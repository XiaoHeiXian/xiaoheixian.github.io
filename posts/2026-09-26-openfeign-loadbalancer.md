---
layout: article
title: "OpenFeign 负载均衡"
description: "- \"定义：将负载（工作任务、访问请求）分摊到多个操作单元执行\"   - \"服务端负载均衡：发生在服务提供者一方（如 Nginx）\"   - \"客户端负载均衡：发生在服务请求方（如 OpenFeign）\"   - \"OpenFeign 依赖 Spring Cloud LoadBalancer 完成负载均衡\"   - \"策略1：轮询 (RoundRobin"
date: 2026-09-26
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "OpenFeign"
  - "负载均衡"
permalink: /posts/2026-09-26-openfeign-loadbalancer.html
---

1、什么是负载均衡

负载均衡就是将负载（工作任务，访问请求）分摊到多个操作单元（服务器集群）上进行执行。根据负载均衡发生位置的不同，一般分为服务端负载均衡和客户端负载均衡。

服务端负载均衡指的是发生在服务提供者一方，比如常见的 nginx 负载均衡。而客户端负载均衡指的是发生在服务请求的一方，也就是在发送请求之前已经选好了由哪个实例处理请求。

架构示意图说明：
- 服务端负载均衡：订单服务发送请求 -> 负载均衡 -> 商品服务（在服务提供者一侧实现负载均衡）。
- 客户端负载均衡：订单服务 -> 负载均衡（在请求方实现选择） -> 发送请求 -> 商品服务。

在微服务调用关系中一般会选择客户端负载均衡，也就是在服务调用的一方来决定服务由哪个提供者执行。

OpenFeign 负载均衡是客户端侧实现的请求分发机制，在服务集群中通过动态选择服务实例提升微服务调用的可用性与性能。负载均衡通过动态选择目标服务实例，实现流量合理分配，从而提升微服务调用的高可用性、可扩展性与性能。其本质是客户端在发起远程调用前，基于服务发现和预定义策略，从多个服务实例中选择最优节点进行请求转发。

2、OpenFeign 负载均衡策略

OpenFeign 自身不直接实现负载均衡，而是依赖 Spring Cloud LoadBalancer 完成实例选择与请求分发，通过与注册中心（如 Nacos、Eureka）结合，动态获取服务实例列表并基于策略筛选目标实例。

Nacos 2022 版后默认集成 LoadBalancer，原生支持服务发现+负载均衡一体化，简化配置流程。LoadBalancer 内置策略包含：
- 轮询（RoundRobin）：默认策略，按顺序依次分配请求到各实例；
- 随机（Random）：随机选择可用实例，避免单一节点压力过大；
- 区域优先（Zone-Preference）：优先调用同一区域的实例，降低网络延迟；
- 权重分配（Nacos）：基于 Nacos 配置的服务实例权重值分配请求比例。

1）默认策略

以集群的方式启动 2 个 mall-user-service 服务（服务 1，服务 2）
测试 localhost:9000/api/test/feign/listAddressByUserId/116

第一次提交：
查看服务 1 控制台（有日志打印），查看服务 2 控制台（没有打印任何日志）。

第二次提交：
查看服务 1 控制台（没有打印任何日志），查看服务 2 控制台（有日志打印）。

这样提交多次，会发现，请求按顺序依次分配到服务 1 和服务 2。

2）权重分配策略

（1）声明权重

在服务实例的配置文件中声明权重值（范围：0-100），权重越高被选中的概率越大。

将服务 1 权重配置为 80：

    ---
    spring:
      cloud:
        nacos:
          discovery:
            metadata:
              weight: 80

编辑复制服务的参数，将服务 2 权重配置为 20：

    --spring.cloud.nacos.discovery.metadata.weight=20

（2）在客户端开启权重分配策略

在 mall-test-service 服务开启权重分配策略：

    ---
    spring:
      cloud:
        loadbalancer:
          configurations: weighted
        nacos:
          enabled: true

（3）测试

刷新 10 次：localhost:9000/api/test/feign/listAddressByUserId/116，查看服务 1 和服务 2 的控制台，发现服务 1 分配请求数（7-8次）高于服务 2。

3）随机策略

只需要在客户端开启随机策略即可：

    loadbalancer:
      type: random

刷新 7 次：localhost:9000/api/test/feign/listAddressByUserId/116，查看服务 1 和服务 2 的控制台，发现服务 1、服务 2 分配请求数是随机的。

4）区域优先策略

（1）将服务 1 配置为 beijing-a 区域：

    ---
    spring:
      cloud:
        nacos:
          discovery:
            metadata:
              # 实例元数据标记区域
              zone: beijing-a

（2）配置客户端为 beijing-a 区域（与服务器同一区域），配置区域优先策略：

    ---
    spring:
      cloud:
        nacos:
          discovery:
            metadata:
              zone: beijing-a # 当前服务所在机房
        loadbalancer:
          # 开启内置区域优先策略
          configurations: zone-preference
          # 指定本地 zone
          zone: beijing-a
          nacos:
            enabled: true

（3）测试

刷新多次：localhost:9000/api/test/feign/listAddressByUserId/116，查看服务 1 和服务 2。

---

💡 **速记**

**【什么是负载均衡？】**
将工作任务、访问请求分摊到多个服务器集群上执行。

**【两种负载均衡类型】**
*   **服务端负载均衡**：在服务提供者一方实现（如 Nginx）。
*   **客户端负载均衡**：在服务请求方实现（如 OpenFeign），在发送请求前选好目标实例。

**【OpenFeign 负载均衡依赖】**
依赖 **Spring Cloud LoadBalancer**。Nacos 2022 版后默认集成，原生支持服务发现+负载均衡一体化。

**【四大策略与配置核心】**
1. **轮询（RoundRobin）**：默认策略，按顺序依次分配。
2. **随机（Random）**：随机选择可用实例。配置 `loadbalancer.type: random`。
3. **区域优先（Zone-Preference）**：优先调用同一区域的实例，降低网络延迟。
   * 服务端配置：`metadata.zone: beijing-a`。
   * 客户端配置：`loadbalancer.configurations: zone-preference` 和 `loadbalancer.zone: beijing-a`。
4. **权重分配（Nacos）**：基于权重值分配比例。
   * 服务端配置：`metadata.weight: 80`（权重0-100，越高越容易被选中）。
   * 客户端配置：`loadbalancer.configurations: weighted`。
