---
layout: article
title: "RocketMQ 核心技术"
description: "- \"Spring Cloud Stream：整合各类消息队列，核心概念Binder(外部集成)、Binding(队列配置)、Input/Output\"   - \"RocketMQ 整合：引入 spring-cloud-starter-stream-rocketmq 依赖\"   - \"使用案例：配置 binder、bindings、输入输出通道命名规范\""
date: 2026-10-01
category: "云商城"
tags:
  - "微服务"
  - "消息队列"
  - "RocketMQ"
permalink: /posts/2026-10-01-rocketmq-core-tech.html
---

1、Spring Cloud 整合

在微服务框架中，RocketMQ 是基于 Spring Cloud Stream 整合的：

    <dependency>
        <groupId>com.alibaba.cloud</groupId>
        <artifactId>spring-cloud-starter-stream-rocketmq</artifactId>
    </dependency>

Spring Cloud Stream 是一个用于构建基于消息的微服务应用框架，它就是用来整合各种消息队列的，比如常见的 Kafka, RabbitMQ, RocketMQ 等等，它的宗旨就是简化配置，让开发者专注业务开发，而不是队列本身的细节。

Spring Cloud Stream 内部有四个重要的东西：

- Binder：整合队列，与外部消息中间件集成的组件，用于创建 Binding。包含了队列的基本配置，它的层级是 Kafka, RabbitMQ, RocketMQ 这一级。
- Binding：每个队列内部的配置，比如我的 Binder 是 RocketMQ，那么 Binding 就是的 RocketMQ 的一些配置。包括 InputBinding 和 OutputBinding，作为消息中间件与应用程序提供的 Producer 和 Consumer 之间的桥梁，使开发者只需关注应用程序的 Producer 或 Consumer 生产或消费数据，无需直接与底层消息中间件交互。
- Input：应用程序通过 Input（相当于消费者 Consumer）与 Spring Cloud Stream 中的 Binder 交互，Binder 负责与消息中间件交互。开发者只需关注如何与 Binder 交互，无需直接与具体消息中间件交互。
- Output：Output（相当于生产者 Producer）与 Spring Cloud Stream 中的 Binder 交互。

2、使用案例

如 mall-test-service 服务使用 RocketMQ：

1）配置

    spring:
      cloud:
        stream:
          rocketmq:
            binder:
              name-server: 192.168.100.101:9876 # NameServer 地址
          bindings:
            testOutput-out-0: # 绑定的 output 输出通道,作为生产者发送消息的目标
              destination: testA     # 生产者 Topic
              group: test-producer-group       # 生产者组名
            testInput-in-0: # 绑定的 input 输入通道,作为消费者接收消息的源
              destination: testA     # 消费者 Topic
              group: test-consumer-group       # 消费者组名
              consumer:
                max-attempts: 3 # 消费重试 3 次

注意，通道命名规范：

- 输出通道：[函数名]-out-[index]
- 输入通道：[函数名]-in-[index]

2）发送信息

StreamBridge 是 Spring Cloud Stream 4.x 版本引入的动态信道绑定工具，它允许在运行时动态发送消息到任意 Topic，无需预定义输出信道接口。简化消息生产者的配置，提升代码灵活性，适用于多 Topic 或动态路由场景。

StreamBridge 核心方法详解：

（1）基础消息发送（send）
用途：动态发送消息到指定 Topic 或 Tag，支持灵活路由。
参数：
- bindingName：目标信道名称（如 testOutput-out-0）。
- message：消息体（支持任意对象，自动序列化）。

【例】发送普通消息

    @RestController
    @RequestMapping("/mq")
    public class MQController {
        @Autowired
        StreamBridge streamBridge;

        @GetMapping("/send")
        public Result send(String msg) {
            streamBridge.send("testOutput-out-0", msg);
            return Result.success("发送成功");
        }
    }

在 RocketMQ 控制台查看测试结果，点击消息菜单-选择主题（testA）-搜索，选择消息明细（MESSAGE DETAIL）即可看到具体的消息体。

注意：如果搜索到了主题，但没有消息，Linux 服务器时间与当前时间没有同步，需要同步时间：

    # 安装工具
    yum install -y ntpdate

    # 同步阿里云时间服务器
    ntpdate -u ntp.aliyun.com
    # 同步系统时间到硬件时钟，重启不还原
    hwclock --systohc

