---
layout: article
title: "OpenFeign 拦截器"
description: "- \"背景问题：Spring MVC请求头仅保存在ThreadLocal，Feign调用默认不复制上游请求头\"   - \"解决方案：使用OpenFeign拦截器透传请求头，实现全链路透传\"   - \"核心场景：统一鉴权(Token)、链路追踪(traceId)、解决跨服务Header丢失、统一预处理限流\"   - \"核心接口：RequestInterce"
date: 2026-09-26
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "OpenFeign"
permalink: /posts/2026-09-26-openfeign-interceptor.html
---

在远程调用时，由于 Spring MVC 的请求头仅保存在当前 Web 主线程的 ThreadLocal 中，Feign 调用属于跨服务全新 HTTP 请求，默认不会自动复制上游请求头。如 A 服务调用 B 服务、B 服务再调用 C 服务，第二次 Feign 调用会丢失前端传入的 Header。那么有没有办法解决这个问题呢？

我们可以使用透传请求头和 OpenFeign 拦截器来解决此类问题。通过 Feign 全局拦截器在请求发起前手动从上下文提取 Header、塞入新请求模板，实现全链路透传。

**请求流程图说明：**
- 客户端发送 HTTP 请求（含请求头）至网关/服务A。
- 服务A发起 Feign 调用，Feign 客户端触发请求拦截器。
- 拦截器从上下文对象中获取存储的原始请求头。
- 拦截器将透传添加的请求头写入 Feign 请求中。
- 转发请求（含透传请求头）至下游服务B，返回响应。

OpenFeign 支持自定义请求拦截器，可在远程请求发起前统一拦截、修改请求模板，实现请求头透传、认证鉴权、链路追踪、请求预处理等通用能力。通过拦截器统一处理跨服务通用逻辑，可彻底消除业务代码重复编码，实现微服务调用标准化、统一化。

1、OpenFeign 拦截器核心应用场景

- 统一微服务调用鉴权：自动读取登录凭证 Token，统一封装到 Feign 请求头（Authorization），实现所有内部服务调用自动鉴权，无需每个业务接口单独处理。
- 分布式链路追踪透传：拦截器自动获取当前链路的 traceId、spanId 等追踪标识，并向下游服务传递，实现全链路日志串联、问题快速定位。
- 解决跨服务 Header 丢失问题：在异步调用、服务内部二次调用、多服务链式调用场景下，原生请求头会丢失。通过拦截器自动复制上下文请求头，保证 Token、租户 ID、设备信息等上下文参数透传不丢失。
- 统一请求预处理与限流防护：可在请求发起前统一完成 URL 加密、参数预处理、请求频次计数、黑白名单校验、限流拦截等通用操作，统一管控服务调用流量与安全规则。

2、创建拦截器

1）RequestInterceptor 拦截器接口

OpenFeign 所有自定义拦截器均需要实现 RequestInterceptor 核心接口。该接口仅提供一个 apply(RequestTemplate) 方法，作为请求拦截的统一入口。

执行时机：Feign 发起 HTTP 请求之前，所有已注册的拦截器会按顺序统一执行，对请求模板进行修改、增强，最终生成完整可调用的 HTTP 请求。

2）RequestTemplate 请求模板对象

RequestTemplate 是 OpenFeign 构建请求的核心模板类，封装了一次远程 HTTP 请求的全部元数据，包含请求地址、请求方式、请求头、请求参数、请求体等信息。

拦截器所有的增强操作（添加 Header、追加参数、修改路径）都是基于该对象完成，最终框架会将处理完成的 RequestTemplate 转换为 feign.Request，完成真实网络请求调用。

3）创建拦截器

通过全局拦截器实现自动透传登录 Token，解决微服务跨服务调用鉴权失效、请求头丢失问题，为所有 Feign 远程调用统一注入认证信息。

（1）全局请求头拦截器代码实现

