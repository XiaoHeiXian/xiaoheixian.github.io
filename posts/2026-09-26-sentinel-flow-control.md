---
layout: article
title: "Sentinel 流量控制与熔断降级"
description: "- \"什么是服务雪崩：下游故障导致上游资源耗尽，逐级瘫痪\"   - \"根本原因：链式依赖、资源未释放、级联扩散\"   - \"解决方案：超时处理、线程隔离、熔断降级、流量控制\"   - \"Sentinel定义：阿里开源的轻量级流量控制、熔断降级、容错防护组件\"   - \"核心能力：流量控制、熔断降级、系统自适应保护、热点限流、统一兜底降级\"   - \"环境"
date: 2026-09-26
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "Sentinel"
permalink: /posts/2026-09-26-sentinel-flow-control.html
---

1、什么是服务雪崩

在微服务链式调用场景中，如果下游服务出现超时、宕机、响应缓慢，会导致上游服务大量请求阻塞、线程积压，最终耗尽服务器线程池、CPU、内存，导致上游服务瘫痪，进而逐级影响所有依赖服务，造成整个系统大面积不可用，这就是服务雪崩。例如，服务D故障可能导致依赖它的服务F、G线程阻塞而耗尽资源，进而影响服务A、B等，这种一个服务的不可用，从而导致整个服务不可用，形成雪崩效应。

1）雪崩传播链路

客户端请求 -> 订单服务 -> 用户服务（宕机/超时）导致订单服务线程全部阻塞，订单服务无法处理新请求导致关联服务全部瘫痪。

2）根本原因

微服务调用是链式依赖，下游故障无法隔离，故障会无限向上传导。

（1）服务提供者故障：如程序Bug、硬件故障或高并发导致服务崩溃。
（2）资源未释放：服务调用方因长时间等待响应而占用线程、连接等资源，导致自身资源耗尽。
（3）级联扩散：未及时处理的异常通过调用链路逐层放大，最终波及整个集群。

3）解决方案

（1）超时处理：设置接口请求的最大等待时间（如1秒），超时后释放资源并返回错误，避免无限制等待。这种方案高并发场景下仍可能因资源快速耗尽导致雪崩。
（2）线程隔离（舱壁模式）：为每个服务或接口分配独立线程池，限制资源使用上限，例如限定某接口最多使用10个线程。故障被隔离在特定资源池内，避免扩散到其他服务。
（3）熔断降级：通过断路器统计异常比例或慢调用比例，若超过阈值则熔断服务，后续请求直接返回预设的降级逻辑（如默认值或错误提示）。
（4）流量控制（限流）：限制接口的QPS（每秒请求量），预防突发流量压垮服务，例如通过Sentinel配置单机阈值。适用于秒杀、高并发API等流量突增场景。

2、Sentinel

Sentinel 是阿里开源的轻量级流量控制、熔断降级、容错防护组件，专注于保障微服务稳定性，核心能力：
（1）流量控制：限制 QPS、限制并发数，防止突发流量打垮服务
（2）熔断降级：下游异常时快速熔断，避免持续阻塞、避免雪崩
（3）系统自适应保护：防止服务器负载过高宕机
（4）热点限流、权限控制：精准控制异常请求
（5）统一兜底降级：异常时返回友好兜底结果，提升用户体验

3、环境搭建

1）安装

（1）Docker 部署

    # 容器内存限制 512M + JVM 堆内存固定 512M，防止内存溢出、波动
    docker run --name sentinel -p 8858:8858 --memory=512m -d bladex/sentinel-dashboard -Xms512m -Xmx512m -Xmn256m

注意：如果部署时出现报错：Get https://registry-1.docker.io/v2/: context deadline exceeded，Docker 默认境外镜像仓库国内访问超时、无法拉取镜像。配置国内镜像加速器：

    vi /etc/docker/daemon.json

在[]的最前面添加以下两个镜像：

    "registry-mirrors": [
        "https://hub-mirror.c.163.com",
        "https://cr.console.aliyun.com",
        ...... (原镜像不变)
    ]

重启 Docker 生效

    systemctl daemon-reload
    systemctl restart docker

