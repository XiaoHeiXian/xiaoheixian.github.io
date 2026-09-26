---
layout: article
title: "Sentinel 兜底返回"
description: "- \"定义：限流、熔断、异常触发后，系统不再抛出报错，而是执行预设兜底方法\"   - \"作用：返回正常业务提示或默认数据，保证服务不报错、不崩溃、用户体验友好\"   - \"异常抛出时机：AOP切面或Web过滤器在进入Controller前拦截并抛出BlockException\"   - \"两大核心方法：blockHandler(拦截Sentinel规则)"
date: 2026-09-26
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "Sentinel"
  - "兜底"
permalink: /posts/2026-09-26-sentinel-fallback.html
---

限流、熔断、异常触发后，系统不再抛出报错，而是执行预设兜底方法，返回正常业务提示或默认数据，保证服务不报错、不崩溃、用户体验友好。

用户去调用一个资源时，如果 Sentinel 对资源进行了保护（如流量控制：每秒通过一个请求），Sentinel 就会去检查调用链路上的规则，如果没有违反规则，则允许调用资源，继续下一个链路。否则，就会抛出异常。对于异常的处理有两种情况，一种是做了兜底处理，一种是没有做兜底处理。如果做了兜底处理，就去执行兜底处理的方法，返回一个兜底数据，否则，就抛出默认错误，中断调用。

**执行流程图说明：**
- 用户请求资源。
- Sentinel 检查规则。
- 若未违反规则 -> 放行 -> 结束。
- 若违反规则 -> 抛出异常。
- 判断是否有兜底处理：
  - 有 -> 执行 fallback -> 结束。
  - 无 -> 默认错误 -> 结束。

1、Sentinel 的异常抛出时机

Sentinel 的熔断/限流逻辑是通过 AOP 切面（SentinelResourceAspect）或 Web 过滤器（SentinelWebInterceptor）实现的：

（1）注解方式（@SentinelResource）：在 Controller 方法执行之前，Sentinel 的 AOP 切面会检查规则。如果触发熔断/限流，会直接抛出 BlockException，根本不会进入 Controller 方法。
（2）Web 过滤器方式：在请求进入 Controller 之前，过滤器就会拦截并抛出 BlockException。

使用 @SentinelResource 实现自定义兜底方法，粒度更细、优先级更高。

2、注解式兜底

1）两大兜底方法

@SentinelResource 提供两类兜底，分工完全不同，不可混用：

| 属性 | 触发时机 | 捕获异常 | 适用场景 |
| :--- | :--- | :--- | :--- |
| blockHandler | 请求触发 Sentinel 规则拦截（QPS 限流、熔断、热点、权限） | BlockException（父类，包含 FlowException 限流、DegradeException 熔断） | 流量拦截、熔断切断时，返回友好提示 |
| fallback | 未触发限流 / 熔断，但业务代码自身抛出异常（空指针、IO、数据库报错） | Throwable 所有 Java 业务异常 | 业务逻辑出错时返回缓存兜底数据 |

2）兜底方法强制语法规范

（1）blockHandler 方法硬性要求
- 访问权限：public
- 返回值类型：必须和原业务方法完全一致
- 参数列表：原方法全部入参 + 末尾追加 BlockException ex
- 不能抛出异常，直接返回结果

（2）fallback 方法硬性要求
- 访问权限：public
- 返回值类型：和原方法完全一致
- 参数二选一：
  - 写法 1：和原方法入参完全相同（简洁）
  - 写法 2：原入参 + Throwable t（可获取异常详情）

3）执行优先级

- blockHandler(限流/熔断拦截) > fallback(业务异常) > UrlBlockHandler(Web 全局过滤器) > @RestControllerAdvice 全局异常处理器
- 只要匹配上层兜底，下层不会执行。

3、实践

【案例一】：限流 + 慢调用熔断降级

规则 1：QPS 限流规则（测试 blockHandler 限流分支）
资源名：productStockCheck（和注解 value 严格一致）
阈值类型：QPS
单机阈值：5
流控模式：直接
流控效果：快速失败
规则解读：每秒最多放行 5 个请求，超过直接触发限流，执行 resourceBlockHandler 中 FlowException 分支。

