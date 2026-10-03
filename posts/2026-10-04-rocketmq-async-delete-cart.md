---
layout: article
title: "RocketMQ 异步删除购物车实战"
description: "- \"背景问题：同步调用接口响应拉长，失败导致全局回滚，无重试兜底机制。\"   - \"解决方案：将删除购物车异步化，交给 MQ 后台异步执行，人工处理死信。\"   - \"请求头丢失：解决 Spring Cloud Stream 与 OpenFeign 之间的线程上下文丢失问题。\"   - \"代码实现：包括生产者配置、消息发送、消费者服务创建与消息消费逻辑"
date: 2026-10-04
category: "云商城"
tags:
  - "微服务"
  - "RocketMQ"
  - "SpringCloudStream"
  - "异步"
  - "分布式事务"
permalink: /posts/2026-10-04-rocketmq-async-delete-cart.html
---

## 1、原订单生成同步删除购物车存在的问题

（1）接口响应拉长：

下单主流程同步调用购物车服务，网络抖动、购物车服务卡顿会拉长下单耗时，高峰期压垮下单接口。

（2）同步调用失败会导致数据不一致：

订单、库存全部成功，调用删除购物车时抛出异常触发 Seata 全局回滚，用户下单失败。只是删购物车这个次要操作失败，就要回滚整个下单链路，业务体验极差。

（3）无重试兜底机制：

同步失败只能整体回滚，没有自动重试、死信人工处理能力。

## 2、解决方案

（1）把删购物车异步化：

订单、库存操作完成，下单主流程就已经成功了，直接给前端返回下单成功。

（2）删购物车交给 MQ 后台异步执行：

就算购物车服务宕机、网络故障，RocketMQ 会自动重试。

（3）人工处理：

多次重试失败进入死信队列，后台人工清理购物车即可，不需要回滚订单和库存。

## 3、发送删除购物车消息

### 1）请求头丢失问题

在 Spring Cloud Stream 消费者中通过 StreamBridge 调用 OpenFeign 时，上下文不会自动跨服务传递，会出现 RequestAttributes 为 null 的异常。

本质是消息监听线程与 Web 请求线程的上下文隔离，即线程上下文丢失。

StreamBridge 的消息监听运行在独立线程池，而 RequestContextHolder 基于 ThreadLocal 存储请求属性，OpenFeign 默认会从 RequestContextHolder 获取 HttpServletRequest 等属性用于构造请求头，导致非 Web 环境调用失败。

即非 Web 线程无法自动继承上下文。当 RequestContextHolder.getRequestAttributes() 返回 null 时，通常是由于线程上下文未正确传递导致的。

因此，消息监听需要远程调用（Feign/RPC）时需显式传递请求头信息：

- 发布消息时提取当前线程所有 HTTP 请求头（token、tenantId、userId、认证标识等）

- 把 Header 键值对存入 MQ 消息的 Header/Property 持久化到 Broker

- MQ 投递到消费者，消费线程读取消息内存存储的 Header

- 手动伪造 HttpServletRequest 绑定到消费线程的 RequestContextHolder

- Feign 拦截器正常读取上下文，不再空指针

（1）使用 MockHttpServletRequest 伪造生成上下文：

MockHttpServletRequest 类由 spring-boot-starter-test 包提供，这个包已经在 mall-service 的 pom 导入，需要将它的作用范围修改为：

    <scope>compile</scope>

