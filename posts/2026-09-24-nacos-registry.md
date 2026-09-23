---
layout: article
title: "Nacos 注册中心"
description: "- \"定位：微服务架构中高效可靠的注册中心解决方案\"   - \"服务注册：客户端发送请求(服务名/IP/端口/元数据)，服务端写入注册表并同步集群\"   - \"服务发现：客户端订阅，服务端返回健康实例，动态推送变更(长轮询/UDP)\"   - \"健康检查：客户端心跳(5秒间隔，15秒超时，30秒剔除) + 服务端主动探测\"   - \"使用实战：引入dis"
date: 2026-09-24
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "Nacos"
permalink: /posts/2026-09-24-nacos-registry.html
---

Nacos 通过轻量级设计、灵活的一致性模型和实时推送机制，成为微服务架构中高效可靠的注册中心解决方案。Nacos 作为注册中心的核心原理围绕服务注册与发现、健康监测和动态一致性展开。

1、服务注册

（1）客户端流程：服务实例（如商品微服务）启动时，向 Nacos Server 发送注册请求，携带服务名（serviceName）、实例 IP、端口、元数据等信息。

（2）服务端处理：Nacos Server 接收请求后，将实例信息写入注册表（内存存储），并同步到其他节点（集群模式），保证数据一致性。

架构示意图说明：
- 订单服务与商品服务的多个实例，统一向 Nacos 注册中心进行服务注册。
- 注册中心提供不停机配置更新与消息推送变更的能力。

2、服务发现

（1）客户端订阅：消费者通过 Nacos Client 订阅目标服务（如 subscribe("mall-product-service")），Nacos Server 返回当前健康的实例列表。如果订单服务需要调用商品服务的某个接口功能，只要到注册中心去找一台健康的商品服务服务器去调用即可。

（2）动态推送：当服务实例状态变化（如上线/下线），Nacos Server 主动推送最新列表给订阅的客户端（基于长轮询或 UDP 推送）。

注册中心的两个核心功能就是服务注册和服务发现。

3、健康检查机制

（1）客户端心跳：注册的服务实例定期向 Nacos Server 发送心跳包（默认间隔 5 秒），超时未收到心跳（默认 15 秒）标记为不健康，30 秒后剔除实例。

（2）服务端主动探测：Nacos Server 可主动发起健康检查（如 HTTP 请求到实例的 /health 端点），确保实例真实可用性。

4、Nacos 注册中心的使用

（1）添加依赖

在父项目 mall-services 项目中添加以下依赖：

    <!-- 注册中心 -->
    <dependency>
        <groupId>com.alibaba.cloud</groupId>
        <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
    </dependency>

（2）配置注册中心

以 mall-product-service 为例：

在 application.yml 中配置：

    spring:
      # 注册中心服务器地址
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848

（3）启动项目

（4）查看注册结果

在注册的服务列表中，发现了商品服务的信息。出现列表信息，服务注册成功。

5、集群注册

下面我们启动两个 mall-product-service，查看注册服务表信息。

（1）集群启动

在 IDEA 中复制配置（Copy Configuration...），配置服务端口号：

    --server.port=8091

按此方法可以将一个应用启动多个实例，从而构建一个集群。启动新应用 ProductServiceApplication(1)（右击服务名-Run）。

（2）到注册中心查看服务列表

| 服务名 | 分组名称 | 集群数目 | 实例数 | 健康实例数 | 触发保护阈值 | 操作 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| mall-product-service | DEFAULT_GROUP | 1 | 2 | 2 | false | 详情 / 示例代码 / 订阅者 / 删除 |

点击详情：

| IP | 端口 | 临时实例 | 权重 | 健康状态 | 元数据 | 操作 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 192.168.100.1 | 9001 | true | 1 | true | preserved.register.source=SPRING_CLOUD | 编辑 / 下线 |
| 192.168.100.1 | 8091 | true | 1 | true | preserved.register.source=SPRING_CLOUD | 编辑 / 下线 |

---

💡 **速记**

**【Nacos 注册中心核心原理】**
服务注册 + 服务发现 + 健康监测 + 动态一致性。

**【服务注册流程】**
客户端启动时发送注册请求（服务名/IP/端口/元数据） -> 服务端写入内存注册表 -> 同步至集群其他节点。

**【服务发现流程】**
消费者订阅目标服务 -> 服务端返回健康实例列表 -> 实例状态变化时（上线/下线）主动推送变更（长轮询/UDP）。

**【健康检查机制（高频参数考点）】**
*   **客户端心跳**：默认间隔 5 秒发送，15 秒未收到标记不健康，30 秒后剔除实例。
*   **服务端主动探测**：主动发起 HTTP 请求到 /health 端点。

**【快速接入三步走】**
1.  **加依赖**：引入 `spring-cloud-starter-alibaba-nacos-discovery`。
2.  **加配置**：`application.yml` 中配置 `spring.cloud.nacos.server-addr`。
3.  **看结果**：启动项目，在 Nacos 控制台服务列表中查看。

**【集群测试流程】**
IDEA 中 Copy Configuration -> 修改 `--server.port=新端口` -> 启动新实例 -> 在 Nacos 控制台“服务列表”中查看实例数、健康实例数及详情。
