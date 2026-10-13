---
layout: article
title: "限流与降级机制"
description: "- \"网关限流：Spring Cloud Gateway 采用令牌桶算法，基于 Redis 实现分布式限流。\"   - \"限流维度：支持按 IP、按用户、按活动、按 URI 等维度设置不同令牌桶。\"   - \"服务限流：使用 Sentinel 限制或调度请求流量，防止系统因突发流量过载。\"   - \"高并发案例：秒杀系统多层限流架构（流量漏斗模型），拦截"
date: 2026-10-14
category: "云商城"
tags:
  - "限流"
  - "降级"
  - "秒杀"
  - "Sentinel"
  - "Gateway"
permalink: /posts/2026-10-14-rate-limiting-and-degradation.html
---

## 1、网关限流

网关除了请求路由、身份验证，还有一个非常重要的作用：请求限流。当系统面对高并发请求时，为了减少对业务处理服务的压力，需要在网关中对请求限流，按照一定的速率放行请求。

常见的限流算法包括：

- 计数器算法
- 漏桶算法
- 令牌桶算法

SpringGateway 中采用的是令牌桶算法，令牌桶算法原理：

- 准备一个令牌桶，有固定容量，一般为服务并发上限
- 按照固定速率，生成令牌并存入令牌桶，如果桶中令牌数达到上限，就丢弃令牌。
- 每次请求调用需要先获取令牌，只有拿到令牌，才继续执行，否则选择等待或者直接拒绝。