（2）工具类：提取 Web 请求头

    @Component
    public class MqHeaderUtil {

        /**
         * 提取当前 Web 线程所有请求头（token、租户、认证信息）
         */
        public static Map<String, String> extractHttpHeaders() {
            Map<String, String> headerMap = new HashMap<>();
            RequestAttributes attr = RequestContextHolder.getRequestAttributes();
            if (!(attr instanceof ServletRequestAttributes)) {
                return headerMap;
            }
            HttpServletRequest request = ((ServletRequestAttributes) attr).getRequest();
            Enumeration<String> headerNames = request.getHeaderNames();
            while (headerNames.hasMoreElements()) {
                String headerKey = headerNames.nextElement();
                headerMap.put(headerKey, request.getHeader(headerKey));
            }
            return headerMap;
        }

        /**
         * 创建消息头，不是手动传递，无法从消息中获取
         */
        public static void buildMockRequestContext() {
            MockHttpServletRequest mockRequest = new MockHttpServletRequest();
            RequestAttributes attributes = new ServletRequestAttributes(mockRequest);
            RequestContextHolder.setRequestAttributes(attributes);
        }

        /**
         * 从消息头恢复 Web 上下文，绑定到当前消费线程
         */
        public static void buildMockRequestContext(Map<String, Object> msgHeaders) {
            MockHttpServletRequest mockRequest = new MockHttpServletRequest();
            msgHeaders.forEach((k, v) -> mockRequest.addHeader(k, String.valueOf(v)));
            ServletRequestAttributes attributes = new ServletRequestAttributes(mockRequest);
            RequestContextHolder.setRequestAttributes(attributes);
        }

        /**
         * 清理 ThreadLocal，防止线程池复用串数据
         */
        public static void clearContext() {
            RequestContextHolder.resetRequestAttributes();
        }
    }

### 2）配置生产者信息

（1）创建默认组 mq.yml 数据集：

    spring:
      cloud:
        stream:
          rocketmq:
            binder:
              name-server: 192.168.100.101:9876 # NameServer 地址

（2）创建 ORDER_GROUP 组 mq_producer.yml 数据集：

    spring:
      cloud:
        stream:
          bindings:
            deleteCart-out-0:
              destination: deletecart
              group: order-producer-group

（3）导入文件：

在 mall-order-service 导入配置文件

### 3）发送消息

（1）创建消息发送接口

    public interface IMessageSendService {

        /**
         * 发送删除购物车事务消息
         * @param transactionId 事务 ID
         * @param cartIds 待删除购物车 ID 集合
         */
        void sendDeleteCartMsg(String transactionId, List<String> cartIds);
    }

（2）接口实现

    @Service
    public class MessageSendServiceImpl implements IMessageSendService {
        public static final String DELETE_CART_CHANNEL = "deleteCart-out-0";

        @Autowired
        private StreamBridge streamBridge;

        @Autowired
        private MqHeaderUtil mqHeaderUtil;

        public void sendDeleteCartMsg(String transactionId, List<String> cartIds) {
            // 1. 安全检测
            if (cartIds == null || cartIds.isEmpty()) {
                return;
            }

            // 2. 获取当前 Web 请求头，存入消息透传给消费端 Feign
            Map<String, String> httpHeaders = mqHeaderUtil.extractHttpHeaders();
            String mqHttpHeaders = JSON.toJSONString(httpHeaders);
            String body = JSON.toJSONString(cartIds);

            // 3. 构建事务消息，把 header 存入消息 properties
            Message message = MessageBuilder
                .withPayload(body)
                .setHeader("MQ_HTTP_HEADER", mqHttpHeaders)
                .setHeader("TRANSACTION_ID", transactionId)
                .build();

            // 4. 发送消息
            streamBridge.send(DELETE_CART_CHANNEL, message);
        }
    }

（3）创建订单

