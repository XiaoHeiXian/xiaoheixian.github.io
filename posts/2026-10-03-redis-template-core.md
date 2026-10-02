---
layout: article
title: "RedisTemplate 核心原理与实战"
description: "- \"定义：Spring Data Redis 的核心操作类，封装底层交互细节。\"   - \"依赖：在 mall-common 模块引入 spring-boot-starter-data-redis。\"   - \"连接管理：通过 RedisConnectionFactory 获取连接，需配置连接池。\"   - \"序列化：默认 JDK 序列化会导致乱码，推"
date: 2026-10-03
category: "云商城"
tags:
  - "微服务"
  - "Redis"
  - "RedisTemplate"
  - "序列化"
permalink: /posts/2026-10-03-redis-template-core.html
---

## 1、RedisTemplate 是什么

RedisTemplate 是 Spring Data Redis 的核心操作类，它封装了与 Redis 交互的底层细节，提供了类型安全的 API，让我们可以用更便捷的方式操作 Redis 数据库。

## 2、RedisTemplate 应用

### （1）依赖

RedisTemplate 本质上是一个高层抽象模板，它像一座桥梁，连接着你的 Java 应用和 Redis 服务器。其依赖 Jar 包如下：

在 mall-common 加 redis 依赖：

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>

### （2）其主要工作流程如下

① 连接管理：

RedisTemplate 本身不直接连接 Redis，而是通过配置好的 RedisConnectionFactory（如 LettuceConnectionFactory）来获取和管理连接。

如在 mall-test-service 中的连接配置：

    spring:
      data:
        redis:
          host: 192.168.100.101
          port: 6379
          password: 123456
          lettuce:
            pool:
              max-active: 8
              max-idle: 4
              min-idle: 1

② 序列化/反序列化：

这是最关键的一环。Java 对象不能直接存入 Redis，需要先序列化成字节数组（byte[]）。

RedisTemplate 将这一过程托管给 RedisSerializer 接口的不同实现。

默认情况下，它使用的是 JDK 原生序列化，这会导致存入 Redis 的数据变成乱码且可读性差，因此在生产环境中，我们强烈推荐自定义序列化方案。

在 mall-common 的 config 包下创建 Redis 配置类，自定义序列化方案：

    @Configuration
    public class RedisConfig {
        @Bean
        public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
            RedisTemplate<String, Object> template = new RedisTemplate<>();
            template.setConnectionFactory(factory);
            // 1. 创建并配置 ObjectMapper
            ObjectMapper mapper = new ObjectMapper();
            // 当从 Redis 读取数据时，正确反序列化回原始的 Java 类型
            mapper.activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.WRAPPER_ARRAY
            );
            // 设置可见性，让 Jackson 可以序列化所有字段
            mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
            // 2. 使用 Jackson2JsonRedisSerializer 来序列化和反序列化 value 值
            // 通过构造器传入 ObjectMapper
            Jackson2JsonRedisSerializer<Object> jsonSerializer =
                new Jackson2JsonRedisSerializer<>(mapper, Object.class);

            // 3. 配置序列化器
            template.setKeySerializer(new StringRedisSerializer());
            template.setValueSerializer(jsonSerializer);
            template.setHashKeySerializer(new StringRedisSerializer());
            template.setHashValueSerializer(jsonSerializer);

            template.afterPropertiesSet();
            return template;
        }
    }

③ 执行 Redis 命令：

RedisTemplate 提供了丰富的 API 来执行 Redis 命令。为了方便使用，它将这些 API 按照 Redis 的 5 种主要数据结构进行了分组，就是我们常用的 opsForXXX() 方法：

opsForValue()：

对应数据结构：String（字符串）。

常用场景：存储简单的缓存数据，如验证码、Token、JSON 字符串等。

opsForHash()：

对应数据结构：Hash（哈希）。

常用场景：存储对象的部分属性，适合需要频繁更新个别字段的场景，内存效率比存储整个 JSON 对象更高。

opsForList()：

对应数据结构：List（列表）。

常用场景：用作消息队列或存储有序数据集合，例如“最新消息列表”。

opsForSet()：

对应数据结构：Set（无序集合）。

常用场景：存储不重复的元素集合，用于去重、计算共同好友等。

opsForZSet()：

对应数据结构：ZSet（有序集合）。

