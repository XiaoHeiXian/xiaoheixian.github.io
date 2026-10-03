---
layout: article
title: "支付宝支付回查机制"
description: "- \"作用：确认支付结果，防止错误支付，确保订单状态准确，处理延时订单。\"   - \"原理：订单生成后延时发送回查消息，依次查询订单状态、支付存根、支付宝，决定修改或删除。\"   - \"接口设计：订单服务提供查询状态与删除接口，支付服务提供回查接口。\"   - \"执行流程：生产端发送延时消息，消费端幂等校验后发起回查并更新或删除订单。\"   - \"测试场"
date: 2026-10-04
category: "云商城"
tags:
  - "微服务"
  - "支付"
  - "支付宝"
  - "支付回查"
permalink: /posts/2026-10-04-alipay-payment-callback-verify.html
---

支付回查可以帮助商户确认支付结果，防止因系统波动或人为疏忽导致的错误支付，确保资金安全。

同时，支付回查可以确保订单状态的准确性，避免用户因订单状态不同步而产生的投诉。

通过及时更新订单状态，提升商户系统的健壮性，减少因状态不同步导致的用户投诉。

支付回查还可以处理延时订单，当订单达到支付时限，通过回查手段删除未支付无效订单。

## 1、支付回查原理

可以在订单生成一段时间（如 2 分钟）发起回查消息：

① 查询订单状态，如果订单已支付，放弃回查。否则，

② 查询支付存根，如果生成了支付日志，修改订单状态。否则，

③ 查询支付宝（第三方平台），如果支付成功，返回支付信息写支付日志并修改订单状态，否则，

④ 删除无效订单。

## 2、创建回查接口

### 1）查询订单状态

（1）业务接口

在订单服务的 OrderInfoService 接口中添加方法：

    /**
     * 获取订单状态
     * @param orderId
     */
    int getOrderStatus(String orderId);

（2）接口实现

    @Override
    public int getOrderStatus(String orderId) {
        OrderInfo orderInfo = this.getById(orderId);
        if (orderInfo != null) {
            return orderInfo.getStatus();
        }
        return 0;
    }

（3）控制器

    /**
     * 获取订单状态
     * @param orderId
     * @return
     */
    @GetMapping("/getOrderStatus/{orderId}")
    public int getOrderStatus(@PathVariable String orderId){
        return orderInfoService.getOrderStatus(orderId);
    }

（4）OpenFeign 接口

在 OrderInfoFeignClient 添加方法：

    @GetMapping("/orderInfo/getOrderStatus/{orderId}")
    Result<Integer> getOrderStatus(@PathVariable("orderId") String orderId);

### 2）查询支付存根

（1）业务接口

    /**
     * 按订单查询交易记录
     * @param orderId
     * @return
     */
    PayLog getByOrderId(String orderId);

（2）接口实现

    public PayLog getByOrderId(String orderId) {
        LambdaQueryChainWrapper<PayLog> query = new LambdaQueryChainWrapper<>(baseMapper);
        PayLog payLog = query.eq(PayLog::getOrderId, orderId).one();
        return payLog;
    }

### 3）发起回查

（1）业务接口

在支付服务支付接口添加方法：

    /**
     * 查询订单状态
     * @param outTradeNo 订单号
     * @return
     * @throws Exception
     */
    String paymentCallbackVerify(String outTradeNo) throws Exception;

（2）接口实现

    @Override
    public String paymentCallbackVerify(String outTradeNo) throws Exception {
        /*
         * 如果支付日志表存在数据，则直接返回
         * 否则查询支付宝交易订单
         */
        // 1.查询支付日志表
        PayLog payLog = payLogService.getByOrderId(outTradeNo);
        if(payLog != null){
            return "TRADE_SUCCESS";
        }

        // 2.查询支付宝交易订单
        // 2.1 创建默认的支付宝客户端实例
        AlipayClient alipayClient = new DefaultAlipayClient(alipayConfiguration.getAlipayConfig());

        // 2.2 构造请求参数以调用接口
        AlipayTradeQueryRequest request = new AlipayTradeQueryRequest();
        AlipayTradeQueryModel model = new AlipayTradeQueryModel();
        // 2.3 设置订单支付时传入的商户订单号
        model.setOutTradeNo(outTradeNo);
        // 2.4 发送查询请求
        request.setBizModel(model);
        AlipayTradeQueryResponse response = alipayClient.execute(request);

        // 如果返回成功，则写入支付日志表
        if(response.isSuccess()){
            payLog = new PayLog();
            payLog.setId(response.getTradeNo());
            payLog.setOrderId(outTradeNo);
            payLog.setAmount(Double.parseDouble(response.getTotalAmount()));
            payLogService.save(payLog);
            return "TRADE_SUCCESS";
        }else {
            return "TRADE_FAIL";
        }
    }

