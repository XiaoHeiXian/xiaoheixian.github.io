---
layout: article
title: "分布式定时任务 ElasticJob"
description: "- \"定时任务：按时间计划执行任务，分为单机定时任务与分布式定时任务。\"   - \"区别：单机独立执行、数据容量低、无高可用；分布式集群执行、支持分片、高可用。\"   - \"选型：单机简单任务用 @Scheduled；集群、海量数据、关键业务用分布式定时任务。\"   - \"ElasticJob：面向互联网生态的分布式调度方案，依赖 ZooKeeper 实"
date: 2026-10-13
category: "云商城"
tags:
  - "分布式"
  - "定时任务"
  - "ElasticJob"
  - "ZooKeeper"
permalink: /posts/2026-10-13-distributed-scheduled-task-elasticjob.html
---

## 1、什么是定时任务

定时任务通常指在单一系统内按时间计划执行任务，如定时将商品的库存加载到 Redis，定时生成静态页面等。定时任务分为：

- 单机定时任务：任务的定义、触发和执行都在同一个应用进程内部。它只管理自己进程里的定时逻辑，对其他应用进程一无所知。

- 分布式定时任务：任务的调度和具体执行是分离的，通常由一个中心化的调度器（或协调者）来统一管理任务，并指派给集群中的多个工作节点去执行。它在逻辑上是一个整体，但物理上分布在多个应用实例中。

1）两种定时任务的区别

    对比维度：适用场景
    本地定时任务：单机应用、简单的周期清理、无状态任务
    分布式定时任务：微服务/分布式系统、大数据量处理、对高可用有要求的场景

    对比维度：执行方式
    本地定时任务：单节点独立执行
    分布式定时任务：集群中单点执行（避免重复）或分片并行执行

    对比维度：数据容量
    本地定时任务：低（受单机限制）
    分布式定时任务：高（可通过扩容线性提升）

    对比维度：高可用
    本地定时任务：无（节点宕机则任务失败）
    分布式定时任务：有（支持故障转移和失效补偿）

    对比维度：动态管理
    本地定时任务：不支持（修改需重启）
    分布式定时任务：支持（实时生效）

    对比维度：监控运维
    本地定时任务：弱（依赖日志）
    分布式定时任务：强（提供可视化管控台）

    对比维度：系统复杂度
    本地定时任务：低
    分布式定时任务：高

    对比维度：典型代表
    本地定时任务：Spring @Scheduled、Quartz 单机版
    分布式定时任务：ElasticJob、XXL-JOB、Quartz 集群版、SchedulerX

2）选型建议

（1）优先选择本地定时任务：

- 应用是单机部署，且未来不太可能变成集群。
- 任务逻辑简单轻量，执行时间短，如缓存刷新、临时状态清理。
- 对任务失败不敏感，可以容忍偶尔的遗漏或重复。

（2）必须选择分布式定时任务：

- 应用部署了多个节点（集群），必须防止任务重复执行。
- 任务需要处理海量数据（如每天千万级/亿级的数据报表），单机处理不完或太慢。
- 任务是关键业务，绝不能因单点故障而中断。
- 任务调度规则频繁变动，不想每次变更都重启服务。

## 2、分布式定时任务 ElasticJob

ElasticJob 是面向互联网生态和海量任务的分布式调度解决方案，由两个相互独立的子项目 ElasticJob-Lite 和 ElasticJob-Cloud 组成。它通过弹性调度、资源管控、以及作业治理的功能，打造一个适用于互联网场景的分布式调度解决方案，并通过开放的架构设计，提供多元化的作业生态。

包含两个子项目：

- ElasticJob-Lite：轻量级无中心化解决方案，通过 Jar 包集成，依赖 ZooKeeper（3.6 以上版本）实现分布式协调。
- ElasticJob-Cloud：结合 Mesos 和 Docker，提供资源管控与作业调度一体化的云原生方案。

1）部署

本系统采用 ElasticJob-Lite 实现定时任务，需要依赖 ZooKeeper：

    docker run -d --name zk -p 2181:2181 -e ZOO_SERVER_IP=0.0.0.0 zookeeper:3.9.5

2）关键组件

    组件：作业
    功能说明：任务执行单元，支持 SimpleJob（简单定时任务）和 DataflowJob（数据流处理）

    组件：注册中心
    功能说明：基于 ZooKeeper 存储作业配置、节点状态及分片信息，实现分布式协调

    组件：分片策略
    功能说明：将任务拆分为多个子任务并行执行（如按时间范围或数据量分片），提升处理效率

    组件：调度器
    功能说明：动态分配分片任务，支持故障节点任务自动迁移

