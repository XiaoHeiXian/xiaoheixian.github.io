---
layout: article
title: "Redis 数据库核心技术与实战"
description: "- \"概述：基于内存的数据结构存储系统，读写性能可达 10 万/秒。\"   - \"特性：速度快、数据类型丰富、支持持久化、高可用与分布式。\"   - \"工具：Redis Stack 扩展了 JSON、搜索、时序等模块。\"   - \"持久化：提供 RDB 和 AOF 两种方式，需按业务场景选择。\"   - \"类型：涵盖 String、Hash、List、S"
date: 2026-10-02
category: "云商城"
tags:
  - "微服务"
  - "Redis"
  - "缓存"
  - "持久化"
  - "数据类型"
permalink: /posts/2026-10-02-redis-core-tech.html
---

## 1、Redis 概述

Redis 是一个开源、基于内存的数据结构存储系统，常被称为远程字典服务器（REmote DIctionary Server）。

它主要用作数据库、缓存和消息中间件，以其极高的性能而闻名，官方给出的读写性能可达 10 万/秒。

### （1）Redis 的核心特性

速度快：数据存储在内存中，读写操作在微秒级响应，这是 Redis 性能卓越的最主要原因。此外，它采用 C 语言编写，并使用单线程模型，避免了多线程竞争的开销。

丰富的数据结构：与传统的键值存储不同，Redis 的 value 支持多种数据结构，如字符串、哈希、列表、集合、有序集合等。

持久化：虽然数据主要在内存中，但 Redis 提供了 RDB 和 AOF 两种机制，可以将数据保存到硬盘，防止因进程退出或系统重启导致数据丢失。

高可用与分布式：通过主从复制、哨兵（Sentinel）和 Redis Cluster 机制，Redis 可以实现高可用和数据水平扩展。

丰富的功能：支持键过期（用于缓存）、发布/订阅（消息系统）、Lua 脚本、事务等。

### （2）典型应用场景

缓存：利用键过期功能，加速热点数据访问，降低后端数据库压力，是 Redis 最广泛的应用场景。

排行榜/计数器：利用有序集合（Sorted Set）实现排行榜，利用 INCR 命令实现高性能计数器。

社交网络：利用集合（Set）实现共同好友、粉丝列表等功能。

消息队列：通过列表（List）的阻塞操作或流（Streams）数据类型实现轻量级消息队列。

## 2、Redis Stack 概述

Redis Stack 是 Redis 的增强版本，它在 Redis 核心功能之上，将多个高级模块和可视化工具打包在一起，为开发者提供了一站式的现代数据平台解决方案。

重要提示：从 Redis 8 开始，Redis Stack 的功能已合并到 Redis 开源版本中。Redis Stack 6.2、7.2 和 7.4 版本已于 2025 年 12 月停止维护更新。新用户建议直接使用 Redis。

### （1）Redis Stack 的核心扩展功能

Redis Stack 主要集成了以下四个核心模块，扩展了 Redis 的数据处理能力：

RedisJSON：

支持存储、操作和查询 JSON 文档，数据以二进制树形结构存储，可快速访问子元素。

主要命令示例：JSON.SET、JSON.GET、JSON.ARRAPPEND。

RediSearch：

提供全文搜索、聚合查询和索引功能，可以对 Hash 和 JSON 文档进行复杂查询。

主要命令示例：FT.CREATE、FT.SEARCH。

RedisTimeSeries：

专为处理时间序列数据设计，支持高吞吐量的数据写入和聚合查询。

主要命令示例：TS.CREATE、TS.ADD、TS.RANGE。

RedisBloom：

提供概率性数据结构，如布隆过滤器（Bloom Filter）、布谷鸟过滤器（Cuckoo Filter）等，用于高效判断元素是否存在。

主要命令示例：BF.ADD、BF.EXISTS。

### （2）Redis Stack 的两种包和可视化工具