功能说明：
①将当前线程的 HTTP 请求中的所有请求头复制到 Feign 远程调用请求中
②确保 Authorization、X-User-Id、X-User-Role 等认证信息在微服务间传递
③解决微服务间调用丢失用户认证信息的问题

在 mall-api 的 api 包下创建 interceptor 包，并在该包下创建拦截器：

    @Slf4j
    @Component
    @Setter // 支持动态修改配置
    @ConfigurationProperties(prefix = "header") // 从 application.yml 中获取配置前缀的值
    public class HeaderInterceptor implements RequestInterceptor {
        /**
         * 需要透传的 Header 白名单
         * 只有在此列表中的 Header 才会被透传
         * 如果列表为空，则透传所有不在排除列表中的 Header
         */
        private Set<String> alloweds = new HashSet<>();

        /**
         * ========== Bean 初始化方法 ==========
         * <p>
         * 功能说明：
         * 1. 使用 @PostConstruct 注解，在 Bean 的所有依赖注入完成后自动执行
         * 2. 检查白名单是否为空（可能因配置文件缺失或加载失败导致）
         * 3. 如果白名单为空，则添加默认的核心 Header，确保系统基本功能可用
         * 4. 提供降级方案，防止配置缺失导致认证信息无法透传
         * </p>
         * <p>
         * 执行时机：
         * Spring 容器在完成 HeaderInterceptor Bean 的实例化和依赖注入后，
         * 自动调用该方法进行初始化，保证后续使用前白名单已准备好。
         * </p>
         * <p>
         * 为什么需要默认值？
         * 1. 配置文件可能缺失或未正确加载，导致 alloweds 为空
         * 2. 即使配置缺失，也要保证基础认证 Header（Authorization）能够透传
         * </p>
         */
        @PostConstruct
        public void init() {
            // 检查白名单是否为空（配置未加载或配置文件中未配置）
            if (alloweds.isEmpty()) {
                // 添加默认的核心 Header，确保认证和用户信息能够正常传递
                // 这些是微服务间调用最常用的认证和追踪 Header
                alloweds.add("Authorization"); // Token 认证
                alloweds.add("X-User-Id");     // 用户 ID
                alloweds.add("X-User-Role");   // 用户角色
                alloweds.add("X-Trace-Id");    // 链路追踪 ID
                alloweds.add("X-Gateway-Secret"); // 网关密钥
                // 记录日志，提示使用了默认配置（便于运维排查）
                log.info("配置文件中未配置白名单，使用默认 Header 白名单: {}", alloweds);
            } else {
                // 记录加载的配置（调试用）
                log.debug("白名单已加载: {}", alloweds);
            }
        }

        @Override
        public void apply(RequestTemplate requestTemplate) {
            // 1. 获取当前线程的 Web 请求上下文
            ServletRequestAttributes attributes = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();

            if (attributes == null) {
                // 没有 Web 请求上下文（如定时任务、MQ 消费、内部调用等场景）
                log.info("当前线程无 Web 请求上下文，跳过 Header 透传");
                return;
            }

            HttpServletRequest request = attributes.getRequest();
            if (request == null) {
                log.info("HttpServletRequest 为空，跳过 Header 透传");
                return;
            }

            // 2. 获取所有请求头名称
            // 获取当前 HTTP 请求中的所有请求头（Header）的名称列表，返回一个 Enumeration（枚举）对象，用于遍历所有的请求头名称
            Enumeration<String> headerNames = request.getHeaderNames();
            if (headerNames == null) {
                log.info("请求头为空，跳过 Header 透传");
                return;
            }

            // 3. 遍历并透传请求头
            // hasMoreElements: 判断枚举中是否还有更多元素
            while (headerNames.hasMoreElements()) {
                // nextElement: 获取枚举中的下一个元素，指针自动后移
                String headerName = headerNames.nextElement().toLowerCase();
                // 透传所有白名单请求头
                alloweds.stream()
                        .map(String::toLowerCase)
                        .filter(headerName::equals)
                        .forEach(e -> {
                            // 获取该 Header 的所有值（支持多值）
                            Enumeration<String> headerValues = request.getHeaders(headerName);
                            while (headerValues.hasMoreElements()) {
                                String headerValue = headerValues.nextElement();
                                if (StrUtil.isNotBlank(headerValue)) {
                                    // 添加到 Feign 请求头中
                                    requestTemplate.header(headerName, headerValue);
                                }
                            }
                        });
            }
        }
    }