时间同步后重新发送消息。

（2）带消息头的发送

通过 MessageBuilder 设置消息头（如 tag、延迟、事务 ID），专门用来构造 Message<T> 对象：

- withPayload(Object payload)：封装消息主体，返回 MessageBuilder<T> 构造器对象。
- fromMessage(Message<?> message)：复制传入消息的全部 headers，可替换 payload，常用于 Function 中转场景。
- setHeader(String name, Object value)：设置单个 header，覆盖同名 key，用于设置 RocketMQ 内置属性和自定义标识：
  - ROCKET_TAGS：消息标签
  - KEYS：消息业务 key（查询、分区路由）
  - DELAY：延迟消息等级
  - TRANSACTION_ID：事务 ID
- setHeaderIfAbsent(String name, Object value)：不存在才设置，不会覆盖已存在的 header，适合兜底默认值。
- copyHeaders(Map<String, ?> headers)：批量复制 Header，传入 Map，全部追加到消息头，重复 key 会覆盖。
- removeHeader(String name) 删除指定 header
- build()：终止方法,完成构建，返回最终 Message<T> 对象，Message 对象不可修改，headers 只读。

【例】发送带 TAG 标签的过滤信息。

    @GetMapping("/payload")
    public Result payLoad(@RequestParam String msg) {
        Message<?> message = MessageBuilder.withPayload(msg)
                .setHeader("ROCKET_TAGS", "test") // 定义消息头传递 Tag
                .build();
        streamBridge.send("testOutput-out-0", message);
        return Result.success("发送成功");
    }

（3）延迟消息发送
用途：结合消息中间件特性实现延迟投递。
RocketMQ 不能自定义延迟时间，有特定等级如下：
DelayLevel=1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h
延迟等级 0 不延迟，1 延时 1s，2 延时 5s，3 延时 10s，4 延时 30s，以此类推……

【例】发送延时消息，消息延时 1m 到达。

    @GetMapping("/delay")
    public Result delay(@RequestParam String msg) {
        Message<?> message = MessageBuilder.withPayload(msg)
                .setHeader("DELAY", 5)
                .setHeader("ROCKET_TAGS", "delay")
                .build();
        streamBridge.send("testOutput-out-0", message);
        return Result.success("发送成功");
    }

3）订阅消息

（1）消息监听
Spring Cloud Stream 推荐使用函数式监听消息，通过 Consumer<Message<T>>接口定义消息处理逻辑，自动绑定到配置的 input 通道。

消息载体 Message<T>：
- getPayload()：获取业务主体数据，生产者实际发送的内容。
- getHeaders()：获取 MessageHeaders，实现 Map<String, Object>，存储所有消息元信息。

【例】订阅主题 testA 的消息
在配置文件中配置的主题订阅通道是 testInput-in-0（[函数名]-in-[index]），遵循通道命名规范要求，订阅函数名应该为 testInput。

    @Configuration
    public class ConsumerHandler {
        @Bean
        public Consumer<Message<String>> testInput() {
            return message -> {
                String payload = message.getPayload();
                Map<String, Object> headers = message.getHeaders();
                System.out.println("收到消息: " + payload + ", 头信息: " + headers);
            };
        }
    }

重试-死信机制：在实际使用中，消息的消费可能出现失败。RocketMQ 拥有重试机制和死信机制来保证消息消费的可靠性：

- 正常消费：消费成功则提交消费位点
- 重试机制：如果正常消费失败，消息会被消费者发回 Broker，放入重试 Topic 的%RETRY%消费者组。最多重试消费 16 次(可以通过 max-attempts 来改变最大重试次数)，重试的时间间隔逐渐变长。（消费者组会自动订阅重试 Topic）。这里延迟重试采用了 RocketMQ 的延迟消息，重试的 16 次时间间隔为延迟消息配置的每个延迟等级的时间（从第三个等级开始）。如果修改延迟等级时间的配置，重试的时间间隔也会相应发生变化。但即便延迟等级时间间隔配置不足 16 个，仍会重试 16 次，后面按照最大的时间间隔来重试。
- 死信机制：如果正常消费和重试 16 次均失败，消息会保存到死信 Topic 的%DLQ%消费者组中，此时需人工介入处理。

