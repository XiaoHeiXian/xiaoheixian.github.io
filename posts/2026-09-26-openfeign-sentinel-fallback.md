---
layout: article
title: "OpenFeign 远程调用熔断降级"
description: "- \"雪崩问题：下游服务超时/宕机导致上游线程阻塞，资源耗尽引发连锁故障\"   - \"Sentinel方案：检测下游故障达阈值后，切断调用，执行兜底，释放线程\"   - \"开启降级：配置 feign.sentinel.enabled: true\"   - \"兜底方法1：fallback，接口粒度独立兜底，适用多业务模块不同返回\"   - \"兜底方法2：F"
date: 2026-09-26
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "OpenFeign"
  - "Sentinel"
  - "熔断"
permalink: /posts/2026-09-26-openfeign-sentinel-fallback.html
---

1、远程调用雪崩问题

微服务 A 通过 Feign 调用服务 B，若 B 出现响应超时、大量报错、宕机等情况：

（1）不做熔断：A 的请求线程持续阻塞等待响应，线程池快速耗尽，A 服务彻底瘫痪，并连锁影响所有依赖 A 的上游服务，造成服务雪崩。
（2）Sentinel 熔断方案：检测下游故障达到阈值后，直接切断远程调用，执行预设兜底逻辑，快速释放线程，隔离故障，阻止雪崩扩散。

2、Feign Sentinel 降级

1）开启 Feign Sentinel 降级

在微服务客户端开启 Feign Sentinel 降级：

    feign:
      sentinel:
        enabled: true

2）两大兜底方法

| 方式 | 特点 | 适用场景 |
| :--- | :--- | :--- |
| Feign 接口内置 fallback 类 | 接口粒度独立兜底，每个远程接口自定义返回 | 多业务模块、不同接口需要不同兜底数据 |
| FallbackFactory 工厂统一兜底 | 全局捕获远程调用所有异常（超时、限流、宕机），可打印异常堆栈 | 推荐全局统一熔断降级，一套逻辑处理所有 Feign 调用故障 |

3、实践

1）FallbackFactory 全局统一熔断（生产首选）

（1）定义 Feign 远程调用接口

在 mall-api 的 product 包下创建 Feign 接口：

    @FeignClient(
        contextId = "category-feign",
        name = "mall-product-service"
    )
    public interface CategoryFeignClient {
        /**
         * 获取一级类目
         */
        @GetMapping("/category/listLevelOne")
        Result<List<CategoryDTO>> listLevelOne();

        /**
         * 获取子级类目
         * @param parentId
         */
        @GetMapping("/listChildren/{parentId}")
        Result<List<CategoryDTO>> listChildren(@PathVariable("parentId") Integer parentId);
    }

（2）创建客户端调用

在 mall-test-service 的业务接口 IFeignService 添加接口方法：

    /**
     * 获取一级类目
     */
    List<CategoryDTO> listLevelOne();

    /**
     * 获取子级类目
     */
    List<CategoryDTO> listChildren(Integer parentId);

接口方法实现：

    @Autowired
    private CategoryFeignClient categoryFeignClient;

    @Override
    public List<CategoryDTO> listLevelOne() {
        Result result = JsonUtils.toObj(categoryFeignClient.listLevelOne(), Result.class);
        if (!result.getCode().equals(ResultCodeEnum.SUCCESS.getCode())) {
            throw new BusinessException(result.getCode(), result.getMsg());
        }
        return (List<CategoryDTO>)result.getData();
    }

    @Override
    public List<CategoryDTO> listChildren(Integer parentId) {
        Result result = categoryFeignClient.listChildren(parentId);
        if (!result.getCode().equals(ResultCodeEnum.SUCCESS.getCode())) {
            throw new BusinessException(result.getCode(), result.getMsg());
        }
        return result.getData();
    }

在 FeignController 添加控制器方法：

    @GetMapping("/listLevelOne")
    public List<CategoryDTO> listLevelOne() {
        return feignService.listLevelOne();
    }

    @GetMapping("/listChildren/{parentId}")
    public List<CategoryDTO> listChildren(@PathVariable Integer parentId) {
        return feignService.listChildren(parentId);
    }

（3）测试

开启 mall-gateway-service 和 mall-test-service 服务，不开启 mall-product-service 服务，测试结果如下：

因为 mall-product-service 服务没有开启（模拟宕机），所以出现 500 异常。响应内容如下：

    {
      "code": 500,
      "msg": "服务器内部异常",
      "data": null
    }

（4）FallbackFactory 全局统一熔断

创建 Feign 客户端统一降级工厂，在 mall-api 的 product 的 factory 包下创建降级工厂类：

    @Slf4j
    @Component
    public class CategoryFallbackFactory implements FallbackFactory<CategoryFeignClient> {
        // Throwable: 远程调用产生的所有异常（超时、服务不存在、下游限流、宕机）
        @Override
        public CategoryFeignClient create(Throwable cause) {
            // 打印远程调用故障日志，便于排查下游问题
            log.error("调用商品服务远程接口熔断降级，异常信息：{}", cause.getMessage());
            // 创建兜底数据
            CategoryDTO categoryDTO = new CategoryDTO();
            categoryDTO.setId(0);
            categoryDTO.setName("未知分类");
            // 返回 Feign 接口的兜底实现类，必须实现所有 Feign 接口方法
            return new CategoryFeignClient() {
                @Override
                public Result<List<CategoryDTO>> listLevelOne() {
                    // 统一兜底返回：使用本地缓存数据，不依赖下游服务
                    return Result.success(List.of(categoryDTO));
                }

                @Override
                public Result<List<CategoryDTO>> listChildren(Integer parentId) {
                    // 统一兜底返回：使用本地缓存数据，不依赖下游服务
                    return Result.success(List.of(categoryDTO));
                }
            };
        }
    }

