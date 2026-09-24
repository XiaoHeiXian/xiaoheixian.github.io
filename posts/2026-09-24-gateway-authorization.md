---
layout: article
title: "Gateway 权限控制"
description: "- \"微服务修正：删除API前缀，禁用微服务拦截器，修正返回值拦截器\"   - \"请求流程：客户端 -> Gateway(RtGlobalFilter -> AuthGlobalFilter) -> 微服务 -> Gateway(RtGlobalFilter) -> 客户端\"   - \"全局过滤器 RtGlobalFilter：记录请求开始/结束时间、U"
date: 2026-09-24
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "网关"
  - "权限控制"
permalink: /posts/2026-09-24-gateway-authorization.html
---

作为微服务入口，网关可以统一校验用户身份和权限，拦截未授权请求，避免在每个微服务中重复开发认证逻辑。

1、微服务修正

1）删除微服务 API 前缀

（1）删除商品服务所控制器的路径前缀 /product
（2）删除用户服务所控制器的路径前缀 /user
（3）删除测试服务所控制器的路径前缀 /test

2）禁用微服务的身份认证拦截器

删除 mall-common 的 config.WebConfig 配置类中的 addInterceptors 方法的内容。

3）修正统一返回值拦截器类

将统一返回值拦截器类 GlobalResponseAdvice 的匹配 OpenAPI 文档相关路径代码作如下更新：

    // 匹配 OpenAPI 文档相关路径
    return path.contains("/v3/api-docs")
            || path.contains("/swagger-ui")
            || path.contains("/doc.html");

2、完整请求处理流程

1）请求流程

（1）客户端发出请求

（2）进入 GATEWAY 层（第一道防线）

① 进入全局过滤器 RtGlobalFilter（请求日志记录）：
- 记录请求开始时间、URI

② 进入默认过滤器 AuthGlobalFilter（登录认证 + 请求头复制）：
- 检查白名单路径（登录、注册、文档等）
- 从请求头获取 Authorization Token
- 校验 Token 有效性（是否过期、是否有效）
- Token 无效 -> 直接返回 401，请求结束（不进入微服务）
- Token 有效 -> 解析用户信息，注入 X-User-Id 到请求头，复制所有请求头，继续转发，传递给下游

（3）进入微服务层

① 进入授权拦截器（略）
② 进入控制器 Controller（业务处理）

（4）进入过滤器 RtGlobalFilter
- 记录响应时间

（5）响应返回客户端

2）自定义过滤器

除了使用内置的过滤器，我们还可以自定义 Gateway 过滤器工厂来满足特定的需求：
- 自定义过滤器工厂的命名规范：{自定义名称} + GatewayFilterFactory，自定义名称是过滤器工厂的名字
- 自定义过滤器的两种类型：局部过滤器和全局过滤器
  - 局部过滤器（针对特定路由）：继承 AbstractGatewayFilterFactory，只对配置了该过滤器的路由生效。可以配置为默认过滤器。
  - 全局过滤器：实现 GlobalFilter 接口，对所有请求生效。不用配置。

（1）自定义全局过滤器

记录每个请求的开始时间、结束时间和总耗时。它是一个典型的性能监控/日志记录过滤器。

功能说明：
- 记录每个请求的 URI、方法、开始时间
- 记录每个请求的结束时间、响应状态码、总耗时
- 支持响应式编程，使用 doFinally 确保日志在响应结束时打印
- 适用于性能监控、问题排查、流量分析等场景