（2）消息过滤
消费者可以通过订阅指定消息头（Header）对消息进行过滤，确保最终只接收被过滤后的消息合集。

【例】订阅主题 testA 中 TAG 为 test 的消息

    if ("test".equals(headers.get("ROCKET_TAGS"))) {
        System.out.println("收到消息: " + payload + ", 头信息: " + headers);
    }

（3）消费模式
RocketMQ 的消费者有两种消费模式：BROADCASTING 广播模式，CLUSTERING 集群模式，默认集群消费模式。

①集群模式
如果这个消费者组都是集群模式，那么这个消费者组会去平分这个 topic 下面的消息，且一条消息只能被一个消费者消费。如：生产者给 testA 发送了 10 条消息，消费 testA 的这个消费者组有 2 个消费者，那么这两个消费者就会平分这 10 条消息，每个消费者 5 条消息。但是经测试有时也会一个消费者 6 条，另一个消费者 4 条。这根消费速度、消费策略、消费者启动时间有关。

②广播模式
如果这个消费者组都是广播模式，那么这个消费者组中的每个消费者都会去执行这个 topic 下面所有的消息，相当于一条消息会被执行多次。如：生产者给 testA 发送了 10 条消息，消费 testA 的这个消费者组有 2 个消费者，那么这两个消费者都会去消费这 10 条消息。

【例】多消费者消费
先将 testB 创建 3 个分区，再使用三个消费者来消费。

①创建三个消费者通道函数：

    @Bean
    public Consumer<Message<String>> testMultipleInputOne() {
        return message -> {
            String payload = message.getPayload();
            Map<String, Object> headers = message.getHeaders();
            System.out.println("消费者 1 收到消息: " + payload + ", 队列编号: " + headers.get("ROCKET_MQ_QUEUE_ID"));
        };
    }

    @Bean
    public Consumer<Message<String>> testMultipleInputTwo() {
        return message -> {
            String payload = message.getPayload();
            Map<String, Object> headers = message.getHeaders();
            System.out.println("消费者 2 收到消息: " + payload + ", 队列编号: " + headers.get("ROCKET_MQ_QUEUE_ID"));
        };
    }

    @Bean
    public Consumer<Message<String>> testMultipleInputThree() {
        return message -> {
            String payload = message.getPayload();
            Map<String, Object> headers = message.getHeaders();
            System.out.println("消费者 3 收到消息: " + payload + ", 队列编号: " + headers.get("ROCKET_MQ_QUEUE_ID"));
        };
    }

②多函数声明配置
多通道函数需要通 spring.cloud.function.definition 显式声明所有需绑定的函数名，用分号分隔：

    # 显式声明所有消费者函数
    spring:
      cloud:
        function:
          definition: testInput;testMultipleInputOne;testMultipleInputTwo;testMultipleInputThree

③多消费者配置策略
多个通道同一消费者组（集群模式）：
- 消息被组内消费者均分，实现负载均衡。
- 若消费者数 > 队列数，部分消费者将处于空闲状态。

    # 生产者
    testOutput-out-1:
      destination: testB
      group: test-producer-batch-group
    # 消费者
    testMultipleInputOne-in-0:
      destination: testB
      group: test-multiple-consumer-group
      consumer:
        max-attempts: 3
    testMultipleInputTwo-in-0:
      destination: testB
      group: test-multiple-consumer-group
      consumer:
        max-attempts: 3
    testMultipleInputThree-in-0:
      destination: testB
      group: test-multiple-consumer-group
      consumer:
        max-attempts: 3

若每个通道配置不同消费者组属于广播模式，每个消费组独立接收全量消息，实现业务隔离。

④发送消息

    @GetMapping("/batch")
    public Result batch() {
        int count = Math.abs(new Random().nextInt(10));
        for (int i = 0; i < count; i++) {
            Message<?> message = MessageBuilder.withPayload("测试批量消息" + i)
                    .setHeader("ROCKET_TAGS", "batch")
                    .build();
            streamBridge.send("testOutput-out-1", message);
        }
        return Result.success(String.format("批量发送 %d 条消息", count));
    }

