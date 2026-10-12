---
layout: article
title: "秒杀系统核心设计与实现"
description: "- \"数据库设计：秒杀活动与秒杀商品一对多，商品表含价格、库存、活动ID等字段。\"   - \"项目架构：独立 mall-seckill-service 模块，配置 Nacos 与数据库连接。\"   - \"核心特征：严格限时限量、瞬时高并发，需解决库存预扣与防超卖。\"   - \"活动展示：查询未结束活动，最多展示 5 条，倒计时与状态显示。\"   - \"R"
date: 2026-10-13
category: "云商城"
tags:
  - "秒杀"
  - "Redis"
  - "缓存"
  - "数据库设计"
permalink: /posts/2026-10-13-seckill-system-design.html
---

## 1 数据库设计

### 1、实体-联系

本系统有两个实体：秒杀活动和秒杀商品，秒杀活动和秒杀商品存在一对多关系，即一个活动有多个商品。

    秒杀活动 (1) --- 包含 --- (N) 秒杀商品

### 2、实体-属性

（1）秒杀活动

属性：活动编号、活动名称、类型、开始时间、结束时间

    编号
    活动名称
    类型
    开始时间
    结束时间
    （均围绕秒杀活动实体）

（2）秒杀商品

属性：编号、SPU 编号、商品编号、商品名称、图片地址、销售价格、秒杀价格、库存数量、秒杀内容（活动名称）、秒杀活动编号

