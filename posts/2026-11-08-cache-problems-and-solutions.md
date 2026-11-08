---
layout: article
title: "缓存问题及解决方案"
description: "穿透：查不存在的数据，请求打满数据库。解法：参数校验、缓存空值、布隆过滤器。 击穿：热点 Key 失效，大量请求直达数据库。解法：永不过期、定时更新、互斥锁。 雪崩：大量 Key 同时失效或 Redis 宕机。解法：过期时间打散、数据预热、高可用。 布隆过滤器：概率型数据结构，用位数组和多哈希函数判断元素“一定不存在或可能存在”。 实现：利用 Redisson 提供的布隆过滤器 API，初始化、添加元素并拦截无效请求。"
date: 2026-11-08
category: "软件架构"
tags:
  - "微服务"
  - "缓存"
  - "Redis"
  - "布隆过滤器"
permalink: /posts/2026-11-08-cache-problems-and-solutions.html
---

# 8.2.12 缓存问题及解决方案

## 1、缓存造成的三种问题

使用过程中需要注意的三种问题：缓存穿透、缓存击穿、缓存雪崩。

### 1）缓存穿透

缓存和数据库中都没有的数据，可用户还是源源不断的发起请求，导致每次请求都会到数据库，从而压垮数据库。

比如客户查询一个根本不存在的东西，首先从 Redis 中查不到，然后会去数据库中查询，数据库中也查询不到，那么就不会将数据放入到缓存中，后面如果还有类似源源不断的请求，最后都会压到数据库来处理，从而给数据库造成巨大的压力。

解决办法：

（1）业务层校验

用户发过来的请求，根据请求参数进行校验，对于明显错误的参数，直接拦截返回。

比如，请求参数为主键自增 id，那么对于请求小于 0 的 id 参数，明显不符合，可以直接返回错误请求。

（2）不存在数据设置短过期时间

对于某个查询为空的数据，可以将这个空结果进行 Redis 缓存，但是设置很短的过期时间，比如 30s，可以根据实际业务设定。注意一定不要影响正常业务。

例如，库存扣减添加判空代码：

    // 4. 查询库存（现在是在锁保护下执行）
    Object stock = redisTemplate.opsForValue().get(stockKey);
    if (stock == null) {
        log.warn("库存不存在");
        throw new BusinessException(7003, "库存不存在");
    }
    int count = Integer.parseInt(stock.toString());

（3）布隆过滤器

关于布隆过滤器，后面会详细介绍。布隆过滤器是一种数据结构，利用极小的内存，可以判断大量的数据“一定不存在或者可能存在”。

对于缓存穿透，我们可以将查询的数据条件都哈希到一个足够大的布隆过滤器中，用户发送的请求会先被布隆过滤器拦截，一定不存在的数据就直接拦截返回了，从而避免下一步对数据库的压力。

### 2）缓存击穿

Redis 中一个热点 key 在失效的同时，大量的请求过来，从而会全部到达数据库，压垮数据库。

这里要注意的是这是某一个热点 key 过期失效，比如淘宝双十一，对于某个特价热门的商品信息，缓存在 Redis 中，刚好 0 点，这个商品信息在 Redis 中过期查不到了，这时候大量的用户又同时正好访问这个商品，就会造成大量的请求同时到达数据库。

解决办法：

（1）设置热点数据永不过期

对于某个需要频繁获取的信息，缓存在 Redis 中，并设置其永不过期。当然这种方式比较粗暴，对于某些业务场景是不适合的。

（2）定时更新

比如这个热点数据的过期时间是 1h，那么每到 59min 时，通过定时任务去更新这个热点 key，并重新设置其过期时间。

（3）互斥锁

这是解决缓存穿透比较常用的方法。互斥锁简单来说就是在 Redis 中根据 key 获得的 value 值为空时，先锁上，然后从数据库加载，加载完毕，释放锁。若其他线程也在请求该 key 时，发现获取锁失败，则睡眠一段时间（比如 100ms）后重试。

### 3）缓存雪崩

Redis 中缓存的数据大面积同时失效，或者 Redis 宕机，从而会导致大量请求直接到数据库，压垮数据库。

对于一个业务系统，如果 Redis 宕机或大面积的 key 同时过期，会导致大量请求同时打到数据库，这是灾难性的问题。

解决办法：

（1）设置有效期均匀分布

避免缓存设置相近的有效期，我们可以在设置有效期时增加随机值，或者统一规划有效期，使得过期时间均匀分布。