⑤测试
发送多条消息，从控制台查看打印信息，从结果可以看出：同一个队列的数据只能被一个消息者消费。

3、并发消费与顺序消费

1）为什么需要顺序消费
顺序消费的核心价值在于保障特定业务场景中消息处理的严格时序性，防止因消息乱序引发的逻辑错误或数据不一致。例如订单生命周期（创建->支付->发货->完成）若乱序处理，可能导致支付未完成却已发货的异常状态。

2）消息的方式
在消费者客户端消费时，有两种订阅消息的方式，分别是并发消费和顺序消费：

（1）并发消费：因为 topic 分了多个区，允许同一消费者组内多个线程并行拉取不同队列的消息。按队列轮询分配，多个线程可同时处理不同队列的消息，同一主题的消息可能被多个线程无序处理。

（2）顺序消费：消费一个主题时，消费消息的顺序和消息发送的顺序一致。
如果一个 Topic 有多个队列，是不可能达成 Topic 级别的顺序消费的，因为无法控制哪个队列的消息被先消费。Topic 只有一个队列的情况下能够实现 Topic 级别的顺序消费。

3）顺序消息
（1）分区顺序性：通过将同一业务标识（如订单 ID）的消息路由至同一消息队列（MessageQueue），确保队列内消息顺序与发送顺序一致。顺序消费的大致原理是依靠两组锁，一组在 Broker 端（Broker 锁），锁定队列和消费者的关系，保证同一时间只有一个消费者在消费；在消费者端也有一组锁（消费队列锁）以保证消费的顺序性。
（2）全局顺序性：需限制 Topic 仅含一个队列，单线程生产与消费，适用于低吞吐量场景。

4）发送与订阅顺序消息
RocketMQ 通过将同一业务标识（如订单 ID）的消息路由至同一队列（Queue），并限制该队列仅由单线程消费，实现局部顺序性。

【例】顺序队列处理
① 生产者端：指定消息路由键
通过消息头 ORDERLY_KEY 控制消息进入同一队列，确保顺序性：

    @GetMapping("/order")
    public Result order() {
        for (int i = 0; i < 10; i++) {
            // 订单编号
            int orderId = i % 3;
            String msg = "测试顺序消息" + orderId + "_" + i;
            Message<?> message = MessageBuilder.withPayload(msg)
                    .setHeader("ORDERLY_KEY", orderId)
                    .setHeader("ROCKET_ORDER_ID", orderId)
                    .build();
            streamBridge.send("testOutput-out-1", message);
        }
        return Result.success("批量发送 10 条消息");
    }

② 自定义提取器
RocketMQ 顺序消息的实现，本质上是基于队列级的有序性，而非依赖生产者的同步发送模式。在 Spring Cloud Stream 框架中，这一机制通过 PartitionKeyExtractorStrategy 接口落地。开发者需实现该接口并重写 extractKey 方法，从消息体中提取业务分区键（如订单 ID），随后将自定义实现注册为 Spring Bean。框架以此确保具有相同键值的消息被路由至同一 MessageQueue，既保障了消费端的顺序处理，又通过分区策略实现了系统负载的有效均衡。

为实现顺序消息，我们通过自定义 PartitionKeyExtractorStrategy 接口，从消息中提取订单 ID 等业务键作为分区依据，使同一键值的消息始终落入相同队列。这保证了单队列内的顺序消费，并通过将业务键均匀分布在多个队列上，在确保顺序性的同时兼顾了系统负载均衡。

Spring Cloud Stream 结合 RocketMQ 时，默认的路由算法通常是 key.hashCode() % 总队列数。总队列数由 Topic 队列数决定，我们只要返回 key.hashCode() 即可：

    @Component
    public class OrderPartitionKeyExtractor implements PartitionKeyExtractorStrategy {
        @Override
        public Object extractKey(Message<?> message) {
            // 获取消息头中的 ORDERLY_KEY 作为分区键（同一个订单数据发到同一个分区）
            Object orderlyKey = message.getHeaders().get("ORDERLY_KEY");
            if (orderlyKey != null) {
                return orderlyKey.hashCode();
            }
            // 获取消息头中的 KEYS,作为分区键（同一个 KEY 会发到同一个分区）
            Object key = message.getHeaders().get("KEYS");
            if (key != null) {
                return key.hashCode();
            }
            // 最终兜底，使用消息 ID 作为分区键（所有消息会被分散到不同分区）
            Object messageId = message.getHeaders().getId();
            return messageId.hashCode();
        }
    }