① 在 filter 包创建过滤器：

    @Component
    @Slf4j
    public class RtGlobalFilter implements GlobalFilter, Ordered {

        /**
         * 过滤器执行顺序，数值越小优先级越高
         * 设置为 0，在所有过滤器中优先执行（记录开始时间）
         */
        @Override
        public int getOrder() {
            return 0;
        }

        @Override
        public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
            // 1. 获取请求信息
            ServerHttpRequest request = exchange.getRequest();
            String method = request.getMethod().name(); // 请求方法：GET/POST/PUT/DELETE
            URI uri = request.getURI(); // 请求 URI
            String path = request.getPath().value(); // 请求路径（不包含参数）
            String query = request.getURI().getQuery(); // 请求参数

            // 组装日志信息（避免暴露完整 URL 中的敏感参数）
            String requestInfo = String.format("%s %s%s", method, path,
                    (query != null && !query.isEmpty()) ? "?" + query : "");

            // 2. 记录开始时间
            long startTime = System.currentTimeMillis();
            log.info("=== 请求开始 ===> [{}] [{}]", requestInfo, startTime);

            // 3. 执行后续过滤器链，并记录结束日志
            return chain.filter(exchange)
                    .doFinally(signalType -> {
                        // ========== 4. 计算耗时 ==========
                        long endTime = System.currentTimeMillis();
                        long duration = endTime - startTime;

                        // ========== 5. 获取响应状态码 ==========
                        HttpStatusCode statusCode = exchange.getResponse().getStatusCode();

                        // ========== 6. 打印结束日志 ==========
                        // 根据响应状态码决定日志级别：4xx/5xx 使用 warn 级别，2xx/3xx 使用 info 级别
                        if (statusCode != null && (statusCode.is4xxClientError() || statusCode.is5xxServerError())) {
                            log.warn("<=== 请求结束 [{}] [{}] 状态码: {} 耗时: {}ms",
                                    requestInfo, endTime, statusCode.value(), duration);
                        } else {
                            log.info("<=== 请求结束 [{}] [{}] 状态码: {} 耗时: {}ms",
                                    requestInfo, endTime,
                                    statusCode != null ? statusCode.value() : "UNKNOWN",
                                    duration);
                        }
                    });
        }
    }

② 测试

在浏览器输入：http://localhost:9000/test/connect，在 mall-gateway 的 IDEA 控制台查看测试结果：

    com.example.mall.filter.RtGlobalFilter : === 请求开始 ===> [GET /test/connect] [1782782465971]
    com.example.mall.filter.RtGlobalFilter : <=== 请求结束 [GET /test/connect] [1782782465976] 状态码: 200 耗时: 5ms

（2）自定义局部过滤器

功能：身份认证（登录认证）

① 过滤器配置规则：

命名规则：过滤器名（Auth） + GatewayFilterFactory = AuthGatewayFilterFactory