（2）数据预热

对于即将来临的大量请求，我们可以提前走一遍系统，将数据提前缓存在 Redis 中，并设置不同的过期时间。

（3）保证 Redis 服务高可用

使用 Redis 的哨兵模式和集群模式，为防止 Redis 集群单节点故障，可以通过这两种模式实现高可用。

## 2、布隆过滤器

### 1）什么是布隆过滤器

布隆过滤器是由布隆（Burton Howard Bloom）在 1970 年提出的一种紧凑型的、比较巧妙的概率型数据结构，特点是高效地插入和查询，查询时可以用来判断“一定不存在或者可能存在”，它是用多个哈希函数，将一个数据映射到位图结构中。

当一个元素被加入集合时，通过 K 个散列函数将这个元素映射成一个位图中的 K 个位置，把它们置为 1。

查询时，只要查看这些位置是不是都是 1，就知道集合中有没有它了：

如果这些位置有任何一个 0，则被查询元素一定不存在；如果都是 1，则被查询元素很可能存在。

简单来说就是将一个长度为 m 的位数组的所有元素初始化为 0，用 k 个散列函数对元素进行 k 次散列运算跟 len（m）取余得到 k 个位置并将 m 中对应位置设置为 1。

https://xiaoheixian.github.io/posts/assets/951_15.png

如上图（示意图），位数组的长度是 8，散列函数个数是 3，两个元素 x，y。这两个元素都经过三次哈希函数生成三个哈希值，并映射到位数组的不同的位置，并置为 1。

元素 x 映射到位数组的第 0 位，第 4 位，第 7 位，元素 y 映射到数组的位数组的第 1 位，第 4 位，第 6 位。

当布隆过滤器保存的元素越多，被置为 1 的 bit 位也会越来越多，元素 z 即便没有存储过，假设哈希函数将 z 映射到位数组的三个位都被其他值设置为 1 了，对于布隆过滤器的机制来讲，元素 z 这个值也是存在的，也就是说布隆过滤器存在一定的误判率。因此布隆过滤器只能保证一定不存在和可能存在。

若位数组长度太小则会导致所有 bit 位很快都会被置为 1 ，那么检索任意值都会返回“可能存在”，起不到过滤的效果。位数组长度越大，则误判率越小。

同时，哈希函数的个数也需要考量，哈希函数的个数越大，检索的速度会越慢，误判率也越小，反之，则误判率越高。

（2）布隆过滤器的效率和缺点

布隆过滤器的空间复杂度为 O(m)，插入和查询时间复杂度都是 O(k)。存储空间和插入、查询时间都不会随元素增加而增大。空间、时间效率都很高。

但是布隆过滤器并不支持删除元素，因为多个元素可能哈希到一个布隆过滤器的同一个位置，如果直接删除该位置的元素，则会影响其他元素的判断。因此，就提出了计数布隆过滤器。

（3）计数布隆过滤器

计数过滤器（Counting Bloom Filter）是布隆过滤器的扩展，标准 Bloom Filter 位数组的每一位扩展为一个小的计数器（Counter），在插入元素时给对应的 k（k 为哈希函数个数）个 Counter 的值分别加 1，删除元素时给对应的 k 个 Counter 的值分别减 1。

https://xiaoheixian.github.io/posts/assets/952_15.png

显然，又引入了另一个问题：更多的资源占用，而且在很多时候会造成极大的空间浪费。

### 2）使用场景

（1）解决 Redis 的缓存穿透

当查询的数据既不在缓存中，也不存在数据库中，则没有办法回写缓存，当有类似这样大量的请求访问服务时，数据库的压力就会极大。

因此，引入布隆过滤器，当用户请求时，判断过滤器中是否存在该元素，若不存在该元素，则直接返回不存在。若包含则从缓存中查询数据，若缓存中也没有，则查询数据库并回写到缓存里，最后给前端返回。

https://xiaoheixian.github.io/posts/assets/953_15.png
https://xiaoheixian.github.io/posts/assets/954_15.png

尽管布隆过滤器有少量的误判，即可能不存在的数据会判定存在，从而继续查询缓存和数据库，但只要将 m 和 k 的值设置相对理想，少量的不存在查询也是可以接受的。

（2）元素删除场景

实际上，元素不仅仅只有增加，还存在删除元素的场景，比如说商品的删除，删除后数据其实已经不存在了，但是布隆过滤器中还没删除，则会判定其存在。

第一种方案就是使用计数布隆过滤器。