配置降级工厂，修改 Feign 注解：

    @FeignClient(
        contextId = "category-feign",
        name = "mall-product-service",
        fallbackFactory = CategoryFallbackFactory.class
    )

（5）熔断测试

重启 mall-test-service 服务，不开启 mall-product-service 服务，测试结果如下：

因为 mall-product-service 服务没有开启（模拟宕机），服务会启用熔断降级，返回缓存数据。响应内容如下：

    {
      "code": 200,
      "msg": "操作成功",
      "data": [
        {
          "id": 0,
          "name": "未知分类"
        }
      ]
    }

2）fallback 简单兜底

不能拿到远程调用的原始异常，无法区分是下游宕机、超时还是被 Sentinel 限流，排查问题不方便，不推荐生产使用。

（1）创建兜底实现类

    @Component
    public class CategoryFallback implements CategoryFeignClient {
        @Override
        public Result<List<CategoryDTO>> listLevelOne() {
            // 创建兜底数据
            CategoryDTO categoryDTO = new CategoryDTO();
            categoryDTO.setId(0);
            categoryDTO.setName("未知分类");
            return Result.success(List.of(categoryDTO));
        }

        @Override
        public Result<List<CategoryDTO>> listChildren(Integer parentId) {
            // 创建兜底数据
            CategoryDTO categoryDTO = new CategoryDTO();
            categoryDTO.setId(0);
            categoryDTO.setName("未知分类");
            return Result.success(List.of(categoryDTO));
        }
    }

（2）修改 Feign 注解

注意：Fallback 和 fallbackFactory 不能共存。

    @FeignClient(
        contextId = "category-feign",
        name = "mall-product-service",
        fallback = CategoryFallback.class
    )

（3）测试（略）

4、Feign 熔断 + @SentinelResource 注解兜底

1）优先级

（1）Feign FallbackFactory/Fallback（远程调用层熔断，最高优先级）
只要远程调用触发熔断，直接走 Feign 兜底，不会进入 Controller 的 blockHandler/fallback。

（2）Controller 层 @SentinelResource 的 blockHandler（本地接口限流/熔断）
仅本地接口被限流时生效，不处理远程调用故障。

2）完整分层容错架构（生产标准架构）

两层防护，彻底杜绝雪崩：

（1）远程调用层（Feign FallbackFactory）
隔离下游服务故障，远程超时/宕机直接返回缓存，解决雪崩根源。

（2）本地接口层（@SentinelResource）
保护自身服务，高并发限流、本地业务异常兜底。

【总结】

1、服务雪崩产生链路

下游服务异常 -> 上游请求超时阻塞 -> 线程池耗尽 -> 上游服务瘫痪 -> 全网连锁故障。

2、限流、熔断、降级三者区别

- 限流：防高并发，拦截多余流量，保护接口
- 熔断：防雪崩，检测下游故障，主动切断调用链
- 降级：异常兜底，保证服务可用，返回友好结果

3、Sentinel 核心价值

通过流量控制削峰、熔断故障隔离、降级兜底容错，彻底解决微服务调用雪崩问题，保障分布式系统高可用。

---

💡 **速记**

**【远程调用雪崩问题】**
服务 A 调用服务 B，B 宕机/超时 -> A 的线程阻塞等待 -> A 线程池耗尽瘫痪 -> 连锁影响上游 -> 全网雪崩。
**Sentinel 解决方案**：检测下游故障达阈值 -> 切断远程调用 -> 执行预设兜底逻辑 -> 释放线程，隔离故障。

**【开启 Feign Sentinel 降级】**
配置：`feign.sentinel.enabled: true`

**【两大兜底方法对比（核心考点）】**
1. **fallback**：接口粒度独立兜底，需实现 Feign 接口，每个方法自定义返回。缺点：无法获取异常信息，排查困难。适用：多业务模块不同接口需要不同兜底。
2. **FallbackFactory（生产首选）**：全局统一兜底，实现 `FallbackFactory<FeignClient>` 接口。优点：可捕获 `Throwable` 并打印异常堆栈，区分超时/宕机/限流。适用：全局统一熔断降级。
*注意：两者不能共存，FallbackFactory 优先级更高。*

**【优先级与分层容错架构】**
*   **优先级**：`Feign FallbackFactory/Fallback`（远程调用层） > `@SentinelResource` 的 `blockHandler`（本地接口层）。
*   **分层架构（生产标准）**：
    *   远程调用层（Feign FallbackFactory）：隔离下游故障，防雪崩。
    *   本地接口层（@SentinelResource）：保护自身，防高并发，兜底本地业务异常。

**【三大概念本质区别】**
*   **限流**：防高并发，拦截多余流量。
*   **熔断**：防雪崩，检测下游故障，主动切断。
*   **降级**：异常兜底，保证服务可用，返回友好结果。

**【Sentinel 核心价值】**
流量控制削峰 + 熔断故障隔离 + 降级兜底容错 = 保障分布式系统高可用。
