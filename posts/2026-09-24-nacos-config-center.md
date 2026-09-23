---
layout: article
title: "Nacos 配置中心"
description: "- \"定义：集中托管、动态更新、安全管控各类应用配置\"   - \"核心功能：集中管理、动态更新、版本控制与审计、权限治理\"   - \"应用场景：微服务架构、灰度发布、多环境协同\"   - \"原理：长轮询机制，客户端拉取+服务端推送(UDP/HTTP)\"   - \"服务端架构：持久化存储(MySQL/Derby)，Config Service模块，Raft"
date: 2026-09-24
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "Nacos"
permalink: /posts/2026-09-24-nacos-config-center.html
---

1、什么是配置中心

配置中心（Configuration Center）是分布式架构下的核心基础组件，主要用于集中托管、动态更新、安全管控各类应用配置。它核心作用是解耦配置与业务服务，解决传统本地配置模式的痛点：传统方案中配置文件分散在各服务节点，当集群规模扩大，修改数据库连接、服务参数等配置时，需逐台修改本地 application.yml 文件并重启服务，不仅运维效率低、人力成本高，还易因配置不一致引发线上问题。依托配置中心，所有集群节点统一拉取远程集中配置，仅需在配置中心完成一次配置变更，便可全量同步至所有服务，支持配置动态生效，无需重启服务，实现配置的标准化、高效化管理。

2、核心功能

（1）集中管理：将分散的配置文件（如数据库连接、API 密钥、服务地址）统一存储在中心化平台，支持多环境（开发/测试/生产）隔离管理。

（2）动态更新：运行时修改配置并实时推送至应用，无需重新部署或重启服务。

（3）版本控制与审计：记录配置变更历史，支持快速回滚和操作追溯，降低配置错误风险。

（4）权限治理：通过角色权限控制（RBAC）限制敏感配置的访问与修改，确保安全性。

3、应用场景

（1）微服务架构：管理数百个微服务的公共参数，避免重复配置和维护成本。

（2）灰度发布：通过分批次推送新配置验证功能稳定性，降低全量变更风险。

（3）多环境协同：实现开发、测试、生产环境的配置隔离与快速切换。

4、Nacos 配置中心

Nacos 配置中心采用长轮询的配置动态推送机制，客户端发起配置查询请求，若配置未变更，服务端将请求挂起（默认最长 30 秒）。在挂起期间，若配置发生变更，服务端立即返回新数据；若超时未变更，返回空响应并触发客户端重新发起请求。客户端注册监听器（Listener），当配置变更时，服务端通过 UDP 或 HTTP 主动通知客户端，触发本地配置热更新（事件驱动模型）。

1）核心架构与组件

服务端（Nacos Server）使用 MySQL 或 Derby 作为持久化存储，保存配置数据（Data ID、Group、内容、版本等），支持集群部署保障高可用。内存中维护 Config Service 模块，提供配置的读写接口，并通过 Notify Service 实现变更推送。集群模式下采用 Raft 算法保证配置数据的一致性，确保多节点间的数据同步。

客户端（Nacos Client）集成于应用中，通过 SDK 与 Nacos Server 交互，监听配置变更并实时拉取更新。

2）配置管理流程

（1）配置发布：用户通过控制台或 API 创建/更新配置（指定 Data ID、Group、内容），服务端持久化存储并记录版本号。若为集群部署，通过 Raft 协议同步至所有节点。

（2）配置拉取：客户端启动时从 Nacos Server 拉取配置，并缓存至本地（如 resources 目录）。支持 failover 机制，当服务端不可用时，自动使用本地缓存配置。注意，配置加载时，优先加载 Nacos 配置，覆盖本地配置。

（3）配置监听：客户端定时（默认 1 秒）检查本地配置与服务端的 MD5 值是否一致，若不一致则拉取最新配置。

5、使用 Nacos 配置

1）创建测试项目

为了方便测试，创建 mall-test-service 项目：

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype:

- Name: mall-test-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.test
- ArtifactId: mall-test-service
- Version: 1.0.0