常用场景：存储带分数的排序集合，常用于排行榜、带权重的任务队列等。

你可能会看到 boundValueOps 或 boundHashOps 等方法。它们与 opsFor 的区别在于：

opsForXXX()：获取的是通用的操作对象，你可以在一个事务或管道中，用它来操作多个不同的 Key。

boundXXXOps(key)：获取的是绑定了特定 Key 的操作对象，后续所有操作都针对这个 Key，省去了反复指定 Key 的麻烦。

### （3）代码实现示例

【例 1】存储和获取字符串（String）

    @RestController
    @RequestMapping("/test/redis")
    public class RedisController {
        @Autowired
        private RedisTemplate<String, Object> redisTemplate;

        /**
         * 使用 opsForValue 存储字符串
         * 特点：每次操作都需要指定完整的 Key
         */
        @GetMapping("/string/opsFor")
        public Result<String> stringExampleWithOpsFor(String key, String value) {
            // 存储（带过期时间）
            redisTemplate.opsForValue().set(key, "refresh:" + value, 30, TimeUnit.MINUTES);
            // 获取
            String token = (String) redisTemplate.opsForValue().get(key);
            return Result.success(token);
        }

        /**
         * 使用 boundValueOps 存储字符串
         * 特点：先绑定 Key，后续操作无需重复指定 Key
         * 适用场景：对同一个 Key 进行多次操作的场景
         */
        @GetMapping("/string/bound")
        public Result<String> stringExampleWithBound(String key, String value) {
            // 1. 绑定 Key，获得 BoundValueOperations 对象
            BoundValueOperations<String, Object> boundOps = redisTemplate.boundValueOps(key);
            // 2. 存储（带过期时间）
            boundOps.set("refresh:" + value, 30, TimeUnit.MINUTES);
            // 3. 获取
            String token = (String) boundOps.get();
            return Result.success(token);
        }
    }

【例 2】存储和获取对象（使用 Hash 结构）

创建 DTO：

    @Data
    public class UserDTO {
        private Long id;
        private String name;
        private Integer age;
        private String email;
    }

创建控制器：

    @PostMapping("/hashSet/save")
    public Result save(@RequestBody UserDTO userDTO) {
        String key = "user:" + userDTO.getId();
        // 使用 Hash 存储对象属性，方便单独更新某个字段
        Map<String, Object> map = new HashMap<>();
        map.put("name", userDTO.getName());
        map.put("age", userDTO.getAge());
        map.put("email", userDTO.getEmail());
        redisTemplate.opsForHash().putAll(key, map);
        // 设置整个 Hash 的过期时间
        redisTemplate.expire(key, 1, TimeUnit.HOURS);
        return Result.success();
    }

    @GetMapping("/hashSet/get")
    public UserDTO get(String key) {
        String userKey = "user:" + key;
        // 获取整个 Hash 的所有字段和值
        Map<Object, Object> map = redisTemplate.opsForHash().entries(userKey);
        map.put("id", key);
        return JsonUtils.toObj(JsonUtils.toJson(map), UserDTO.class);
    }

## 3、流程图文字推演

RedisTemplate 操作 Redis 的完整工作流程可以推演如下：

Spring 容器启动 --> 读取 application.yml 配置 --> 创建 RedisConnectionFactory（Lettuce 连接池） --> 注入 RedisConfig 中的 RedisTemplate Bean（自定义 Jackson 序列化器） --> 业务代码调用 opsForXXX() 方法 --> 底层将对象序列化为字节数组 --> 通过连接工厂发送命令至 Redis 服务器

💡 **速记**

【核心考点】

RedisTemplate 是 Spring Data Redis 的核心操作类，封装底层细节，提供类型安全的 API。

默认 JDK 序列化会导致乱码和可读性差，生产环境必须自定义序列化方案（推荐 Jackson2JsonRedisSerializer）。

【高频逻辑链】

依赖引入（mall-common） --> 连接配置（Lettuce 连接池） --> 序列化配置（ObjectMapper + Jackson） --> 调用 opsForXXX 或 boundXXXOps 执行命令。

【关键避坑】

opsForXXX() 是通用操作对象，适合在事务或管道中操作多个 Key；boundXXXOps(key) 绑定特定 Key，适合对同一个 Key 进行多次操作，避免重复指定 Key 的麻烦。