（2）拦截器作用域配置

① 全局生效
将自定义拦截器添加至 Spring IOC 容器，即可实现全局所有 Feign 客户端自动生效，所有微服务远程调用统一完成请求头透传、自动鉴权，无需业务服务额外配置。
只需在拦截器类上添加 @Component 注解完成自动注册，即可全局生效。

② 局部生效
指定 Feign 客户端：

    @FeignClient(contextId = "shipping-address-feign", name = "mall-user-service"
            , configuration = HeaderInterceptor.class)

本例中使用全局生效作用域，即所有微服务都可以通过此拦截器转发请求头进行鉴权。

③ 测试
在 mall-test-service 的 application.yml 文件中添加配置（可以不配置，使用默认配置）：

    ---
    header:
      alloweds:
        # 认证相关
        - Authorization
        - X-Auth-Token
        - X-Gateway-Secret
        # 用户信息（由网关过滤器注入）
        - X-User-Id
        # 链路追踪
        - X-Trace-Id
        # 请求来源
        - X-Request-Source
        - X-Client-IP
        # 多租户
        - X-Tenant-Id
        - X-Org-Id
        # API 版本
        - X-API-Version
        - X-Version

在拦截器加断点，测试 mall-test-service 的获取用户地址接口，检查拦截器拦截的数据。

4）实战实现：解决旁路攻击风险

鉴权只做在网关，后端无兜底校验，直连接口即可跳过认证，属于标准认证旁路风险。

（1）问题
在浏览器输入 http://localhost:9002/shippingAddress/116，能正确获取用户地址信息，这是因为系统依靠单一网关做鉴权，攻击者跳过网关直接访问业务接口，导致身份、权限校验逻辑完全失效，属于典型鉴权绕过漏洞。核心两点漏洞：
- 微服务公网 / 内网直接暴露端口，外部能直连；
- 微服务自身没有二次身份校验，完全依赖网关鉴权。

（2）解决方案

① 禁止客户端直连微服务（最根本）
容器 / 云环境（Docker/K8s）部署时：
- 微服务只配置 ClusterIP（集群 IP），不分配 NodePort/LoadBalancer，外部无法直接访问（创建虚拟网络，局域网）；
- 仅网关开放对外端口，所有流量强制走网关。

② 微服务层：网关信任机制（兜底，必不可少）
就算网络被突破，直连服务也无法绕过校验。

第一步：网关透传内部密钥
在网关登录认证过滤器，添加透传密钥：

    // 3.2 将用户信息传递给下游服务
    ServerHttpRequest newRequest = request.mutate()
            .header("X-User-Id", userId)
            .header("X-Gateway-Secret", "mall-micro-8080")
            .build();

第二步：微服务校验网关来源
在 mall-common 创建拦截器：

    @Component
    public class AuthorizationInterceptor implements HandlerInterceptor {
        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
            // 1. 从请求头获取网关密钥
            String secret = request.getHeader("X-Gateway-Secret");
            if (secret == null || !secret.equals("mall-micro-8080")) {
                ObjectMapper objectMapper = new ObjectMapper();
                response.setContentType("application/json;charset=UTF-8");
                objectMapper.writeValue(response.getWriter(),
                        Result.fail(ResultCodeEnum.FORBIDDEN));
                return false;
            }
            return true;
        }
    }