Redis Stack 提供两种包以满足不同场景的需求：

Redis Stack：包含 Redis Stack Server 和 RedisInsight 可视化工具。适合本地开发，因为它方便你通过图形界面直观地查看和操作数据。

Redis Stack Server：仅包含服务器端和模块扩展，不包含 RedisInsight。此版本更精简，适合生产环境部署。

RedisInsight 是官方提供的可视化工具，你可以通过浏览器访问它的 Web 界面（默认端口 8001）：

以图形化方式浏览和管理所有数据。

使用内置的 CLI 或 Workbench 执行命令。

分析内存使用情况和慢查询日志，帮助排查性能问题。

### （3）第三方可视化工具

Navicat for Redis：

Navicat 是数据库管理工具领域的老牌厂商，它的 Redis 版本延续了一贯的强大风格。

它支持 SSH 和 SSL 加密连接，能安全地访问云端或内网的 Redis 实例；内置的数据备份恢复和任务自动执行功能，可以帮你定期备份数据或定时运行某个命令；还有一个 AI 助理功能，可以帮你生成命令或解释数据结构。

界面是图形化的，你可以像操作 Excel 一样查看和编辑数据，对不熟悉命令行的用户非常友好。如果你平时就用 Navicat 管理 MySQL、PostgreSQL 等数据库，那 Redis 这个版本可以让你在同一个软件里统一管理所有数据库，切换起来非常顺手。

yunedit-redis：

这是一款国产免费的可视化工具，对中文用户非常友好，界面是全中文的，上手几乎没门槛。

它最大的特色是搜索功能非常强大，支持 SSH 隧道连接，内置了内存使用分析、慢查询分析，还能灵活地导入导出数据，支持多种格式。不仅支持按 key 搜索，还能按 value 内容搜索，甚至按 value 内部的元素数量来搜索，这在排查问题时特别实用。

### （4）Docker 快速部署 Redis Stack

    docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 --restart=always -e REDIS_ARGS="--requirepass 123456" redis/redis-stack

- -p 6379:6379：将 Redis 服务端口映射到主机。
- -p 8001:8001：将 RedisInsight Web 端口映射到主机。
- -e REDIS_ARGS="--requirepass mypassword"：通过环境变量设置访问密码。

## 3、Redis 持久化方式

Redis 提供两种主要持久化方式：RDB 和 AOF，两者可以同时开启以兼顾性能与数据安全。

### （1）RDB 与 AOF 特性对比

基本原理：

RDB：在指定时间间隔内，将内存中的数据集快照以二进制形式写入磁盘（dump.rdb）。

AOF：将服务器接收到的每个写操作命令以文本形式追加到日志文件末尾（appendonly.aof）。

数据恢复速度：

RDB：快。直接加载二进制快照文件，适合大数据集恢复。

AOF：较慢。需要逐条重新执行 AOF 文件中的所有写命令。

数据安全性：

RDB：较低。两次快照之间的数据可能丢失。

AOF：高。可通过 appendfsync everysec（推荐）配置最多丢失 1 秒数据。

文件体积：

RDB：小。紧凑的二进制文件，适合备份。

AOF：较大。记录了所有写操作，可通过 BGREWRITEAOF 重写来压缩。

性能影响：

RDB：较小。通过 fork() 子进程执行，主进程只会在 fork 时短暂阻塞。

AOF：较大。根据 appendfsync 策略，频繁写文件可能带来性能开销。

主要优点：

RDB：非常适合灾难恢复和备份；大数据集恢复速度快；对性能影响小。

AOF：数据安全性高，最多丢失 1 秒数据；日志是文本格式，可读性强，方便人工检查和修复；支持重写机制，避免文件无限增大。

主要缺点：

RDB：数据可能丢失；当数据集很大时，fork() 操作可能耗时，导致服务短暂停顿。

AOF：文件体积通常比 RDB 大；恢复速度较慢；写操作频繁时，性能开销较大。

