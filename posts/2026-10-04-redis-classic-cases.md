---
layout: article
title: "Redis 经典案例实战"
description: "- \"Token 管理：从无状态变为可管理、可控制，解决安全与运维痛点。\"   - \"安全性：支持强制下线、多设备登录管理、防止 Token 被盗用。\"   - \"可用性：支持滑动续期，可针对不同场景精细化设置过期策略。\"   - \"幂等去重：通过业务唯一 Key 与 Redis 原子操作，实现消费端幂等。\""
date: 2026-10-04
category: "云商城"
tags:
  - "微服务"
  - "Redis"
  - "Token"
  - "幂等性"
  - "最佳实践"
permalink: /posts/2026-10-04-redis-classic-cases.html
---

## 【案例一】Token 管理

将登录 Token 保存到 Redis，核心目的是让 Token 从“无状态”变成“可管理、可控制的状态”。虽然 JWT 等自包含 Token 本身可以不依赖服务端存储，但在实际生产环境中，仅靠客户端保存 Token 会带来一系列安全和运维问题。

### 1）为什么将 Token 存到 Redis

下面从安全、可用、运维三个维度详细说明为什么要将 Token 存到 Redis：

（1）安全性：主动控制权

① 支持强制下线/踢人

问题：如果 Token 只存在客户端，服务端无法主动让某个 Token 失效。用户修改密码或账号被盗后，旧 Token 依然有效，存在安全风险。

Redis 方案：每次登录生成 Token 存入 Redis，并设置过期时间。执行踢人操作时，直接删除 Redis 中对应的 Key，该 Token 立即失效。

② 支持多设备登录管理

问题：用户可能在手机、PC 等多设备登录，需要分别管理每个设备的 Token。

Redis 方案：使用 Hash 结构存储，Field 为设备 ID，Value 为 Token，可单独管理每个设备。

③ 防止 Token 被盗用

问题：无状态 JWT 一旦泄露，攻击者可在有效期内任意使用。

Redis 方案：每次请求验证 Token 时，检查 Redis 中是否存在且有效。如果发现异常，可立即删除 Token，使其失效。

（2）可用性：灵活的过期管理

① 支持滑动续期

问题：JWT 一旦签发，过期时间固定，无法根据用户活跃度动态延长。用户体验差，如每隔 10 分钟就要重新登录。

Redis 方案：用户每次请求时，更新 Redis 中 Token 的过期时间（expire），实现“只要在操作，Token 就一直有效”。

② 精细化过期策略

可以为不同场景设置不同的过期时间：

普通用户：30 分钟

记住我用户：7 天

管理员：15 分钟（更安全）

（3）运维性：可观测与控制

① 实时查看在线用户

管理人员可以实时查看系统中有哪些用户在线，统计活跃用户数。

② 支持黑名单机制

问题：用户注销后，JWT 依然有效，直到过期。

Redis 方案：将注销的 Token 加入黑名单，在有效期内阻止其访问。

③ 方便迁移和扩展

Token 存储在 Redis 中，多个微服务实例可以共享同一个 Redis 集群，实现分布式会话管理，无需依赖粘性 Session。

### 2）案例实现

（1）在配置中心创建默认组数据集 redis.yml，并在用户服务导入数据集

    spring:
      data:
        redis:
          host: 192.168.100.101
          port: 6379
          password: 123456
          lettuce:
            pool:
              max-active: 20
              max-idle: 10
              min-idle: 5
              timeout: 3000ms

（2）修改 JwtUtil 工具类，添加 Redis 验证方法

① Redis Key 设计规范

Key 格式：user:token:{userId}

示例：user:token:1001

用途：存储用户 Token（单设备）

Key 格式：user:token:{userId} (Hash)

示例：user:token:1001 -> {deviceId: token}

用途：存储多设备 Token

Key 格式：blacklist:{token}

示例：blacklist:abc123

用途：Token 黑名单

以下为对应的 Hash 结构存储数据示例：

    HSET user:1001 name "张三" age 28 city "上海" vip_level 3
    HSET user:1002 name "李四" age 38 city "北京" vip_level 5

表名：user

| Id | name | age | city | Vip_level |
| 1001 | 张三 | 28 | 上海 | 3 |
| 1002 | 李四 | 38 | 北京 | 5 |