短格式（简洁）：适用于参数较少、类型简单的场景。

    filters:
      - Auth= /login,/test/**

长格式（清晰）：适用于参数较多、需要明确命名的场景。

    filters:
      - name: Auth
        args:
          patterns:
            - /login
            - /test/**

② 在 filter 包创建过滤器：

    @Component
    public class AuthGatewayFilterFactory extends AbstractGatewayFilterFactory<AuthGatewayFilterFactory.Config> {

        private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();
        private final ObjectMapper objectMapper = new ObjectMapper();
        @Autowired
        private JwtUtil jwtUtil;

        public AuthGatewayFilterFactory() {
            super(Config.class);
        }

        /**
         * 短格式参数顺序：patterns 在前，matchTrailingSlash 在后
         * 配置示例：Auth=/login,/user/register,true
         * matchTrailingSlash: true-匹配时忽略末尾斜杠
         */
        @Override
        public List<String> shortcutFieldOrder() {
            return Arrays.asList("patterns", "matchTrailingSlash");
        }

        /**
         * 短格式类型：列表参数 + 尾部布尔标记
         */
        @Override
        public ShortcutType shortcutType() {
            return ShortcutType.GATHER_LIST_TAIL_FLAG;
        }

        /**
         * 创建并返回一个 GatewayFilter 实例，该实例包含认证过滤器的核心处理逻辑。
         * <p>
         * 该过滤器用于对请求进行统一的身份认证和授权校验，主要功能包括：
         * <ul>
         *   <li>白名单放行：对配置的公开路径（如登录、注册、文档等）直接放行，不进行 Token 校验</li>
         *   <li>Token 校验：从请求头中提取 Authorization Token，校验其有效性（是否为空、是否过期）</li>
         *   <li>用户信息提取：解析 Token 中的用户 ID 等信息，存入请求头传递给下游微服务</li>
         *   <li>Token 刷新：Token 有效时自动生成新 Token 放入响应头，实现无感知续期</li>
         * </ul>
         *
         * @param config 过滤器配置对象(自定义)，包含白名单路径列表（patterns）和末尾斜杠匹配策略（matchTrailingSlash）
         * @return GatewayFilter 实例，由 Spring Cloud Gateway 过滤器链执行
         */
        @Override
        public GatewayFilter apply(Config config) {
            return new GatewayFilter() {
                /**
                 * 过滤器的核心处理方法，对每个经过网关的请求执行认证逻辑。
                 *
                 * @param exchange 网关上下文对象，包含请求（ServerHttpRequest）、响应（ServerHttpResponse）及会话信息
                 * @param chain 过滤器链，用于将请求传递给下一个过滤器或目标服务
                 * @return Mono<Void> 响应式编程的返回结果，表示异步处理完成
                 */
                @Override
                public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
                    // 获取请求和响应对象
                    ServerHttpRequest request = exchange.getRequest();
                    ServerHttpResponse response = exchange.getResponse();
                    // 获取当前请求的路径
                    String path = request.getURI().getPath();

                    // 1.1 白名单放行
                    // 遍历配置的白名单路径，使用 AntPathMatcher 进行通配符匹配（支持 /**、/* 等模式）
                    // 如果当前请求路径匹配任一白名单模式，则直接放行，不进行 Token 校验
                    for (String pattern : config.getPatterns()) {
                        if (PATH_MATCHER.match(pattern, path)) {
                            return chain.filter(exchange);
                        }
                    }

                    // 1.2 放行接口文档
                    if (path.contains("/v3/api-docs")
                            || path.contains("/swagger-ui")
                            || path.contains("/doc.html")) {
                        return chain.filter(exchange);
                    }

                    // 2. Token 校验
                    // 从请求头中获取 Authorization 头
                    String token = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

                    // 2.1 检查 Token 是否为空
                    if (token == null || token.isEmpty()) {
                        // Token 为空，返回“用户未登录”错误响应
                        return writeErrorResponse(response, ResultCodeEnum.UNAUTHORIZED);
                    }

                    // 2.2 Token 格式错误/过期/被篡改 -> 拦截
                    if (!jwtUtil.validateToken(token)) {
                        // Token 已过期，返回“Token 过期”错误响应
                        return writeErrorResponse(response, ResultCodeEnum.TOKEN_EXPIRED);
                    }

                    // 3. 解析 Token，提取用户信息
                    try {
                        // 3.1 从 Token 中解析用户信息
                        Claims claims = jwtUtil.parseToken(token);
                        String userId = claims.getSubject();
                        String username = (String) claims.get("username");
                        String email = (String) claims.get("email");

                        // 3.2 将用户信息传递给下游服务
                        // 构造新的请求对象，在保留所有原有请求头的基础上，添加用户 ID 头
                        // 下游微服务可通过 @RequestHeader("X-User-Id") 获取当前用户 ID
                        ServerHttpRequest newRequest = request.mutate()
                                .header("X-User-Id", userId)
                                .build();

                        // 3.3 刷新 Token（无感知续期）
                        // 使用用户信息重新生成新 Token，延长有效时间
                        Map<String, Object> map = new HashMap<>();
                        map.put("userId", userId);
                        map.put("username", username);
                        map.put("email", email);
                        // 生成 Token
                        String newToken = jwtUtil.createToken(Long.parseLong(userId), claims);

                        // 执行后续过滤器链（使用新的请求对象），并在所有过滤器执行完毕后
                        // 通过 then(Mono.fromRunnable(...)) 在响应返回前将新 Token 放入响应头
                        return chain.filter(exchange.mutate().request(newRequest).build())
                                .then(Mono.fromRunnable(() -> {
                                    // 在响应头中设置新 Token，客户端可将其保存用于后续请求
                                    response.getHeaders().set(HttpHeaders.AUTHORIZATION, newToken);
                                }));

                    } catch (Exception e) {
                        // Token 解析失败（格式错误、签名无效等），视为 Token 无效，返回过期错误
                        return writeErrorResponse(response, ResultCodeEnum.TOKEN_EXPIRED);
                    }
                }
            };
        }

        /**
         * 将错误响应写入 HTTP 响应体。
         * <p>
         * 该方法将错误枚举对象序列化为 JSON 格式的字节数组，设置响应头 Content-Type 为 application/json，
         * 并写入响应流，返回给客户端。
         *
         * @param response 网关响应对象，用于设置响应状态、响应头和响应体
         * @param errorEnum 错误枚举，包含错误码和错误消息
         * @return Mono<Void> 表示响应写入完成
         */
        private Mono<Void> writeErrorResponse(ServerHttpResponse response, ResultCodeEnum errorEnum) {
            // 设置响应内容类型为 JSON
            response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            try {
                // 将错误响应对象序列化为 JSON 字节数组
                byte[] bytes = objectMapper.writeValueAsBytes(Result.fail(errorEnum));
                // 将字节数组包装为 DataBuffer 并写入响应体
                return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)));
            } catch (JsonProcessingException e) {
                // 序列化失败时，返回一个错误流
                return response.writeWith(Mono.error(new IOException("响应序列化失败", e)));
            }
        }

        /**
         * 配置类
         */
        public static class Config {
            private List<String> patterns = new ArrayList<>();
            private boolean matchTrailingSlash = true;

            public List<String> getPatterns() {
                return patterns;
            }

            public Config setPatterns(List<String> patterns) {
                this.patterns = patterns;
                return this;
            }

            public boolean isMatchTrailingSlash() {
                return matchTrailingSlash;
            }

            public Config setMatchTrailingSlash(boolean matchTrailingSlash) {
                this.matchTrailingSlash = matchTrailingSlash;
                return this;
            }
        }
    }

