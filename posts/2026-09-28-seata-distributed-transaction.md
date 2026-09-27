---
layout: article
title: "分布式事务实现（Seata）"
description: "- \"Seata定义：阿里开源的高性能分布式事务解决方案，2019年开源\"   - \"四大模式：AT(自动事务,零侵入,主流)、TCC(手动补偿)、SAGA(长事务)、XA(性能差)\"   - \"三大角色：TC(协调者,Server端)、TM(管理者,Client端,发起全局事务)、RM(资源管理者,Client端,分支事务)\"   - \"AT模式机制："
date: 2026-09-28
category: "云商城"
tags:
  - "微服务"
  - "分布式事务"
  - "Seata"
permalink: /posts/2026-09-28-seata-distributed-transaction.html
---

1、分布式事务解决方案 Seata

1）定义

Seata 是一款开源的分布式事务解决方案，致力于在微服务架构下提供高性能和简单易用的分布式事务服务。在 Seata 开源之前，Seata 对应的内部版本在阿里经济体内部一直扮演着分布式一致性中间件的角色，帮助经济体平稳的度过历年的双 11，对各 BU 业务进行了有力的支撑。经过多年沉淀与积累，商业化产品先后在阿里云、金融云进行售卖。2019.1 为了打造更加完善的技术生态和普惠技术成果，Seata 正式宣布对外开源，开放以来，广受欢迎，不到一年已经成为最受欢迎的分布式事务解决方案。

2）工作模式

Seata 将为用户提供了 AT、TCC、SAGA 和 XA 事务模式：

（1）AT 模式（自动事务，业务零侵入，主流）
基于 undo_log 回滚日志表实现，不用手动写 Try/Confirm/Cancel：
- 执行业务 DML 前，RM 记录当前数据快照（undo_log）；
- SQL 正常执行提交本地事务；
- 如果全局事务需要回滚：RM 读取 undo_log，反向执行补偿 SQL 恢复原始数据；
- 正常提交：异步删除 undo_log。
适用：MySQL/PostgreSQL 等支持本地事务的关系型数据库，普通订单、库存场景首选。

（2）TCC 模式（手动补偿，强一致性）
需要开发者自己实现 Try / Confirm / Cancel 三个接口，无数据库日志依赖，兼容非关系库、第三方支付接口。
优点：性能可控、不依赖数据库快照；缺点：侵入业务代码，开发量大。

（3）SAGA 模式
长事务场景（流程几十步、耗时长），正向业务接口 + 反向补偿接口，失败自动执行补偿逻辑。

（4）XA 模式
标准两阶段提交，数据库原生支持，性能差，并发场景极少使用。

3）Seata 架构

在使用 Seata 分布式事务管理框架时，通常涉及到多个服务的协调和事务的回滚/提交。Seata 通过使用全局事务 ID（Global Transaction ID，简称 XID）来管理跨多个服务的事务。
在 Seata 的架构中，一共有三个角色：

- TC(Transaction Coordinator)-事务协调器：Server 端，要单独部署，维护全局事务的运行状态，负责协调并驱动全局事务的提交和回滚。
- TM(Transaction Manager)-事务管理器：Client 端，控制全局事务边界，负责开启一个全局事务，并最终发起全局提交和全局回滚的决议。
- RM(Resource Manager)-资源管理器：Client 端，由业务系统集成，控制分支事务，负责分支注册、状态汇报，并接收事务协调器的指令，驱动分支（本地）事务的提交和回滚。

架构图说明：
Server 端包含 Seata-Server(TC 驱动器)，内部有 global_table(全局事务表)、branch_table(分支事务表)、lock_table(全局锁表)。
Client 端包含 TM(发起者)和 RM(干活的)。TM 向 TC 发起全局事务，TC 协调驱动各 RM。RM 控制本地事务（如 order-server 操作 table_order，stack-server 操作 table_stack），并在本地记录 undo_log。

4）工作机制（AT 模式）

（1）阶段一（Phase 1）：
- Seata 解析 SQL，生成更新前的数据镜像（before image）和更新后的镜像（after image）。
- 将镜像数据写入 undo_log 表，并在本地事务中提交业务 SQL 和回滚日志。
- 获取全局锁，确保其他事务无法修改同一行数据。