② 在配置中心的 jwt.yml 数据集添加自定义配置

    jwt:
      # redis 配置
      redis:
        token-prefix: user:token
        blacklist-prefix: blacklist:token

③ 添加注入

    @Value("${jwt.redis.token-prefix:user:token}")
    private String tokenPrefix;
    @Value("${jwt.redis.blacklist-prefix:blacklist:token}")
    private String blacklistPrefix;
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

④ 核心方法

    /**
     * 生成 Token 并存入 Redis（登录时使用）
     */
    public String createTokenAndStore(Long userId, Map<String, Object> claims) {
        String token = createToken(userId, claims);
        String redisKey = tokenPrefix + ":" + userId;
        // 存入 Redis，过期时间与 JWT 一致（毫秒转秒）
        long expireSeconds = expireTime / 1000;
        redisTemplate.opsForValue().set(redisKey, token, expireSeconds, TimeUnit.SECONDS);
        return token;
    }

    /**
     * 完整验证：JWT 有效性 + Redis 存在性 + 黑名单检查
     */
    public boolean validateTokenWithRedis(String token, Long userId) {
        // 1. 检查黑名单
        String blacklistKey = blacklistPrefix + ":" + token;
        Boolean isBlacklisted = redisTemplate.hasKey(blacklistKey);
        if (Boolean.TRUE.equals(isBlacklisted)) {
            throw new BusinessException(ResultCodeEnum.TOKEN_INVALID);
        }
        // 2. 检查 JWT 签名和过期
        if (!validateToken(token)) {
            throw new BusinessException(ResultCodeEnum.TOKEN_EXPIRED);
        }
        // 3. 检查 Redis 中是否存在
        String redisKey = tokenPrefix + ":" + userId;
        String storedToken = (String) redisTemplate.opsForValue().get(redisKey);
        if (storedToken == null) {
            throw new BusinessException(ResultCodeEnum.TOKEN_EXPIRED);
        }
        // 4. 校验 Token 是否匹配
        if (!token.equals(storedToken)) {
            throw new BusinessException(4010, "Token 不匹配，可能在其他设备登录");
        }
        return true;
    }

    /**
     * 通过 Claims 中的 userId 自动提取进行校验
     */
    public boolean validateTokenWithRedis(String token) {
        Claims claims = parseToken(token);
        Long userId = Long.valueOf(claims.getSubject());
        return validateTokenWithRedis(token, userId);
    }

    /**
     * 登录：生成 Token 并存入 Redis
     */
    public String login(Long userId, Map<String, Object> extraClaims) {
        if (extraClaims == null) {
            extraClaims = new HashMap<>();
        }
        extraClaims.put("userId", userId);
        return createTokenAndStore(userId, extraClaims);
    }

    /**
     * 退出登录：删除 Redis 中的 Token
     */
    public void logout(Long userId) {
        String redisKey = tokenPrefix + ":" + userId;
        // 删除 Redis 中的 Token
        redisTemplate.delete(redisKey);
    }

    /**
     * 退出登录（通过 Token 注销）
     */
    public void logoutByToken(String token) {
        Long userId = getUserId(token);
        // 加入黑名单
        String blacklistKey = blacklistPrefix + ":" + token;
        // 获取 Token 有效期
        long remainingTtl = getRemainingTtl(token);
        if (remainingTtl > 0) {
            redisTemplate.opsForValue().set(blacklistKey, "1", remainingTtl, TimeUnit.MILLISECONDS);
        }
        // 删除 Redis
        String redisKey = tokenPrefix + ":" + userId;
        redisTemplate.delete(redisKey);
    }

    /**
     * 强制踢人（管理员操作）
     */
    public void forceLogout(Long userId) {
        String redisKey = tokenPrefix + ":" + userId;
        String token = (String) redisTemplate.opsForValue().get(redisKey);
        if (token != null) {
            // 加入黑名单（永久或长期）
            String blacklistKey = blacklistPrefix + ":" + token;
            redisTemplate.opsForValue().set(blacklistKey, "1", 7, TimeUnit.DAYS);
        }
        redisTemplate.delete(redisKey);
    }

    /**
     * 获取 Token 剩余有效期（毫秒）
     */
    public long getRemainingTtl(String token) {
        Claims claims = parseToken(token);
        Date expiration = claims.getExpiration();
        return expiration.getTime() - System.currentTimeMillis();
    }

    /**
     * 检查 Token 是否在黑名单中
     */
    public boolean isBlacklisted(String token) {
        String blacklistKey = blacklistPrefix + ":" + token;
        return Boolean.TRUE.equals(redisTemplate.hasKey(blacklistKey));
    }

    /**
     * 获取 Redis 中存储的 Token
     */
    public String getStoredToken(Long userId) {
        String redisKey = tokenPrefix + ":" + userId;
        return (String) redisTemplate.opsForValue().get(redisKey);
    }

    /**
     * 判断用户是否在线
     */
    public boolean isOnline(Long userId) {
        String redisKey = tokenPrefix + ":" + userId;
        return Boolean.TRUE.equals(redisTemplate.hasKey(redisKey));
    }