③ 过滤器配置

过滤器是有顺序的，身份认证过滤器放在所有路由过滤器的前面。

    gateway:
      default-filters:
        - Auth=/login

④ 测试

在浏览器输入：http://localhost:9000/test/connect，测试结果：

    {
      "code": 401,
      "msg": "未登录，请先登录",
      "data": null
    }

⑤ 添加白名单

在过滤器配置项添加：

    - Auth=/login,/test/**

再次测试，获取数据正常。

3、路由配置实现

（下个章节内容）

---

💡 **速记**

**【微服务前置修正（网关接管权限前）】**
1. 删除微服务自身的 API 前缀（如 /product、/user、/test）。
2. 禁用微服务中旧的认证拦截器（WebConfig.addInterceptors）。
3. 修正统一返回值拦截器（GlobalResponseAdvice）放行 OpenAPI 文档路径（/v3/api-docs, /swagger-ui, /doc.html）。

**【完整请求处理流程（核心链路）】**
客户端 -> 进入 Gateway（第一道防线）：
1. 全局过滤器 RtGlobalFilter（记录开始时间、URI、方法）。
2. 默认过滤器 AuthGlobalFilter（登录认证 + 请求头复制）：白名单放行 -> Token 校验(空/过期返回401) -> 解析用户信息注入 X-User-Id -> 刷新 Token 放入响应头 -> 转发下游。
-> 进入微服务层（Controller 业务处理）。
-> 返回 Gateway（RtGlobalFilter 记录响应时间和总耗时）。
-> 响应返回客户端。

**【自定义过滤器类型与规范】**
*   **命名规范**：`{自定义名称} + GatewayFilterFactory`（如 `AuthGatewayFilterFactory`）。
*   **局部过滤器**：继承 `AbstractGatewayFilterFactory`，针对特定路由生效（可配置为默认过滤器）。
*   **全局过滤器**：实现 `GlobalFilter` 接口，对所有请求生效，无需配置。

**【自定义全局过滤器 RtGlobalFilter（性能监控）】**
*   实现 `GlobalFilter, Ordered`。
*   `getOrder()` 返回 0，确保最先执行（记录开始时间）。
*   使用 `chain.filter(exchange).doFinally(...)` 保证在响应结束后打印结束日志（状态码、总耗时）。4xx/5xx 用 warn，2xx/3xx 用 info。

**【自定义局部过滤器 AuthGatewayFilterFactory（鉴权）】**
*   核心逻辑在 `apply(Config config)` 方法中，返回一个 `GatewayFilter` 实例。
*   核心流程：
    1.  **白名单放行**：遍历配置的 patterns，使用 `AntPathMatcher` 匹配，匹配则放行。
    2.  **放行接口文档**：放行 /v3/api-docs 等。
    3.  **Token 校验**：从 Header 获取 Authorization，空则返回 UNAUTHORIZED，校验失败（`!jwtUtil.validateToken(token)`）返回 TOKEN_EXPIRED。
    4.  **解析 Token**：解析出 userId、username 等，构造新请求 `request.mutate().header("X-User-Id", userId).build()` 传给下游。
    5.  **Token 刷新**：生成新 Token，通过 `.then(Mono.fromRunnable(() -> response.getHeaders().set(...)))` 在响应头中设置新 Token。
    6.  **错误处理**：`writeErrorResponse` 将错误枚举序列化为 JSON 写入响应体。
*   **配置类 Config**：包含 `patterns` 和 `matchTrailingSlash`。
*   **配置方式**：
    *   短格式（`shortcutFieldOrder` 返回列表 + `shortcutType` 返回 `GATHER_LIST_TAIL_FLAG`）：`- Auth=/login,/test/**`。
    *   长格式：`- name: Auth args: patterns: [...]`。
*   **默认过滤器配置**：在 `gateway.default-filters` 中配置 `- Auth=/login`，确保全局鉴权优先执行。