③ 配置生产者队列选择策略
在 application.yml 中指定分区键提取器，实现队列路由逻辑：

    testOutput-out-1:
      destination: testB
      group: test-producer-batch-group
      producer:
        partition-key-extractor-name: orderPartitionKeyExtractor
        partition-count: 3 # 必须配置，且与 testB 队列数一致

④ 消费者端启用顺序消费

    testMultipleInputOne-in-0:
      destination: testB
      group: test-multiple-consumer-group
      consumer:
        max-attempts: 3
        orderly: true

    testMultipleInputTwo-in-0:
      destination: testB
      group: test-multiple-consumer-group
      consumer:
        max-attempts: 3
        orderly: true

    testMultipleInputThree-in-0:
      destination: testB
      group: test-multiple-consumer-group
      consumer:
        max-attempts: 3
        orderly: true

（补充说明：在配置好分区键提取器和队列数后，RocketMQ 会根据 ORDERLY_KEY 的哈希值将消息分配到指定的 MessageQueue，消费者端 orderly: true 会启用单线程消费队列，从而保证同一队列内的消息严格有序。至此，RocketMQ 并发消费与顺序消费的配置已完整实现。）

---

💡 **速记**

**【Spring Cloud Stream 核心概念】**
*   **Binder**：与外部消息中间件集成的组件（如 RocketMQ、Kafka）。
*   **Binding**：队列内部的配置（InputBinding / OutputBinding），连接 Binder 与应用程序。
*   **Input**：消费者（Consumer），从 Binder 接收消息。
*   **Output**：生产者（Producer），向 Binder 发送消息。
*   **依赖**：`spring-cloud-starter-stream-rocketmq`。

**【使用案例（核心配置与用法）】**
*   **通道命名规范**：输出 `[函数名]-out-[index]`，输入 `[函数名]-in-[index]`。
*   **发送消息**：
    *   基础发送：`streamBridge.send("testOutput-out-0", msg)`。
    *   带消息头：`MessageBuilder.withPayload(msg).setHeader("ROCKET_TAGS", "test").build()`。
    *   延迟消息：`setHeader("DELAY", 5)`，延迟等级 (1s 5s 10s 30s 1m...)。
*   **订阅消息**：使用 `Consumer<Message<T>>` 接口，`getPayload()` 获取业务数据，`getHeaders()` 获取元数据。
*   **重试-死信机制**：正常消费提交位点；失败进入 `%RETRY%` 重试最多 16 次；最终失败进入 `%DLQ%` 死信队列，需人工处理。
*   **消息过滤**：判断 `headers.get("ROCKET_TAGS")` 过滤消息。
*   **消费模式**：集群模式（均分消息，默认） vs 广播模式（每个消费者都收全量消息）。
*   **多消费者消费**：使用 `spring.cloud.function.definition` 声明多个函数，YAML 中配置多组 `bindings`（同一 group 为集群，不同 group 为广播）。

**【并发消费与顺序消费】**
*   **并发消费**：多线程并行拉取不同队列，无序处理。
*   **顺序消费**：消费顺序与发送顺序一致。
    *   **分区顺序性**：同一业务标识（如订单ID）路由至同一队列，依靠 Broker 锁 + 消费者队列锁实现单线程消费。
    *   **全局顺序性**：Topic 只设一个队列，单线程生产与消费，适用低吞吐量场景。
*   **顺序消息实现（核心步骤）**：
    1.  **生产者端**：发送消息时，设置 `ORDERLY_KEY` 消息头。
    2.  **自定义提取器**：实现 `PartitionKeyExtractorStrategy` 接口，重写 `extractKey` 方法，返回 `key.hashCode()`。注册为 Spring Bean。
    3.  **生产者配置**：YAML 中配置 `producer.partition-key-extractor-name` 和 `producer.partition-count`（必须与 Topic 队列数一致）。
    4.  **消费者配置**：YAML 中配置 `consumer.orderly: true`，启用顺序消费。