规则 2：慢调用比例熔断降级规则（测试 blockHandler 熔断分支）
资源名：productStockCheck
降级策略：慢调用比例
最大 RT：450ms（超过 450ms 判定为慢调用）
比例阈值：0.5（50%）
最小请求数：5
熔断时长：5 秒
规则解读：1 秒内累计≥5 次请求，且 50% 以上请求耗时超 450ms，开启 5 秒熔断窗口，所有请求执行 DegradeException 兜底分支。

（1）业务接口

在 mall-test-service 的 ProductController 添加方法：

    @GetMapping("/productStockCheck")
    @SentinelResource(
        value = "productStockCheck", // 核心：Sentinel 识别的资源名
        blockHandler = "resourceBlockHandler" // 限流/熔断拦截兜底
    )
    public String productStockCheck(Long productId) throws InterruptedException {
        // 模拟慢调用（用于测试熔断降级，耗时 400-600ms）
        int time = (int)(Math.random() * 200) + 400;
        log.info("模拟慢调用，耗时{}", time);
        Thread.sleep(time);
        return "库存校验正常，商品 ID: " + productId;
    }

    // blockHandler：限流/熔断统一兜底
    // 参数规则：原方法入参 + BlockException 放在最后
    public String resourceBlockHandler(Long productId, BlockException ex) {
        // 区分限流、熔断，返回不同提示文案
        if (ex instanceof FlowException) {
            // QPS 限流触发
            log.warn("商品接口触发限流，商品 ID:{}", productId);
            throw new BusinessException(429, "【限流保护】当前访问人数过多，请稍后重试");
        } else if (ex instanceof DegradeException) {
            // 熔断降级触发
            log.warn("商品接口触发熔断，商品 ID:{}", productId);
            throw new BusinessException(429, "【熔断降级】服务响应缓慢，临时关闭实时库存查询");
        } else {
            // 热点限流、权限拦截等其他 Sentinel 规则
            throw new BusinessException(429, "请求被 Sentinel 拦截，请稍后操作");
        }
    }

（2）规则配置
按案例需求配置：分别配置 2 个规则。

（3）测试
使用 Jmeter 测试，重新创建线程组（线程数 100，启动时间 10，循环次数 2），添加 HTTP 请求：/product/productStockCheck

（4）效果验证
查看微服务控制台日志（略）

【案例二】：限流 + 异常比例熔断降级

规则 1：QPS 限流规则（测试 blockHandler 限流分支）
资源名：productFallbackStockCheck（和注解 value 严格一致）
阈值类型：QPS
单机阈值：5
流控模式：直接
流控效果：快速失败
规则解读：每秒最多放行 5 个请求，超过直接触发限流，执行 resourceBlockHandler 中 FlowException 分支。

规则 2：异常比例熔断降级规则（测试 fallback 熔断分支）
资源名：productFallbackStockCheck
降级策略：异常比例
比例阈值：0.3（30%）（异常请求占比≥30%触发熔断）
最小请求数：5
熔断时长：5 秒
规则解读：统计周期内请求数≥5，且业务异常比例超过 30%，立即熔断 5 秒，所有请求执行 fallback 兜底分支。

（1）业务接口

在 mall-test-service 的 ProductController 添加方法：

    @GetMapping("/productFallbackStockCheck")
    @SentinelResource(
        value = "productFallbackStockCheck", // 核心：Sentinel 识别的资源名
        blockHandler = "resourceBlockHandler", // 限流/熔断拦截兜底
        fallback = "resourceFallbackHandler" // 业务代码异常兜底
    )
    public String productFallbackStockCheck(Long productId) throws InterruptedException {
        // 场景 1：模拟慢调用（用于测试熔断降级，耗时 400-600ms）
        int time = (int)(Math.random() * 200) + 400;
        log.info("模拟异常数，耗时{}", time);
        Thread.sleep(time);

        // 模拟随机业务异常
        int count = (int) (Math.random() * 10);
        if (count % 2 == 0) {
            int i = 1 / 0; // 偶数次请求抛异常
        }
        return "库存校验正常，商品 ID: " + productId;
    }

    // fallback：业务代码异常兜底
    // 参数携带 Throwable，可打印异常日志
    public String resourceFallbackHandler(Long productId, Throwable t) {
        log.error("库存校验业务异常，商品 ID:{}，异常信息：{}", productId, t.getMessage());
        // 业务出错时返回缓存兜底数据
        throw new BusinessException(5003,"兜底缓存库存数据，商品 ID: " + productId);
    }

（2）规则配置
按案例需求配置：分别配置 2 个规则。

