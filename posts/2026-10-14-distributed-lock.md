---
layout: article
title: "分布式锁"
description: "- \"定义：分布式系统环境下，通过多个节点对共享资源进行访问控制的一种同步机制。\"   - \"区别：分布式锁控制跨进程访问，乐观锁通过版本号/CAS，悲观锁通过数据库行锁。\"   - \"选型：分布式环境用分布式锁（Redis/ZooKeeper），单体高并发写用悲观锁，读多写少用乐观锁。\"   - \"SETNX：利用 Redis 的 setIfAbsen"
date: 2026-10-14
category: "云商城"
tags:
  - "分布式"
  - "锁"
  - "Redis"
  - "Redisson"
permalink: /posts/2026-10-14-distributed-lock.html
---

## 1、什么是分布式锁

分布式锁是一种在分布式系统环境下，通过多个节点对共享资源进行访问控制的一种同步机制。它的主要目的是防止多个节点同时操作同一份数据，从而避免数据的不一致性。

## 2、分布式锁与悲观锁、乐观锁区别

（1）分布式锁主要用于分布式系统中，控制不同进程或不同系统之间对共享资源的访问，保证数据的一致性和互斥性。它通常在多个进程或系统之间协调动作，使得只有一个进程或系统能够获取到锁，从而访问共享资源。

主要使用场景：

- 在多个应用或服务需要共同访问同一资源时使用。
- 适用于处理跨多个节点的业务流程，保证数据的一致性和系统的稳定性。

（2）乐观锁则是一种在数据处理过程中的锁机制，它假设多个进程或系统并发访问共享资源时，不会彼此冲突，因此在数据处理过程中不会加锁。只是在更新数据时，会判断在此期间有没有其他进程对数据进行过修改，如果有则采取回滚等方式解决，没有则完成更新。乐观锁能减少锁的开销，提高系统的整体性能。

主要使用场景：

- 当单体应用数据竞争较少，冲突不频繁时，读多写少的应用场景建议使用直接基于数据库的乐观锁。

（3）悲观锁就是很悲观，每次去拿数据的时候都认为别人会修改，所以每次在拿数据的时候都会上锁，这样别人想拿这个数据就会等待直到它拿到锁。

主要使用场景：

- 单体应建议使用悲观锁来做并发控制，或者直接基于数据库做悲观锁控制。

选择建议（决策树）：

    是否分布式环境？
    |--- 是 -> 使用分布式锁（Redis/ZooKeeper）
    |--- 否 -> 是否高并发写操作？
        |--- 是 -> 使用悲观锁（数据库行锁）
        |--- 否 -> 是否读多写少？
            |--- 是 -> 使用乐观锁（版本号/CAS）
            |--- 否 -> 按需选择