数据库表结构示例：

    id | spu_id | sku_id | sku_name | image | price | seckill_price | num | store_count | content | activity_id
    1  | 1      | 1      | 小米10 至尊纪念版 双模5G | https://img10.360buyimg | 6999 | 4799 | 100 | 100 | shop秒杀 | 1
    2  | 1      | 2      | 小米10 至尊纪念版 双模5G | https://img10.360buyimg | 7999 | 6399 | 100 | 100 | shop秒杀 | 1
    3  | 1      | 3      | 小米10 至尊纪念版 双模5G | https://img14.360buyimg | 5999 | 4799 | 100 | 100 | shop秒杀 | 1
    4  | 2      | 4      | Redmi 10X 4G Helio G85 | https://2e.zol-img.com.c | 999  | 799  | 100 | 100 | shop秒杀 | 1
    5  | 2      | 5      | Redmi 10X 4G Helio G85 | https://2e.zol-img.com.c | 999  | 799  | 100 | 100 | shop秒杀 | 1
    6  | 2      | 6      | Redmi 10X 4G Helio G85 | https://2e.zol-img.com.c | 1299 | 1039 | 100 | 100 | shop秒杀 | 1
    7  | 2      | 7      | Redmi 10X 4G Helio G85 | https://2e.zol-img.com.c | 1299 | 1039 | 100 | 100 | shop秒杀 | 1
    8  | 3      | 8      | Apple iPhone 12 (A2404 | https://www.apple.com. | 8197 | 6558 | 100 | 100 | shop秒杀 | 1
    9  | 3      | 9      | Apple iPhone 12 (A2404 | https://www.apple.com. | 8197 | 6558 | 100 | 100 | shop秒杀 | 1
    10 | 3      | 10     | Apple iPhone 12 (A2404 | https://www.apple.com. | 8197 | 6558 | 100 | 100 | shop秒杀 | 1
    11 | 3      | 11     | Apple iPhone 12 (A2404 | https://www.apple.com. | 8197 | 6558 | 100 | 100 | shop秒杀 | 1
    12 | 3      | 12     | Apple iPhone 12 (A2404 | https://www.apple.com. | 8197 | 6558 | 100 | 100 | shop秒杀 | 1
    13 | 4      | 13     | 华为 HUAWEI P40 麒麟99 | https://img11.360buyim | 4188 | 3350 | 100 | 100 | shop秒杀 | 1
    14 | 4      | 14     | 华为 HUAWEI P40 麒麟99 | https://img11.360buyim | 4188 | 3350 | 100 | 100 | shop秒杀 | 1
    15 | 4      | 15     | 华为 HUAWEI P40 麒麟99 | https://img11.360buyim | 4488 | 3590 | 100 | 100 | shop秒杀 | 1
    16 | 4      | 16     | 华为 HUAWEI P40 麒麟99 | https://img11.360buyim | 4488 | 3590 | 100 | 100 | shop秒杀 | 1
    17 | 5      | 17     | TCL 65Q10 65英寸 QLED | https://2c.zol-img.com.c | 6699 | 5359 | 100 | 100 | shop秒杀 | 1
    18 | 5      | 18     | TCL 75Q10 75英寸 QLED | https://2c.zol-img.com.c | 9199 | 7359 | 100 | 100 | shop秒杀 | 1
    19 | 5      | 19     | TCL 85Q6 85英寸 巨幕私 | https://2c.zol-img.com.c | 11999| 9599 | 100 | 100 | shop秒杀 | 1
    20 | 6      | 20     | 小米电视E65X 65英寸 全 | https://2b.zol-img.com.c | 2899 | 2319 | 100 | 100 | shop秒杀 | 1
    21 | 6      | 21     | 小米电视4A 70英寸 4K超 | https://2b.zol-img.com.c | 3299 | 2639 | 100 | 100 | shop秒杀 | 1
    22 | 12     | 34     | 华为智慧屏V55i-J 55英寸 | https://img.pconline.cor | 3927 | 3142 | 100 | 100 | shop秒杀 | 1
    23 | 12     | 35     | 华为智慧屏V65i 65英寸 H | https://img.pconline.cor | 5499 | 4399 | 100 | 100 | shop秒杀 | 1

秒杀活动表：

    id | activity_name | type | start_time | end_time
    1  | shop秒杀 | 1 | 2026-07-27 08:00:00 | 2026-07-27 22:00:00
    2  | shop秒杀 | 1 | 2026-07-24 18:00:00 | 2026-07-24 22:00:00
    3  | shop秒杀 | 1 | 2027-06-14 10:00:00 | 2027-06-14 11:00:00
    4  | shop秒杀 | 1 | 2027-06-14 11:00:00 | 2027-06-14 12:00:00
    5  | shop秒杀 | 1 | 2025-06-14 12:00:00 | 2025-06-14 13:00:00
    6  | shop秒杀 | 1 | 2025-06-14 13:00:00 | 2025-06-14 14:00:00
    7  | shop秒杀 | 1 | 2025-06-14 14:00:00 | 2025-06-14 16:00:00
    8  | shop秒杀 | 1 | 2025-06-14 15:00:00 | 2025-06-14 16:00:00
    10 | shop秒杀 | 1 | 2025-06-15 17:00:00 | 2025-06-15 18:00:00
    11 | shop秒杀 | 1 | 2025-06-15 18:00:00 | 2025-06-15 19:00:00
    12 | shop秒杀 | 1 | 2025-06-15 19:00:00 | 2025-06-15 20:00:00
    13 | shop秒杀 | 1 | 2025-06-15 20:00:00 | 2025-06-15 21:00:00
    14 | shop秒杀 | 1 | 2025-06-15 21:00:00 | 2025-06-15 22:00:00
    100| shop秒杀 | 1 | 2025-06-14 08:00:00 | 2025-06-14 09:00:00

## 2 项目的架构

### 1、创建项目

1）创建项目

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype:

- Name: mall-seckill-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.seckill
- ArtifactId: mall-seckill-service
- Version: 1.0.0

2）用代码生成器生成代码

（略）

3）配置文件

（1）主配置文件 application.yml 内容

    spring:
      application:
        name: mall-seckill-service
      profiles:
        active: dev
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            namespace: ${spring.profiles.active:public}

（2）开发环境配置文件 application-dev.yml 内容

    server:
      port: 9007
    spring:
      config:
        import: #导入多个文件：Data ID?group=Group
          - nacos:mysql.yml?group=SECKILL_GROUP
          - nacos:mybatis.yml
          - nacos:log.yml
          - nacos:knife4j.yml
          - nacos:redis.yml

（3）在配置中心创建配置文件

    Data ID: mysql.yml
    Group: SECKILL_GROUP
    配置格式: yaml
    配置内容: 克隆后，修改数据库地址信息

### 2、启动项目

1）创建启动程序

    @SpringBootApplication(scanBasePackages = "com.example.mall")
    @MapperScan("com.example.mall.seckill.mapper")
    public class SeckillServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(SeckillServiceApplication.class, args);
        }
    }

2）启动项目

（略）

## 3 秒杀商品概述

秒杀商品是电商平台或商家在特定时间段内，以远低于常规价格的促销价限量销售的商品，通过制造稀缺性和紧迫感刺激用户瞬时集中抢购。

### 1、核心特征

（1）严格限时限量

- 限时模式：固定时间段开放购买（如整点秒杀）。
- 限量模式：库存售罄即结束，不限时长。
- 混合模式：同时限制时间段与库存量。

（2）瞬时高并发

大量用户同一时间涌入，系统需承受极高流量压力（可达数十万 QPS）。

### 2、关键业务逻辑

（1）库存预扣与防超卖

- 采用 Redis 预减库存，订单支付成功后同步扣减数据库。
- 未支付订单超时释放库存，避免资源浪费。

（2）技术架构核心挑战

- 流量削峰：通过答题验证、异步队列缓解瞬时压力。
- 缓存优化：热点数据（如库存）加载至内存，结合 Redis 集群分担压力。
- 防刷机制：验证码、IP 限流、行为分析拦截恶意请求。

（3）体验优化策略

- 预热展示：活动开始前显示倒计时，禁止下单。
- 实时反馈：抢购结果即时提示（成功/失败/排队中）。

## 4 秒杀活动展示

### 1、需求

（1）展示正在抢购的活动和即将开始的活动（最多 5 个活动）

（2）正在抢购的活动显示倒计时，其它活动禁止下单

页面示意：

    shop秒杀 | 每日特价 | 大牌闪购 | 节日活动
    20:00:00 正在抢购中 | 21:00:00即将开始
    距离结束:0小时 20分 21秒

### 2、设计实现

1）创建 DTO

    @Data
    public class SeckillActivityDTO implements Serializable {
        private static final long serialVersionUID = 1L;

        private Integer id;

        private String activityName;

        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
        private LocalDateTime startTime;

        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
        private LocalDateTime endTime;
    }

2）接口实现

（1）活动业务 SeckillActivityService 添加展示活动的方法：

    /**
     * 获取秒杀活动列表
     * @return
     */
    public List<SeckillActivityDTO> listActivity();

（2）接口实现

    @Override
    public List<SeckillActivityDTO> listActivity() {
        LambdaQueryChainWrapper<SeckillActivity> wrapper = new LambdaQueryChainWrapper<>(baseMapper);
        List<SeckillActivity> list = wrapper
            .gt(SeckillActivity::getEndTime, LocalDateTime.now())
            .orderByAsc(SeckillActivity::getStartTime)
            .last("limit 5") // 最多显示5条
            .list();
        return JsonUtils.toList(list, SeckillActivityDTO.class);
    }

（3）添加控制器方法

    @Autowired
    private ISeckillActivityService seckillActivityService;

    @GetMapping("/list")
    public Result<List<SeckillActivityDTO>> list() {
        List<SeckillActivityDTO> list = seckillActivityService.listActivity();
        return Result.success(list);
    }

（4）测试（略）

## 5 使用 Redis 缓存

在现代应用程序中，查询缓存的使用已经变得越来越普遍。它不仅能够显著提高系统的性能，还能提升用户体验。缓存通过在内存中存储频繁访问的数据，减少对数据库或其他存储系统的访问，从而加快数据读取速度。

### 1、什么是缓存

缓存是一种临时存储机制，用于在内存中保存频繁访问的数据。它可以是硬件（如 CPU 缓存）或软件（如应用程序缓存）。缓存的主要目的是通过减少数据访问的延迟，提高系统的响应速度。以下是缓存的一些关键特性：

- 临时性：缓存中的数据通常是临时的，会在一段时间后失效或被替换。
- 快速访问：由于缓存数据存储在内存中，访问速度非常快。
- 空间有限：缓存的存储空间通常有限，因此需要有效的管理策略，如 LRU（最近最少使用）策略。

### 2、使用缓存的好处

（1）提高性能：缓存可以显著减少数据读取的时间，因为内存访问速度比硬盘或网络存储快很多。

（2）减轻数据库负载：缓存可以减少数据库的查询次数，从而减轻数据库的负载，提升整体系统的稳定性和可扩展性。

（3）节省资源：通过减少对后端系统的访问，缓存可以帮助节省带宽和计算资源。

（4）提高用户体验：快速的数据访问可以显著提升用户体验，特别是在需要频繁读取数据的应用场景中。

### 3、缓存的成本

（1）内存消耗：缓存需要占用系统的内存资源，过多的缓存可能会影响其他应用程序的性能。

（2）数据一致性：缓存中的数据可能会与数据库中的数据不一致，尤其是在数据频繁更新的场景中。需要设计有效的缓存失效策略来保证数据的一致性。

（3）复杂性增加：引入缓存机制会增加系统的复杂性，需要处理缓存的管理、更新和失效等问题。

（4）维护成本：缓存系统需要定期监控和维护，以确保其高效运行。

### 4、缓存工作原理

由于我们的缓存的数据源来自于数据库，而数据库的数据是会发生变化的，如果当数据库中数据发生变化，而缓存却没有同步，此时就会有数据一致性问题存在，在一些并发场景会出现问题。

（1）读流程

    读请求 --> 是否命中缓存 --> 命中则返回数据
                    |
                    未命中 --> 从数据库读取数据 --> 写入缓存 --> 返回数据

![架构示意图](https://xiaoheixian.github.io/posts/assets/352_65.png)

（2）写流程

①应用程序首先更新数据库中的数据。

②然后使缓存中的对应数据失效。

### 5、Spring Cache

在 Spring Boot 中，Spring Cache 提供了一套简洁且强大的缓存抽象机制，帮助开发者轻松地将缓存集成到应用程序中。为了实现高效的数据缓存，结合使用 Spring Cache 和 Redis，能够充分发挥二者的优点，实现高效的数据缓存。

1）SpringCache 核心组件

（1）CacheManager：CacheManager 是 Spring Cache 的核心接口，负责管理多个缓存实例。它是缓存操作的入口点，提供了获取和操作缓存实例的方法。Spring 提供了多种 CacheManager 实现，如 ConcurrentMapCacheManager、EhCacheCacheManager、RedisCacheManager 等。不同的实现适用于不同的缓存存储机制。

（2）Cache：Cache 是缓存的具体实现，负责存储和检索缓存数据。它提供了基本的缓存操作，如 put、get、evict 等。具体的 Cache 实现依赖于底层的缓存存储机制，如内存缓存、Redis 缓存等。

2）SpEL 表达式

Spring Cache 使用 SpEL 表达式来动态生成缓存键，SpEL 表达式的语法类似于 Java 的表达式语法，支持以下几种操作：

（1）字面量：

- 数字：1，2.5
- 字符串：'hello'，"world"
- 布尔值：true，false
- 空值：null

（2）属性和方法：

- 访问对象的属性：#user.name
- 调用对象的方法：#user.getName()

（3）运算符：

- 算术运算：+，-，*，/，%
- 比较运算：==，!=，<，>，<=，>=
- 逻辑运算：&&，||，!

（4）集合和数组：

- 访问集合元素：#users[0]
- 集合操作：#users.size()，#users.isEmpty()

（5）条件运算符：

- 三元运算符：condition ? trueValue : falseValue
- Elvis 运算符：expression ?: defaultValue

（6）变量：

- 定义和使用变量：#variableName

参数索引表示法（以下两者在功能上等价，都是通过参数位置索引访问）

- #a0 表示方法的第一个参数（a=argument）
- #p0 表示方法的第一个参数（p=parameter）

3）Spring Cache 的注解

（1）常用注解：

- @EnableCaching：开关性注解，在项目启动类或某个配置类上使用此注解后，则表示允许使用注解的方式进行缓存操作。
- @Cacheable：用于标注需要缓存的方法。当该方法被调用时，Spring Cache 会先检查缓存中是否存在对应的数据。如果存在，则直接返回缓存数据；如果不存在，则执行方法并将结果存入缓存。
- @CachePut：用于标注需要更新缓存的方法。即使缓存中已经存在数据，该方法仍然会执行，并将结果更新到缓存中。
- @CacheEvict：用于标注需要清除缓存的方法。当该方法被调用时，Spring Cache 会清除对应的缓存数据。
- @Caching：此注解即可作为@Cacheable、@CacheEvict、@CachePut 三种注解中的任何一种或几种来使用。
- @CacheConfig：可以用于配置@Cacheable、@CacheEvict、@CachePut 这三个注解的一些公共属性，例如 cacheNames、keyGenerator。

（2）注解参数：

- cacheNames 是 Spring Cache 中的一个属性，用于指定缓存组件的名称。在 Spring Cache 中，缓存名称用于标识特定的缓存区域。一个应用程序可以有多个缓存区域，每个区域可以有自己的缓存策略（如过期时间、缓存大小等）。cacheNames 可以接受一个字符串数组，表示该类中所有缓存操作默认使用的缓存区域名称。
- value：指定缓存的名称，与 cacheNames 相同。
- key：指定缓存的键，可以使用 SpEL 表达式。如果没写 key，默认使用 SimpleKeyGenerator 生成（通常是所有参数的组合）
- allEntries：删除时使用，值为 true 时删除所有条目。如果 allEntries = false（默认值），则只删除与该方入参对应的那个 key 的缓存。
- condition：方法执行前判断，为 true 才缓存。
- unless：方法执行后判断，为 true 则不缓存。

### 6、使用 Redis 缓存

1）启用缓存并缓存序列化

（1）在 mall-common 的 config.RedisConfig 方法上启用缓存：

    @Configuration
    @EnableCaching
    public class RedisConfig {
    }

（2）在 RedisConfig 添加序列化方法：

    /**
     * 配置 Redis 键的序列化方式
     * @return StringRedisSerializer，用于序列化和反序列化 Redis 中的键
     */
    private RedisSerializer<String> keySerializer() {
        return new StringRedisSerializer();
    }

    /**
     * 配置 Redis 值的序列化方式
     * @return GenericJackson2JsonRedisSerializer，使用 Jackson 库以 JSON 格式序列化和反序列化 Redis 中的值
     */
    private RedisSerializer<Object> valueSerializer() {
        return new GenericJackson2JsonRedisSerializer();
    }

    /**
     * 配置缓存管理器，使用 Redis 作为缓存后端
     * @param redisConnectionFactory Redis 连接工厂，用于创建 Redis 连接
     * @return RedisCacheManager，Redis 缓存管理器实例
     */
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        // 配置序列化，解决乱码的问题，设置缓存条目的默认过期时间
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            // 设置键的序列化器
            .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(keySerializer()))
            // 设置值的序列化器
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(valueSerializer()))
            // 设置缓存条目的默认过期时间为 12 小时
            .entryTtl(Duration.ofHours(12));
        // 创建非锁定的 Redis 缓存写入器
        RedisCacheWriter redisCacheWriter = RedisCacheWriter.nonLockingRedisCacheWriter(Objects.requireNonNull(redisConnectionFactory));
        // 返回 Redis 缓存管理器实例，使用上述配置
        return new RedisCacheManager(redisCacheWriter, config);
    }

2）创建 DTO

（1）商品输出 DTO

    @Data
    public class SeckillGoodsDTO implements Serializable {
        private static final long serialVersionUID = 1L;
        private Integer id;
        private String spuId;
        private String skuId;
        private String skuName;
        private String image;
        private Integer price;
        private Integer seckillPrice;
        private Integer num;
        private Integer storeCount;
        private String content;
        private Integer activityId;
    }

（2）商品修改 DTO

    @Data
    public class SeckillGoodsUpdateDTO implements Serializable {
        private static final long serialVersionUID = 1L;
        private Integer id;
        private Integer seckillPrice;
        private Integer num;
        private Integer storeCount;
        private Integer activityId;
    }

3）添加缓存

（1）在秒杀商品业务层添加方法

    public interface ISeckillGoodsService extends IService<SeckillGoods> {
        /**
         * 按活动 id 查询
         */
        List<SeckillGoodsDTO> listByActivityId(Integer activityId);
        /**
         * 按活动 id 删除
         */
        Boolean removeByActivityId(Integer activityId);
        /**
         * 按活动 id 修改
         */
        Boolean updateByActivityId(SeckillGoodsUpdateDTO seckillGoods);
    }

（2）接口实现

    @Service
    @CacheConfig(cacheNames = "seckill-goods")
    public class SeckillGoodsServiceImpl extends ServiceImpl<SeckillGoodsMapper, SeckillGoods> implements ISeckillGoodsService {
        @Cacheable(key = "#activityId", unless = "#result.isEmpty()")
        @Override
        public List<SeckillGoodsDTO> listByActivityId(Integer activityId) {
            LambdaQueryChainWrapper<SeckillGoods> wrapper = new LambdaQueryChainWrapper<>(baseMapper);
            List<SeckillGoods> list = wrapper.eq(SeckillGoods::getActivityId, activityId).list();
            return JsonUtils.toList(list, SeckillGoodsDTO.class);
        }

        @CacheEvict(key = "#activityId", allEntries = true)
        @Override
        public Boolean removeByActivityId(Integer activityId) {
            LambdaUpdateChainWrapper<SeckillGoods> wrapper = new LambdaUpdateChainWrapper<>(baseMapper);
            boolean removed = wrapper.eq(SeckillGoods::getActivityId, activityId).remove();
            return removed;
        }

        @CacheEvict(key = "#p0.activityId", allEntries = true)
        @Override
        public Boolean updateByActivityId(SeckillGoodsUpdateDTO seckillGoods) {
            SeckillGoods seckillGoodsEntity = JsonUtils.toObj(seckillGoods, SeckillGoods.class);
            LambdaUpdateChainWrapper<SeckillGoods> updateWrapper = new LambdaUpdateChainWrapper<>(baseMapper);
            return updateWrapper
                .eq(SeckillGoods::getActivityId, seckillGoods.getActivityId())
                .update(seckillGoodsEntity);
        }
    }

注意：key 的值与方法的参数名对应，如 key = "#activityId"，key = "#p0.activityId"。

（3）控制器：

    @Autowired
    private ISeckillGoodsService seckillGoodsService;

    @GetMapping("/activity/{id}")
    public Result<List<SeckillGoodsDTO>> listByActivityId(@PathVariable Integer id) {
        List<SeckillGoodsDTO> list = seckillGoodsService.listByActivityId(id);
        return Result.success(list);
    }

    @PutMapping("/activity/update")
    public Result updateByActivityId(@RequestBody SeckillGoodsUpdateDTO seckillGoods) {
        seckillGoodsService.updateByActivityId(seckillGoods);
        return Result.success();
    }

    @DeleteMapping("/activity/{id}")
    public Result deleteByActivityId(@PathVariable Integer id) {
        seckillGoodsService.removeByActivityId(id);
        return Result.success();
    }

4）接口测试

（1）读缓存测试

测试按活动 Id 查询，连续执行 2 次查询：

    JDBC Connection [com.mysql.cj.jdbc.ConnectionImpl@512ebf8c] will not be managed by Spring
    ==> Preparing: SELECT id, spu_id, sku_id, sku_name, image, price, seckill_price, num, store_count, content, activity_id FROM seckill_goods WHERE (activity_id = ?)
    ==> Parameters: 1(Integer)
    <== Columns: id, spu_id, sku_id, sku_name, image, price, seckill_price, num, store_count, content, activity_id
    <== Row: 1, 1, 1, 小米10 至尊纪念版 双模5G 骁龙865 120HZ高刷新率 120倍长焦镜头 120W快充 8GB+128GB 星际黑, https://img10.360buyimg.com, 6999, 4799, 100, 100, shop秒杀, 1
    <== Row: 2, 1, 2, 小米10 至尊纪念版 双模5G 骁龙865 120HZ高刷新率 120倍长焦镜头 120W快充 8GB+256GB 星际黑, https://img10.360buyimg.com, 7999, 6399, 100, 100, shop秒杀, 1

查看测试日志，第一次发送了 SQL，第二次不再发送 SQL，证明是在缓存中读取数据。

（2）写缓存测试

修改数据：将活动 1 的所有商品库存修改为 1000：

    {
      "num": 1000,
      "activityId": 1
    }

在 Redis 查看缓存，缓存数据被删除，保证数据一致性。

（3）测试 MySQL 和 Redis 缓存的流量压力

压测参数：线程组 10000，时长 1 条，循环次数 3

①删除 Redis 缓存，并注释 @EnableCaching 注解，使缓存失效，这时查询数据会直接到数据库查询，测试数据库压力：

    Label      # Samples  Average  Median  90% Line  95% Line  99% Line  Min   Max   Error %  Throughput
    HTTP Request 30000     3438     3438    4587.75   4587.75   4587.75   0     18942 54.89%   896.9/sec
    总体        30000     3438     3438    4587.75   4587.75   4587.75   0     18942 54.89%   896.9/sec

从测试结果发现：异常较高，吞吐量只 896/秒。

②启用缓存，这时缓存中有数据，数据会在缓存中查询，测试缓存压力：

第一次测试：有异常是因为第一次要到数据库读取数据，丢失了一部分请求，但吞吐量高达 1498/秒，而后面的测试，吞吐能达到 5000/秒左右。

    Label      # Samples  Average  Median  90% Line  95% Line  99% Line  Min   Max   Error %  Throughput
    HTTP Request 30000     3860     3860    3141.49   3141.49   3141.49   0     13125 25.76%   1498.6/sec
    总体        30000     3860     3860    3141.49   3141.49   3141.49   0     13125 25.76%   1498.6/sec

从上面测试结果可以看出：

- Redis 并发性能碾压 MySQL：在简单数据模型、高吞吐需求场景下，Redis 凭借内存存储与单线程模型实现 10 倍以上吞吐优势；
- MySQL 不可替代性：需强事务、复杂查询或持久化海量数据时，仍依赖 MySQL 的关系型能力；
- 协同部署建议：多数系统采用 Redis 作缓存层 + MySQL 作存储层，通过缓存击穿保护、延迟双删等策略平衡性能与一致性。

【思考】：如何降低瞬时高流量下的异常率？

①容量规划与压测：通过压测确定单机阈值（峰值 80%）。

②入口流量控制：在网关层和应用层实现“匀速排队”或“冷启动”策略。

③服务自我保护：在应用内配置线程池隔离，防止某个慢接口耗尽所有资源，并配置层级化的熔断规则。

④结果兜底：对降级后的请求，使用本地缓存兜底，确保有数据返回，而不是空结果。

### 7、流程图文字推演

#### 缓存读流程

读请求 --> 检查缓存是否命中 --> 命中则直接返回数据 --> 未命中则从数据库读取数据 --> 将数据写入缓存 --> 返回数据

#### 缓存写流程

应用程序更新数据库 --> 使缓存中的对应数据失效

#### 秒杀活动展示查询流程

请求活动列表 --> 查询条件：结束时间大于当前时间 --> 按开始时间升序排序 --> 限制返回 5 条 --> 转换为 DTO 返回

## 💡 **速记**

【核心考点】

秒杀系统核心特征：限时限量、瞬时高并发，需解决库存预扣与防超卖、流量削峰、缓存优化、防刷机制。

数据库设计：秒杀活动与秒杀商品一对多，商品表含价格、库存、活动 ID 等字段。

活动展示：查询未结束活动，按开始时间排序，最多返回 5 条。

Redis 缓存：使用 Spring Cache + Redis，通过 @Cacheable、@CacheEvict 等注解实现缓存读写与失效。

缓存原理：读请求先查缓存，未命中查库并写入；写请求更新库后使缓存失效。

性能对比：Redis 缓存后吞吐量提升 10 倍以上，异常率大幅降低。

【高频逻辑链】

缓存读：请求 -> 查缓存 -> 命中返回 -> 未命中查库 -> 写缓存 -> 返回。

缓存写：更新数据库 -> 删除缓存。

秒杀活动展示：查询未结束活动 -> 按开始时间排序 -> limit 5 -> 返回。

【关键避坑】

缓存与数据库一致性：写操作需先更新数据库，再使缓存失效（或延迟双删），避免脏数据。

缓存穿透与雪崩：需结合布隆过滤器、空值缓存、过期时间随机打散等策略。

高并发下异常率：通过容量规划、入口流量控制、线程池隔离、熔断降级和结果兜底来降低。