（3）测试
使用 Jmeter 测试，重新创建线程组（线程数 100，启动时间 10，循环次数 2），添加 HTTP 请求：/product/productFallbackStockCheck

（4）效果验证
查看微服务控制台日志（略）

4、兜底方法抽离

如果将兜底代码都写在 Controller，就会造成代码臃肿，可将兜底方法抽至独立静态工具类，使用 blockHandlerClass、fallbackClass 指定，注意，工具类方法必须 static。

1）独立兜底工具类

在微服务的 handler 包创建工具类：

    public class ProductSentinelHandler {
        // blockHandler：限流/熔断统一兜底
        // 参数规则：原方法入参 + BlockException 放在最后
        public static String resourceBlockHandler(Long productId, BlockException ex) {
            // 区分限流、熔断，返回不同提示文案
            if (ex instanceof FlowException) {
                // QPS 限流触发
                throw new BusinessException(429, "【限流保护】当前访问人数过多，请稍后重试");
            } else if (ex instanceof DegradeException) {
                // 熔断降级触发
                throw new BusinessException(429, "【熔断降级】服务响应缓慢，临时关闭实时库存查询");
            } else {
                // 热点限流、权限拦截等其他 Sentinel 规则
                throw new BusinessException(429, "请求被 Sentinel 拦截，请稍后操作");
            }
        }

        // fallback：业务代码异常兜底
        // 参数携带 Throwable，可打印异常日志
        public static String resourceFallbackHandler(Long productId, Throwable t) {
            // 业务出错时返回缓存兜底数据
            throw new BusinessException(5003,"兜底缓存库存数据，商品 ID: " + productId);
        }
    }

2）注解修改配置

    @SentinelResource(
        value = "productStockCheck",
        blockHandler = "resourceBlockHandler",
        blockHandlerClass = ProductSentinelHandler.class,
        fallback = "resourceFallbackHandler",
        fallbackClass = ProductSentinelHandler.class
    )

---

💡 **速记**

**【什么是兜底返回？】**
限流、熔断、异常触发后，不再抛出报错，而是执行预设兜底方法，返回正常提示或默认数据，保证服务不崩溃，提升用户体验。

**【异常抛出时机】**
AOP 切面或 Web 过滤器在进入 Controller 前拦截，直接抛出 `BlockException`，不进入 Controller 方法。注解方式粒度更细。

**【两大核心兜底方法（高频考点）】**
1. **blockHandler**：
   * 触发时机：触发 Sentinel 规则（限流、熔断、热点等）。
   * 捕获异常：`BlockException`（包含 FlowException, DegradeException）。
   * 语法要求：原方法入参 + BlockException。
   * 适用：流量拦截、熔断切断，返回友好提示。
2. **fallback**：
   * 触发时机：未触发 Sentinel 规则，但业务代码自身抛异常（NPE、IO等）。
   * 捕获异常：`Throwable`（所有 Java 业务异常）。
   * 语法要求：原方法入参 或 原入参 + Throwable。
   * 适用：业务逻辑出错时返回缓存/兜底数据。

**【执行优先级】**
`blockHandler` > `fallback` > `UrlBlockHandler`（Web全局） > `@RestControllerAdvice`（全局异常处理器）。
*只要匹配上层兜底，下层不执行。*

**【代码优化：兜底方法抽离】**
兜底代码写 Controller 会导致臃肿，需抽离至独立静态工具类：
* 使用 `blockHandlerClass` 和 `fallbackClass` 指定类。
* 工具类中的方法必须是 `static`。

**【实战配置核心（案例一）】**
* 资源名：`productStockCheck`
* 规则1：QPS=5，直接，快速失败（测试 `blockHandler` 限流）。
* 规则2：慢调用比例，RT=450ms，比例0.5，最小5，熔断5秒（测试 `blockHandler` 熔断）。
* 代码：`@SentinelResource(value = "productStockCheck", blockHandler = "resourceBlockHandler")`，在兜底方法中区分 `FlowException` 和 `DegradeException`。

**【实战配置核心（案例二）】**
* 资源名：`productFallbackStockCheck`
* 规则1：QPS=5，直接，快速失败（测试 `blockHandler` 限流）。
* 规则2：异常比例，比例0.3，最小5，熔断5秒（测试 `fallback` 熔断）。
* 代码：`@SentinelResource(value = "...", blockHandler = "...", fallback = "resourceFallbackHandler")`，`fallback` 捕获 `Throwable` 并返回缓存兜底数据。