（1）配置文件

    server:
      port: 10000
    spring:
      application:
        name: mall-test-service
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848

（2）启动程序

    @SpringBootApplication(
        scanBasePackages = "com.example.mall",
        // 禁用数据源自动配置
        exclude = {DataSourceAutoConfiguration.class}
    )

2）配置中心

（1）在父工程 mall-services 中添加配置中心依赖

    <!-- 配置中心 -->
    <dependency>
        <groupId>com.alibaba.cloud</groupId>
        <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
    </dependency>

（2）配置发布

通过 Nacos 控制台编写配置文件。

创建配置文件 application-test.yml

- 命名空间：public
- Data ID：application-test.yml
- Group：DEFAULT_GROUP
- 配置格式：YAML
- 配置内容：

    connect:
      time-out: 1000
      online: 1000

点击发布，配置文件创建完成。

（3）配置拉取

①在项目的配置文件中，添加以下配置：

    spring:
      config:
        import:
          - nacos:application-test.yml

注意：如果项目不需要导入 nacos 配置中心的文件，在配置文件中加入：

    cloud:
      nacos:
        server-addr: 192.168.100.101:8848

Add a spring.config.import=nacos: property to your configuration.
    If configuration is not required add spring.config.import=optional:nacos: instead.
    To disable this check, set spring.cloud.nacos.config.import-check.enabled=false.

②获取配置参数

在 domain.dto 包下创建 ConnectDTO 类：

    @Component
    @ConfigurationProperties(prefix = "connect")
    @Data
    @ToString
    public class ConnectDTO{
        private Long timeOut;
        private Long online;
    }

创建测试控制器

    @RestController
    @RequestMapping("/test")
    public class TestController {
        @Autowired
        private ConnectDTO connect;
        @GetMapping("/connect")
        public ConnectDTO getConnect(){
            return connect;
        }
    }

使用浏览器测试，在测试前，需要到登录拦截器配置放行：

    .excludePathPatterns("/login","/user/userInfo/register","/product/**","/test/**");

测试结果输出：

    {"code":200,"msg":"操作成功","data":{"timeOut":500,"online":5000}}

从以上结果可以看出，配置中心可以实现不停机更新数据。

6、数据隔离

在 SpringBoot 多环境管理中，有开发环境、测试环境、生产环境，不同的环境使用不同的配置文件，如 dev、test、prod 等。同时每个微服务也有 dev、test、prod 等配置文件，用于不同环境配置。如何实现微服务不环境间配置隔离呢？我们可以通过命名空间、组、数据集来进行数据分离。如下图所示，不同的环境对应不同的命名空间，如 dev、test、prod 等。同一个命名空间可以有多个分组，如用户组、商品组、订单组等。每个分组下面可以创建不同的数据集，如数据库配置、日志配置等。

配置参数：

- Namespace（命名空间）：实现多租户粒度的配置隔离，常用于区分不同环境（如开发、测试、生产环境）或不同业务线，确保各环境/业务配置独立且互不干扰。默认值：public，未指定时所有配置默认归属此命名空间。
- Group（配置分组）：对相同业务或组件的配置进行分类管理。例如，将同一微服务的数据库配置和消息队列配置划分到同一分组，逻辑上区分不同模块或应用。默认值：DEFAULT_GROUP。
- Data ID（配置集 ID）：唯一标识一个配置集（相当于一个配置文件），保证全局唯一性，用于组织系统内的具体配置项（如数据源、日志级别等）。

总之，Namespace 可以区别多套环境、Group 可以区分多个微服务、Data ID 区分多套配置。

下面以 mall-product-service 为例进行配置。

1）配置发布

（1）创建命名空间

打开 Nacos 控制台的命名空间—创建命名空间，分别创建以下三个名称空间

| 命名空间 ID | 命名空间名 | 描述 |
| :--- | :--- | :--- |
| dev | dev | 开发环境 |
| test | test | 测试环境 |
| prod | prod | 生产环境 |

创建如图所示：
（2）创建 mall-product-service 的开发环境配置

在配置列表中，选择命名空间 dev。