（3）回查控制器

    @GetMapping("/payment/query/{orderId}")
    public Result queryPaymentResult(@PathVariable String orderId) throws Exception {
        String result = alipayService.paymentCallbackVerify(orderId);
        return Result.success(result);
    }

（4）回查 OpenFeign 接口

    @FeignClient(name = "mall-pay-service", contextId = "alipay-feign")
    public interface AlipayFeignClient {

        @GetMapping("/alipay/payment/query/{orderId}")
        Result queryPaymentResult(@PathVariable("orderId") String orderId) throws Exception;
    }

### 4）删除订单

（1）按订单编号删除订单明细

在 IOrderItemsService 接口添加方法：

    /**
     * 按订单 ID 删除订单
     * @param orderId
     */
    void removeByOrderId(Long orderId);

实现：

    @Override
    public void removeByOrderId(Long orderId) {
        LambdaUpdateChainWrapper<OrderItems> updateChainWrapper = new LambdaUpdateChainWrapper<>(baseMapper);
        updateChainWrapper.eq(OrderItems::getOrderId, orderId).remove();
    }

（2）删除订单

在 IOrderService 接口添加删除方法：

    /**
     * 按订单 ID 删除订单
     * @param orderId
     * @return
     */
    void removeById(Long orderId);

接口实现：

    @Override
    public void removeById(Long orderId) {
        orderInfoService.removeById(orderId);
        orderItemsService.removeByOrderId(orderId);
    }

（3）创建控制器

在 OrderController 中添加方法：

    @Operation(summary = "删除订单")
    @DeleteMapping("/remove/{orderId}")
    public Result removeById(@PathVariable Long orderId) {
        orderService.removeById(orderId);
        return Result.success();
    }

创建 OrderFeignClient 接口：

    @FeignClient(name = "mall-order-service", contextId = "order-feign")
    public interface OrderFeignClient {

        @DeleteMapping("/order/remove/{orderId}")
        Result removeById(@PathVariable("orderId") Long orderId);
    }

## 3、执行回查流程

### 1）发送延时回查消息

（1）在 mall-order-service 的 IMessagesSendService 接口添加方法：

    /**
     * 发送订单回查事务消息
     * @param userId 用户 ID
     * @param orderId 订单 ID
     */
    void sendOrderCheckMsg(Long userId, String orderId);

接口实现：

    public static final String ORDER_CHECK_CHANNEL = "orderCheck-out-0";

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Override
    public void sendOrderCheckMsg(Long userId, String orderId) {
        // 1. 获取当前 Web 请求头，存入消息透传给消费端 Feign
        Map<String, String> httpHeaders = mqHeaderUtil.extractHttpHeaders();
        String mqHttpHeaders = JSON.toJSONString(httpHeaders);
        String transactionId = orderId + "_" + userId;

        // 2. 构建事务消息，把 header 存入消息头
        Message message = MessageBuilder
            .withPayload(orderId)
            .setHeader("MQ_HTTP_HEADER", mqHttpHeaders)
            .setHeader("TRANSACTION_ID", transactionId)
            .setHeader("DELAY", 5)
            .build();

        // 3. 发送消息
        String lockKey = "req:lock:" + transactionId;
        if(redisTemplate.opsForValue().setIfAbsent(lockKey,"1",30, TimeUnit.SECONDS)){
            streamBridge.send(ORDER_CHECK_CHANNEL, message);
        }
    }

注意：导入 redis.yml 数据集。

（2）发送回查消息

在 orderServiceImpl 的 create 方法的删除购物车的后面添加以下代码：

    // 4. 发送回查消息
    messageSendService.sendOrderCheckMsg(orderInfo.getUserId(), orderId);

（3）配置消息通道

在 ORDER_GROUP 组的 mq_producer.yml 数据集中添加通道：

    orderCheck-out-0:
      destination: checkorder
      group: order-check-group

### 2）实现支付回查

（1）发起支付流程

