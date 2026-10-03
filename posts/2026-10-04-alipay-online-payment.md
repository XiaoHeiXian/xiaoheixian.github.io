---
layout: article
title: "支付宝在线支付实战"
description: "- \"支付流程：下单、发送支付请求、生成二维码、用户扫码、异步回调修改订单状态。\"   - \"数据库设计：只需一张支付存根表（pay_log），记录流水号、订单号、金额和时间。\"   - \"创建服务：新增 mall-pay-service 模块，引入支付宝 SDK 与公共模块依赖。\"   - \"配置中心：新增 alipay.yml、mq_producer"
date: 2026-10-04
category: "云商城"
tags:
  - "微服务"
  - "支付"
  - "支付宝"
  - "在线支付"
  - "SpringBoot"
permalink: /posts/2026-10-04-alipay-online-payment.html
---

## 1、支付流程

订单生成之后，用户开始支付，支付流程如下图所示：

![架构示意图](https://xiaoheixian.github.io/posts/assets/305_65.png)

用户下单 --> 订单系统 --> 发送支付请求 --> 支付系统 --> 生成支付二维码 --> 支付宝

用户扫码支付 --> 支付宝 --> 返回支付结果 --> 支付系统 --> 支付结果存根 --> MySQL

支付系统 --> 发送修改订单状态请求 --> RocketMQ --> 订单系统 --> 修改订单状态 --> MySQL

## 2、数据库设计

本系统只有一张支付存根表，用于保存订单的支付存根：

支付存根（pay_log）

    id：varchar，长度 24，说明：支付流水号
    order_id：varchar，长度 64，说明：外键，关联订单表(order_id)
    amount：double，长度 10,2，说明：支付金额（price × quantity）
    create_time：datetime，说明：支付时间

## 3、创建支付服务

### 1）创建项目

（1）创建项目

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype：

- Name: mall-pay-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.pay
- ArtifactId: mall-pay-service
- Version: 1.0.0

（2）添加依赖

    <dependency>
        <groupId>com.alipay.sdk</groupId>
        <artifactId>alipay-sdk-java</artifactId>
        <version>4.39.218.ALL</version>
    </dependency>
    <dependency>
        <groupId>com.cx.mall.common</groupId>
        <artifactId>mall-common</artifactId>
        <version>1.0-SNAPSHOT</version>
    </dependency>

（3）生成代码（略）

### 2）配置文件

（1）主配置文件 application.yml 内容

    spring:
      application:
        name: mall-pay-service
      profiles:
        active: dev
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            namespace: ${spring.profiles.active:public}

（2）开发环境配置文件 application-dev.yml 内容

    server:
      port: 9006
    spring:
      config:
        import:
          - nacos:mysql.yml?group=PAY_GROUP
          - nacos:mybatis.yml
          - nacos:log.yml
          - nacos:knife4j.yml
          - nacos:redis.yml
          - nacos:mq.yml
          - nacos:alipay.yml?group=PAY_GROUP
          - nacos:mq_producer.yml?group=PAY_GROUP
          - nacos:thymeleaf.yml?group=PAY_GROUP

（3）在配置中心创建配置文件

    Data ID：mysql.yml，Group：PAY_GROUP，配置格式：yaml，配置内容：克隆后，修改数据库地址信息
    Data ID：alipay.yml，Group：PAY_GROUP，配置格式：yaml，配置内容：见配置
    Data ID：mq_producer.yml，Group：PAY_GROUP，配置格式：yaml，配置内容：见配置
    Data ID：thymeleaf.yml，Group：PAY_GROUP，配置格式：yaml，配置内容：克隆后，再修改

alipay.yml 配置内容：

    # 支付宝参数配置
    alipay:
      # app-id：支付宝开放平台中的 APPID
      appId: 支付宝开放平台中的 APPID
      # gateway-url：支付宝开放平台中的支付宝网关地址
      gatewayUrl: https://openapi-sandbox.dl.alipaydev.com/gateway.do
      # private-key：在支付宝开放平台秘钥工具中生成的应用私钥
      privateKey: 在支付宝开放平台秘钥工具中生成的应用私钥
      # alipay-public-key：支付宝开放平台中的支付宝公钥
      alipayPublicKey: 支付宝开放平台中的支付宝公钥
      # notify-url：支付宝通过该 URL 通知交易状态变化，使用内网穿透地址
      notifyUrl: http://kbea2285.natappfree.cc/api/pay/alipay/notify
      # return-url：用户完成支付后，支付宝会重定向到该 URL
      returnUrl: http://localhost:9000/api/pay/alipay/return
      # 支付成功后返回地址（由前端决定）
      successUrl: http://localhost/alipay/success

mq_producer.yml 配置内容：

    spring:
      cloud:
        stream:
          bindings:
            updateOrderOutput-out-0:
              destination: updateOrder
              group: pay-producer-group

### 3）创建启动程序

    @SpringBootApplication(scanBasePackages = "com.example.mall")
    @MapperScan("com.example.mall.pay.mapper")
    public class PayServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(PayServiceApplication.class, args);
        }
    }