点击创建配置，分别创建以下配置文件：

| Data ID | Group | 配置格式 | 配置内容 |
| :--- | :--- | :--- | :--- |
| mysql.yml | PRODUCT_GROUP | yaml | 将本地配置的 spring.datasource 项配置到此处 |
| mybatis.yml | DEFAULT_GROUP | yaml | 将本地配置的 mybatis-plus 项配置到此处 |
| log.yml | DEFAULT_GROUP | yaml | 将本地配置的 logging 项配置到此处 |
| knife4j.yml | DEFAULT_GROUP | yaml | 将本地配置的 knife4j 和 springdoc 项配置到此处 |
| thymeleaf.yml | PRODUCT_GROUP | yaml | 将本地配置的 spring.thymeleaf 和 file 项配置到此处 |

如 mysql.yml 配置：

    spring:
      datasource:
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://localhost:3306/shop_goods?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
        username: root
        password: root
        type: com.alibaba.druid.pool.DruidDataSource
        druid:
          # 初始连接数
          initial-size: 5
          # 最小连接池数量
          min-idle: 10
          # 最大连接池数量
          max-active: 20

2）配置拉取

（1）多环境多文件切换配置

修改本地 application.yml 文件：

    # 公共基础配置
    spring:
      # 应用名称
      application:
        name: mall-product-service
      # 激活开发环境，上线时改为 prod
      profiles:
        active: dev
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            namespace: ${spring.profiles.active:public} #动态获取命名空间,默认 public

修改本地 application-dev.yml 文件：

    # 服务端口（开发端口，避免冲突）
    server:
      port: 9001
    spring:
      config:
        import: #导入多个文件：Data ID?group=Group
          - nacos:mysql.yml?group=PRODUCT_GROUP
          - nacos:thymeleaf.yml?group=PRODUCT_GROUP
          - nacos:mybatis.yml
          - nacos:log.yml
          - nacos:knife4j.yml

（2）启动项目

项目启动后，查看启动日志，发现以下日志，配置文件拉取成功。

    The following 1 profile is active: "dev"
    [Nacos Config] Load config[dataId=mysql.yml, group=PRODUCT_GROUP] success

---

💡 **速记**

**【什么是配置中心？】**
分布式架构核心组件，用于集中托管、动态更新、安全管控配置。解决本地配置分散、修改麻烦、易出错、需重启的痛点。实现配置与业务解耦。

**【核心功能】**
集中管理（多环境隔离）、动态更新（无需重启）、版本控制与审计（支持回滚）、权限治理（RBAC）。

**【应用场景】**
微服务架构公共参数管理、灰度发布验证、多环境（dev/test/prod）隔离与切换。

**【Nacos 配置中心原理（长轮询）】**
客户端发起请求 -> 服务端未变更则挂起（30秒） -> 变更则立即返回 -> 超时返回空触发重试 -> 客户端注册监听器 -> 服务端通过 UDP/HTTP 推送变更 -> 本地配置热更新。

**【核心架构与流程】**
*   **服务端**：MySQL/Derby 持久化，Config Service 读写，Notify Service 推送，Raft 算法保证一致性。
*   **客户端**：SDK 交互，监听变更并拉取更新。
*   **流程**：
    1.  **配置发布**：控制台/API 创建更新，持久化+版本号，Raft 同步。
    2.  **配置拉取**：客户端启动拉取，本地缓存，failover 机制（服务端不可用用本地），Nacos 配置覆盖本地。
    3.  **配置监听**：定时（1秒）检查 MD5，不一致拉取最新。

**【数据隔离三要素（高频考点）】**
*   **Namespace**：环境隔离（dev/test/prod），默认 public。
*   **Group**：业务/组件分组（如 PRODUCT_GROUP），默认 DEFAULT_GROUP。
*   **Data ID**：配置文件唯一标识（如 mysql.yml）。
*   **多环境配置实战**：动态获取 Namespace `${spring.profiles.active:public}`，通过 `spring.config.import` 导入多个 Data ID，支持 `?group=Group` 指定分组。
