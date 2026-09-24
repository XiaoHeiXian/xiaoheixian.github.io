---
layout: article
title: "Gateway 网关"
description: "- \"定位：微服务架构的“守门神”，所有请求的统一入口\"   - \"功能1：请求路由（根据URL/请求头转发，解耦客户端与微服务）\"   - \"功能2：权限控制（统一鉴权，拦截未授权请求）\"   - \"功能3：流量控制（限流，保护后端服务免受压垮）\"   - \"技术选型：Spring Cloud Gateway（响应式编程，性能优于Zuul）\"   -"
date: 2026-09-24
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "网关"
permalink: /posts/2026-09-24-spring-cloud-gateway.html
---

1、为什么要使用网关

在微服务架构中，Gateway（网关）作为系统的“守门神”，是所有请求的统一入口。它的核心价值主要体现在三个方面：

（1）请求路由：网关根据预设规则（如 URL 路径、请求头等），将请求精准转发到后端的对应微服务。客户端只需知道网关地址，无需了解后端服务的具体部署细节。内置客户端负载均衡能力，结合 LoadBalancer 组件，自动将请求均匀分配至多个服务实例，提升系统吞吐量和可靠性。

例如：你有用户服务（端口 9002）、订单服务（端口 9004）、商品服务（端口 9001）三个微服务，客户端（如前端页面）原本需要记住每个服务的地址。

没有网关时：

    前端请求用户信息 -> http://192.168.100.101:9002/user/userInfo/116
    前端请求订单列表 -> http://192.168.100.101:9004/order/orderInfo/list
    前端请求商品详情 -> http://192.168.100.101:9001/product/product/page

前端需要知道每个服务的 IP 和端口，服务迁移或扩容时前端代码要跟着改。

有网关时（网关地址为 http://192.168.100.101:9000）：

    前端请求用户信息 -> http://192.168.100.101:9000/user/userInfo/116
    前端请求订单列表 -> http://192.168.100.101:9000/order/orderInfo/list
    前端请求商品详情 -> http://192.168.100.101:9000/product/product/page

前端只需记住一个地址（网关地址），网关根据路径前缀自动转发，用户服务从 9002 迁移到 8002，前端完全无感知。

（2）权限控制：作为微服务入口，网关可以统一校验用户身份和权限，拦截未授权请求，避免在每个微服务中重复开发认证逻辑。

（3）流量控制（限流）：当请求流量过高时，网关按下游微服务能接受的速度放行请求，保护后端服务不被突发流量压垮。

在 Spring Cloud 生态中，网关的主流实现是 Spring Cloud Gateway。它基于 Spring 5、Project Reactor 和 WebFlux 构建，采用响应式编程模型，性能优于传统的阻塞式网关（如 Zuul 1.x）。

2、创建网关

1）创建网关

右键 mall-micro-cloud 模块 -> New -> Module -> 左侧选 Maven Archetype：

- Name: mall-gateway
- Location: 默认即可（在父工程下）
- Parent: mall-micro-cloud
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall
- ArtifactId: mall-gateway
- Version: 1.0.0

2）引入依赖

    <!-- Spring Cloud Gateway 依赖 -->
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-gateway</artifactId>
    </dependency>
    <!-- Nacos 服务发现依赖 -->
    <dependency>
        <groupId>com.alibaba.cloud</groupId>
        <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
    </dependency>
    <!-- gateway 需要负载均衡 -->
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-loadbalancer</artifactId>
    </dependency>
    <dependency>
        <groupId>com.example.mall</groupId>
        <artifactId>mall-common</artifactId>
        <version>1.0.0</version>
    </dependency>

3）配置文件

在 application.yml 中配置网关端口、注册中心地址和路由规则：

    server:
      port: 9000 # 网关端口
    spring:
      application:
        name: mall-gateway
      main:
        web-application-type: reactive # 强制使用响应式
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848 # Nacos 注册中心地址
        gateway:
          routes:
            - id: mall-test-service # 路由 id，唯一即可
              uri: lb://mall-test-service # lb:// 表示从注册中心负载均衡获取服务(服务名与 nacos 注册一致)
              predicates: # 断言
                - Path=/test/** # 路径匹配断言

4）启动

（1）编写启动类

    @SpringBootApplication
    public class GatewayApplication {
        public static void main(String[] args) {
            SpringApplication.run(GatewayApplication.class, args);
        }
    }

（2）测试

启动网关和商品服务，在测试器输入：http://localhost:9000/test/connect，可以从微服务 mall-test-service 中获取数据：

    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "timeOut": 500,
        "online": 5000
      }
    }

---

💡 **速记**

**【为什么需要网关？（核心价值）】**
微服务的“守门神”，所有请求的统一入口。解决客户端需记住多个服务地址的问题，实现解耦。

**【三大核心功能】**
1. **请求路由**：根据 URL 路径/请求头转发，内置 LoadBalancer 负载均衡。
2. **权限控制**：统一鉴权，拦截未授权请求，避免微服务重复开发。
3. **流量控制（限流）**：保护后端服务，防止被突发流量压垮。

**【技术选型】**
**Spring Cloud Gateway**（主流）：基于 Spring 5 + Project Reactor + WebFlux，响应式编程，性能高。
（对比：Zuul 1.x 为阻塞式，性能较差）

**【快速搭建步骤】**
1. 建模块：Maven 创建 `mall-gateway` 模块。
2. 加依赖：`spring-cloud-starter-gateway`、`nacos-discovery`、`loadbalancer`。
3. 写配置：
   * `spring.main.web-application-type: reactive`（强制响应式）
   * `spring.cloud.gateway.routes` 配置路由
4. 写启动类：`@SpringBootApplication` + `SpringApplication.run`。

**【路由配置核心参数】**
*   `id`：路由唯一标识。
*   `uri: lb://服务名`：`lb` 代表从 Nacos 注册中心负载均衡获取服务。
*   `predicates: - Path=/test/**`：路径匹配断言，满足条件才路由。