## 4、支付实现

### 1）创建支付宝的基础配置类 config.AlipayConfiguration

    @Component
    @ConfigurationProperties(prefix = "alipay")
    @Data
    public class AlipayConfiguration {
        // 支付宝的 AppId
        private String appId;
        // 支付宝网关地址
        private String gatewayUrl;
        // 应用私钥
        private String privateKey;
        // 支付宝公钥
        private String alipayPublicKey;
        // 支付宝通知本地的完成地址
        private String notifyUrl;
        // 支付宝回调地址
        private String returnUrl;
        // 支付成功返回页面
        private String successUrl;

        /**
         * 该静态方法用于创建并配置一个实例，
         * 设置支付宝接口调用所需的基本参数：
         * 如服务器地址、AppId、密钥、编码格式等，返回配置好的对象以供使用。
         */
        public AlipayConfig getAlipayConfig() {
            AlipayConfig alipayConfig = new AlipayConfig();
            alipayConfig.setServerUrl(gatewayUrl);
            alipayConfig.setAppId(appId);
            alipayConfig.setPrivateKey(privateKey);
            alipayConfig.setFormat("json");
            alipayConfig.setAlipayPublicKey(alipayPublicKey);
            alipayConfig.setCharset("UTF-8");
            alipayConfig.setSignType("RSA2");
            return alipayConfig;
        }
    }

### 2）实现支付

（1）支付流程

支付宝支付服务流程如下图所示：