![架构示意图](https://xiaoheixian.github.io/posts/assets/355_65.png)
![架构示意图](https://xiaoheixian.github.io/posts/assets/356_65.png)

## 3、Redis 分布式锁

1）基于 SETNX 分布式锁实现

redis 分布式锁的解决思路，就是利用 redis 的高性能来解决高并发，每次访问一个资源的时候，都会存储一个 key，然后通过 redisTemplate.opsForValue().setIfAbsent() 方法来进行向数据库进行插入，这个方法的作用和一般的插入不同，普通插入会将相同 key 的值进行覆盖，而 setIfAbsent 则不会，它会进行判断，如果 redis 中有这个 key，那么返回 false，如果没有则进行存储然后返回 true，而我们可以利用这个特性来进行持有锁和释放锁，但是需要注意的是必须要设置一个过期的时间，否则会造成死锁。

![架构示意图](https://xiaoheixian.github.io/posts/assets/357_65.png)
![架构示意图](https://xiaoheixian.github.io/posts/assets/358_65.png)

【示例】在 mall-test-service 子项目创建控制器

    @RestController
    @RequestMapping("/redis/lock")
    @Slf4j
    public class RedisLockController {
        @Autowired
        private RedisTemplate<String, String> redisTemplate;

        @PutMapping("/key")
        public void setRedisKey() {
            boolean ifAbsent = redisTemplate.opsForValue().setIfAbsent("test_stock", "1", 100, TimeUnit.MILLISECONDS);
            if (ifAbsent) {
                log.info(System.currentTimeMillis() + "抢到锁，开始处理订单");
            } else {
                log.info("很遗憾，没有抢到锁");
            }
        }
    }

压力测试：

在控制查看结果：

    1751680110083 抢到锁，开始处理订单
    很遗憾，没有抢到锁
    很遗憾，没有抢到锁
    ......
    1751680110185 抢到锁，开始处理订单
    很遗憾，没有抢到锁
    很遗憾，没有抢到锁
    ......

但是这种方法还是会出现问题，如果业务比较大，处理时间较长，而过期时间又不能设置的太短，这个时候就不好去控制锁的释放，如何来解决锁续期问题呢？可以使用 redis 的看门狗策略来实现。

2）基于 Redisson 分布式锁实现

在 Java 应用程序中使用 Redisson 分布式锁，可以有效地处理分布式系统中的并发问题，确保在多个实例或节点上对共享资源的访问是互斥的。Redisson 提供了内置的看门狗机制，可以自动续期分布式锁，保证即使客户端出现问题，锁也能在一定时间内自动释放，避免死锁。

Redisson 提供的分布式锁是支持锁自动续期的，也就是说，如果线程仍旧没有执行完，那么 redisson 会自动给 redis 中的目标 key 延长超时时间，这在 Redisson 中称之为 Watch Dog 机制。默认情况下，看门狗的检查锁的超时时间是 30 秒钟，也可以通过修改 Config.lockWatchdogTimeout 来另行指定。

watch dog 是指当你加锁时没有指定锁的自动释放时间时，则默认给你添加一个 30s 的自动释放时间，并且每隔 30s / 3 即 10s 去进行锁的续约，即每 10s 锁的自动释放时间重置为 30s，直至业务完成。

（1）客户端配置

Redisson 是一个在 Redis 的基础上实现的 Java 客户端，它提供了丰富的数据结构以及分布式服务。

在 mall-common 中添加依赖

    <dependency>
        <groupId>org.redisson</groupId>
        <artifactId>redisson-spring-boot-starter</artifactId>
        <version>3.24.3</version>
    </dependency>

在 mall-common 的 RedisConfig 中配置客户端：

    @Value("${spring.data.redis.host}")
    private String redisHost;
    @Value("${spring.data.redis.port}")
    private int redisPort;
    @Value("${spring.data.redis.password}")
    private String password;

    @Bean
    public RedissonClient redissonClient() {
        Config config = new Config();
        // 单机模式
        config.useSingleServer()
            .setAddress("redis://" + redisHost + ":" + redisPort)
            .setPassword(password)
            .setConnectionPoolSize(10) // 连接池大小
            .setConnectionMinimumIdleSize(5) // 最小空闲连接数
            .setTimeout(3000) // 连接超时时间
            .setRetryAttempts(3) // 重试次数
            .setRetryInterval(1000); // 重试间隔时间
        // 设置看门狗超时时间（默认 30 秒）
        config.setLockWatchdogTimeout(30000);
        return Redisson.create(config);
    }

（2）Rlock 加锁

RLock 是 Redisson 分布式锁的最核心接口。RLock 锁接口实现源码主要是 RedissonLock 这个类，而源码中加锁、释放锁等操作都是使用 Lua 脚本完成的，并且封装的非常完善，开箱即用。RLock 的 tryLock 方法用于尝试获取锁，并在特定的时间内等待获取锁。

    boolean tryLock(long waitTime, long leaseTime, TimeUnit unit)

参数解释：

- waitTime（long）：等待时间。定义了在获取锁之前，线程会等待多长时间。如果在这段时间内锁没有被获取到，tryLock 方法将返回 false。如果设置为 0，表示不等待，立即尝试获取锁，无论成功与否都会立即返回。
- leaseTime（long）：租约时间。定义了锁的持有时间，即锁在自动释放之前可以保持多久。如果设置为 -1，表示锁一直持有，直到显式解锁（即必须手动调用 unlock() 方法）。该时间段内如果没有显式释放锁，锁会在 leaseTime 时间到期后自动释放，避免死锁。
- unit（TimeUnit）：时间单位。用于指定 waitTime 和 leaseTime 的时间单位。可以是 TimeUnit.SECONDS、TimeUnit.MILLISECONDS 等等。

以下是看门狗续期设置案例：

    // 等待时间：10 秒 锁释放时间：40 秒（固定，不会续期）（指定了 leaseTime）
    lock.tryLock(10, 40, TimeUnit.SECONDS);
    // 等待时间：10 秒 锁释放时间：默认 30 秒（看门狗会每 10 秒续期一次）（未指定 leaseTime）
    lock.tryLock(10, TimeUnit.SECONDS);
    // 无限等待，看门狗自动续期（未指定 leaseTime）
    lock.lock();

## 4、实现秒杀库存的扣减

（1）使用分布式锁解决超卖问题，修改业务实现方法代码：

    @Autowired
    private RedissonClient redissonClient;

    @Override
    public void decreaseStock(StockDeductDTO stockDeductDTO) {
        // 1. 创建锁
        // 1.1 构建锁的 key
        String lockKey = "lock:seckill:" + stockDeductDTO.getActivityId()
            + ":" + stockDeductDTO.getSkuId();
        // 1.2 创建锁对象
        RLock lock = redissonClient.getLock(lockKey);
        // 2. 构建库存 key
        String stockKey = "seckill-" + stockDeductDTO.getActivityId() + "-" + stockDeductDTO.getSkuId();
        try {
            // 3. 尝试获取锁（等待 3 秒，锁自动释放时间 10 秒）
            boolean isLocked = lock.tryLock(3, 10, TimeUnit.SECONDS);
            if (!isLocked) {
                log.warn("获取分布式锁失败");
                throw new BusinessException(7001, "系统繁忙，请稍后重试");
            }
            log.info("获取分布式锁成功，开始扣减库存");
            // 4. 查询库存（现在是在锁保护下执行）
            int count = Integer.parseInt(redisTemplate.opsForValue().get(stockKey).toString());
            // 5. 判断并扣减库存
            if (count > 0) {
                Long remainCount = redisTemplate.opsForValue().decrement(stockKey);
                log.info("库存扣减成功，剩余库存：{}", remainCount);
            } else {
                log.warn("库存不足，当前库存：{}", count);
                throw new BusinessException(ResultCodeEnum.STOCK_SHORTAGE);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("获取锁被中断", e);
            throw new BusinessException(7002, "系统异常");
        } finally {
            // 6. 释放锁（必须检查是否当前线程持有）
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
                log.info("释放分布式锁");
            }
        }
    }

（2）压测

用测试计划（库存扣减）线程组进行测试，将商品编号修改为 3，4，5，……

测试完成后，查看 Redis 库存，库存为 0，没有出现超卖现象。

## 5、库存同步

缓存中库存扣减是临时扣减，扣减后要保证缓存与数据库一致性：

- 先操作缓存再操作数据库
- 数据库操作异步化（通过消息队列）
- 设置库存操作流水表用于对账

库存扣减与同步流程图：

![架构示意图](https://xiaoheixian.github.io/posts/assets/359_65.png)

    开始 --> Redis预减库存 --> 预减成功？
    预减成功为 Y --> 生成订单 --> 发起支付 --> 支付成功？
        支付成功为 Y --> 更新数据库库存 --> 结束
        支付成功为 N --> 回滚Redis库存 --> 结束
    预减成功为 N --> 结束

## 流程图文字推演

### 分布式锁（SETNX）执行流程

用户请求 --> 调用 setIfAbsent 设置 key 与过期时间 --> 判断返回值
返回 true：抢到锁，执行后续业务逻辑
返回 false：未抢到锁，返回失败或重试

### Redisson 看门狗续期流程

业务线程尝试获取锁（tryLock） --> 未指定 leaseTime 时，默认锁超时为 30 秒 --> 业务执行耗时超过 10 秒 --> Redisson 看门狗每隔 10 秒检查锁是否仍被持有 --> 若持有则发送 expire 命令将锁超时重置为 30 秒 --> 业务执行完成调用 unlock() --> 锁被释放

### 秒杀库存扣减流程

用户请求扣减库存 --> 构建锁 Key（lock:seckill:活动ID:商品ID） --> 尝试获取 Redisson 分布式锁 --> 获取成功 --> 查询 Redis 库存 --> 库存 > 0 --> 执行 DECR 扣减库存 --> 释放锁 --> 返回扣减成功；若库存不足则抛出异常并释放锁

## 💡 **速记**

【核心考点】

分布式锁用于跨进程、跨节点控制共享资源访问，与乐观锁、悲观锁的适用场景不同。选型：分布式环境用 Redis/ZooKeeper，单体高并发写用悲观锁，读多写少用乐观锁。

基于 SETNX 实现分布式锁需配合过期时间，但存在业务未执行完锁过期、难以控制续期的问题。

Redisson 通过看门狗（Watch Dog）机制自动续期，默认锁超时 30 秒，每 10 秒续期一次，避免死锁和业务超时。

【高频逻辑链】

分布式锁选型：分布式环境（Redis/ZooKeeper） -> 单体高并发写（数据库行锁/悲观锁） -> 读多写少（版本号/CAS/乐观锁）。

秒杀库存扣减：构建锁 Key -> 获取 Redisson 锁 -> 查询 Redis 库存 -> 判断并 DECR 扣减 -> 释放锁。

Redisson 续期：tryLock 未指定 leaseTime -> 默认 30 秒 -> 看门狗每 10 秒续期 -> 业务完成 unlock 释放。

【关键避坑】

使用 SETNX 实现分布式锁时，必须设置过期时间，否则一旦宕机将造成死锁。

Redisson 的 tryLock 方法必须放在 try...finally 中，并在 finally 中判断 `lock.isHeldByCurrentThread()` 后再释放锁，避免释放其他线程的锁。

缓存预减库存后，必须通过 MQ 异步同步到数据库，保证最终一致性；支付失败需回滚 Redis 库存。