ElasticJob 通过灵活的分片策略与分布式协调机制，成为互联网领域处理海量定时任务的首选框架，尤其适用于需弹性扩展与高可靠性的场景。

【思考】如何处理任务堆积问题？

当任务执行时间（30 小时）超过调度周期（24 小时）时，如果处理不当，会导致任务实例重叠执行（任务堆积或任务重叠），迅速耗尽系统资源（如数据库连接、内存），甚至导致数据错乱或服务崩溃。

解决方法：利用分布式调度框架 ElasticJob 的任务分片功能。将 30 小时的工作量，按照业务维度（如用户 ID 哈希值取模、地区）拆分成 N 个分片。启动 N 台机器同时执行各自的分片。30 小时的工作量可以近似缩短为 30 小时 / N 台机器。只要机器足够多，就能在 24 小时内完成。

## 3、Cron 表达式

定时任务也就是指将定时执行的周期固定，每次都会按照指定时间执行，定时使用 Cron 表达式来表示。

Cron 表达式结构：

Cron 表达式由 6-7 个字段组成（部分系统支持年字段），表示时间触发规则，格式如下：

    秒（0-59）
    分钟（0-59）
    小时（0-23）
    日（1-31）
    月（1-12）
    星期（0-7，0 和 7 均表示周日）
    * * * * * * [年]（可选，1970-2099）

特殊符号说明：

    符号：*
    含义：任意值
    示例：0 * * * * *
    适用场景：每分钟的第 0 秒触发

    符号：,
    含义：值列表
    示例：0 0,30 9 * * *
    适用场景：每天 9:00 和 9:30 触发

    符号：-
    含义：范围
    示例：0 0 9-18 * * *
    适用场景：每天 9 点到 18 点整点触发

    符号：/
    含义：步长
    示例：0 */5 * * * *
    适用场景：每 5 分钟触发一次

    符号：?
    含义：日/星期占位符（不能同时指定）
    示例：0 0 0 ? * MON
    适用场景：每周一 0 点触发

    符号：L
    含义：最后一天（日或星期）
    示例：0 0 0 L * ?
    适用场景：每月最后一天触发

    符号：W
    含义：最近工作日
    示例：0 0 0 15W * ?
    适用场景：每月 15 日最近的工作日

    符号：#
    含义：第 N 周的星期 X
    示例：0 0 0 ? * 6#3
    适用场景：每月第 3 个周五触发

常见场景示例：

    需求描述：每天凌晨 1 点执行
    Cron 表达式：0 0 1 * * ?
    解释：忽略星期和日冲突

    需求描述：每 30 分钟执行一次
    Cron 表达式：0 */30 * * * ?
    解释：从 0 秒开始，间隔 30 分钟

    需求描述：每周五下午 3 点触发
    Cron 表达式：0 0 15 ? * FRI
    解释：兼容日字段占位符

    需求描述：每月 1 日和 15 日 10:30 触发
    Cron 表达式：0 30 10 1,15 * ?
    解释：多值分隔

    需求描述：每年 1 月 1 日 0 点触发
    Cron 表达式：0 0 0 1 1 ? 2025
    解释：带年份（需系统支持）

## 4、项目搭建

1）创建项目

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype:

- Name: mall-scheduler-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.scheduler
- ArtifactId: mall-scheduler-service
- Version: 1.0.0

2）添加依赖

    <!-- SpringBoot 整合 Elasticjob -->
    <dependency>
        <groupId>org.apache.shardingsphere.elasticjob</groupId>
        <artifactId>elasticjob-lite-spring-boot-starter</artifactId>
        <version>3.0.4</version>
    </dependency>
    <dependency>
        <groupId>org.apache.curator</groupId>
        <artifactId>curator-recipes</artifactId>
        <version>5.4.0</version>
    </dependency>

3）配置文件

（1）主配置文件 application.yml 内容

    spring:
      application:
        name: mall-scheduler-service
      profiles:
        active: dev
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            namespace: ${spring.profiles.active:public}

（2）开发环境配置文件 application-dev.yml 内容

    server:
      port: 9008
    spring:
      config:
        import: #导入多个文件：Data ID?group=Group
          - nacos:mysql.yml?group=SECKILL_GROUP
          - nacos:mybatis.yml
          - nacos:log.yml
          - nacos:knife4j.yml
          - nacos:redis.yml
          - nacos:elasticjob.yml?group=SCHEDULER_GROUP