### （2）如何选择

重视数据安全性（如金融、交易系统）：推荐同时开启 RDB 和 AOF。Redis 重启时会优先加载 AOF 文件，因为它包含的数据更完整。

缓存场景，允许数据丢失：可以只使用 RDB，甚至关闭持久化，仅依赖内存。

### （3）核心配置示例

创建文件夹：

    mkdir -p /data/local/redis/conf /data/local/redis/data

核心配置示例（/data/local/redis/conf/redis-stack.conf）：

    # RDB 配置：60 秒内至少有 10000 次修改则触发快照
    save 60 10000

    # AOF 配置
    appendonly yes
    appendfsync everysec

重新部署：

    docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 -v /data/local/redis/conf/redis-stack.conf:/redis-stack.conf -v /data/local/redis/data:/data -e REDIS_ARGS="--requirepass 123456" redis/redis-stack redis-server /redis-stack.conf

## 4、Redis 数据类型与操作命令

Redis 支持多种数据类型，每种类型都有其专属的命令集。

### （1）String（字符串）—— 最通用的缓存与计数器

场景：存储用户信息、商品浏览量、分布式锁、短信验证码。

    # 1. 缓存单个用户信息（简单场景）
    SET user:1001:name "张三"
    SET user:1001:age 28
    GET user:1001:name

    # 2. 缓存对象（使用 JSON 字符串）
    SET product:2001 '{"name":"iPhone 15","price":6999,"stock":50}'
    GET product:2001

    # 3. 计数器 - 商品浏览量（每次访问 +1）
    # 执行 3 次后查看结果
    INCR product:2001:views
    GET product:2001:views

    # 4. 计数器 - 库存扣减（原子操作，防止超卖）
    SET product:2001:stock 50
    # 执行 3 次后查看结果
    DECR product:2001:stock
    GET product:2001:stock

    # 5. 设置带过期时间的缓存（验证码，60 秒有效）
    SETEX captcha:13800138000 60 482936
    # 剩余秒数
    TTL captcha:13800138000

    # 6. 批量操作（减少网络往返）
    MSET user:1002:name "李四" user:1002:age 25 user:1002:city "北京"
    MGET user:1002:name user:1002:age user:1002:city

    # 7. 当 key 不存在时，才设置 key 的值；key 已存在则不做任何操作
    # key 不存在，返回 1，# 再次执行，再次尝试，key 已存在，返回 0
    SETNX nx 100

    # 8. 分布式锁（SETNX + 过期时间，防止死锁）
    # 成功获取锁，10 秒后自动释放，再次尝试，获取失败，说明已被占用，值为(nil)
    SET lock:order:1001 "locked" NX EX 10
    # 拆分为两条指令
    # 第一步：SETNX 加锁
    SETNX lock:order:1001 "locked"
    # 第二步：设置过期时间
    EXPIRE lock:order:1001 10

### （2）Hash（哈希）—— 存储对象的最佳选择

场景：存储用户信息、购物车、商品详情（多个字段独立更新）。

    # 1. 存储用户信息（相比 String，Hash 可以单独更新某个字段）
    # 语法：HSET key field1 value1 field2 value2 ...
    HSET user:1001 name "张三" age 28 city "上海" vip_level 3
    HSET user:1002 name "李四" age 38 city "北京" vip_level 5
    HGET user:1001 name
    HGETALL user:1001
    HGETALL user:1002

    # 2. 单独更新某个字段（用户修改年龄）
    # 0 表示更新已有字段，1 表示新增字段
    HSET user:1001 age 29

    # 3. 字段值自增（积分变化）
    # VIP 等级升到 4
    HINCRBY user:1001 vip_level 1

    # 4. 判断字段是否存在
    # 0 # 不存在
    HEXISTS user:1001 email
    HSET user:1001 email "zhangsan@qq.com"
    HEXISTS user:1001 email

    # 5. 获取所有字段名或所有值
    HKEYS user:1001
    HVALS user:1001

    # 6. 购物车：使用 Hash 存储用户的购物车（商品 ID: 数量）
    HSET cart:user:1001 product:2001 2 product:2002 1 product:2003 5
    HGETALL cart:user:1001
    HINCRBY cart:user:1001 product:2001 1 # 加购 1 件
    HDEL cart:user:1001 product:2003 # 移除某商品

