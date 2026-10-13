---
layout: article
title: "Redis 实现库存递减"
description: "- \"秒杀挑战：瞬时高并发、超卖风险、数据库压力、用户体验下降。\"   - \"实现思路：预加载库存、Redis 原子减操作、异步持久化、库存恢复。\"   - \"库存预热：定时任务提前将当天活动商品库存加载至 Redis。\"   - \"库存扣减：通过 Redis DECR 原子操作扣减库存，小于 0 回滚，成功则异步下单。\""
date: 2026-10-13
category: "云商城"
tags:
  - "秒杀"
  - "Redis"
  - "库存扣减"
permalink: /posts/2026-10-13-redis-stock-decrement.html
---

电商秒杀场景具有瞬时高并发、资源竞争激烈和数据一致性要求高三大特征。当数万用户同时抢购少量商品时（如 1000 件商品承受 10 万 QPS），系统面临多重挑战：

- 超卖风险：多个并发请求同时查询库存并扣减，导致库存扣减数超过实际库存量

    时间 | 商品库存 | 用户 A | 用户 B
    T0 | 100 | 读取库存:100 件 |
    T1 | 100 | 扣减库存: 100-1=99 | 读取库存:100 件
    T2 | 100 | | 扣减库存: 100-1=99
    T3 | 99 | 提交库存 |
    T4 | 99 | | 提交库存

- 数据库压力：传统数据库难以承受瞬时高并发读写
- 用户体验：响应延迟或服务崩溃导致用户请求失败

用 Redis 实现商品秒杀业务的基本思路是利用 Redis 的高性能和原子操作特性来处理高并发的请求。以下是一个简单的实现方案：

①预加载库存：在秒杀开始前，将商品的库存数量预加载到 Redis 中。

②请求处理：当用户尝试秒杀时，使用 Redis 的原子减操作（如 DECR）来减少库存数量。

- 如果返回的结果大于等于 0，表示秒杀成功。
- 如果返回的结果小于 0，表示库存不足，秒杀失败。

③持久化存储：秒杀成功后，可以将成功的记录异步地写入数据库，进行持久化存储。

④库存恢复：如果需要处理用户取消订单或支付超时的情况，恢复 Redis 中的库存。

## 1、库存预热

在秒杀活动开始前，我们需要将商品的库存数据从数据库加载到 Redis 中。需要通过定时任务来实现。

### 1）获取今天的秒杀活动

（1）在接口 ISeckillActivityService 中添加方法：

    /**
     * 获取当天的所有活动
     * @return
     */
    List<SeckillActivityDTO> listAllByToday();

（2）方法实现：

    @Override
    public List<SeckillActivityDTO> listAllByToday() {
        LambdaQueryChainWrapper<SeckillActivity> wrapper = new LambdaQueryChainWrapper<>(baseMapper);
        // 当天的一天的起止时间
        LocalDateTime startTime = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endTime = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);
        List<SeckillActivity> list = wrapper
            .between(SeckillActivity::getStartTime, startTime, endTime)
            .list();
        return JsonUtils.toList(list, SeckillActivityDTO.class);
    }

### 2）获取今天的秒杀商品和生成静态页面

（1）创建 IProductService 接口：

    public interface IProductService {
        /**
         * 获取今天的秒杀商品
         */
        List<SeckillGoodsDTO> listTodaySeckillGoods();

        /**
         * 创建秒杀商品详情静态页
         */
        void generateHtml() throws Exception;

        /**
         * 将商品库存写入缓存
         */
        void loadStockCache();
    }