将创建订单的代码替换如下：

    @Autowired
    private IMessageSendService messageSendService;

    @Override
    public void create(OrderCreateDTO orderCreateDTO) throws Exception {
        // 1. 分离数据
        // 1.1 订单数据
        OrderInfo orderInfo = JsonUtils.toObj(orderCreateDTO, OrderInfo.class);
        // 1.2 订单明细数据
        List<OrderItems> orderItemsList = JsonUtils.toList(orderCreateDTO.getOrderItemsList(), OrderItems.class);
        // 1.3 购物车 ID 集合
        List<String> cartIds = JsonUtils.toList(orderCreateDTO.getCartIds(), String.class);

        // 1. 库存扣减
        // 1.1 获取库存扣减数据
        Map<Long, Integer> deductMap = orderItemsList.stream().collect(
            Collectors.toMap(OrderItems::getSkuId, OrderItems::getQuantity)
        );
        // 1.2 批量扣减库存
        Result stockResult = skuInfoFeignClient.deductStock(deductMap);
        if (!stockResult.getCode().equals(ResultCodeEnum.SUCCESS.getCode())) {
            throw new BusinessException(stockResult.getCode(), stockResult.getMsg());
        }

        // 2. 保存订单
        // 2.1 生成订单编号（订单和订单明细编号一致），基于雪花算法的分布式唯一 ID
        String orderId = IdWorker.getIdStr();
        // 2.2 保存订单明细
        // 2.2.1 计算金额和合计金额
        double totalAmount = 0.0;
        for (OrderItems item : orderItemsList) {
            // 计算金额
            double amount = item.getPrice() * item.getQuantity();
            item.setAmount(amount); // 设置金额
            item.setOrderId(orderId); // 设置订单编号
            // 计算合计金额
            totalAmount += amount;
        }
        // 2.2.2 保存订单明细
        orderItemsService.saveBatch(orderItemsList);

        // 2.3 保存订单
        orderInfo.setOrderId(orderId); // 设置订单编号
        orderInfo.setTotalAmount(totalAmount); // 设置总金额
        orderInfoService.save(orderInfo);

        // 3. 删除购物车
        messageSendService.sendDeleteCartMsg(orderId, cartIds);
    }

## 4、消费消息

### 1）创建消费者服务

创建消费者服务，专门用来消费 RocketMQ 的消息。

（1）创建项目

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype：

- Name: mall-consumer-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.consumer
- ArtifactId: mall-consumer-service
- Version: 1.0.0

（2）配置文件

主配置文件 application.yml 内容

    spring:
      application:
        name: mall-consumer-service
      profiles:
        active: dev
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            namespace: ${spring.profiles.active:public}

开发环境配置文件 application-dev.yml 内容

    server:
      port: 9005
    spring:
      config:
        import:
          - nacos:log.yml

（3）主程序

    @SpringBootApplication(scanBasePackages = "com.example.mall",exclude = {DataSourceAutoConfiguration.class})
    public class ConsumerServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(ConsumerServiceApplication.class, args);
        }
    }

### 2）消费者配置

（1）创建 CONSUMER_GROUP 的 mq_consumer.yml：

    spring:
      cloud:
        function:
          definition: deleteCartInput
        stream:
          bindings:
            #删除购物车
            deleteCartInput-in-0:
              destination: deletecart
              group: deleet-cart-group
              consumer:
                max-attempts: 3 # 消费最大重试次数
                concurrency: 3 # 线程数

（2）导入数据集

    import:
      - nacos:log.yml
      - nacos:mq.yml
      - nacos:redis.yml
      - nacos:mq_consumer.yml?group=CONSUMER_GROUP

### 3）消息消费（幂等校验 + 重试 + 上下文清理）

    @Component
    public class DeleteCartHandler {
        @Autowired
        private CartFeignClient cartFeignClient;
        @Autowired
        private MqHeaderUtil mqHeaderUtil;
        @Autowired
        private RedisTemplate<String, Object> redisTemplate;

        @Bean
        public Consumer<Message<String>> deleteCartInput() {
            return message -> {
                // 1. 获取消息
                // 1.1 获取 RocketMQ 事务 ID，用于幂等判断
                String key = (String) message.getHeaders().get("TRANSACTION_ID");
                String lockKey = "que:lock:" + key;
                // 获取消息体
                String bodyStr = message.getPayload();
                List<String> cartIdList = JSON.parseArray(bodyStr, String.class);

                // 2. 幂等校验
                Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, "1", 30, TimeUnit.SECONDS);
                if(!Boolean.TRUE.equals(acquired)){
                    return;
                }

                // 3. 删除购物车
                try {
                    // 3.1 恢复 Web 请求上下文，解决 Feign RequestAttributes null
                    String headerJson = (String) message.getHeaders().get("MQ_HTTP_HEADER");
                    Map<String, Object> headerMap = JSON.parseObject(headerJson);
                    mqHeaderUtil.buildMockRequestContext(headerMap);

                    // 3.2 远程调用删除购物车
                    Result result = cartFeignClient.deleteCart(cartIdList);
                    if (!ResultCodeEnum.SUCCESS.getCode().equals(result.getCode())) {
                        throw new BusinessException(result.getCode(), result.getMsg());
                    }
                } catch (Exception e) {
                    // 抛出异常触发 Stream 自动重试，达到 max-attempts 进入死信
                    throw new RuntimeException("消费删除购物车消息异常", e);
                } finally {
                    // 必须清理 ThreadLocal，线程池复用防串上下文
                    mqHeaderUtil.clearContext();
                }
            };
        }
    }