第二种方案，则是通过定时重新构建布隆过滤器。

https://xiaoheixian.github.io/posts/assets/955_15.png

    定时任务触发全量商品查询，更新数据
    将商品添加到新的布隆过滤器
    修改商品布隆过滤器的映射（从旧 A 修改成新 B）
    商品服务根据布隆过滤器的映射，选择新的布隆过滤器 B 进行相关的查询操作
    选择合适的时间点，删除旧的布隆过滤器 A
    在删除商品到使用新的布隆过滤器 B 之间的这段时间的不存在的查询有可能还会到数据库层面，但这种少量的不存在查询也是可以接受的。

### 3）布隆过滤器的实现

Redisson 内置布隆过滤器通过高效拦截无效请求，可以有效解决缓存穿透问题。

（1）初始化布隆过滤器

在 mall-common 创建布隆过滤器 filter.CacheBloomFilter：

    @Slf4j
    @Component
    public class CacheBloomFilter<T> {

        private static final String BLOOM_FILTER_NAME_PREFIX = "cache:bloom:";

        @Value("${cache.bloom.name}")
        private String name;

        @Value("${cache.bloom.expectedInsertions}")
        private Long expectedInsertions;

        @Value("${cache.bloom.falseProbability}")
        private Double falseProbability;

        @Autowired
        private RedissonClient redissonClient;

        private RBloomFilter<T> bloomFilter;

        /**
         * 初始化（项目启动时执行一次）
         */
        @PostConstruct
        public void init() {
            String fullName = BLOOM_FILTER_NAME_PREFIX + name;
            bloomFilter = redissonClient.getBloomFilter(fullName);
            boolean initialized = bloomFilter.tryInit(expectedInsertions, falseProbability);
            if (initialized) {
                log.info("布隆过滤器初始化成功 | name: {}, 预期容量: {}, 误判率: {}", fullName, expectedInsertions, falseProbability);
            } else {
                log.warn("布隆过滤器已存在，跳过初始化 | name: {}", fullName);
            }
        }

        /**
         * 添加元素
         */
        public void add(T value) {
            if (value == null) {
                return;
            }
            bloomFilter.add(value);
        }

        /**
         * 批量添加
         */
        public void addAll(List<T> values) {
            if (values == null || values.isEmpty()) {
                return;
            }
            for (T value : values) {
                bloomFilter.add(value);
            }
            log.debug("批量添加布隆过滤器，数量: {}", values.size());
        }

        /**
         * 判断元素是否可能存在
         * @return true=可能存在（放行），false=一定不存在（拦截）
         */
        public boolean mightContain(T value) {
            if (value == null) {
                return false;
            }
            return bloomFilter.contains(value);
        }
    }

在 Redisson 布隆过滤器的初始化中，expectedInsertions（预期数据量）和 falseProbability（误判率）是两个关键的设计参数，它们直接影响布隆过滤器的性能和内存占用：

- 预期数据量：预计会添加到布隆过滤器中的最大元素数量（例如商品 ID、用户 ID 等键的数量）
- 误判率：当布隆过滤器说“元素存在”时，实际不存在的概率（假阳性率），范围：0 < falseProbability < 1（通常取 0.01~0.05）。误判率越低，需要的哈希函数个数越多（通常从 3~5 个增加到 7~10 个）。每次判断都要计算多次哈希，这会轻微增加 CPU 开销和响应耗时。对于高并发场景，适当提高误判率能减少计算量。

布隆过滤器的内存大小主要由预期数据量和误判率共同决定：

- 误判率越低，需要的哈希函数越多，底层位数组越长，内存占用越大。
- 误判率越高（比如从 0.01 放宽到 0.05），位数组可以大幅缩短，内存消耗显著降低。

（2）配置参数

根据需求，在定时加载库存时写入布隆过滤器，在进行商品扣减时防止缓存穿透。

在 mall-seckill-service 中使用布隆过滤器，配置参数：

    cache:
      bloom:
        name: seckill-activity-bloom
        expectedInsertions: 10000
        falseProbability: 0.1

（3）定时写入布隆过滤器

在 ProductServiceImpl 注入布隆过滤器依赖：

    @Autowired
    private CacheBloomFilter<String> cacheBloomFilter;