（2）阶段二（Phase 2）：
- 若全局事务提交成功，异步删除 undo_log 记录并释放锁。
- 若需回滚，根据 undo_log 生成反向 SQL 恢复数据。

以一个示例来说明整个 AT 分支的工作过程。
库存递减 AT 分支事务的业务逻辑：

    update sku set num = num - 100 where id = '1318599511605563394';

【一阶段】
① 解析 SQL：得到 SQL 的类型（UPDATE），表（sku），条件（where id = '1318599511605563394'）等相关的信息。
② 查询前镜像：根据解析得到的条件信息，生成查询语句，定位数据。

    select id, name, num,...... from sku where id = '1318599511605563394';

得到前镜像：

| id | name | num | ...... |
| :--- | :--- | :--- | :--- |
| 1318599511605563394 | ...... | 1000 | ...... |

③ 执行业务 SQL：更新这条记录的 id 为 'GTS'，全局唯一的 XID。
④ 查询后镜像：根据前镜像的结果，通过 主键 定位数据。

    select id, name, since from sku where id = 1318599511605563394;

得到后镜像：

| id | name | num | ...... |
| :--- | :--- | :--- | :--- |
| 1318599511605563394 | ...... | 900 | ...... |

⑤ 插入回滚日志：把前后镜像数据以及业务 SQL 相关的信息组成一条回滚日志记录，插入到 UNDO_LOG 表中。

    {
      "branchId": 641789253,
      "undoItems": [{
        "afterImage": {
          "rows": [{
            "fields": [{
              "name": "id",
              "type": 4,
              "value": 1318599511605563394
            }, {
              "name": "name",
              "type": 12,
              "value": "......"
            }, {
              "name": "num",
              "type": 4,
              "value": 900
            }]
          }],
          "tableName": "sku"
        },
        "beforeImage": {
          "rows": [{
            "fields": [{
              "name": "id",
              "type": 4,
              "value": 1318599511605563394
            }, {
              "name": "name",
              "type": 12,
              "value": "......"
            }, {
              "name": "num",
              "type": 4,
              "value": 1000
            }]
          }],
          "tableName": "sku"
        },
        "sqlType": "UPDATE"
      }],
      "xid": "xid:xxx"
    }

⑥ 提交前，向 TC 注册分支：申请 sku 表中，主键值等于"1318599511605563394"的记录的全局锁。
⑦ 本地事务提交：业务数据的更新和前面步骤中生成的 UNDO LOG 一并提交。
⑧ 将本地事务提交的结果上报给 TC。

【二阶段-回滚】
（1）收到 TC 的分支回滚请求，开启一个本地事务，执行如下操作。
（2）通过 XID 和 Branch ID 查找到相应的 UNDO LOG 记录。
（3）数据校验：拿 UNDO LOG 中的后镜像与当前数据进行比较，如果有不同，说明数据被当前全局事务之外的动作做了修改。
（4）根据 UNDO LOG 中的前镜像和业务 SQL 的相关信息生成并执行回滚的语句：

    update sku set num = 1000 where id = '1318599511605563394';

（5）提交本地事务。并把本地事务的执行结果（即分支事务回滚的结果）上报给 TC。

【二阶段-提交】
（1）收到 TC 的分支提交请求，把请求放入一个异步任务的队列中，马上返回提交成功的结果给 TC。
（2）异步任务阶段的分支提交请求后将异步批量地删除相应 UNDO LOG 记录。

2、Seata 安装与配置

1）准备数据库表