在 mall-common 的 config.WebConfig 类的 addInterceptors 添加以下内容：

    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authorizationInterceptor)
                .addPathPatterns("/**") // 拦截所有地址（需要登录就能访问）
                // 放行 swagger（不需要登录就能访问）
                .excludePathPatterns("/swagger-ui/**", "/v3/api-docs/**", "/doc.html", "/webjars/**")
                // 放行接口（不需要登录就能访问）
                .excludePathPatterns("/login", "/user/userInfo/register",
                        "/product/**", "category/**", "/brand/**",
                        "/page/**", "/th/**", "/feign/**", "/connect/**");
    }

（3）测试

测试时不用放行 /test/**，因为放行了 /test/**，http://localhost:9000/api/test/feign/listAddressByUserId/116 就不需要身份认证，不会透传密钥了。先从网关认证白名单中删除 /test/**，再进行测试：

① 直接访问微服务接口
浏览器输入：http://localhost:9002/shippingAddress/116
响应结果：

    {
      "code": 403,
      "msg": "访问受限，权限不足",
      "data": null
    }

② 通过网关访问接口
在测试工具中发起请求：

    GET /api/test/feign/listAddressByUserId/{userId}
    参数：userId = 116

响应结果：

    {
      "code": 200,
      "msg": "操作成功",
      "data": [
        {
          "city": "南昌市",
          "defaultStatus": 0,
          "detailAddress": "方志敏大道399号",
          "id": 1895874493057335297,
          "phoneNumber": "139****8889",
          "province": "江西省",
          "region": "新建区",
          "shippingAddress": "江西省南昌市新建区方志敏大道399号",
          "userId": "116"
        }
      ]
    }

在生产环境中，通过网络限制（微服务端口仅网关可访问） + 网关携带内部密钥请求头，微服务校验该头作为准入门槛来防止旁路攻击。

注意：便于后续测试，关闭微服务内部密钥拦截器，并将 /test/** 加入网关认证白名单。

---

💡 **速记**

**【为什么需要 OpenFeign 拦截器？】**
解决微服务调用中 Header 丢失问题。Spring MVC 请求头保存在 ThreadLocal，Feign 是全新 HTTP 请求，默认不带上游 Header（如 A->B->C，第二次调用丢失前端 Token）。

**【四大核心应用场景】**
1. **统一鉴权**：自动读取并透传 Token (Authorization)。
2. **链路追踪**：透传 traceId、spanId。
3. **解决 Header 丢失**：自动复制上下文请求头（Token、租户 ID 等）。
4. **统一预处理与限流**：URL 加密、黑白名单、限流拦截。

**【核心接口与对象】**
*   **接口**：`RequestInterceptor`，方法 `apply(RequestTemplate)`。
*   **对象**：`RequestTemplate`，封装了请求地址、方式、头、参数、体。所有增强操作基于此对象。

**【实战：HeaderInterceptor 核心逻辑】**
1.  **白名单初始化**：使用 `@PostConstruct`，若未配置白名单，添加默认核心 Header（Authorization, X-User-Id, X-User-Role, X-Trace-Id, X-Gateway-Secret）。
2.  **获取上下文**：`RequestContextHolder.getRequestAttributes()`，为空（定时任务/MQ）则跳过。
3.  **遍历透传**：`request.getHeaderNames()` 遍历，匹配白名单中的 Header，使用 `requestTemplate.header(name, value)` 添加到 Feign 请求中。
4.  **作用域**：全局生效加 `@Component`；局部生效在 `@FeignClient(configuration = HeaderInterceptor.class)` 指定。

**【安全实战：防旁路攻击】**
*   **漏洞**：绕过网关直连微服务（如 `localhost:9002`），导致网关鉴权失效。
*   **解决方案**：
    1.  **网络隔离**（最根本）：微服务仅配置 ClusterIP，仅网关开放端口。
    2.  **网关信任机制**（兜底）：网关在请求头注入 `X-Gateway-Secret`，微服务端拦截器校验该密钥（如 `mall-micro-8080`），缺失或错误则返回 403。