（3）修改登录和登出控制器

将登录和登出控制器代码替换如下代码：

    @Tag(name = "用户登录模块")
    @RestController
    public class LoginController {
        @Autowired
        private IUserInfoService userInfoService;
        @Autowired
        private JwtUtil jwtUtil;
        @Operation(summary = "用户登录")
        @PostMapping("/login")
        @Login4j
        public UserInfoDTO login(@RequestBody LoginDTO loginDTO, HttpServletResponse response) {
            // 验证用户名和密码
            UserInfoDTO userInfoDTO = userInfoService.validate(loginDTO.getUsername(), loginDTO.getPassword());
            // 创建 token
            // 自定义载荷数据
            Map<String, Object> claims = new HashMap<>();
            claims.put("userId", userInfoDTO.getId());
            claims.put("username", userInfoDTO.getUsername());
            claims.put("email", userInfoDTO.getEmail());
            // 生成 Token
            String token = jwtUtil.login(Long.parseLong(userInfoDTO.getId()), claims);
            // 将 token 写入响应头，带加到前端
            response.setHeader("Authorization", token);
            return userInfoDTO;
        }

        @Operation(summary = "用户登出")
        @PostMapping("/logout")
        public Result logout(Long userId) {
            jwtUtil.logout(userId);
            return Result.success();
        }
    }

（4）修改 Gateway 登录过滤器

重载输出异常方法：

    private Mono<Void> writeErrorResponse(ServerHttpResponse response, int code, String message) {
        // 设置响应内容类型为 JSON
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        try {
            // 将错误响应对象序列化为 JSON 字节数组
            byte[] bytes = objectMapper.writeValueAsBytes(Result.fail(code, message));
            // 将字节数组包装为 DataBuffer 并写入响应体
            return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)));
        } catch (JsonProcessingException e) {
            // 序列化失败时，返回一个错误流
            return response.writeWith(Mono.error(new IOException("响应序列化失败", e)));
        }
    }

修改：// 2. Token 校验

    // 2. Token 校验
    // 从请求头中获取 Authorization 头
    String token = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
    try {
        jwtUtil.validateTokenWithRedis(token);
    } catch (BusinessException e) {
        return writeErrorResponse(response, e.getCode(), e.getMessage());
    }

修改：// 3.3 刷新 Token（无感知续期）

将生成 token 语句替换：

    // 生成 Token
    String newToken = jwtUtil.createTokenAndStore(Long.parseLong(userId), claims);

（5）Gateway 整合 redis

① 在网关服务的 pom.xml 中，需要引入支持响应式编程的 Redis 依赖，这是与 Gateway 的 WebFlux 底层兼容的关键：

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
    </dependency>

② 在 application.yml 中配置 Redis 连接信息：

    spring:
      data:
        redis:
          host: 192.168.100.101
          port: 6379
          password: 123456
          lettuce:
            pool:
              max-active: 20
              max-idle: 10
              min-idle: 5
              timeout: 3000ms

（6）测试

① 打开前端页面登录测试（添加地址），测试正常

② 删除 redis 中用户 token，再次（添加地址），出现网络错误（token 已过期）

## 【案例二】幂等性去重

### 1）去重实现步骤

第一步：设置业务唯一 Key：在生产者发送消息时，用业务的唯一标识（如订单号）设置消息的 KEYS 属性。

第二步：消费端进行幂等校验：消费者拿到消息后，根据这个业务 Key 进行去重。在 Redis 中创建业务标识，将业务 Key 设为唯一值。消费消息时，尝试插该 Key。插入成功则代表首次消费，执行后续业务逻辑；若插入失败，则说明是重复消息，直接忽略。