（1）创建独立 seata 数据库（TC 服务端库，必须单独创建）
给 Seata Server (TC 事务协调器) 使用，存全局事务状态、分支事务、全局锁：
数据库名：seata
三张核心表：global_table、branch_table、lock_table

    -- the table to store GlobalSession data
    CREATE TABLE IF NOT EXISTS `global_table`
    (
        `xid`                       VARCHAR(128) NOT NULL,
        `transaction_id`            BIGINT,
        `status`                    TINYINT      NOT NULL,
        `application_id`            VARCHAR(32),
        `transaction_service_group` VARCHAR(32),
        `transaction_name`          VARCHAR(128),
        `timeout`                   INT,
        `begin_time`                BIGINT,
        `application_data`          VARCHAR(2000),
        `gmt_create`                DATETIME,
        `gmt_modified`              DATETIME,
        PRIMARY KEY (`xid`),
        KEY `idx_status_gmt_modified` (`status` , `gmt_modified`),
        KEY `idx_transaction_id` (`transaction_id`)
    ) ENGINE = InnoDB
      DEFAULT CHARSET = utf8mb4;

    -- the table to store BranchSession data
    CREATE TABLE IF NOT EXISTS `branch_table`
    (
        `branch_id`         BIGINT       NOT NULL,
        `xid`               VARCHAR(128) NOT NULL,
        `transaction_id`    BIGINT,
        `resource_group_id` VARCHAR(32),
        `resource_id`       VARCHAR(256),
        `branch_type`       VARCHAR(8),
        `status`            TINYINT,
        `client_id`         VARCHAR(64),
        `application_data`  VARCHAR(2000),
        `gmt_create`        DATETIME(6),
        `gmt_modified`      DATETIME(6),
        PRIMARY KEY (`branch_id`),
        KEY `idx_xid` (`xid`)
    ) ENGINE = InnoDB
      DEFAULT CHARSET = utf8mb4;

    -- the table to store lock data
    CREATE TABLE IF NOT EXISTS `lock_table`
    (
        `row_key`        VARCHAR(128) NOT NULL,
        `xid`            VARCHAR(128),
        `transaction_id` BIGINT,
        `branch_id`      BIGINT       NOT NULL,
        `resource_id`    VARCHAR(256),
        `table_name`     VARCHAR(32),
        `pk`             VARCHAR(36),
        `status`         TINYINT      NOT NULL DEFAULT '0' COMMENT '0:locked ,1:rollbacking',
        `gmt_create`     DATETIME,
        `gmt_modified`   DATETIME,
        PRIMARY KEY (`row_key`),
        KEY `idx_status` (`status`),
        KEY `idx_branch_id` (`branch_id`),
        KEY `idx_xid` (`xid`)
    ) ENGINE = InnoDB
      DEFAULT CHARSET = utf8mb4;

    CREATE TABLE IF NOT EXISTS `distributed_lock`
    (
        `lock_key` CHAR(20) NOT NULL,
        `lock_value` VARCHAR(20) NOT NULL,
        `expire` BIGINT,
        primary key (`lock_key`)
    ) ENGINE = InnoDB
      DEFAULT CHARSET = utf8mb4;

    INSERT INTO `distributed_lock` (lock_key, lock_value, expire) VALUES ('AsyncCommitting', ' ', 0);
    INSERT INTO `distributed_lock` (lock_key, lock_value, expire) VALUES ('RetryCommitting', ' ', 0);
    INSERT INTO `distributed_lock` (lock_key, lock_value, expire) VALUES ('RetryRollbacking', ' ', 0);
    INSERT INTO `distributed_lock` (lock_key, lock_value, expire) VALUES ('TxTimeoutCheck', ' ', 0);

    SET FOREIGN_KEY_CHECKS = 1;

