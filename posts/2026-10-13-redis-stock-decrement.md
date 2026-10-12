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

### 1）创建秒杀接口

在 ISeckillGoodsService 中添加秒杀方法：

    /**
     * 秒杀下单
     * @param activityId 活动 ID
     * @param skuId 商品 ID
     * @param userId 用户 ID
     * @return 是否成功
     */
    Boolean seckill(Integer activityId, String skuId, Long userId);

### 2）接口实现

    @Override
    public Boolean seckill(Integer activityId, String skuId, Long userId) {
        // 1. 校验活动时间
        SeckillActivityDTO activity = seckillActivityService.getById(activityId);
        if (activity == null || LocalDateTime.now().isBefore(activity.getStartTime()) || LocalDateTime.now().isAfter(activity.getEndTime())) {
            throw new BusinessException("秒杀活动未开始或已结束");
        }

        // 2. 校验用户是否重复秒杀（幂等性防重）
        String userKey = String.format("seckill-user-%s-%s", activityId, userId);
        Boolean isAbsent = redisTemplate.opsForValue().setIfAbsent(userKey, "1", 1, TimeUnit.HOURS);
        if (Boolean.FALSE.equals(isAbsent)) {
            throw new BusinessException("您已参与过该秒杀活动");
        }

        // 3. 拼接 Redis Key
        String stockKey = String.format("seckill-%s-%s", activityId, skuId);

        // 4. 执行 Redis 原子减操作
        Long stock = redisTemplate.opsForValue().decrement(stockKey);

        // 5. 判断库存
        if (stock == null || stock < 0) {
            // 库存不足，回滚 Redis 扣减，删除用户秒杀标记
            redisTemplate.opsForValue().increment(stockKey);
            redisTemplate.delete(userKey);
            throw new BusinessException("商品库存不足，秒杀失败");
        }

        // 6. 扣减成功，异步发送 MQ 消息（或直接调用订单服务）
        // 模拟发送消息
        // rocketMQTemplate.convertAndSend("seckill-order-topic", orderMessage);

        // 7. 返回成功
        return true;
    }

### 3）控制器

在 SeckillGoodsController 中添加接口：

    @PostMapping("/seckill")
    public Result<Boolean> seckill(@RequestParam Integer activityId, @RequestParam String skuId, @RequestParam Long userId) {
        Boolean result = seckillGoodsService.seckill(activityId, skuId, userId);
        return Result.success(result);
    }

### 4）测试

（1）启动项目，访问秒杀接口，观察 Redis 库存变化。

（2）并发测试：使用 JMeter 模拟高并发请求，验证库存是否准确扣减、不会超卖。

（3）验证幂等性：同一个用户重复请求秒杀接口，验证是否只成功一次。

## 3、流程图文字推演

### 秒杀库存扣减完整流程

用户请求秒杀 --> 校验活动时间（是否开始/结束） --> 校验用户是否重复秒杀（setIfAbsent） --> 拼接 Redis 库存 Key --> 执行 Redis DECR 原子减操作 --> 判断返回值

返回值 >= 0：扣减成功，发送 MQ 异步下单，返回秒杀成功

返回值 < 0：库存不足，回滚 Redis INCR，删除用户秒杀标记，返回秒杀失败

### 库存预热流程

定时任务触发（每天凌晨 2 点） --> 获取当天秒杀活动 --> 获取活动对应商品 --> 生成静态页面 --> 遍历商品，将库存写入 Redis（key = seckill-活动ID-商品ID） --> 设置过期时间为 1 天

## 💡 **速记**

【核心考点】

Redis 秒杀库存扣减的核心是：预加载库存到 Redis，利用 Redis 的 DECR 原子操作实现库存扣减，保证高并发下不会超卖。

秒杀流程需严格校验活动时间、用户重复秒杀（幂等），扣减成功后再异步下单，扣减失败需回滚 Redis 库存。

【高频逻辑链】

校验活动时间 --> 校验用户重复秒杀 --> Redis DECR 扣减库存 --> 判断返回值是否 >= 0 --> 成功则发 MQ，失败则 INCR 回滚并删除用户标记。

库存预热：定时任务 --> 获取活动商品 --> 写入 Redis --> 设置过期时间。

【关键避坑】

DECR 返回小于 0 时必须回滚（INCR），否则会出现库存负数。

用户重复秒杀校验必须使用 setIfAbsent（分布式锁）保证原子性，防止一个用户抢多单。

高并发下建议使用 Lua 脚本将“校验库存 + 扣减 + 记录用户”组合为一个原子操作，避免分开执行产生并发漏洞。
