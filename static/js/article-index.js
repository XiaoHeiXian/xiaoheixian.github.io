window.BLOG_ARTICLES = [
  {
    "id": "2026-09-02-test2",
    "title": "测试2",
    "url": "posts/2026-09-02-test2.html",
    "publishedAt": "2026-09-02",
    "category": "测试",
    "tags": [
      "测试"
    ],
    "summary": "测试2"
  },
  {
    "id": "2026-09-02-test",
    "title": "测试",
    "url": "posts/2026-09-02-test.html",
    "publishedAt": "2026-09-02",
    "category": "测试",
    "tags": [
      "测试"
    ],
    "summary": "测试"
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