### 2）去重实现

以下实现在 mall-test-service 中实现：

（1）生产端幂等性保障

发送消息时携带业务唯一键（如订单号、交易流水号），通过消息头 KEYS 方法绑定到消息属性中，消息投递前查询数据库或 Redis，判断该业务键是否已存在，存在则放弃发送。

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @GetMapping("/unique")
    public Result<String> unique(String msg, String key) {
        // 1. 锁 Key 规范化
        String lockKey = "req:lock:" + key;
        String msgKey = "order:" + key; // 消息 KEYS，加业务前缀便于识别
        // 2. 原子获取锁（10 秒过期），必须设置合理过期时间，未设置过期时间导致锁无法自动释放（如系统崩溃）
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "1", 10, TimeUnit.SECONDS);
        if (Boolean.TRUE.equals(acquired)) {
            // 3. 构建消息
            Message<String> message = MessageBuilder.withPayload(msg)
                .setHeader("KEYS", msgKey)
                .build();
            // 4. 发送消息
            streamBridge.send("testOutput-out-2", message);
            return Result.success("消息发送成功");
        }
        // 5. 获取锁失败（10 秒内重复提交）
        return Result.fail(7001, "请勿重复提交，请稍后再试");
    }

（2）消费端幂等性保障

使用自定义业务键作为去重依据，消费前检查 Redis 是否存在该标识。

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Bean
    public Consumer<Message<String>> testOrderInput() {
        return message -> {
            String payload = message.getPayload();
            Map<String, Object> headers = message.getHeaders();
            String key = (String) headers.get("KES");
            String lockKey = "que:lock:" + key;
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, "1", 20, TimeUnit.SECONDS);
            if (Boolean.TRUE.equals(acquired)) {
                System.out.println("订单创建成功:" + payload);
            } else {
                System.out.println("订单创建失败:" + payload + "已重复创建");
            }
        };
    }

（3）发送通道和消费通道配置

    testOutput-out-2:
      destination: orderTopic
      group: test-order-producer-group
    testOrderInput-in-0:
      destination: orderTopic
      group: test-order-consumer-group
    ---
    function:
      definition: testOrderInput

（4）测试

用 JMeter 持续 30 秒发送 10 条消息，查看发送和消费结果：

从压测结果可以看出，发送了 10 个请求，但是只发出 3 条消息，因为幂等设置 10 秒钟发一次。

从消费者控制台可以看出，只消费了两条数据，因为幂等设置 20 秒钟接收一次：

    订单创建成功:订单数据
    订单创建失败:订单数据已重复创建
    订单创建成功:订单数据

## 流程图文字推演

### Token 校验与续期流程

前端请求携带 Authorization 头 --> Gateway 过滤器拦截 --> 提取 Token --> 校验 JWT 签名与过期时间 --> 校验 Redis 中是否存在该 Token --> 校验是否在黑名单中 --> 校验通过后放行并将请求转发至下游服务 --> 若需续期则更新 Redis 中 Key 的过期时间

### 消息幂等去重流程

生产者发送消息 --> 携带业务唯一 Key 并绑定到消息头 --> 消费者拉取消息 --> 提取消息头中的 KEYS --> 尝试在 Redis 中 setIfAbsent 插入该 Key --> 插入成功则视为首次消费并执行后续业务逻辑 --> 插入失败则视为重复消息并直接忽略

💡 **速记**

【核心考点】

Token 存 Redis 的核心目的是实现服务端的主动控制权（强制下线、多设备管理、黑名单）。

幂等性去重的核心是“一锁二判三更新”，利用 Redis 的原子操作（setIfAbsent）作为分布式锁或去重标识。

【高频逻辑链】

Token 管理：安全性（踢人/多端） --> 可用性（滑动续期/精细过期） --> 运维性（在线统计/黑名单） --> JwtUtil 改造 --> Gateway 拦截校验。

幂等去重：生产端消息头绑定业务唯一 Key --> 消费端 Redis setIfAbsent 尝试插入 --> 成功执行业务，失败忽略消息。

【关键避坑】

分布式锁的 Key 必须设置合理的过期时间，否则系统崩溃时会导致锁无法自动释放，造成死锁。

Gateway 整合 Redis 必须使用响应式依赖（spring-boot-starter-data-redis-reactive），否则会与 WebFlux 底层不兼容。