![架构示意图](https://xiaoheixian.github.io/posts/assets/360_65.png)

### 1）网关限流实现

（1）引入依赖

SpringCloudGateway 是采用令牌桶算法，其令牌相关信息记录在 redis 中，因此我们需要引入 Redis 相关依赖。（在之前项目中已经引入）

（2）配置过滤条件 key

Gateway 会在 Redis 中记录令牌相关信息，我们可以自己定义令牌桶的规则，例如：

- 给不同的请求 URI 路径设置不同令牌桶
- 给不同的登录用户设置不同令牌桶
- 给不同的请求 IP 地址设置不同令牌桶

Redis 中的一个 Key 和 Value 对就是一个令牌桶。因此 Key 的生成规则就是桶的定义规则。SpringCloudGateway 中 key 的生成规则定义在 KeyResolver 接口中：

    public interface KeyResolver {
        Mono<String> resolve(ServerWebExchange exchange);
    }

这个接口中的方法返回值就是给令牌桶生成的 key。API 说明：

- Mono：是一个单元素容器，用来存放令牌桶的 key
- ServerWebExchange：上下文对象，可以理解为 ServletContext，可以从中获取 request、response、cookie 等信息

比如上面的三种令牌桶规则，生成 key 的方式如下：

- 给不同的请求 URI 路径设置不同令牌桶，示例代码：

    return Mono.just(exchange.getRequest().getURI().getPath());// 获取请求 URI

- 给不同的登录用户设置不同令牌桶

    return exchange.getPrincipal().map(Principal::getName);// 获取用户

- 给不同的请求 IP 地址设置不同令牌桶

    return Mono.just(exchange.getRequest().getRemoteAddress().getHostName());// 获取请求者 IP

以限制 IP 为例进行限流，在 filter 包下创建令牌桶规则：

    @Configuration
    public class IpLimitKeyResolver {
        @Bean
        @Primary
        public KeyResolver ipKeyResolver() {
            return exchange -> {
                ServerHttpRequest request = exchange.getRequest();
                InetSocketAddress remoteAddress = request.getRemoteAddress();
                String ip = remoteAddress.getHostString();
                return Mono.just(ip);
            };
        }
    }

（3）配置桶参数：

配置一个过滤器：RequestRateLimiter，并设置了三个参数：

- key-resolver: "#{@bean的名称}" 是 SpEL 表达式，如 ipLimitKeyResolver 就是我们定义的 Bean 名称
- redis-rate-limiter.replenishRate：每秒钟生成令牌的速率
- redis-rate-limiter.burstCapacity：令牌桶的容量（可接收的流量）

在秒杀服务的路由配置：

    filters:
      - StripPrefix=2
      - name: RequestRateLimiter # 限流过滤器
        args:
          key-resolver: "#{@ipLimitKeyResolver}" # 限流维度（按 IP）
          redis-rate-limiter.replenishRate: 2 # 令牌生成速率，每秒生成 2 个令牌 2QPS
          redis-rate-limiter.burstCapacity: 5 # 令牌桶容量（突发流量）

（4）网关限流的测试

修改测试计划（库存扣减）线程组：

线程数调整为 100，把持续时长调整为 10 秒。

HTTP 请求地址：http://localhost:9000/api/seckill/product/decreaseStock

测试结果：

    Label      # Samples  Average  Min  Max  Std.Dev  Error %  Throughput
    HTTP Reque... 100      4        3    15   3.02     75.00%   10.1/sec
    总体        100      4        3    15   3.02     75.00%   10.1/sec

结果分析：

    秒数：第 1 秒
    请求数：10
    通过数：5（另一行显示2） 限流数：3
    累计通过：7
    累计限流：3

    秒数：第 2 秒
    请求数：10
    通过数：2  限流数：8
    累计通过：9
    累计限流：11

    秒数：第 3 秒
    请求数：10
    通过数：2  限流数：8
    累计通过：11
    累计限流：19

    ...（后续每秒通过 2 个，拒绝 8 个）

控制台数据：

    第 1 秒：请求 10QPS 突发到达 -> 桶内有 5 个令牌 -> 全部通过（桶从 5->0） -> 每秒生成（补充）2 个（桶内=2） -> 通过 2 个（这时可能跨秒，下一秒通过 1 个或 2 个，桶从 2->0） -> 桶内令牌耗尽 -> 拒绝后续请求通过（等待下一秒补充）

    第 2 秒：请求 10QPS 到达 -> 桶内 0 令牌 -> 拒绝通过 -> 每秒生成 2 个（桶内=2） -> 通过 2 个（桶内 2->0）

    第 3 秒：请求 10QPS 到达 -> 桶内 0 令牌 -> 拒绝通过 -> 每秒生成 2 个（桶内=2） -> 通过 2 个（桶内 2->0）

    ......

### 2）其它限流规则

（1）活动级别限流（整个秒杀活动）

    @Configuration
    public class ActivityLimitKeyResolver {
        @Bean
        public KeyResolver activityKeyResolver() {
            return exchange -> {
                // 从请求参数中获取活动 ID
                String activityId = exchange.getRequest().getQueryParams()
                    .getFirst("activityId");
                return Mono.just("seckill:activity:" + activityId);
            };
        }
    }

（2）用户级别限流（每个用户）

    @Configuration
    public class UserLimitKeyResolver {
        @Autowired
        private JwtUtil jwtUtil;

        @Bean
        public KeyResolver userKeyResolver() {
            return exchange -> {
                // 从 Token 中解析用户 ID
                String token = exchange.getRequest().getHeaders()
                    .getFirst("Authorization");
                Claims claims = jwtUtil.parseToken(token);
                return Mono.just("seckill:user:" + claims.getSubject());
            };
        }
    }

（3）限流配置

    filters:
      - StripPrefix=2
      # 1. 活动级别限流（整个秒杀活动）
      - name: RequestRateLimiter
        args:
          key-resolver: "#{@activityKeyResolver}"
          redis-rate-limiter.replenishRate: 2000
          redis-rate-limiter.burstCapacity: 5000
      # 2. 用户级别限流（每个用户）
      #- name: RequestRateLimiter
      #  args:
      #    key-resolver: "#{@userKeyResolver}"
      #    redis-rate-limiter.replenishRate: 5
      #    redis-rate-limiter.burstCapacity: 10
      # 3. IP 级别限流（防止单 IP 刷接口）
      #- name: RequestRateLimiter
      #  args:
      #    key-resolver: "#{@ipLimitKeyResolver}"
      #    redis-rate-limiter.replenishRate: 10
      #    redis-rate-limiter.burstCapacity: 20

## 2、服务限流

使用 Sentinel 限制或调度请求流量，防止系统因突发流量过载而崩溃，根据系统负载动态调整服务能力。

实现（略）

## 3、高并发场景案例

秒杀系统的限流是高并发场景下的核心保障，但在生产环境下，需要多层防护来应对瞬间流量洪峰。

【场景】

正常流量： 100 QPS

秒杀瞬间： 10,000 QPS （100 倍流量突增）

持续时间： 1-3 秒

【问题】

系统在 1 秒内收到平时 100 倍的请求，瞬间压垮所有服务

【解决方案】

搭建多层限流架构（流量漏斗模型）

流量漏斗模型是一套四层阶梯式流量漏斗限流架构，从客户端 10000 QPS 的海量请求层层拦截、削峰，最终仅 100 QPS 流量抵达数据库完成成交，整体拦截率 99%，用于秒杀、抢购等高并发场景保护后端数据库。

整体逻辑：流量自上而下逐层过滤，每一层都有独立限流规则，上层先过滤掉大部分无效流量，减轻下层服务压力，形成漏斗式逐级缩流。

原始流量：10000 QPS -> 四层层层拦截 -> 最终成交 100 QPS

架构图如下所示：

![架构示意图](https://xiaoheixian.github.io/posts/assets/361_65.png)
![架构示意图](https://xiaoheixian.github.io/posts/assets/362_65.png)
![架构示意图](https://xiaoheixian.github.io/posts/assets/363_65.png)

    客户端请求 10,000 QPS
    |
    v
    第一层：接入层限流（Nginx + Lua）
      单IP限流: 10 req/s
      全局限流: 5,000 req/s
      拦截比例: 50%
      放行流量 -> 5,000 QPS
    |
    v
    第二层：网关层限流（Spring Cloud Gateway）
      活动级别限流: 2,000 req/s
      用户级别限流: 5 req/s
      拦截比例: 60%
      放行流量 -> 2,000 QPS
    |
    v
    第三层：业务层限流（Sentinel）
      接口限流: 1,000 req/s
      熔断降级: 超时降级
      拦截比例: 50%
      放行流量 -> 1,000 QPS
    |
    v
    第四层：分布式锁 + 库存扣减（Redis + Lua）
      Redis分布式锁: 100 TPS
      库存扣减: Lua原子脚本
      拦截比例: 90%
      最终成交 -> 100 QPS

### 第一层：接入层限流（Nginx + Lua）

部署位置：最前端反向代理，用户请求第一道关卡

限流规则：

单 IP 限流：单个 IP 每秒最多放行 10 个请求，限制单个用户疯狂刷接口

全局总限流：整个接入层最多放行 5000 req/s

拦截比例：原始 10000 QPS，拦截 50%，放行 5000 QPS

核心作用：

在流量到达业务网关前，直接在网络层拦截恶意刷量、爬虫、高频 IP，消耗极低，避免无效流量占用后端网关、服务器资源。

### 第二层：网关层限流（Spring Cloud Gateway）

部署位置：微服务统一网关，承接 Nginx 放行的 5000 QPS 流量

限流规则：

活动级别限流：当前抢购活动整体上限 2000 req/s

用户级别限流：单个用户账号每秒最多 5 次请求，防止同一账号重复抢购

拦截比例：流入 5000 QPS，拦截 60%，放行 2000 QPS

核心作用：

基于业务维度做精细化限流，区分用户、区分活动，过滤掉活动上限外的流量，同时做鉴权、路由，只把合法活动流量转发到后端业务服务。

### 第三层：业务层限流（Sentinel 阿里流量防护组件）

部署位置：后端微服务业务代码层，承接网关放行 2000 QPS

限流 & 防护规则：

接口粒度限流：当前抢购接口上限 1000 req/s

熔断降级：接口调用超时、异常时自动触发降级，直接返回兜底结果，防止故障级联扩散

拦截比例：流入 2000 QPS，拦截 50%，放行 1000 QPS

核心作用：

服务内部最后一道流量防护，聚焦单个业务接口，同时兼具熔断、降级、热点参数限流能力，避免单个接口压垮整个微服务集群。

### 第四层：分布式锁 + 库存扣减（Redis + Lua 原子脚本）

部署位置：库存扣减核心逻辑层，承接业务层放行 1000 QPS

流量控制规则：

Redis 分布式锁：控制库存操作并发，同一商品同一时间只允许少量请求扣库存

Lua 原子脚本：库存查询、扣减合并为单段 Lua 脚本，保证原子性，防止超卖

最终数据库上限：仅放行 100 QPS 到达数据库，最终成交 100 QPS

核心作用：

保护数据库（数据库是整个系统性能最弱节点），通过 Redis 预扣库存、分布式锁做最终流量收口，把大量库存扣减操作拦截在 Redis 缓存层，只有确认库存充足的少量请求才落地 MySQL，彻底避免数据库被打崩、商品超卖问题。

### 【架构设计优势】

- 分层削峰，压力逐层分摊：越上层流量越大、拦截越多，下层服务压力逐级递减；
- 限流粒度由粗到细：Nginx 按 IP / 全局粗粒度 -> 网关按活动 / 用户中粒度 -> Sentinel 按接口细粒度 -> Redis 库存业务精准控流；
- 技术选型各司其职：
    - Nginx：网络层高性能限流，抗爬虫
    - Spring Cloud Gateway：微服务网关，业务维度限流路由
    - Sentinel：业务服务熔断、接口限流、故障自愈
    - Redis+Lua：库存原子操作、分布式锁，保护数据库
- 极致保护数据库：原始 1 万 QPS 流量经过四层漏斗过滤，仅 1% 流量落地数据库，从根源杜绝高并发下数据库崩溃、超卖等线上故障。

### 【总结】

第一层是 Nginx 接入层，做 IP、连接数粗粒度限流，拦截爬虫恶意请求；

第二层在 API 网关层，基于 Redis 令牌桶做分布式限流，按接口、用户做全局限流；

第三层在微服务内部使用 Sentinel，做细粒度限流，同时实现熔断、舱壁隔离、降级，作为兜底，防止流量绕过网关把服务打垮。

前面三层解决的是请求放行问题，但是放行之后，多实例并发争抢同一个业务资源还会出现超卖、重复下单问题，所以第四层使用 Redisson 分布式锁，做业务资源互斥控制。限流控制进来多少请求，分布式锁控制同一个资源同时只能有一个请求操作，两者配合使用。

## 流程图文字推演

### 令牌桶算法执行流程

令牌工厂按固定速率生成令牌 --> 令牌存入固定容量的令牌桶（满则丢弃） --> 用户请求尝试获取令牌 --> 判断是否持有令牌

持有令牌：放行，进入微服务

未持有令牌：拒绝服务或等待

### 多层限流漏斗模型流程

客户端请求 10,000 QPS --> 第一层接入层限流（Nginx + Lua，拦截 50%，放行 5,000 QPS） --> 第二层网关层限流（Spring Cloud Gateway，拦截 60%，放行 2,000 QPS） --> 第三层业务层限流（Sentinel，拦截 50%，放行 1,000 QPS） --> 第四层分布式锁 + 库存扣减（Redis + Lua，最终 100 QPS 到达数据库） --> 真实成交 100 QPS

## 💡 **速记**

【核心考点】

限流算法：计数器、漏桶、令牌桶。Spring Cloud Gateway 采用令牌桶算法，基于 Redis 实现分布式限流。

网关限流配置核心参数：key-resolver（限流维度）、redis-rate-limiter.replenishRate（令牌生成速率）、redis-rate-limiter.burstCapacity（令牌桶容量）。

高并发秒杀场景采用四层流量漏斗模型：Nginx 接入层、Gateway 网关层、Sentinel 业务层、Redis 分布式锁 + Lua 库存扣减层。整体拦截率 99%，最终仅 100 QPS 落地数据库。

【高频逻辑链】

网关限流：请求到达 --> KeyResolver 生成 Key --> Redis 令牌桶校验 --> 有令牌放行，无令牌拒绝。

多层限流：Nginx 抗爬虫/粗粒度限流 --> Gateway 按活动/用户维度限流 --> Sentinel 按接口细粒度限流/熔断 --> Redis 分布式锁库存扣减。层层过滤，保护数据库。

【关键避坑】

网关限流需自定义 KeyResolver（如按 IP、用户、活动），否则默认所有请求共用一个令牌桶，无法实现精细化限流。

令牌桶的 replenishRate 和 burstCapacity 需根据实际业务流量合理设置，burstCapacity 过小会导致突发流量被大量拒绝，过大则起不到削峰作用。

多层限流架构中，分布式锁（如 Redisson）与限流需配合使用。限流控制“进来多少”，分布式锁控制“同一资源同时只能被一个请求操作”。