（2）打开 Sentinel 控制台主页

在浏览器输入地址：http://ip地址:8858，（默认用户名和密码为 sentinel）出现页面：Sentinel 控制台 1.8.8

2）整合

（1）在父工程 mall-services 添加 Sentinel 依赖

    <dependency>
        <groupId>com.alibaba.cloud</groupId>
        <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
    </dependency>

（2）配置

在 nacos 的 dev 环境配置默认组 sentinel.yml：

    spring:
      cloud:
        sentinel:
          transport:
            dashboard: 192.168.100.101:8858
            eager: true #默认为懒加载，设置启动时加载
            web-context-unify: false #关闭统一上下文，默认为 true

在每个需要 Sentinel 的服务导入 sentinel.yml：

    - nacos:sentinel.yml

注意：为了测试方便，克隆 sentinel.yml 到 public 组（mall-test-service 专用）
在控制台发现了添加 Sentinel 配置的微服务：mall-product-service (1/1)、mall-test-service (1/1)、mall-user-service (1/1)。

4、簇点链路

1）簇点链路

簇点链路是 Sentinel 在微服务架构中用于监控和防护的调用链模型。当请求进入微服务时，其调用路径（如 DispatcherServlet -> Controller -> Service -> Mapper）形成一条链路，链表中每个被监控的接口或方法即视为一个资源。

2）簇点链路的组成

（1）资源

默认监控 Spring MVC 的每个端点（Endpoint），如 OrderController 中的接口 /order/{orderId}，均被识别为独立资源。

可以在方法上使用注解 @SentinelResource 来标注资源，这样同一个资源有相同的标识。

（2）动态链路

服务间调用依赖关系构成链式结构，Sentinel 通过簇点链路实时追踪资源状态。

【技巧】Sentinel 会自动探测链路，如果没有生成动态链路，只要访问一次资源就能动态生成。

如：mall-test-service 服务的簇点链路
①先在接口测试中访问获取用户地址
②簇点链路自动探测

在控制台 mall-test-service 的簇点链路中，资源名为 `/feign/listAddressByUserId/{userId}`。

---

💡 **速记**

**【什么是服务雪崩？】**
微服务链式调用中，下游服务故障（超时、宕机）导致上游服务大量请求阻塞、线程积压，耗尽资源，进而逐级瘫痪，造成整个系统不可用。

**【雪崩根本原因】**
1. 服务提供者故障（Bug、硬件、高并发）
2. 资源未释放（调用方长时间等待占用线程、连接）
3. 级联扩散（异常通过调用链逐层放大）

**【四大解决方案】**
1. **超时处理**：设置最大等待时间，超时释放资源（高并发下仍可能雪崩）。
2. **线程隔离**：为每个服务或接口分配独立线程池，限制资源上限（舱壁模式）。
3. **熔断降级**：统计异常/慢调用比例，超阈值则熔断，后续请求走降级逻辑。
4. **流量控制**：限制 QPS，预防突发流量压垮服务（秒杀等场景）。

**【Sentinel 核心能力】**
流量控制、熔断降级、系统自适应保护、热点限流/权限控制、统一兜底降级。

**【Sentinel 环境搭建与整合】**
1. **Docker 部署控制台**：`docker run --name sentinel -p 8858:8858 --memory=512m -d bladex/sentinel-dashboard -Xms512m -Xmx512m -Xmn256m`。
2. **依赖**：`spring-cloud-starter-alibaba-sentinel`。
3. **配置**：在 Nacos 中配置 `sentinel.yml`，指定 `transport.dashboard` (控制台地址)，`eager: true` (启动时加载)，`web-context-unify: false` (关闭统一上下文)。
4. **导入**：服务模块引入 `- nacos:sentinel.yml`。

**【簇点链路】**
*   **定义**：请求进入微服务的调用路径（DispatcherServlet -> Controller -> Service -> Mapper），每个被监控的接口视为一个资源。
*   **资源标记**：默认监控 Spring MVC 端点，可使用 `@SentinelResource` 自定义资源标识。
*   **动态链路**：服务间依赖构成链式结构，Sentinel 自动探测，访问一次资源即可生成动态链路。
