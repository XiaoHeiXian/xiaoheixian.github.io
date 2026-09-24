---
layout: article
title: "Gateway 路由"
description: "- \"路由四要素：id(唯一标识)、uri(目标地址)、predicates(断言)、filters(过滤器)\"   - \"内置断言工厂：Path、Method、Header、Cookie、Query、时间、Host\"   - \"断言规则：多个断言之间是 AND 关系，需全部满足\"   - \"Path断言作用：请求路由、服务隔离、对外屏蔽内部结构\""
date: 2026-09-24
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "网关"
permalink: /posts/2026-09-24-spring-cloud-gateway-routing.html
---

1、路由

路由由以下要素构成：
- id：路由的唯一标识
- uri：目标地址，http:// 表示固定地址，lb:// 表示从注册中心负载均衡获取
- predicates：路由断言条件
- filters：对请求/响应进行处理的过滤器

2、断言工厂

1）内置断言工厂

Gateway 断言工厂是 Spring Cloud Gateway 提供的一种机制，用于定义路由请求的匹配条件。通过使用不同的断言工厂，我们可以根据请求的不同属性（如请求路径、请求方法、请求头等）来匹配和过滤请求。Spring Cloud Gateway 提供了多种内置断言工厂：

| 名称 | 说明 | 示例 |
| :--- | :--- | :--- |
| Path | 请求路径匹配 | - Path=/user/** |
| Method | 请求方法匹配 | - Method=GET,POST |
| Header | 请求头匹配 | - Header=X-Request-Id, \d+ |
| Cookie | Cookie 匹配 | - Cookie=chocolate, ch.p |
| Query | 请求参数匹配 | - Query=name, Jack |
| After/Before/Between | 时间匹配 | - After=2037-01-20T17:42:47.789-07:00[America/Denver] |
| Host | 域名匹配 | - Host=*.somehost.org |

注意：多个断言之间是 AND 关系，需要全部满足才会路由。

2）Path 断言

Path 断言就是给网关地址加前缀，是指客户端请求 URL 中，用于标识目标微服务的一段路径。如：
- http://localhost:9000/product/category/listAll 中的 /product
- http://localhost:9000/user/shippingAddress/116 中的 /user

（1）作用

① 请求路由：网关根据地址前缀将请求转发到对应的后端微服务。如断言中的：

    predicates:
      - Path=/product/**

② 服务隔离：不同的前缀对应不同的微服务，确保请求不会被错误路由。即使两个服务有相同的子路径，也能通过前缀区分：

商品服务接口：listAll -> /product/listAll
订单服务接口：listAll -> /order/listAll

两个 listAll 虽然路径相同，但因为前缀不同，网关能正确转发到不同的服务。

③ 对外屏蔽内部结构：客户端只需知道网关地址和前缀，无需知道每个微服务的具体 IP 和端口。

流程图说明：
客户端请求 /product/category/listAll -> 网关接收 -> 匹配路由规则 Path=/product/** -> 匹配成功 -> 转发到商品服务 -> 商品服务处理 /category/listAll -> 返回响应。

（2）Path 断言匹配规则

Spring Cloud Gateway 使用 PathPattern（Spring 的路径匹配器）进行匹配：

| 配置 | 匹配的请求 |
| :--- | :--- |
| Path=/product/** | /product/a、/product/a/b、/product/v3/api-docs |
| Path=/product/* | /product/a、/product/b |
| Path=/product/category | /product/category |
| Path=/product/{id} | /product/123、/product/abc |

当多个路由可能匹配同一个请求时，配置顺序决定优先级（先配置先匹配）。

3、过滤器工厂

（1）内置过滤器工厂

过滤器可以对进入网关的请求和微服务返回的响应进行处理。常用内置过滤器：

| 名称 | 说明 |
| :--- | :--- |
| AddRequestHeader | 添加请求头 |
| RemoveRequestHeader | 移除请求头 |
| AddResponseHeader | 添加响应头 |
| StripPrefix | 移除路径前缀 |
| RequestRateLimiter | 限流 |
| CircuitBreaker | 熔断降级 |

2）移除路径前缀

网关在转发请求时，可以通过 StripPrefix 过滤器控制是否去掉前缀。

| 配置 | 网关接收 | 转发到服务 | 说明 |
| :--- | :--- | :--- | :--- |
| 不加 StripPrefix | /product/category/list | /product/category/list | 保留前缀，完整转发，不建议 |
| StripPrefix=1 | /product/category/list | /category/list | 去掉第一段 /product，适用开发环境 |
| StripPrefix=2 | /api/product/category/list | /category/list | 去掉前两段 /api/product，适用生产环境 |

3）默认过滤器

默认过滤器作用于所有路由。常用于统一处理鉴权、日志记录等全局逻辑。

---

💡 **速记**

**【路由的四要素（核心概念）】**
*   `id`：路由唯一标识。
*   `uri`：目标地址（`http://`固定，`lb://`从注册中心负载均衡获取）。
*   `predicates`：断言条件（匹配规则）。
*   `filters`：过滤器（处理请求和响应）。

**【断言工厂（匹配条件）】**
*   **常用**：Path（路径）、Method（方法）、Header（请求头）、Cookie、Query（参数）、Host（域名）、时间（After/Before/Between）。
*   **规则**：多个断言是 **AND** 关系，需全部满足。

**【Path 断言的三大作用】**
1.  **请求路由**：根据前缀转发（如 `/product/**` 转发到商品服务）。
2.  **服务隔离**：同路径不同前缀可区分不同微服务（如 `/product/listAll` vs `/order/listAll`）。
3.  **对外屏蔽内部结构**：客户端只需知道网关地址，无需感知微服务具体 IP。

**【Path 匹配规则】**
*   `/product/**`：匹配多级路径。
*   `/product/*`：只匹配一级路径。
*   `/product/{id}`：匹配带参数的路径。
*   **优先级**：当多个路由匹配时，按配置顺序，先配置先匹配。

**【过滤器工厂（处理请求/响应）】**
*   **常用**：Add/RemoveRequestHeader、AddResponseHeader、StripPrefix（移除路径前缀）、RequestRateLimiter（限流）、CircuitBreaker（熔断降级）。
*   **StripPrefix 核心用法**：`StripPrefix=1` 去掉第一段前缀（开发环境），`StripPrefix=2` 去掉前两段前缀（生产环境）。
*   **默认过滤器**：作用于所有路由，用于统一鉴权、日志记录等全局逻辑。