（2）接口实现：

    @Service
    public class ProductServiceImpl implements IProductService {
        @Autowired
        private ISeckillActivityService seckillActivityService;
        @Autowired
        private ISeckillGoodsService seckillGoodsService;
        @Autowired
        private IPageService pageService;
        @Autowired
        private RedisTemplate<String, Object> redisTemplate;

        @Override
        public List<SeckillGoodsDTO> listTodaySeckillGoods() {
            // 获取今天的活动
            List<SeckillActivityDTO> activityList = seckillActivityService.listAllByToday();
            // 提取活动的 id
            List<Integer> activityIdList = activityList.stream().map(SeckillActivityDTO::getId).toList();
            // 获取活动对应的商品
            List<SeckillGoodsDTO> goodsList = new ArrayList<>();
            for (Integer activityId : activityIdList) {
                // 获取活动对应的商品（加入缓存，过期时间为24小时）
                goodsList.addAll(seckillGoodsService.listByActivityId(activityId));
            }
            return goodsList;
        }

        @Override
        public void generateHtml() throws Exception {
            // 获取今天的活动
            List<SeckillActivityDTO> activityList = seckillActivityService.listAllByToday();
            // 提取活动的 id
            List<Integer> activityIdList = activityList.stream().map(SeckillActivityDTO::getId).toList();
            // 生成静态页面
            for (Integer activityId : activityIdList) {
                pageService.generateProductTemplate(activityId);
            }
        }

        @Override
        public void loadStockCache() {
            // 获取今天的活动
            List<SeckillActivityDTO> activityList = seckillActivityService.listAllByToday();
            // 提取活动的 id
            List<Integer> activityIdList = activityList.stream().map(SeckillActivityDTO::getId).toList();
            for (Integer activityId : activityIdList) {
                // 获取活动对应的商品
                List<SeckillGoodsDTO> goodsList = seckillGoodsService.listByActivityId(activityId);
                // 缓存商品
                for (SeckillGoodsDTO goods : goodsList) {
                    // 缓存商品库存
                    // 以 seckill+活动 id+商品 id 作为为 key
                    String key = String.format("seckill-%s-%s", activityId, goods.getSkuId());
                    redisTemplate.opsForValue().set(key, goods.getStoreCount());
                    redisTemplate.expire(key, 1, TimeUnit.DAYS);
                }
            }
        }
    }

（3）控制器：

    @RestController
    @RequestMapping("/product")
    public class ProductController {
        @Autowired
        private IProductService productService;

        @GetMapping("/listTodaySeckillGoods")
        public List<SeckillGoodsDTO> listTodaySeckillGoods() {
            return productService.listTodaySeckillGoods();
        }

        @GetMapping("/generateHtml")
        public void generateHtml() throws Exception {
            productService.generateHtml();
        }

        @GetMapping("/loadStockCache")
        public void loadStockCache() {
            productService.loadStockCache();
        }
    }

（4）测试（略）

### 3）创建 Feign 接口

    @FeignClient(name = "mall-seckill-service", contextId = "seckill-product-feign")
    public interface SeckillProductFeignClient {
        @GetMapping("/product/listTodaySeckillGoods")
        Result<List<SeckillGoodsDTO>> listTodaySeckillGoods();

        @GetMapping("/product/generateHtml")
        void generateHtml() throws Exception;

        @GetMapping("/product/loadStockCache")
        void loadStockCache();
    }

### 4）创建定时任务

每天凌晨 2：00 将当天的秒杀商品库存加载到 Redis。

