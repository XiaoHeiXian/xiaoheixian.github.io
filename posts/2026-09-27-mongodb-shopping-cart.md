---
layout: article
title: "MongoDB 实现购物车"
description: "- \"推荐选型：购物车数据结构多变，推荐使用非关系型数据库 MongoDB\"   - \"关系型数据库：先定结构，再存数据，遵守相同字段，不可随意新增\"   - \"非关系型数据库：自由变结构，不用提前定义/改表，支持嵌套结构\"   - \"选型原因：结构多变适配业务迭代、读多写多并发高、Redis吃内存不适合\"   - \"核心概念：文档(Document)、"
date: 2026-09-27
category: "云商城"
tags:
  - "MongoDB"
  - "购物车"
permalink: /posts/2026-09-27-mongodb-shopping-cart.html
---

在当今电商平台中，购物车功能是一个至关重要的部分，它能够存储用户选择的商品信息以便用户最终进行结算。选择合适的数据库来存储购物车的数据是开发中的一个关键步骤，推荐使用非关系型数据库 MongoDB，tair，Redis。

1、关系型数据库与非关系型数据库

非关系型数据库无固定表结构、字段可动态增减、不同数据行 / 文档结构可完全不一样，和 MySQL 等关系型数据库（固定表、固定字段）形成鲜明对比：

- 关系型数据库：先定结构，再存数据。建表后所有行必须遵守相同字段，不能随意新增字段、嵌套结构。
- 非关系型数据库：数据随业务自由变结构，不用提前定义、不用改表，数据以独立文档存储，每个文档字段、层级、内容都可以不一样，无需提前定义表结构。

示例一：关系型数据库（MySQL）固定结构

    -- MySQL 用户表，结构永久固定
    CREATE TABLE user(
        id INT,
        name VARCHAR(20),
        age INT
    )

示例二：文档型 NoSQL（MongoDB）

集合名：user（不用提前建表）

普通用户文档（只有基础字段）

    { "_id": 1, "name": "张三", "age": 22 }

会员用户字段（单独加 vip、expire）

    { "_id": 2, "name": "李四", "age": 25, "vip": true, "expire": "2026-12-31" }

老年用户字段（去掉 age，加 tel、health）

    { "_id": 3, "name": "王五", "tel": "13800138000", "health": "良好" }

特点：同一个“表”里，三条数据结构完全不同，不用改库表结构。

示例三：给用户增加嵌套对象、数组，结构动态扩展，支持无限嵌套复杂结构（关系型做不到）

    {
        "_id": 4,
        "name": "赵六",
        "age": 28,
        "address": { "province": "广东", "city": "深圳" }, // 嵌套对象
        "hobby": ["跑步", "看书", "摄影"] // 数组字段
    }

后续新用户还可以再加多层嵌套，无需任何结构变更。

2、为什么选择 MongoDB

MongoDB 的特性与购物车业务场景高度契合，核心原因如下：

- 购物车商品结构多变（如规格、数量、选中状态、临时优惠等），MongoDB 是文档型数据库无需固定表结构，可直接存储 JSON 格式的购物车文档，适配业务迭代；MySQL 结构固定，一个购物车可能关联多张表，涉及到多表查询。
- 购物车是“读多写多”场景（用户频繁增删改查商品），MongoDB 基于内存映射 + 文档级锁，高并发下读写性能优于 MySQL（行锁 / 表锁开销）。
- Redis 是基于内存的数据库，适合做缓存，快速读写，但购物车的数据量比较大，会消耗大量的内存，不适合做购物车。

3、MongoDB 简介

- MongoDB 数据库：MongoDB 是一个基于分布式文件存储的开源 NoSQL 数据库系统，通常用于处理大数据和高并发的应用场景。在高负载的情况下，添加更多的节点，可以保证服务器性能。MongoDB 将数据存储为一个文档，数据结构由键值(key=>value)对组成。MongoDB 文档类似于 JSON（简称 BSON）对象。字段值可以包含其他文档，数组及文档数组。
- MongoDB 存储原理：MongoDB 是一个基于磁盘的数据库系统，数据主要存储在硬盘上，以确保数据的持久性。即使服务器重启或发生故障，数据也不会丢失。然而，MongoDB 也充分利用了内存来提高性能。它使用了一种称为“MMapv1”的存储引擎，将数据文件映射到虚拟内存中，这样操作系统可以将热门数据缓存在内存中，从而加快读写操作。