修改 loadStockCache 方法，将商品库存写入布隆过滤器：

    // 缓存商品
    for (SeckillGoodsDTO goods : goodsList) {
        // 缓存商品库存
        // 以 seckill+活动 id+商品 id 作为为 key
        String key = String.format("seckill:%s:%s", activityId, goods.getSkuId());
        redisTemplate.opsForValue().set(key, goods.getStoreCount());
        redisTemplate.expire(key, 1, TimeUnit.DAYS);
        // 缓存商品库存布隆过滤器
        cacheBloomFilter.add(key);
    }

（4）使用布隆过滤器

修改 decreaseStock 方法，判断布隆过滤器中是否存在该商品：

    // 2. 构建库存 key
    String stockKey = "seckill-" + stockDeductDTO.getActivityId() + "-" + stockDeductDTO.getSkuId();
    // 判断布隆过滤器中是否包含 key
    if (!cacheBloomFilter.mightContain(stockKey)) {
        log.warn("商品不存在");
        throw new BusinessException(7003, "库存不存在");
    }

（5）测试

使用压力测试计划（库存扣减）进行测试

测试地址：http://localhost:9000/api/seckill/product/decreaseStock

测试数据：

    {
      "activityId": 2,
      "skuId": 1,
      "quantity": 0
    }

在 mall-seckill-service 控制台查看结果：

    [nio-9007-exec-6] c.e.m.s.service.impl.ProductServiceImpl : 商品不存在
    [nio-9007-exec-7] c.e.m.s.service.impl.ProductServiceImpl : 商品不存在
    [nio-9007-exec-2] c.e.m.s.service.impl.ProductServiceImpl : 商品不存在
    [nio-9007-exec-5] c.e.m.s.service.impl.ProductServiceImpl : 商品不存在
    [nio-9007-exec-4] c.e.m.s.service.impl.ProductServiceImpl : 商品不存在

从结果可以看出，布隆过滤器拦截了无效请求。

Redisson 布隆过滤器以极小内存代价拦截无效请求，是应对缓存穿透的高效方案。

## 3、流程图文字推演

### 缓存穿透解决方案流程

用户请求 --> 业务层参数校验（拦截明显非法参数） --> 查询布隆过滤器

布隆过滤器判定不存在 --> 直接拦截返回

布隆过滤器判定存在 --> 查询 Redis 缓存

Redis 缓存命中 --> 返回数据

Redis 缓存未命中 --> 查询数据库

数据库查到数据 --> 回写 Redis 缓存 --> 返回数据

数据库未查到数据 --> 缓存空值（设置短过期时间） --> 返回空数据

### 缓存击穿解决方案（互斥锁）流程

用户请求 --> 查询 Redis 缓存

缓存命中 --> 返回数据

缓存未命中 --> 尝试获取分布式互斥锁

获取锁成功 --> 查询数据库 --> 重建缓存 --> 释放锁 --> 返回数据

获取锁失败 --> 休眠一段时间（如 100ms） --> 重试获取锁或查询缓存

### 布隆过滤器重建流程（定时任务）

定时任务触发 --> 全量查询数据库更新数据 --> 将商品数据添加到新的布隆过滤器 B --> 修改商品服务对布隆过滤器的映射（指向新 B） --> 商品服务查询使用新的布隆过滤器 B --> 选择合适时间点删除旧的布隆过滤器 A

## 💡 **速记**

【核心考点】

缓存穿透：数据在缓存和数据库都不存在。解法：参数校验、缓存空值、布隆过滤器。

缓存击穿：单个热点 Key 失效。解法：热点数据永不过期、定时更新、互斥锁。

缓存雪崩：大量 Key 同时失效或 Redis 宕机。解法：过期时间加随机值打散、数据预热、Redis 高可用（哨兵/集群）。

布隆过滤器：用位数组和多哈希函数判断元素“一定不存在或可能存在”，存在误判率，不支持删除。Redisson 提供了开箱即用的实现。

【高频逻辑链】

缓存穿透防护：请求 --> 布隆过滤器拦截（不存在直接返回） --> Redis 查询 --> 数据库查询。

缓存击穿防护：请求 --> Redis 查询未命中 --> 获取互斥锁 --> 查库重建缓存 --> 释放锁。

布隆过滤器参数：expectedInsertions（预期容量）决定位数组长度，falseProbability（误判率）决定哈希函数个数。误判率越低，内存占用越大。

【关键避坑】

布隆过滤器存在误判率，只能判断“一定不存在”，不能判断“一定存在”。如果业务需要支持删除元素，需使用计数布隆过滤器或定时重建。

使用互斥锁解决缓存击穿时，获取锁失败后的休眠重试必须设置上限，避免线程一直阻塞。