（1）创建定时任务类：

    @Component
    @Slf4j
    public class LoadSeckillProductTask implements SimpleJob {
        @Autowired
        private SeckillProductFeignClient seckillProductFeignClient;

        @Override
        public void execute(ShardingContext shardingContext) {
            // 1. 调用商品服务，获取今天要秒杀的商品
            log.info("开始加载秒杀商品");
            seckillProductFeignClient.listTodaySeckillGoods();
            log.info("加载秒杀商品完成");
            // 2. 生成静态页面
            log.info("开始生成静态页面");
            try {
                seckillProductFeignClient.generateHtml();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
            log.info("生成静态页面完成");
            // 3. 加载商品库存缓存
            log.info("开始加载商品库存缓存");
            seckillProductFeignClient.loadStockCache();
            log.info("加载商品库存缓存完成");
        }
    }

（2）配置任务

    loadSeckillProductTask:
      elasticJobClass: com.example.mall.scheduler.job.LoadSeckillProductTask
      cron: 0 0 2 * * ?
      sharding-total-count: 1
      overwrite: true

（3）测试

将任务的 cron 调整为当前时间，启动任务调度服务，查询 Redis 结果。

## 2、实现库存扣减

（1）创建库存扣减 DTO

    @Data
    public class StockDeductDTO {
        private Integer activityId;
        private Long skuId;
        private Integer quantity = 1;
    }

（2）在 IProductService 接口添加库存扣减的方法：

    void decreaseStock(StockDeductDTO stockDeductDTO);

（3）实现方法：

    @Override
    public void decreaseStock(StockDeductDTO stockDeductDTO) {
        // 提取商品 ID
        String key = "seckill-" + stockDeductDTO.getActivityId() + "-" + stockDeductDTO.getSkuId();
        // 提取商品库存
        int count = Integer.parseInt(redisTemplate.opsForValue().get(key).toString());
        // 如果库存大于 0，则减 1
        if(count > 0) {
            redisTemplate.opsForValue().decrement(key);
        } else {
            throw new BusinessException(ResultCodeEnum.STOCK_SHORTAGE);
        }
    }

（4）控制器

    @PutMapping("/decreaseStock")
    public Result decreaseStock(@RequestBody StockDeductDTO stockDeductDTO) {
        productService.decreaseStock(stockDeductDTO);
        return Result.success();
    }

（5）测试（略）

测试之前先将加载库存到 Redis。

（6）压力测试（将压测计划命名为库存扣减，后续测试使用到该压测计划）

参数设置：

线程数：1000，持续时间：2 秒，循环次数：1

HTTP 请求：添加 Body Data（消息体数据）：

    {
      "activityId": 1,
      "skuId": 2,
      "quantity": 0
    }

添加请求头管理：

    Content-Type: application/json

测试后查看 Redis 的 seckill-1-2 的值（原 100，测试后 -122）。原来库存 100 件商品卖出 222 件，这种情况就是超卖问题。

## 3、流程图文字推演

### 库存预热流程

定时任务触发（每天凌晨 2 点） --> 调用商品服务获取今日秒杀商品 --> 生成商品详情静态页面 --> 遍历商品将库存写入 Redis（key 为 seckill-活动ID-商品ID，过期时间 1 天）

### 库存扣减流程

用户发起秒杀请求 --> 构建 Redis Key（seckill-活动ID-商品ID） --> 获取当前库存值 --> 判断库存是否大于 0 --> 大于 0 则执行递减操作，秒杀成功 --> 小于等于 0 则抛出库存不足异常，秒杀失败

## 💡 **速记**

【核心考点】

秒杀超卖成因：多个并发请求同时查询库存并扣减，扣减数超过实际库存量。

Redis 解决方案思路：预加载库存到 Redis，利用原子减操作（DECR）处理高并发请求，返回结果大于等于 0 表示成功，小于 0 表示失败。

库存预热：通过定时任务（ElasticJob）在秒杀开始前将商品库存写入 Redis，并设置过期时间。

【高频逻辑链】

库存预热：定时任务 -> 获取今日活动 -> 获取活动商品 -> 生成静态页 -> 写入 Redis 缓存。

库存扣减：构建 Redis Key -> 获取库存 -> 判断库存 > 0 -> 递减库存 -> 成功；否则抛出异常。

【关键避坑】

上述代码中的库存扣减逻辑存在并发安全问题：先 get 再判断再 decrement，这三步不是原子操作，高并发下会导致超卖（如压测结果库存变为 -122）。生产环境必须使用 Lua 脚本或 Redis 的原子命令（如 DECR 后判断返回值是否小于 0，若小于 0 则 INCR 回滚）来保证原子性。