### （3）List（列表）—— 消息队列与最新动态

场景：消息队列、最新评论列表、操作日志、关注动态流。

    # 1. 最新评论列表（左侧插入，右侧弹出，保持最新）
    LPUSH comments:product:2001 "评论 1：性价比高！"
    LPUSH comments:product:2001 "评论 2：发货很快"
    LPUSH comments:product:2001 "评论 3：质量很好"

    # 2. 获取最新 2 条评论（索引 0 是最新插入的）
    LRANGE comments:product:2001 0 1

    # 3. 分页获取评论（第 2 页，每页 2 条，索引从 0 开始）
    LRANGE comments:product:2001 2 3

    # 4. 获取列表长度
    LLEN comments:product:2001

    # 5. 消息队列 - 生产者（RPUSH）和消费者（LPOP 非阻塞）
    # 生产者：将任务放入队列
    RPUSH task:queue "发送邮件给 user1001"
    RPUSH task:queue "生成报表 task_20260101"

    # 消费者：从队列取出任务（非阻塞）
    LPOP task:queue

    # 6. 阻塞式消费（没有任务时等待 5 秒，适合消费者程序）
    RPUSH task:queue "查看报表 task_20260102"
    BLPOP task:queue 5 # 立即返回
    BLPOP task:queue 5 # 5 秒后超时返回（nil）

    # 7. 保留最新 100 条评论（定时修剪，防止列表无限增长）
    LTRIM comments:product:2001 0 99

### （4）Set（集合）—— 关系运算与去重

场景：共同好友、用户标签、抽奖去重、关注关系。

    # 1. 给商品打标签（每个标签出现一次，自动去重）
    SADD product:2001:tags "手机" "电子产品" "苹果" "旗舰机"
    SADD product:2001:tags "手机" # 重复添加无效
    SMEMBERS product:2001:tags

    # 2. 判断商品是否包含某个标签
    SISMEMBER product:2001:tags "苹果" # 1: 存在
    SISMEMBER product:2001:tags "华为" # 0: 不存在

    # 3. 用户关注/粉丝关系
    SADD user:1001:follow "user2002" "user2003" "user2004" # 用户 1001 关注了谁
    SADD user:1002:follow "user1001" "user2003" # 用户 1002 关注了谁

    # 4. 共同关注（交集）
    SINTER user:1001:follow user:1002:follow

    # 5. 可能认识的人（差集：user1001 关注但 user1002 没关注的）
    SDIFF user:1001:follow user:1002:follow

    # 6. 我关注的人+关注我的人（并集）
    SUNION user:1001:follow user:1002:follow

    # 7. 抽奖系统 - 用户参与抽奖（随机抽取）
    SADD lottery:202601 "user1001" "user1002" "user1003" "user1004" "user1005"
    SRANDMEMBER lottery:202601 2 # 随机抽取 2 人（不删除）
    SPOP lottery:202601 3 # 随机弹出 3 人（删除，用于开奖）
    SCARD lottery:202601 # 剩余参与人数

### （5）Sorted Set（有序集合）—— 排行榜与优先级队列