（3）在配置中心创建配置文件

    Data ID: elasticjob.yml
    Group: SCHEDULER_GROUP
    配置格式: yaml
    配置内容: 内容如下

文件内容：

    #配置 Elasticjob
    elasticjob:
      regCenter:
        serverLists: 192.168.100.101:2181
        namespace: mall-scheduler
        # 基础超时（必配）
        connection-timeout-milliseconds: 60000
        session-timeout-milliseconds: 60000
        # Curator 底层重试策略（关键！默认重试不够）
        maxRetries: 5
        base-sleep-time-milliseconds: 1000
        max-sleep-time-milliseconds: 5000
        # 关闭防火墙检测（部分环境会干扰）
        digest: ""
        # 强制使用 IPv4（避免 IPv6 解析问题）
        useIpv4: true

4）启动项目

（1）创建启动程序

    @SpringBootApplication(scanBasePackages = "com.example.mall", exclude = {DataSourceAutoConfiguration.class})
    public class SchedulerServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(SchedulerServiceApplication.class, args);
        }
    }

（2）启动项目

（略）

## 5、定时任务测试

（1）创建定时任务类

创建类 job.DemoTask.java。创建 Job 时需要实现 SimpleJob 接口，并重写 execute 方法。

    @Component
    public class DemoTask implements SimpleJob {
        @Override
        public void execute(ShardingContext shardingContext) {
            System.out.println("执行静态定时任务时间：" + LocalDateTime.now());
        }
    }

（2）配置任务

创建并导入 SCHEDULER_GROUP 组数据集 task.yml，配置工作任务：

    elasticjob:
      jobs: #多个工作任务配置信息
        demotask: # 任务名称，自定义，通常是任务类名
          #任务类，需要自定义
          elasticJobClass: com.example.mall.scheduler.job.DemoTask
          # 执行周期每 5 秒执行一次
          cron: 0/5 * * * * ?
          # 分片总数（分布式调度关键参数）
          sharding-total-count: 1
          # 如果 ZooKeeper 中已有配置，是否覆盖
          overwrite: true

（3）测试

启动项目，在控制台显示如下信息（定时任务配置成功）：

    执行静态定时任务时间：2026-07-24T07:08:00.054326600
    执行静态定时任务时间：2026-07-24T07:08:05.011761900
    执行静态定时任务时间：2026-07-24T07:08:10.011868800
    执行静态定时任务时间：2026-07-24T07:08:15.009469900

## 6、流程图文字推演

### ElasticJob 分布式定时任务执行流程

启动应用 --> 连接 ZooKeeper 注册中心 --> 注册作业配置与节点信息 --> 调度器根据分片策略分配任务到各节点 --> 各节点执行 SimpleJob 的 execute 方法 --> 执行结果反馈至注册中心 --> 故障节点任务自动迁移至其他节点

### 任务分片处理海量数据流程

任务触发 --> 调度器将大任务拆分为 N 个分片 --> 每个分片分配至不同工作节点 --> 各节点并行执行分片任务 --> 所有分片执行完成后汇总结果

## 💡 **速记**

【核心考点】

定时任务分为单机定时任务与分布式定时任务。单机独立执行、数据容量低、无高可用；分布式集群执行、支持分片、高可用、支持动态管理。

选型：单机简单任务用 @Scheduled；集群、海量数据、关键业务、频繁变更调度规则用分布式定时任务。

ElasticJob-Lite 是轻量级无中心化解决方案，依赖 ZooKeeper 实现分布式协调。核心组件包括作业、注册中心、分片策略、调度器。

Cron 表达式由 6-7 个字段组成，支持 *、,、-、/、?、L、W、# 等特殊符号。常见场景如每天凌晨 1 点：0 0 1 * * ?。

【高频逻辑链】

分布式定时任务：应用启动 --> 连接 ZooKeeper --> 注册作业配置 --> 调度器分配分片 --> 节点执行任务 --> 故障自动迁移。

任务堆积解决：任务分片（按业务维度拆分） --> N 台机器并行执行 --> 缩短总耗时。

【关键避坑】

分布式定时任务必须防止任务重复执行，ElasticJob 通过 ZooKeeper 协调实现集群中单点执行或分片并行执行。

Cron 表达式中，日（1-31）和星期（0-7）字段不能同时指定，需使用 ? 占位符。

ZooKeeper 连接超时、重试策略等参数需合理配置，否则可能因网络波动导致任务调度异常。