（4）测试：由前端发起测试

场景一：订单保存失败

    // 设置异常代码
    int x = 10 / 0;
    orderInfoService.save(orderInfo);

在测试过程中，如果生产者发生了异常，消息是不会发送，购物车被删除不会被删除。

场景二：订单保存成功

删除异常代码。

在测试过程中，消息正常发送，正常消费，购物车被删除。

## 5、流程图文字推演

### 请求头跨线程传递流程

Web 请求线程 --> 调用发送消息方法 --> extractHttpHeaders() 提取请求头 --> 存入 MQ 消息 Header 持久化到 Broker --> MQ 投递消息至消费线程 --> 消费线程 buildMockRequestContext() 恢复上下文 --> Feign 拦截器读取上下文成功 --> 远程调用删除购物车 --> clearContext() 清理 ThreadLocal

### 异步删除购物车完整链路

用户下单 --> 扣减库存 --> 保存订单 --> 发送 MQ 消息（异步） --> 返回下单成功给前端

消费者服务拉取消息 --> 基于 TRANSACTION_ID 做 Redis 幂等校验 --> 恢复 Web 上下文 --> Feign 远程调用删除购物车 --> 成功则 ACK，失败则重试（最多 3 次） --> 超过重试次数进入死信队列等待人工处理

## 【总结】

RocketMQ 作为分布式消息中间件的领先方案，其核心优势总结如下：

（1）高吞吐：支持单机十万级 QPS，适用于双十一等超大规模场景。

（2）毫秒级响应延迟：99.6% 的请求在高压环境下延迟低于 1ms，通过零拷贝技术减少数据复制开销。

（3）水平扩展能力：Topic 分片存储在多个 Broker 节点，支持横向扩展。

（4）NameServer 无状态路由：轻量级服务发现机制，确保路由信息高效同步。

（5）Broker 主从同步：通过主从复制实现数据冗余，故障时自动切换提升可用性。

凭借上述特性，RocketMQ 在电商、金融、物联网等高并发场景中展现出强大的适用性，成为支撑复杂分布式系统的核心基础设施。

💡 **速记**

【核心考点】

删除购物车等次要操作应异步化处理，避免同步调用失败导致主链路全局回滚。使用 RocketMQ 实现异步解耦，配合死信队列实现人工兜底。

Spring Cloud Stream 与 OpenFeign 之间通过 ThreadLocal 传递上下文，消息监听线程无法自动继承 Web 线程的 RequestAttributes，需手动传递 Header 并在消费端伪造上下文。

【高频逻辑链】

主流程下单成功 --> 发送 MQ 消息 --> 消费者幂等校验 --> 恢复 Web 上下文 --> Feign 调用删除购物车 --> 成功则 ACK，失败则重试 --> 超过次数进入死信。

【关键避坑】

消息消费后必须清理 ThreadLocal（`RequestContextHolder.resetRequestAttributes()`），防止线程池复用导致上下文串数据。

消费端必须做幂等校验（如基于 TRANSACTION_ID 使用 Redis setIfAbsent），避免消息重复消费导致重复删除或异常。
