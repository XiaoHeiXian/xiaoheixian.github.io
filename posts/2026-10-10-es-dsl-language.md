---
layout: article
title: "ES 的 DSL 语言"
description: "- \"概念类比：Index 对应 Database，Document 对应 Row，Field 对应 Column。\"   - \"索引库操作：必须创建 Mapping 映射，定义字段的 type、index 和 analyzer。\"   - \"Mapping 属性：text 支持分词，keyword 精确匹配，支持数值、布尔、日期、对象类型。\"   -"
date: 2026-10-10
category: "云商城"
tags:
  - "Elasticsearch"
  - "DSL"
  - "搜索"
permalink: /posts/2026-10-10-es-dsl-language.html
---

Elasticsearch 是面向文档型数据库，一条数据在这里就是一个文档。为了方便大家理解，我们将 Elasticsearch 里存储文档数据和关系型数据库 MySQL 存储数据的概念进行一个类比：

![架构示意图](https://xiaoheixian.github.io/posts/assets/333_65.png)

    Elasticsearch：Index(索引)
    MySQL：Database(数据库)

    Elasticsearch：Type(类型)
    MySQL：Table(表)

    Elasticsearch：Documents(文档)
    MySQL：Row(行)

    Elasticsearch：Fields(字段)
    MySQL：Column(列)

## 1、索引库操作

索引库就类似数据库表，mapping 映射就类似表的结构。我们要向 es 中存储数据，必须先创建“库”和“表”。

### （1）Mapping 映射属性

mapping 是对索引库中文档的约束，常见的 mapping 属性（properties，该字段的子字段）包括：

- type：字段数据类型，常见的简单类型有：
    - 字符串：text（可分词的文本）。
    - keyword：精确值，例如：品牌、国家、ip 地址，keyword 类型只能整体搜索，不支持搜索部分内容
    - 数值：long、integer、short、byte、double、float、
    - 布尔：boolean
    - 日期：date
    - 对象：object

- index：是否创建索引，默认为 true

- analyzer：使用哪种分词器（ik_max_word, ik_smart）

例如下面的 json 文档：

    {
        "age": 21,
        "weight": 52.1,
        "isMarried": false,
        "info": "真相只有一个！",
        "email": "zy@itcast.cn",
        "score": [99.1, 99.5, 98.9],
        "name": {
            "firstName": "柯",
            "lastName": "南"
        }
    }

对应的每个字段映射（mapping）：

age：类型为 integer；参与搜索，因此需要 index 为 true；无需分词器

weight：类型为 float；参与搜索，因此需要 index 为 true；无需分词器

isMarried：类型为 boolean；参与搜索，因此需要 index 为 true；无需分词器

info：类型为字符串，需要分词，因此是 text；参与搜索，因此需要 index 为 true；分词器可以用 ik_smart

email：类型为字符串，但是不需要分词，因此是 keyword；不参与搜索，因此需要 index 为 false；无需分词器

score：虽然是数组，但是我们只看元素的类型，类型为 float；参与搜索，因此需要 index 为 true；无需分词器

name：类型为 object，需要定义多个子属性

name.firstName：类型为字符串，但是不需要分词，因此是 keyword；参与搜索，因此需要 index 为 true；无需分词器

name.lastName：类型为字符串，但是不需要分词，因此是 keyword；参与搜索，因此需要 index 为 true；无需分词器

### （2）索引库的 CRUD

CRUD 简单描述：

- 创建索引库：PUT /索引库名
- 查询索引库：GET /索引库名
- 删除索引库：DELETE /索引库名
- 修改索引库（添加字段）：PUT /索引库名/_mapping

### （3）创建索引库和映射

基本语法：

请求方式：PUT

请求路径：/索引库名

请求参数：mapping 映射

格式：

    PUT /索引库名称
    {
      "mappings": {
        "properties": {
          "字段名":{
            "type": "text",
            "analyzer": "ik_smart"
          },
          "字段名2":{
            "type": "keyword",
            "index": "false"
          },
          "字段名3":{
            "properties": {
              "子字段": {
                "type": "keyword"
              }
            }
          }
        }
      }
    }

### （4）修改索引库

倒排索引结构虽然不复杂，但是一旦数据结构改变（比如改变了分词器），就需要重新创建倒排索引，这简直是灾难。因此索引库一旦创建，无法修改 mapping。

虽然无法修改 mapping 中已有的字段，但是却允许添加新的字段到 mapping 中，因为不会对倒排索引产生影响。

语法说明：

    PUT /索引库名/_mapping
    {
      "properties": {
        "新字段名":{
          "type": "integer"
        }
      }
    }

### （5）删除索引库

语法：

请求方式：DELETE

请求路径：/索引库名

请求参数：无

格式：

    DELETE /索引库名

### （6）查询索引库

基本语法：

请求方式：GET

请求路径：/索引库名

请求参数：无

格式：

    GET /索引库名

### 【例】创建商品索引库

① 创建库结构

    PUT /sku_info
    {
      "mappings": {
        "properties": {
          "sku_id":{
            "type": "keyword"
          },
          "name":{
            "type": "text",
            "index": true,
            "analyzer": "ik_max_word"
          },
          "category":{
            "properties": {
              "category_id": {
                "type": "keyword"
              },
              "category_name": {
                "type": "keyword"
              }
            }
          },
          "price":{
            "type": "float",
            "index": true
          }
        }
      }
    }

② 修改库结构

    PUT /sku_info/_mapping
    {
      "properties": {
        "from_date":{
          "type": "text",
          "index": true,
          "analyzer": "ik_max_word"
        }
      }
    }

③ 显示库结构

    GET /sku_info

## 2、文档操作

创建文档：POST /{索引库名}/_doc/文档 id

查询文档：GET /{索引库名}/_doc/文档 id

删除文档：DELETE /{索引库名}/_doc/文档 id

修改文档：

全量修改：PUT /{索引库名}/_doc/文档 id

增量修改：POST /{索引库名}/_update/文档 id { "doc": {字段}}

### （1）新增文档

语法：

    POST /索引库名/_doc/文档id
    {
        "字段1": "值1",
        "字段2": "值2",
        "字段3": {
            "子属性1": "值3",
            "子属性2": "值4"
        }
    }

### （2）删除文档

删除使用 DELETE 请求，同样，需要根据 id 进行删除：

语法：

    DELETE /{索引库名}/_doc/id值

### （3）修改文档

修改有两种方式：

- 全量修改：直接覆盖原来的文档
- 增量修改：修改文档中的部分字段

全量修改

全量修改是覆盖原来的文档，其本质是：

根据指定的 id 删除文档

新增一个相同 id 的文档

注意：如果根据 id 删除时，id 不存在，第二步的新增也会执行，也就从修改变成了新增操作了。

语法：

    PUT /{索引库名}/_doc/文档id
    {
        "字段1": "值1",
        "字段2": "值2",
        ... 略
    }

增量修改

增量修改是只修改指定 id 匹配的文档中的部分字段。

语法：

    POST /{索引库名}/_update/文档id
    {
        "doc": {
            "字段名": "新的值",
        }
    }

### 【例】向商品索引库添加数据

① 新增数据 3 条数据

    POST /sku_info/_doc/1
    {
        "sku_id":1,
        "name":"2024 款华为全球首发 PRO 手机",
        "category":{
            "category_id":1,
            "category_name":"数码"
        },
        "price":9998,
        "from_date":"2024-08-20"
    }

    POST /sku_info/_doc/2
    {
        "sku_id":1,
        "name":"2024 款小米全球首发 PRO 手机",
        "category":{
            "category_id":1,
            "category_name":"数码"
        },
        "price":6998,
        "from_date":"2024-09-20"
    }

    POST /sku_info/_doc/3
    {
        "sku_id":1,
        "name":"2024 款米其林小童装",
        "category":{
            "category_id":2,
            "category_name":"服装"
        },
        "price":98,
        "from_date":"2024-09-30"
    }

② 增量修改数据

    POST /sku_info/_update/1
    {
        "doc": {
            "price":8998
        }
    }

### （4）文档查询

根据 rest 风格，新增是 post，查询应该是 get，不过查询一般都需要条件。

查询所有数据

    GET /sku_info/_search

按 ID 查询

    GET /sku_info/_doc/1

按条件查询

    GET /索引表/_search
    {
      "query": {
        "查询类型": {
          "查询条件": "条件值"
        }
      }
    }

- 精准查询类型：
    - term 查询：根据词条精确匹配，一般搜索 keyword 类型、数值类型、布尔类型、日期类型字段
    - range 查询：根据数值范围查询，可以是数值、日期的范围
- 模糊查询类型：
    - match 查询：单字段查询
- multi_match 查询：多字段查询，任意一个字段符合条件就算符合查询条件
- bool 查询：用于组合多个子查询的复合查询，支持逻辑运算
    - must：必须满足（AND）
    - should：应该满足（OR）
    - must_not：必须不满足（NOT）
    - filter：必须满足（AND），高性能过滤（如范围、状态）

### 【例】查询数据

term 查询：

    GET /sku_info/_search
    {
      "query": {
        "term": {
          "category.category_name": {
            "value": "数码"
          }
        }
      }
    }

range 查询：

    GET /sku_info/_search
    {
      "query": {
        "range": {
          "price": {
            "gte": 100,
            "lte": 10000
          }
        }
      }
    }

match 查询：

    GET /sku_info/_search
    {
      "query": {
        "match": {
          "name": "手机"
        }
      }
    }

    GET /sku_info/_search
    {
      "query": {
        "match": {
          "from_date": "09"
        }
      }
    }

bool 查询：

    GET /sku_info/_search
    {
      "query": {
        "bool": {
          "must": [ { "match": { "name": "手机" } } ], // 必须包含关键词
          "filter": [ { "range": { "price": { "gte": 100 } } } ], // 价格≥100
          "must_not": [ { "term": { " category.category_name ": "数码" } } ] // 排除数码商品
        }
      }
    }

### （5）高级查询

除了上面这些查询外，还有地理查询，高亮显示、排序、分页等：

查询的 DSL 是一个大的 JSON 对象，包含下列属性：

- query：查询条件
- from 和 size：分页条件
- sort：排序条件
- highlight：高亮条件
- aggs：定义聚合

### 【例】分页、排序、高亮显示、聚合查询

    GET /sku_info/_search
    {
      "query": {
        "match": {
          "name": "2024"
        }
      },
      "from": 0,
      "size": 3,
      "sort": [
        {
          "price": {
            "order": "desc"
          }
        }
      ],
      "highlight": {
        "fields": {
          "price": {
            "pre_tags": "<em>",
            "post_tags": "</em>"
          }
        }
      },
      "aggs": {
        "sumaggs": {
          "sum": {
            "field": "price"
          }
        }
      }
    }

### （6）字段筛选

_source 用于控制返回文档的原始字段，支持以下两种操作模式：

- includes：包含字段，指定需返回的字段列表（白名单）
- excludes：排除字段，指定需过滤的字段列表（黑名单）

### 【例 8-1-05】查询数据，筛选字段

    GET /sku_info/_search
    {
      "query": {
        "term": {
          "category.category_name": {
            "value": "数码"
          }
        }
      },
      "_source": {
        "includes": ["name", "price"]
      }
    }

## 3、流程图文字推演

### 索引库与文档操作流程

创建索引库（定义 Mapping 映射） --> 新增文档（POST 指定 ID） --> 查询文档（GET 按 ID 或条件） --> 修改文档（全量 PUT 覆盖或增量 POST 更新） --> 删除文档（DELETE 指定 ID）

### 复杂条件查询流程

用户发起查询请求 --> 解析 Query 条件 --> 判断查询类型

精准匹配 --> term 查询（keyword/数值/布尔/日期）或 range 查询（数值/日期范围）

模糊匹配 --> match 查询（单字段）或 multi_match 查询（多字段）

复合条件 --> bool 查询 --> 组合 must（AND）、should（OR）、must_not（NOT）、filter（高性能过滤）

匹配成功 --> 返回结果集（可配合分页、排序、高亮、聚合、_source 字段筛选） --> 返回给用户

💡 **速记**

【核心考点】

DSL 是 Elasticsearch 的 JSON 风格查询语言，用于实现 CRUD 和复杂搜索。

Mapping 映射类似于 MySQL 的表结构，必须明确字段的 type（text/keyword/数值/日期/对象等）、index（是否索引）和 analyzer（分词器）。

文档修改分为全量修改（PUT，本质是删除后新增）和增量修改（POST _update，仅修改指定字段）。

【高频逻辑链】

索引操作：PUT 创建/修改（仅限新增字段），GET 查询，DELETE 删除。

文档操作：POST _doc 新增，GET _doc 查询，POST _update 增量修改，DELETE _doc 删除。

查询类型：term（精准）、range（范围）、match（模糊）、multi_match（多字段）、bool（复合，含 must/should/must_not/filter）。

高级查询：from/size（分页）、sort（排序）、highlight（高亮）、aggs（聚合）、_source（字段筛选）。

【关键避坑】

索引库一旦创建，无法修改已有字段的 mapping，只能添加新字段。如果必须修改，需要重建索引并做数据迁移。

全量修改（PUT）如果指定的 ID 不存在，会自动变为新增操作，使用前需确认业务逻辑。

term 查询是精确匹配，不要用于 text 类型的分词字段；match 查询会对查询词进行分词，适用于 text 类型字段。