MongoDB 的存储结构区别于传统的关系型数据库，由如下三个单元组成：

- 文档（Document）：MongoDB 中最基本的单元，由 BSON 键值对（key-value）组成。相当于关系型数据库中的行（Row）。
- 集合（Collection）：一个集合可以包含多个文档，相当于关系型数据库中的表格（Table）。
- 数据库（Database）：等同于关系型数据库中的数据库概念，一个数据库中可以包含多个集合。您可以在 MongoDB 中创建多个数据库。

关系型数据库与 MongoDB 常见术语对比

| 关系型数据库 | MongoDB |
| :--- | :--- |
| 表（Table） | 集合（Collection） |
| 行（Row） | 文档（Document） |
| 列（Col） | 字段（Field） |
| 主键（Primary Key） | _id（Objectid） |
| 索引（Index） | 索引（Index） |
| 嵌套表（Embedded Table） | 嵌入式文档（Embedded Document） |
| 数组（Array） | 数组（Array） |

4、Docker 安 MongoDB

（1）安装

mongodb5.x 以上安装需要 cpu 支持 avx 指令集，避免 cpu 不支持 avx 的情况，我们安装 4.x 版本的 mongodb。

    [root@192 ~]# docker run --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=root -d mongo:4.4

（2）用 Navicate 连接

在 Navicate 创建连接，选择 MongoDB，连接名称填写 linux-mongodb，类型选择 Standalone。

5、数据库的操作

1）数据库操作

（1）选择创建数据库

在 MongoDB 中，如果数据库不存在，会自动创建。

在 Navicate 中选择 mongodb，新建查询：

    use 集合空间名字(数据库名字)

（2）删除数据库

在删除数据库之前，确保你已经切换到了你想要操作的数据库：

    db.dropDatabase()

（3）给数据库授权

    db.createUser({user:"用户名",pwd:"密码",roles:[{role:"授予权限",db:"指定数据库"}]})

例如：给数据库 shop 授予读写权限

    db.createUser({user:"sh",pwd:"sh",roles:[{role:"readWrite",db:"shop"}]})

创建了用户 sh（密码为 sh），并授予数据库 shop 的读写权限。

（4）删除用户

在删除数据库用户之前，确保你已经切换到了你想要操作的数据库：

    db.dropUser("username")

例如：删除用户 sh

    db.dropUser("sh")

---

💡 **速记**

**【为什么购物车选 MongoDB 而不是 MySQL？】**
1. **结构灵活**：购物车商品结构多变（规格、数量、选中状态），MongoDB 无需固定表结构，直接存 JSON，适配业务迭代。
2. **读写性能**：购物车是“读多写多”场景，MongoDB 基于内存映射+文档级锁，高并发下性能优于 MySQL。
3. **不吃内存**：Redis 基于内存，购物车数据量大，会消耗大量内存，不适合做持久化存储（适合做缓存）。

**【核心概念与术语对比（高频考点）】**
*   **文档 (Document)**：最基本单元，BSON 键值对，相当于 MySQL 的**行 (Row)**。
*   **集合 (Collection)**：多个文档的集合，相当于 MySQL 的**表 (Table)**。
*   **数据库 (Database)**：包含多个集合，相当于 MySQL 的**数据库**。
*   **主键**：MySQL 用 `Primary Key`，MongoDB 用 `_id` (Objectid)。

**【MongoDB 核心优势（举例说明）】**
支持**嵌套对象**和**数组**。例如：`address` 为嵌套对象，`hobby` 为数组，且不同文档的字段可以完全不同，无需改表结构。

**【Docker 部署核心命令】**
安装 4.x 版本（避开 CPU avx 指令集限制）。
`docker run --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=root -d mongo:4.4`

**【数据库常用操作指令】**
*   创建/切换数据库：`use 数据库名`（不存在会自动创建）。
*   删除数据库：`db.dropDatabase()`。
*   创建用户并授权：`db.createUser({user:"用户名",pwd:"密码",roles:[{role:"readWrite",db:"数据库名"}]})`。
*   删除用户：`db.dropUser("用户名")`。
