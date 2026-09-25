window.BLOG_ARTICLES = [
  {
    "id": "2026-09-26-openfeign-remote-call",
    "title": "OpenFeign 远程调用的实现",
    "url": "posts/2026-09-26-openfeign-remote-call.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "OpenFeign"
    ],
    "summary": "- \"调用基本流程：提供者注册 -> 暴露接口 -> 消费者订阅 -> Feign 自动调用\"   - \"整体方案：模型集中管理 + 调用客户端集中管理\"   - \"模型集中管理：消除冗余、统一口径、全局复用\"   - \"客户端集中管理：统一接口定义、统一配置、统一拦截与熔断\"   - \"实战依赖：引入 openfeign 和 loadbalancer"
  },
  {
    "id": "2026-09-26-openfeign-vs-grpc",
    "title": "OpenFeign 与 gRPC",
    "url": "posts/2026-09-26-openfeign-vs-grpc.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "远程调用"
    ],
    "summary": "- \"OpenFeign：声明式 HTTP 客户端，简化 RESTful 调用\"   - \"OpenFeign优点：代码简洁、开发效率高、深度集成 Spring Cloud\"   - \"OpenFeign缺点：仅支持 HTTP/REST，性能低于二进制协议\"   - \"gRPC：Google 开源的高性能 RPC 框架，基于 HTTP/2 和 Proto"
  },
  {
    "id": "2026-09-24-gateway-integrate-knife4j",
    "title": "Gateway 整合 Knife4j",
    "url": "posts/2026-09-24-gateway-integrate-knife4j.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "网关",
      "Knife4j"
    ],
    "summary": "- \"核心目的：解决微服务架构中接口文档分散的问题\"   - \"统一聚合：只需访问网关的文档地址，即可查看所有服务的接口\"   - \"版本要求：Knife4j从v4.0开始提供专门针对Gateway的聚合组件\"   - \"整合步骤：加入依赖(knife4j-gateway-spring-boot-starter)\"   - \"配置前先删除微服务私有的Kn"
  },
  {
    "id": "2026-09-24-gateway-authorization",
    "title": "Gateway 权限控制",
    "url": "posts/2026-09-24-gateway-authorization.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "网关",
      "权限控制"
    ],
    "summary": "- \"微服务修正：删除API前缀，禁用微服务拦截器，修正返回值拦截器\"   - \"请求流程：客户端 -> Gateway(RtGlobalFilter -> AuthGlobalFilter) -> 微服务 -> Gateway(RtGlobalFilter) -> 客户端\"   - \"全局过滤器 RtGlobalFilter：记录请求开始/结束时间、U"
  },
  {
    "id": "2026-09-24-spring-cloud-gateway-routing",
    "title": "Gateway 路由",
    "url": "posts/2026-09-24-spring-cloud-gateway-routing.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "网关"
    ],
    "summary": "- \"路由四要素：id(唯一标识)、uri(目标地址)、predicates(断言)、filters(过滤器)\"   - \"内置断言工厂：Path、Method、Header、Cookie、Query、时间、Host\"   - \"断言规则：多个断言之间是 AND 关系，需全部满足\"   - \"Path断言作用：请求路由、服务隔离、对外屏蔽内部结构\""
  },
  {
    "id": "2026-09-24-spring-cloud-gateway",
    "title": "Gateway 网关",
    "url": "posts/2026-09-24-spring-cloud-gateway.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "网关"
    ],
    "summary": "- \"定位：微服务架构的“守门神”，所有请求的统一入口\"   - \"功能1：请求路由（根据URL/请求头转发，解耦客户端与微服务）\"   - \"功能2：权限控制（统一鉴权，拦截未授权请求）\"   - \"功能3：流量控制（限流，保护后端服务免受压垮）\"   - \"技术选型：Spring Cloud Gateway（响应式编程，性能优于Zuul）\"   -"
  },
  {
    "id": "2026-09-24-nacos-config-center",
    "title": "Nacos 配置中心",
    "url": "posts/2026-09-24-nacos-config-center.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Nacos"
    ],
    "summary": "- \"定义：集中托管、动态更新、安全管控各类应用配置\"   - \"核心功能：集中管理、动态更新、版本控制与审计、权限治理\"   - \"应用场景：微服务架构、灰度发布、多环境协同\"   - \"原理：长轮询机制，客户端拉取+服务端推送(UDP/HTTP)\"   - \"服务端架构：持久化存储(MySQL/Derby)，Config Service模块，Raft"
  },
  {
    "id": "2026-09-24-nacos-registry",
    "title": "Nacos 注册中心",
    "url": "posts/2026-09-24-nacos-registry.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Nacos"
    ],
    "summary": "- \"定位：微服务架构中高效可靠的注册中心解决方案\"   - \"服务注册：客户端发送请求(服务名/IP/端口/元数据)，服务端写入注册表并同步集群\"   - \"服务发现：客户端订阅，服务端返回健康实例，动态推送变更(长轮询/UDP)\"   - \"健康检查：客户端心跳(5秒间隔，15秒超时，30秒剔除) + 服务端主动探测\"   - \"使用实战：引入dis"
  },
  {
    "id": "2026-09-24-nacos-registry-config-center",
    "title": "Nacos 注册与配置中心",
    "url": "posts/2026-09-24-nacos-registry-config-center.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Nacos"
    ],
    "summary": "- \"定义：面向云原生应用的动态服务发现、配置管理与治理平台\"   - \"核心功能：服务发现与健康监测（TCP/PING/HTTP/MySQL）\"   - \"核心功能：动态配置管理（实时推送，无需重启）\"   - \"核心功能：动态 DNS 与流量治理、服务元数据管理\"   - \"架构优势：高可用（双集群流量迁移）、多协议、弹性扩展\"   - \"部署：支持"
  },
  {
    "id": "2026-09-24-spring-cloud-alibaba-setup",
    "title": "Spring Cloud 环境搭建",
    "url": "posts/2026-09-24-spring-cloud-alibaba-setup.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "微服务",
      "Spring Cloud"
    ],
    "summary": "- \"版本适配：Spring Boot/Cloud/Alibaba 三者版本必须严格匹配\"   - \"推荐稳定组合：Boot 3.2.4 + Cloud 2023.0.1 + Alibaba 2023.0.1.0\"   - \"版本选择：优先选择稳定版（Stable Release），避免 RC 版\"   - \"历史项目维护：升级需同步更新三大组件，避免版"
  },
  {
    "id": "2026-09-24-spring-cloud-alibaba",
    "title": "SpringCloud Alibaba",
    "url": "posts/2026-09-24-spring-cloud-alibaba.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务"
    ],
    "summary": "- \"背景：阿里开源，2018年加入Spring Cloud官方生态\"   - \"核心组件：Nacos(注册/配置)、Gateway(网关)、OpenFeign(调用)\"   - \"核心组件：Sentinel(限流/熔断)、Seata(分布式事务)、RocketMQ(消息)\"   - \"核心组件：Dubbo(RPC)、OSS(存储)\"   - \"特点：整"
  },
  {
    "id": "2026-09-23-database-diversification",
    "title": "数据库多样化",
    "url": "posts/2026-09-23-database-diversification.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "数据库多样化"
    ],
    "summary": "- \"核心架构：MySQL(存储) + Redis(缓存) + Elasticsearch(检索) + Druid(分析)\"   - \"关系型(RDBMS)：表格/外键/事务，代表：MySQL/PostgreSQL/Oracle\"   - \"非关系型(NoSQL)：灵活模式，高扩展，代表：Redis/MongoDB/Cassandra/Neo4j\""
  },
  {
    "id": "2026-09-23-high-speed-cache",
    "title": "高速缓存",
    "url": "posts/2026-09-23-high-speed-cache.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "高速缓存"
    ],
    "summary": "- \"高并发方案：缓存、限流、降级\"   - \"缓存原理：先查缓存，未命中查库并回写\"   - \"方案1：反向代理缓存（Nginx/Varnish/Squid）\"   - \"方案2：分布式缓存（Redis/Memcached/Hazelcast）\"   - \"方案3：本地缓存（Caffeine/Guava/Ehcache）\"   - \"多级缓存架构：客户"
  },
  {
    "id": "2026-09-23-sharding",
    "title": "分库分表",
    "url": "posts/2026-09-23-sharding.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "分库分表"
    ],
    "summary": "- \"目标：解决单机数据库五大瓶颈（存储、I/O、网络、CPU、连接）\"   - \"垂直拆分-分库：按业务模块划分（如用户库、商品库、订单库）\"   - \"垂直拆分-分表：冷热字段分离，大字段（BLOB/TEXT）独立建表\"   - \"水平拆分：同业务数据分散到多实例，通过哈希或ID等属性路由\"   - \"分表参考阈值：500万内优化SQL，超500万考"
  },
  {
    "id": "2026-09-23-mysql-master-slave",
    "title": "主从读写",
    "url": "posts/2026-09-23-mysql-master-slave.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "主从读写"
    ],
    "summary": "- \"主从复制：允许从库复制主库数据，提升读性能和可用性\"   - \"复制三步：主库写Binlog -> 从库IOthread读并写Relay Log -> 从库SQLthread重放\"   - \"读写分离：读请求发从库，写请求发主库\"   - \"模式1：一主多从（主库写，从库读，但主库宕机无法写入）\"   - \"模式2：双主多从（互为主从，解决单点故障"
  },
  {
    "id": "2026-09-23-single-database-architecture",
    "title": "单数据库",
    "url": "posts/2026-09-23-single-database-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "单数据库"
    ],
    "summary": "- \"定义：一个应用只使用一个数据库服务器\"   - \"连接：Tomcat 直接通过 JDBC 连接单库\"   - \"痛点：读写扎堆，IO/CPU 性能很快达到上限\"   - \"瓶颈1：连接池耗尽（解法：合理配置连接池参数）\"   - \"瓶颈2：SQL 效率低（解法：优化索引，避免函数致索引失效）\"   - \"瓶颈3：并发冲突（解法：乐观/悲观锁，控制事"
  },
  {
    "id": "2026-09-23-microservices-architecture",
    "title": "微服务架构",
    "url": "posts/2026-09-23-microservices-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "微服务"
    ],
    "summary": "- \"SOA：面向服务架构，通过可复用服务实现互操作\"   - \"SOA特点：松耦合、服务复用、标准化接口、自治性、可组合性\"   - \"微服务：SOA演进，功能模块拆分为高度自治的小型服务\"   - \"微服务核心：独立部署、独立数据库、轻量级通信(HTTP API)\"   - \"微服务组成：注册发现、网关、服务、缓存、负载均衡、配置中心、权限控制\""
  },
  {
    "id": "2026-09-23-cluster-architecture",
    "title": "集群架构",
    "url": "posts/2026-09-23-cluster-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "集群"
    ],
    "summary": "- \"背景：单机扛不住高并发（如商品190万，订单180万QPS），分布式拆分后单节点仍可能撑不住\"   - \"定义：同一业务部署到多台服务器上，组成整体\"   - \"核心：节点运行相同程序，提供相同功能，由负载均衡器统一分发\"   - \"特点1：可扩展性（动态加机器，水平扩展）\"   - \"特点2：高可用性（故障节点被其他节点接管）\"   - \"负载均"
  },
  {
    "id": "2026-09-23-distributed-architecture",
    "title": "分布式架构",
    "url": "posts/2026-09-23-distributed-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "分布式"
    ],
    "summary": "- \"背景：单机QPS达瓶颈 -> 拆分服务/水平扩展\"   - \"定义：多节点网络协作，资源分散共享\"   - \"特点1：独立部署（网络通信协作）\"   - \"特点2：独立运行（高可用/易扩容，单点故障不影响整体）\"   - \"通信1：RPC（同步，像调本地方法，需获取结果）\"   - \"通信2：MQ（异步，发布订阅，解耦/削峰，无需立即获取结果）\""
  },
  {
    "id": "2026-09-23-middle-platform-architecture",
    "title": "中台架构",
    "url": "posts/2026-09-23-middle-platform-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "中台"
    ],
    "summary": "- \"背景：阿里“大中台，小前台”战略\"   - \"核心：抽象解耦，抽离通用模块（如支付/推荐）为自治服务供前台复用\"   - \"分类：业务、数据、技术、研发、组织、智能\"   - \"优点：敏捷开发、快速创新、低成本复用\"   - \"缺点：流量激增时，集中式中台仍会成整体瓶颈\""
  },
  {
    "id": "2026-09-23-monolithic-architecture",
    "title": "单体架构",
    "url": "posts/2026-09-23-monolithic-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "单体"
    ],
    "summary": "- \"初期：单服务器部署，架构简单\"   - \"痛点1：扩展性/可靠性差（单点故障，无法抗高并发）\"   - \"痛点2：协作效率低（重复造轮子，如短信/支付）\"   - \"痛点3：上线周期长（代码耦合，公共API变更牵一发动全身）\""
  },
  {
    "id": "2026-09-03-springboot-autoconfig",
    "title": "Spring Boot的自动配置原理",
    "url": "posts/2026-09-03-springboot-autoconfig.html",
    "publishedAt": "2026-09-03",
    "category": "Spring",
    "tags": [
      "Spring Boot",
      "自动配置",
      "源码"
    ],
    "summary": "启动类`@EnableAutoConfiguration`从`META-INF/spring.factories`加载配置类，结合`@Conditional`条件注解按需创建Bean。"
  },
  {
    "id": "2026-09-03-hashmap-underlying",
    "title": "Java中HashMap的底层实现原理和扩容机制是什么？",
    "url": "posts/2026-09-03-hashmap-underlying.html",
    "publishedAt": "2026-09-03",
    "category": "Java",
    "tags": [
      "HashMap",
      "集合框架",
      "扩容"
    ],
    "summary": "基于数组+链表/红黑树实现，通过key的hash值定位桶索引，达到负载因子0.75时触发2倍扩容并重新计算hash分配位置。"
  },
  
  
  {
    id: 'springcloud',
    title: 'Spring Cloud 常用组件',
    url: 'posts/2026-08-26-springcloud.html',
    publishedAt: '2026-08-26',
    category: 'Java',
    tags: ['spring Cloud', 'Nacos', 'Gateway', 'OpenFeign', 'Sentinel'],
    summary: 'Spring Cloud 是一套微服务治理的生态工具集。配置和注册中心用 Nacos，网关用 Gateway，服务调用用 OpenFeign，负载均衡用 Spring Cloud LoadBalancer，限流降级用 Sentinel，链路追踪用 Zipkin。 项目中最常用的就是 Nacos + Gateway + Sentinel + OpenFeign 这套技术组合。'
  },
  {
    id: 'mysql-topsql',
    title: '慢查询优化',
    url: 'posts/2026-08-26-mysql-topsql.html',
    publishedAt: '2026-08-26',
    category: 'mysql',
    tags: ['慢查询', 'EXPLAIN'],
    summary: '慢查询优化遵循 “先定位 → 再分析 → 后调优” 三步走。开启慢日志抓 TOP SQL，用 EXPLAIN 看执行计划，通过索引优化、SQL 改写、分表归档逐级解决。核心目标：让所有核心查询都走索引。'
  },
  {
    id: 'jar',
    title: 'jar包冲突',
    url: 'posts/2026-08-26-jar.html',
    publishedAt: '2026-08-26',
    category: 'maven',
    tags: ['jar', 'maven'],
    summary: 'Jar 包冲突本质是 依赖传递导致的类路径污染。核心解决思路分两步：Maven Dependency Tree 定位冲突 → exclusions 排除 + 父 POM 锁版，遇到无法排除的硬编码 SPI 加载时用 Shade 插件重命名隔离。NoSuchMethodError / NoClassDefFoundError 大概率是 Jar 包冲突导致'
  },
  {
    id: 'mysql-index',
    title: '索引优化',
    url: 'posts/2026-08-26-mysql-index.html',
    publishedAt: '2026-08-26',
    category: 'mysql',
    tags: ['最左原则', '索引优化'],
    summary: '索引优化本质是 “让查询尽量少读、尽量顺序读”。我将索引设计归纳为四层：选列：最左前缀 + 高基数优先 + 等值在前；防失效：禁止函数运算、隐式转换、左模糊；控成本：单表不超 5 索引，杜绝冗余；架构降维：千万级走冷热分离或分库分表。最终目标：核心查询全部做到覆盖索引。'
  },
  {
    id: 'springboot',
    title: 'Spring Boot 自动配置原理',
    url: 'posts/2026-08-26-springboot.html',
    publishedAt: '2026-08-26',
    category: 'Java',
    tags: ['spring boot', '自动配置原理'],
    summary: 'Spring Boot 自动配置分为三个阶段。加载，拿到全部候选自动配置类。过滤，通过条件注解筛掉不匹配当前环境的配置。注册，把生效的 Bean 注册到 Spring 容器。如果我们自定义了这个 Bean，框架干脆就不创建默认的 Bean 了。所以它可以做到开箱即用，同时支持灵活定制。'
  },
  {
    id: 'java-thread',
    title: '线程池的核心参数及其含义',
    url: 'posts/2026-08-25-thread.html',
    publishedAt: '2026-08-25',
    category: 'Java',
    tags: ['thread', '并发'],
    summary: '线程池的核心参数一共有 7 个，分别是 `corePoolSize`（核心线程数）、`maximumPoolSize`（最大线程数）、`keepAliveTime`（空闲存活时间）、`TimeUnit`（时间单位）、`BlockingQueue`（阻塞队列）、`ThreadFactory`（线程工厂）、`RejectedExecutionHandler`（拒绝策略）。'
  },
  {
    id: 'java-jvm',
    title: 'JVM内存模型与各个区域的作用',
    url: 'posts/2026-08-25-jvm.html',
    publishedAt: '2026-08-25',
    category: 'Java',
    tags: ['jvm', '内存模型'],
    summary: 'JVM 内存分为 线程私有（程序计数器、虚拟机栈、本地方法栈）和 线程共享（堆、方法区）两大部分。在项目中，堆 是 GC 主要关注区，栈 决定线程数量，方法区 存类元信息。'
  },
  {
    id: 'java-final',
    title: 'Java 中 final 关键字的作用',
    url: 'posts/2026-08-25-final.html',
    publishedAt: '2026-08-25',
    category: 'Java',
    tags: ['final'],
    summary: '修饰类不可继承、方法不可重写、变量引用不可变。'
  },
  // {
  //   id: 'moon-robot-playthrough',
  //   title: '月亮机器人双线毕业流程',
  //   url: 'posts/2026-08-25-moon-robot-playthrough.html',
  //   publishedAt: '2026-08-25',
  //   category: '兴趣记录',
  //   tags: ['游戏流程', '饥荒联机版', 'WX-78'],
  //   summary: '从前期加点到月亮与暗影双线推进的一份完整流程记录。'
  // },
  // {
  //   id: 'circuit-recipes',
  //   title: '电路改装配方与效果一览',
  //   url: 'posts/2026-08-24-circuit-recipes.html',
  //   publishedAt: '2026-08-24',
  //   category: '兴趣记录',
  //   tags: ['游戏资料', '电路改装', '饥荒联机版'],
  //   summary: '整理电路的制作配方、插口占用、效果、扫描对象和技能树强化。'
  // }
];