在消息消费服务发起回查流程：

    @Component
    public class OrderPaymentCallbackVerifyHandler {
        @Autowired
        private OrderInfoFeignClient orderInfoFeignClient;
        @Autowired
        private OrderFeignClient orderFeignClient;
        @Autowired
        private AlipayFeignClient alipayFeignClient;
        @Autowired
        private MqHeaderUtil mqHeaderUtil;
        @Autowired
        private RedisTemplate<String, Object> redisTemplate;

        @Bean
        public Consumer<Message<String>> orderCheckInput() {
            return message -> {
                // 1. 获取消息
                // 1.1 获取 RocketMQ 事务 ID，用于幂等判断
                String key = (String) message.getHeaders().get("TRANSACTION_ID");
                String lockKey = "que:lock:" + key;

                // 1.2 获取消息体
                String orderId = message.getPayload();

                // 2. 幂等校验
                Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "1", 30, TimeUnit.SECONDS);
                if(!Boolean.TRUE.equals(acquired)){
                    return;
                }

                // 3. 查询订单状态
                try {
                    // 3.1 恢复 Web 请求上下文，解决 Feign RequestAttributes null
                    String headerJson = (String) message.getHeaders().get("MQ_HTTP_HEADER");
                    Map<String, Object> headerMap = JSON.parseObject(headerJson);
                    mqHeaderUtil.buildMockRequestContext(headerMap);

                    // 3.2 远程调用查询订单状态
                    Result result = orderInfoFeignClient.getOrderStatus(orderId);
                    if (!ResultCodeEnum.SUCCESS.getCode().equals(result.getCode())) {
                        throw new BusinessException(result.getCode(), result.getMsg());
                    }

                    // 3.3 判断订单状态
                    Integer orderStatus = (Integer) result.getData();
                    if (orderStatus > 0) {
                        return;
                    }

                    // 3.4 发起支付回查
                    Result paymentResult = alipayFeignClient.queryPaymentResult(orderId);
                    if (!ResultCodeEnum.SUCCESS.getCode().equals(paymentResult.getCode())) {
                        throw new BusinessException(paymentResult.getCode(), paymentResult.getMsg());
                    }

                    // 3.5 回查成功修改订单状态，否则删除订单
                    if("TRADE_SUCCESS".equals(paymentResult.getData())){
                        OrderInfoUpdateDTO updateDTO = new OrderInfoUpdateDTO();
                        updateDTO.setOrderId(orderId);
                        updateDTO.setStatus(1);
                        updateDTO.setPayType(1);
                        updateDTO.setPaymentTime(LocalDateTime.now());
                        orderInfoFeignClient.update(updateDTO);
                    }else {
                        orderFeignClient.removeById(Long.parseLong(orderId));
                    }
                } catch (Exception e) {
                    // 抛出异常触发 Stream 自动重试，达到 max-attempts 进入死信
                    throw new RuntimeException("消费查询订单消息异常", e);
                } finally {
                    // 必须清理 ThreadLocal，线程池复用防串上下文
                    mqHeaderUtil.clearContext();
                }
            };
        }
    }

（2）配置消息通道

在 CONSUMER_GROUP 的 mq_consumer.yml 数据集添加通道：

    spring:
      cloud:
        function:
          definition: deleteCartInput;updateOrderStatusInput;orderCheckInput
        stream:
          bindings:
            ......
            # 订单支付回查
            orderCheckInput-in-0:
              destination: checkorder
              group: check-Order-group
              consumer:
                max-attempts: 3 # 消费最大重试次数

## 4、测试

（1）场景一：订单生成后不支付，查看订单是否删除

（2）场景二：订单支付后将订单状态修改为 0，等待 2 分钟后，查看订单状态是否修改为 1

（3）场景三：订单支付后将订单状态修改为 0，并删除支付记录，等待 2 分钟后，查看订单状态是否修改为 1，支付记录是否生成。

## 5、流程图文字推演

### 支付回查整体流程

订单创建成功 --> 发送延时消息（DELAY=5）至 RocketMQ --> 消费者服务拉取消息 --> 基于 TRANSACTION_ID 进行 Redis 幂等校验 --> 恢复 Web 上下文 --> 查询订单状态

订单状态 > 0（已支付） --> 直接返回，结束回查

订单状态 = 0（未支付） --> 调用支付宝接口查询交易状态

支付宝返回 TRADE_SUCCESS --> 更新订单状态（状态=1，支付类型=1，支付时间） --> 结束回查

支付宝返回非 TRADE_SUCCESS --> 调用订单服务删除订单及订单明细 --> 结束回查

💡 **速记**

【核心考点】

支付回查机制利用延时消息（RocketMQ）触发，按“订单状态 -> 支付存根 -> 第三方支付平台”的优先级逐层校验，保证状态最终一致性。

回查逻辑是闭环的：如果支付宝已支付但本地未记录，则补写支付日志并更新订单；如果支付宝未支付，则视为超时无效订单并删除。

【高频逻辑链】

订单创建 --> 发送延时消息（延迟 5 秒） --> 消费端幂等校验 --> 恢复 Web 上下文 --> 查询订单状态（若已支付则终止） --> 查询支付宝（若成功则更新订单并写日志） --> 若未支付则删除订单。

【关键避坑】

生产端发送延时消息需加 Redis 分布式锁，防止短时间内重复发送回查消息。

消费端处理回查消息时，必须先做幂等校验，防止重复消费导致多次更新或删除订单。

回查操作涉及 Feign 远程调用（查询订单、查询支付宝、更新/删除订单），必须恢复 Web 请求上下文（MQ_HTTP_HEADER）并清理 ThreadLocal，否则会抛空指针异常。
