---
layout: article
title: "ES 数据库基本概念"
description: "- \"文档和字段：文档是ES中的一条数据，字段是JSON文档中的属性。\"   - \"索引和映射：索引是相同类型文档的集合，映射是索引中文档的字段约束。\"   - \"MySQL 对比：Table 对应 Index，Row 对应 Document，Column 对应 Field。\"   - \"分工：MySQL 擅长事务操作保障安全，ES 擅长海量数据的搜索与"
date: 2026-10-09
category: "云商城"
tags:
  - "Elasticsearch"
  - "数据库"
  - "概念"
permalink: /posts/2026-10-09-es-database-core-concepts.html
---

elasticsearch 中有很多独有的概念，与 mysql 中略有差别，但也有相似之处。

## 1、文档和字段

一个文档就像数据库里的一条数据，字段就像数据库里的列。

elasticsearch 是面向文档（Document）存储的，可以是数据库中的一条商品数据，一条订单信息。文档数据会被序列化为 json 格式后存储在 elasticsearch 中：

![架构示意图](https://xiaoheixian.github.io/posts/assets/330_65.png)

MySQL 表结构：

    id | title | price
    1  | 小米手机 | 3499
    2  | 华为手机 | 4999
    3  | 华为小米充电器 | 49
    4  | 小米手环 | 299

对应的 JSON 文档：

    {
      "id": 1,
      "title": "小米手机",
      "price": 3499
    }
    {
      "id": 2,
      "title": "华为手机",
      "price": 4999
    }
    {
      "id": 3,
      "title": "华为小米充电器",
      "price": 49
    }
    {
      "id": 4,
      "title": "小米手环",
      "price": 299
    }

而 Json 文档中往往包含很多的字段（Field），类似于 mysql 数据库中的列。

## 2、索引和映射

索引就像数据库里的表，映射就像数据库中定义的表结构。

索引（Index），就是相同类型的文档的集合，类似 mysql 中的表。

例如：

（1）所有用户文档，就可以组织在一起，称为用户的索引；

（2）所有商品的文档，可以组织在一起，称为商品的索引；

（3）所有订单的文档，可以组织在一起，称为订单的索引；

![架构示意图](https://xiaoheixian.github.io/posts/assets/331_65.png)

商品索引：

    {
      "id": 1,
      "title": "小米手机",
      "price": 3499
    }
    {
      "id": 2,
      "title": "华为手机",
      "price": 4999
    }
    {
      "id": 3,
      "title": "三星手机",
      "price": 3999
    }

用户索引：

    {
      "id": 101,
      "name": "张三",
      "age": 21
    }
    {
      "id": 102,
      "name": "李四",
      "age": 24
    }
    {
      "id": 103,
      "name": "麻子",
      "age": 18
    }

订单索引：

    {
      "id": 10,
      "userId": 101,
      "goodsId": 1,
      "totalFee": 294
    }
    {
      "id": 11,
      "userId": 102,
      "goodsId": 2,
      "totalFee": 328
    }

因此，我们可以把索引当做是数据库中的表。

数据库的表会有约束信息，用来定义表的结构、字段的名称、类型等信息。因此，索引库中就有映射（mapping），是索引中文档的字段约束信息，类似表的结构约束。

## 3、mysql 与 elasticsearch

Mysql：擅长事务类型操作，可以确保数据的安全和一致性。

Elasticsearch：擅长海量数据的搜索、分析、计算。

我们统一的把 mysql 与 elasticsearch 的概念做一下对比：

    MySQL：Table
    Elasticsearch：Index
    说明：索引(index)，就是文档的集合，类似数据库的表(table)

    MySQL：Row
    Elasticsearch：Document
    说明：文档（Document），就是一条条的数据，类似数据库中的行（Row），文档都是 JSON 格式

    MySQL：Column
    Elasticsearch：Field
    说明：字段（Field），就是 JSON 文档中的字段，类似数据库中的列（Column）

    MySQL：Schema
    Elasticsearch：Mapping
    说明：Mapping（映射）是索引中文档的约束，例如字段类型约束。类似数据库的表结构（Schema）

    MySQL：SQL
    Elasticsearch：DSL
    说明：DSL 是 elasticsearch 提供的 JSON 风格的请求语句，用来操作 elasticsearch，实现 CRUD

## 4、企业中结合使用

在企业中，往往是两者结合使用：

对安全性要求较高的写操作，使用 mysql 实现。

对查询性能要求较高的搜索需求，使用 elasticsearch 实现。

两者再基于某种方式，实现数据的同步，保证一致性。

![架构示意图](https://xiaoheixian.github.io/posts/assets/332_65.png)

## 5、流程图文字推演

### MySQL 与 Elasticsearch 协同工作流程

用户端发起 CRUD 请求 --> 服务器接收请求 --> 根据操作类型进行分流

写操作（增删改） --> 请求发送至 MySQL --> MySQL 保障数据安全与事务一致性 --> 数据同步机制（如 Canal、MQ） --> 将数据同步至 Elasticsearch

搜索请求（查询） --> 请求发送至 Elasticsearch --> Elasticsearch 基于倒排索引高效检索海量数据 --> 返回查询结果给服务器 --> 服务器返回结果给用户端

💡 **速记**

【核心考点】

Elasticsearch 是面向文档（Document）存储的，文档以 JSON 格式序列化存储，字段（Field）类似于数据库的列。

索引（Index）是相同类型文档的集合，类似于 MySQL 的表（Table）；映射（Mapping）是索引中文档的字段约束，类似于表结构（Schema）。

【高频逻辑链】

MySQL 与 ES 对比：Table -> Index，Row -> Document，Column -> Field，Schema -> Mapping，SQL -> DSL。

企业级分工：写操作走 MySQL（保证安全与事务），搜索操作走 ES（保证海量数据检索性能），两者通过数据同步机制保证最终一致性。

【关键避坑】

不要把 ES 当作关系型数据库使用，ES 不擅长事务操作，无法保证强一致性，仅适合海量数据的搜索、分析与计算。

在写入数据到 ES 时，必须先定义好映射（Mapping），明确字段类型（如 keyword、text、date 等），否则后期修改映射结构非常麻烦，需要重建索引。