（2）各业务库内的 undo_log（客户端，订单库 / 库存库各自建）
每个微服务自己的业务库单独建一张，AT 模式用来存数据快照、做本地回滚，不属于 seata 数据库。
例如，分别在数据库 shop_goods 和 shop_order 中创建回滚日志表：

    CREATE TABLE `undo_log` (
      `id` bigint(20) NOT NULL AUTO_INCREMENT,
      `branch_id` bigint(20) NOT NULL,
      `xid` varchar(100) NOT NULL,
      `context` varchar(128) NOT NULL,
      `rollback_info` longblob NOT NULL,
      `log_status` int(11) NOT NULL,
      `log_created` datetime NOT NULL,
      `log_modified` datetime NOT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `ux_undo_log` (`xid`,`branch_id`)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

2）服务注册

在 nacos 创建命名空间 seata（注意，id 为 seata）

3）安装

（1）创建文件夹，用来映射 docker 虚拟机

    mkdir -p /data/local/seata/conf/

（2）核心配置

安装最小 seata，获取原始配置文件：

    docker run -d --name seata -p 7091:7091 -p 8091:8091 --privileged=true -e SEATA_IP=192.168.100.101 seataio/seata-server

复制原始配置文件到映射文件夹（将容器文件复制到本地）：

    docker cp seata:/seata-server/resources/application.yml /data/local/seata/conf/

编辑文件 application.yml，采用 DB 存储+Nacos 注册配置：

    server:
      port: 7091

    spring:
      application:
        name: seata-server

    logging:
      config: classpath:logback-spring.xml
      file:
        path: ${log.home:${user.home}/logs/seata}
      extend:
        logstash-appender:
          destination: 127.0.0.1:4560
        kafka-appender:
          bootstrap-servers: 127.0.0.1:9092
          topic: logback_to_logstash

    console:
      user:
        username: seata
        password: seata

    seata:
      config:
        # support: nacos, consul, apollo, zk, etcd3
        type: nacos
        nacos:
          server-addr: 192.168.100.101:8848
          group: SEATA_GROUP
          namespace: seata
          username: nacos
          password: nacos
      registry:
        # support: nacos, eureka, redis, zk, consul, etcd3, sofa
        type: nacos
        nacos:
          application: seata-server
          server-addr: 192.168.100.101:8848
          group: SEATA_GROUP
          namespace: seata
          username: nacos
          password: nacos
          # registry.conf 中，配置 cluster 名称
          cluster: default
      store:
        # support: file 、 db 、 redis
        mode: db
        db:
          datasource: druid
          db-type: mysql
          driver-class-name: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://192.168.100.101:3306/seata?characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai&rewriteBatchedStatements=true&allowPublicKeyRetrieval=true
          user: root
          password: root
          min-conn: 10
          max-conn: 100
          global-table: global_table
          branch-table: branch_table
          lock-table: lock_table
          distributed-lock-table: distributed_lock
          query-limit: 1000
          max-wait: 5000
      # server:
      #  service-port: 8091 #If not configured, the default is '${server.port} + 1000'
      security:
        secretKey: SeataSecretKey0c382ef121d778043159209298fd40bf3850a017
        tokenValidityInMilliseconds: 1800000
        ignore:
          urls:
            /,/**/*.css,/**/*.js,/**/*.html,/**/*.map,/**/*.svg,/**/*.png,/**/*.jpeg,/**/*.ico,/api/v1/auth/login,/health,/error

（3）部署

注意：先删除原安装的容器：

    docker stop seata && docker rm seata

重新安装：
① 安装环境
内存：4G，虚拟内容是物理内存的 1-2 倍，创建虚拟内存见附录一。
磁盘：100G，如果你的 Linux 虚拟机磁盘空间<100G，需要扩容，扩容方法见附录一。

② 部署

    docker run -d --name seata --restart=always -p 7091:7091 -p 8091:8091 --memory=1g --memory-swap=4g -v /data/local/seata/conf/application.yml:/seata-server/resources/application.yml -v /data/local/seata/logs:/root/logs/seata -e SEATA_IP=192.168.100.101 -e JAVA_OPTS="-Xms128m -Xmx256m -Xmn64m -XX:MetaspaceSize=64m -XX:MaxMetaspaceSize=128m -XX:MaxDirectMemorySize=256m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError" seataio/seata-server

（4）在 nacos 上看到服务注册成功
服务列表：命名空间 seata，分组名称 SEATA_GROUP，服务名 seata-server，集群数目 1，实例数 1，健康实例数 1，触发保护阈值 false。
安装完成。

（5）在事务调试过程中，可以通过 web 页面查看事务信息：http://ip:7091（用户名和密码 seata）。

3、订单分布式事务实现

1）在项目中导入依赖包

分别在 mall-goods-service 和 mall-order-service 引入如下依赖包，注意：不需要在父工程 导入，如果在父工程导入，没有配置 seata 的项目会出错：

    <dependency>
        <groupId>com.alibaba.cloud</groupId>
        <artifactId>spring-cloud-starter-alibaba-seata</artifactId>
    </dependency>

2）参数配置

（1）在 nacos 创建 order_stock.yml 配置文件，组为 SEATA_GROUP：

    seata:
      # 定义当前微服务所属的虚拟事务组,把所有需要参与分布式事务的微服务（订单、商品），全部拉入同一个事务团队，
      tx-service-group: order_stock_tx_group # 事务组名称，默认，参与同一分布式事务的所有服务，tx-service-group 必须完全一致
      service:
        # 建立 事务组名称 和 Seata 集群名称 的绑定关系
        vgroup-mapping:
          order_stock_tx_group: default # TC 集群的名称，与配置 seata 服务核心配置文件的名称一致
        grouplist:
          default: 192.168.100.101:8091 # TC 服务地址列表，多个地址用逗号分隔，8091 为 RPC 通信端口

（2）分别在 mall-order-service 和 mall-goods-service 的 yml 文件中导入配置：

    - nacos:order_stock.yml?group=SEATA_GROUP

3）完成订单服务

（1）发起事务 TM：
生成订单：mall-order-service 的 OrderServiceImpl 的 create 方法，发起了以下三个分支服务。

（2）分支事务 RM：
① 实现库存递减：mall-product-service 的 SkuInfoServiceImpl 的 decreaseStock 方法。
② 删除购物车：mall-cart-service 的 CartServiceImpl 的 removeCart 方法。
注意，Seata 不支持 MongoDB，此处事务暂不考虑（可以用 MQ 事务来处理）。
③ 生成订单和订单详情：mall-order-service 的 OrderServiceImpl 的 create 方法。
注意，虽然生成订单和订单详情是两个业务，但 OrderServiceImpl 的 create 方法通过事务的传播行为对生成订单和订单详情进行事务管理。同时 OrderServiceImpl 的 create 方法又是 TM，所以将此方法视为分布式事务的发起者。

（3）在分支事务 RM 添加@Transactional 注解，实现本地事务
（4）在 TM 添加全局事务注解@GlobalTransactional
在 mall-order-service 服务的 OrderServiceImpl 添加注解@GlobalTransactional，不需要添加@Transactional 注解。

（5）测试场景三
在保存明细订单完成行加断点：

    orderItemsService.saveBatch(orderItemsList);

---

💡 **速记**

**【Seata 核心概念】**
*   **定义**：阿里开源的分布式事务解决方案，2019年开源。
*   **四大模式**：AT（自动事务，零侵入，主流，基于 undo_log）、TCC（手动补偿，强一致，侵入大）、SAGA（长事务，正向+补偿）、XA（数据库原生，性能差）。
*   **三大角色（高频考点）**：
    *   **TC (Transaction Coordinator)**：Server 端，独立部署，协调者，维护全局事务状态。
    *   **TM (Transaction Manager)**：Client 端，发起者，控制全局事务边界，开启/提交/回滚。
    *   **RM (Resource Manager)**：Client 端，分支事务，与数据库交互，上报状态，执行回滚。

**【AT 模式工作流程（核心原理）】**
*   **一阶段**：解析 SQL -> 查询前镜像 -> 执行业务 SQL -> 查询后镜像 -> 插入 undo_log（记录快照） -> 注册分支获取全局锁 -> 提交本地事务 -> 上报 TC。
*   **二阶段-回滚**：收到 TC 回滚请求 -> 查 undo_log -> 数据校验 -> 反向 SQL 恢复数据 -> 提交本地事务 -> 上报 TC。
*   **二阶段-提交**：收到 TC 提交请求 -> 放入异步队列 -> 返回成功 -> 异步批量删除 undo_log。

**【Seata 安装与配置（踩分点）】**
1. **数据库表**：Server 端建独立 `seata` 库（global_table, branch_table, lock_table, distributed_lock）；Client 端在业务库建 `undo_log` 表。
2. **Nacos 注册**：在 Nacos 创建命名空间 `seata`。
3. **Docker 部署**：`seataio/seata-server`，映射 7091 (Web) 和 8091 (RPC) 端口。
4. **application.yml**：配置 Nacos 注册/配置中心、DB 存储模式、数据库连接信息。

**【订单业务整合】**
*   **依赖**：在**具体微服务**中引入 `spring-cloud-starter-alibaba-seata`（不要在父工程引入）。
*   **Nacos 配置**：`tx-service-group` (事务组名，必须一致)，`vgroup-mapping` (映射 TC 集群名)，`grouplist` (TC 地址)。
*   **代码改造**：TM（订单服务）加 `@GlobalTransactional`，RM（库存/购物车服务）加 `@Transactional`。注意：Seata 不支持 MongoDB。