场景：积分排行榜、热门文章、带权重的任务队列。

    # 1. 商品销量排行榜（score = 销量）
    ZADD sales:rank 150 "product:1001" 89 "product:1002" 230 "product:1003" 45 "product:1004"

    # 2. 销量更新（订单完成时增加销量）
    ZINCRBY sales:rank 10 "product:1001" # product1001 又卖了 10 件

    # 3. 获取销量排行榜 TOP 3（分数从高到低）
    ZREVRANGE sales:rank 0 2 WITHSCORES

    # 4. 获取销量排行榜 4-6 名（分页）
    ZREVRANGE sales:rank 3 5 WITHSCORES

    # 5. 查询某个商品的排名和销量
    ZREVRANK sales:rank "product:1001" # 第 2 名（0 开始）
    ZSCORE sales:rank "product:1001"

    # 6. 热门文章（按时间权重排序，score = 发布时间戳）
    ZADD articles:2026 1734567890 "article:001" 1734567900 "article:002" 1734568000 "article:003"
    ZREVRANGE articles:2026 0 2 WITHSCORES # 最新发布的排在前面

    # 7. 按分数区间查询（查询销量在 100-200 之间的商品）
    ZRANGEBYSCORE sales:rank 100 200 WITHSCORES

    # 8. 删除低分商品（清理销量为 0 的商品）
    ZREMRANGEBYSCORE sales:rank -inf 0

### （6）JSON（Redis Stack 特有）—— 文档数据库能力

场景：存储复杂的嵌套对象，如商品详情、订单完整信息、用户档案。

    # 1. 存储完整的商品信息（包含嵌套结构）
    JSON.SET product:3001 $ '{"name":"iPhone 15 Pro","brand":"Apple","specs":{"color":"钛金属","storage":"256GB","chip":"A17 Pro"},"price":8999,"reviews":[{"user":"user1001","rating":5,"comment":"非常棒！"},{"user":"user1002","rating":4,"comment":"电池续航不错"}]}'

    # 2. 获取整个文档
    JSON.GET product:3001

    # 3. 使用 JSONPath 获取特定字段
    JSON.GET product:3001 $.name
    JSON.GET product:3001 $.specs.color

    # 4. 更新嵌套字段（修改价格）
    JSON.SET product:3001 $.price 7999
    JSON.GET product:3001 $.price

    # 5. 追加评论到 reviews 数组
    JSON.ARRAPPEND product:3001 $.reviews '{"user":"user1003","rating":5,"comment":"性价比之王"}'
    JSON.GET product:3001 $.reviews[-1].comment # 获取最新一条评论

## 5、流程图文字推演

### 持久化选择决策流程

业务对数据安全性要求高（如金融、交易系统） --> 同时开启 RDB 与 AOF --> 重启时优先加载 AOF 文件（数据更完整）

业务为纯缓存场景，允许数据丢失 --> 仅使用 RDB，甚至关闭持久化 --> 仅依赖内存提供高性能访问

### 消息队列阻塞消费流程

生产者执行 RPUSH 插入任务 --> 消费者执行 BLPOP 尝试拉取 --> 队列有任务立即返回并消费 --> 队列无任务则阻塞等待指定秒数 --> 超时无任务返回 nil 结束本次拉取

💡 **速记**

【核心考点】

Redis 基于内存，采用 C 语言与单线程模型，读写性能达 10 万/秒。

Redis Stack 包含 JSON、Search、TimeSeries、Bloom 四大扩展模块，自 Redis 8 起已合并入开源版本。

【高频逻辑链】

持久化选择：数据安全要求高（金融/交易） --> RDB + AOF 同时开启，优先加载 AOF；纯缓存场景 --> 仅 RDB 或关闭。

数据类型选型：String（缓存/计数器）--> Hash（对象/购物车）--> List（消息队列/最新动态）--> Set（去重/关系运算）--> Sorted Set（排行榜）--> JSON（复杂嵌套文档）。

【关键避坑】

分布式锁需使用 SET NX EX 原子操作，不可拆分为 SETNX 和 EXPIRE 两条独立命令，避免死锁。

RDB 数据安全性较低，两次快照间可能丢失数据；AOF 文件体积较大，恢复速度较慢，需根据业务权衡。
