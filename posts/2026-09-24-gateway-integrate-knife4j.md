---
layout: article
title: "Gateway 整合 Knife4j"
description: "- \"核心目的：解决微服务架构中接口文档分散的问题\"   - \"统一聚合：只需访问网关的文档地址，即可查看所有服务的接口\"   - \"版本要求：Knife4j从v4.0开始提供专门针对Gateway的聚合组件\"   - \"整合步骤：加入依赖(knife4j-gateway-spring-boot-starter)\"   - \"配置前先删除微服务私有的Kn"
date: 2026-09-24
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "网关"
  - "Knife4j"
permalink: /posts/2026-09-24-gateway-integrate-knife4j.html
---

Gateway 整合 Knife4j 的核心目的是解决微服务架构中接口文档分散的问题：每个服务都有自己的 Swagger 文档地址，前端/测试人员需要记住多个地址，很不方便。通过网关统一聚合，只需访问网关的文档地址，就能在一个页面上查看所有服务的接口。

1、整合

1）加入依赖

Knife4j 从 v4.0 开始提供了专门针对 Spring Cloud Gateway 的聚合组件 knife4j-gateway-spring-boot-starter，大大简化了整合复杂度。

    <dependency>
        <groupId>com.github.xiaoymin</groupId>
        <artifactId>knife4j-gateway-spring-boot-starter</artifactId>
        <version>4.5.0</version>
    </dependency>

2）配置

（1）在配置之前删除商品服务、用户服务、测试服务的私有配置 Knife4jConfig。

（2）配置

网关与 Knife4j 最常用的两种聚合模式：

（1）服务发现自动聚合（推荐）

如果子服务数量较多，并且所有子服务统一使用 Swagger2 或 OpenAPI3 规范，可以使用服务发现模式自动聚合。

网关配置：

    knife4j:
      gateway:
        enabled: true          # 开启网关聚合
        strategy: discover     # 服务发现模式
        discover:
          enabled: true
          version: openapi3    # 如果子服务是 Swagger2，改为 swagger2
          # 排除不需要聚合的服务（支持正则）
          excluded-services:
            - mall-gateway     # 排除网关自身
            - .*dubbo.*        # 排除包含 dubbo 的服务

工作机制：Knife4j 通过服务发现机制 从注册中心获取服务列表，然后直接通过网关访问 /{service-name}/v3/api-docs 来拉取文档。

你的配置：uri: lb://mall-product-service，并配置了 StripPrefix=2。

路径生成：Knife4j 构造的文档请求 URL 是 /api/product/v3/api-docs。

文档请求路径：/api/product/v3/api-docs

网关转发后的实际路径：经过 StripPrefix=2 处理后，变为 /v3/api-docs。你的商品服务能正确返回文档。

测试接口路径来源：因为它看到你配置的文档 url 是 /api/product/v3/api-docs，它会认为 /api/product 是一个路由前缀，并在构造测试请求时，帮你自动加上了这个前缀。

（2）手动配置聚合

如果子服务同时存在 Swagger2 和 OpenAPI3 混用的情况，或者需要对每个服务的文档地址做精细控制，可以使用手动模式。

网关配置：

    knife4j:
      gateway:
        enabled: true
        strategy: manual       # 手动模式
        routes:
          - name: 商品服务
            service-name: mall-product-service
            # 注意：url 需要走网关路由前缀
            url: /api/product/v3/api-docs
            context-path: /api/product
            order: 1
          - name: 用户服务
            service-name: mall-user-service
            url: /api/user/v3/api-docs
            context-path: /api/user/
            order: 2

工作机制：你通过 url: /api/product/v3/api-docs 显式指定了文档的获取地址。

你的配置：uri: lb://mall-product-service，并配置了 StripPrefix=2。

路径生成：你指定的文档请求 URL 是 /api/product/v3/api-docs。

文档请求路径：/api/product/v3/api-docs

网关转发后的实际路径：经过 StripPrefix=2 处理后，变为 /v3/api-docs。你的商品服务同样能正确返回文档。

测试接口路径来源：因为它看到你配置的文档 url 是 /api/product/v3/api-docs，它会认为 /api/product 是一个路由前缀，并在构造测试请求时，帮你自动去掉了这个前缀。所以用 context-path 指定路由前缀。

2、测试文档实现

1）配置

使用自动服务发现。

    knife4j:
      gateway:
        enabled: true          # 开启网关聚合
        strategy: discover     # 服务发现模式
        discover:
          enabled: true
          version: openapi3    # 如果子服务是 Swagger2，改为 swagger2
          # 排除不需要聚合的服务（支持正则）
          excluded-services:
            - mall-gateway     # 排除网关自身
            - .*dubbo.*        # 排除包含 dubbo 的服务

3、接口测试

1）服务分组

打开接口文档：http://localhost:9000/doc.html，在左上角下拉选中分组：

    mall-product-service
    mall-test-service
    mall-user-service

2）商品服务测试

（1）测试获取所有类别：

    GET /api/product/category/listAll

响应内容：

    {
      "code": 200,
      "msg": "操作成功",
      "data": [
        {
          "id": 2,
          "name": "手机",
          "children": [
            {
              "id": 13,
              "name": "手机通讯",
            }
          ]
        }
      ]
    }

3）携带请求头 Token 测试

（1）先在 mall-user-server 中登录，获取 token 后，复制 token

（2）再在需要登录获取数据的服务中创建全局参数设置：

① 打开文档菜单 -> 全局参数设置 -> 添加参数

新增参数：
- 参数名称：Authorization
- 参数值：eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InpzZDF9...
- 参数类型：header

② 参数添加完成后，刷新页面（这步很重要）

③ 可以在测试接口中看到请求头参数，如获取用户地址：

（3）发送测试接口

    GET /api/user/shippingAddress/{userId}

参数名称：userId，参数值：116

响应内容：

    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "id": 1895874493057335297,
        "userId": "116",
        "name": null,
        "phoneNumber": "139****8889"
      }
    }

---

💡 **速记**

**【为什么整合 Knife4j？】**
微服务架构下接口文档分散，前端/测试需记多个地址。网关统一聚合后，只需访问网关文档地址，即可查看所有服务接口。

**【整合前置动作】**
1. 加入依赖：`knife4j-gateway-spring-boot-starter` (v4.0+ 针对 Gateway 专门推出)。
2. 删除子服务中私有的 `Knife4jConfig` 配置类。

**【两种聚合模式】**
1. **服务发现自动聚合（推荐）**：
   * 配置：`strategy: discover`，开启 `discover.enabled: true`，指定 `version: openapi3` (或 swagger2)。
   * 排除服务：`excluded-services` 排除网关自身和 dubbo 服务。
   * 原理：Knife4j 通过注册中心获取服务列表，访问 `/{service-name}/v3/api-docs` 拉取文档。
2. **手动配置聚合**：
   * 适用场景：Swagger2 和 OpenAPI3 混用，或需精细控制文档地址。
   * 配置：`strategy: manual`，配置 `routes` 列表，显式指定 `name`, `service-name`, `url`, `context-path`, `order`。
   * 原理：显式指定文档 URL，需配合路由前缀和 `StripPrefix` 使用，构造请求时自动加上或去掉前缀。

**【文档测试流程】**
1. 访问 `http://localhost:9000/doc.html`。
2. 左上角下拉查看服务分组。
3. 测试无鉴权接口（如查询商品分类）。
4. 测试需鉴权接口：
   * 先登录获取 Token。
   * 在 Knife4j 文档“全局参数设置”中添加 Header 参数 `Authorization`。
   * 刷新页面，携带 Token 发送请求。