![架构示意图](https://xiaoheixian.github.io/posts/assets/306_65.png)

扫码设备 --> 上传条码信息 --> 商家收银台 --> 提交支付 --> 商家后台 --> 支付 --> 支付宝后台

支付宝后台 --> 返回支付结果 --> 商家后台 --> 返回支付结果 --> 商家收银台

用户支付宝钱包 --> 扫描付款码 --> 支付宝后台 --> 支付宝消息通知支付成功 --> 用户支付宝钱包

从上图可以看出，支付流程分为三个阶段：

①商家生成订单支付二维码，通知用户支付

②用户支付后，返回支付结果给商家

③支付成功后，异步通知支付结果给用户

（2）支付服务实现

①创建支付订单 DTO

    @Data
    public class PayCreateDTO {
        private String orderId; // 订单 ID
        private String subject; // 订单标题
        private String body; // 订单描述
        private Double totalAmount; // 订单金额
    }

②创建支付服务

    public interface IAlipayService {

        /**
         * 生成支付二维码
         * @param payCreateDTO 支付订单信息
         * @return
         * @throws RuntimeException
         */
        String pay(PayCreateDTO payCreateDTO) throws Exception;

        /**
         * 支付回调处理
         * @param result
         */
        void payNotify(Map<String, String[]> result);
    }

③支付实现

    @Service
    @Transactional
    public class AlipayServiceImpl implements IAlipayService {
        @Autowired
        private AlipayConfiguration alipayConfiguration;
        @Autowired
        private IPayLogService payLogService;
        @Autowired
        private StreamBridge streamBridge;
        @Autowired
        private RedisTemplate redisTemplate;

        @Override
        public String pay(PayCreateDTO payCreateDTO) throws Exception {
            // 1. 创建默认的支付宝客户端实例
            AlipayClient alipayClient = new DefaultAlipayClient(alipayConfiguration.getAlipayConfig());

            // 2. 发送支付请求
            // AlipayTradePagePayRequest 接口主要用于在 PC 网站上实现支付宝支付功能
            AlipayTradePagePayRequest alipayTradePagePayRequest = new AlipayTradePagePayRequest();
            // 设置异步通知地址
            alipayTradePagePayRequest.setNotifyUrl(alipayConfiguration.getNotifyUrl());
            // 设置返回地址
            alipayTradePagePayRequest.setReturnUrl(alipayConfiguration.getReturnUrl());

            // 构造业务请求参数（如果是电脑网页支付，product_code 是必传参数）
            JSONObject jsonObject = new JSONObject();
            jsonObject.put("out_trade_no", payCreateDTO.getOrderId());// 订单编号
            jsonObject.put("subject", payCreateDTO.getSubject());
            jsonObject.put("body", payCreateDTO.getBody());
            jsonObject.put("total_amount", payCreateDTO.getTotalAmount());// 订单总金额
            jsonObject.put("product_code", "FAST_INSTANT_TRADE_PAY");// 固定配置
            alipayTradePagePayRequest.setBizContent(jsonObject.toJSONString());

            // 3.请求支付宝接口，拿到响应结果
            String result = alipayClient.pageExecute(alipayTradePagePayRequest).getBody();
            return result;
        }

        @Override
        public void payNotify(Map<String, String[]> result) {
            // 支付流水号
            String no = result.get("trade_no")[0];
            // 订单编号
            String orderId = result.get("out_trade_no")[0];
            // 订单金额
            String trade_no = result.get("total_amount")[0];

            // 写支付存根
            PayLog payLog = new PayLog();
            payLog.setId(no);
            payLog.setOrderId(orderId);
            payLog.setAmount(Double.parseDouble(trade_no));
            payLogService.save(payLog);
        }
    }

④支付服务控制器

    @RestController
    @RequestMapping("/alipay")
    public class AlipayController {
        @Autowired
        private IAlipayService alipayService;
        @Autowired
        private AlipayConfiguration alipayConfiguration;

        @GetMapping("/pay")
        public void pay(PayCreateDTO payCreateDTO, HttpServletResponse response) throws Exception {
            // 调用业务
            String result = alipayService.pay(payCreateDTO);
            // 返回结果给前端:将表单直接输出到页面，用户点击后会跳转到支付宝支付页面
            response.setContentType("text/html;charset=" + CHARSET_UTF8);
            response.getWriter().write(result);
            response.getWriter().flush();
            response.getWriter().close();
        }

        @PostMapping("/notify")
        public void payNotify(HttpServletRequest request) {
            // 获取支付宝返回的各个参数
            Map<String, String[]> result = request.getParameterMap();
            // 检查交易状态是否为成功
            if ("TRADE_SUCCESS".equals(request.getParameter("trade_status"))) {
                // 通知处理
                alipayService.payNotify(result);
            }
        }
    }

⑤成功返回页面控制器

使用 Thymeleaf 静态页，制作支付成功返回页面（将 success.html 放到 resources/templates 下）

    @Controller
    @RequestMapping("/alipay")
    public class PageController {
        @GetMapping("/return")
        public String payReturn(HttpServletRequest request, ModelMap model) {
            // 格式化日期
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

            Map<String, String[]> result = request.getParameterMap();
            // 支付流水号
            String id = result.get("trade_no")[0];
            // 订单编号
            String orderId = result.get("out_trade_no")[0];
            // 订单金额
            String totalAmount = result.get("total_amount")[0];

            model.addAttribute("id", id);
            model.addAttribute("orderId", orderId);
            model.addAttribute("totalAmount", totalAmount);
            model.addAttribute("payTime", sdf.format(System.currentTimeMillis()));

            return "success"; // 对应 templates/success.html
        }
    }

（5）配置网关路由和放行路由

    - id: mall-pay-service
      uri: lb://mall-pay-service
      predicates:
        - Path=/api/pay/**
      filters:
        - StripPrefix=2
    # 在默认过滤器放行路由 /api/pay/**

（6）用浏览器测试

    http://localhost:9000/api/pay/alipay/pay?orderId=2026100623142031374&totalAmount=0.01&subject=测试

在浏览器输入以上地址（注意修改订单号，一个订单号只能支付一次），出现支付页面，走完一个测试流程。

## 5、流程图文字推演

### 支付宝在线支付完整业务流程

用户提交订单 --> 订单系统生成订单 --> 订单系统发送支付请求至支付系统 --> 支付系统调用支付宝 SDK 生成支付表单/二维码 --> 用户扫描二维码或点击跳转至支付宝 --> 支付宝处理支付 --> 支付宝异步通知支付系统（notify） --> 支付系统写入支付存根至 MySQL --> 支付系统发送修改订单状态消息至 RocketMQ --> 订单系统消费消息修改订单状态 --> 支付宝同步重定向至返回页面（return） --> 展示支付成功页面

💡 **速记**

【核心考点】

支付宝在线支付基于异步通知（notify）和同步跳转（return）双重机制来保障状态同步，支付系统的核心职责是生成支付请求、记录支付存根、发送 MQ 消息通知订单系统更新状态。

【高频逻辑链】

创建订单 --> 调用支付宝支付接口（AlipayTradePagePayRequest） --> 用户支付 --> 支付宝回调 notify 接口 --> 写入支付存根（pay_log） --> 发送 MQ 消息 --> 订单系统更新订单状态。

【关键避坑】

一个订单号只能支付一次，测试时需注意修改订单号。

支付宝异步通知地址（notifyUrl）必须是公网可访问的地址，本地开发需配合内网穿透工具（如 NATAPP）使用。

支付回调接口（notify）必须校验交易状态（trade_status 为 TRADE_SUCCESS），确保支付成功才处理业务逻辑，同时需保证回调处理的幂等性。
