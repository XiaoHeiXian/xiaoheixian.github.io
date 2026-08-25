---
layout: article
title: "Spring Boot 自动装配原理"
description: "Spring Boot 自动配置分为三个阶段。加载，拿到全部候选自动配置类。过滤，通过条件注解筛掉不匹配当前环境的配置。注册，把生效的 Bean 注册到 Spring 容器。如果我们自定义了这个 Bean，框架就不创建默认的 Bean 了。所以它可以做到开箱即用，同时支持灵活定制。"
date: 2026-08-26
category: "Java"
tags:
  - "Spring Boot"
  - "自动装配原理"
permalink: /posts/2026-08-26-springboot.html
---
## 一句话概括

Spring Boot 自动装配的本质是 **“加载 → 过滤 → 注册”** 三阶段机制：

1. **加载**：通过 SPI 机制获取所有候选自动配置类  
2. **过滤**：利用条件注解剔除不匹配当前环境的配置  
3. **注册**：将生效的 Bean 注入 Spring IOC 容器  

该机制实现了 **“开箱即用 + 灵活定制”** 的平衡，完美诠释“约定优于配置”。

---

## 核心流程（三大阶段）

### 阶段一：加载候选配置

- 入口：`@SpringBootApplication` → `@EnableAutoConfiguration`
- 核心类：`AutoConfigurationImportSelector`
- 加载机制：`SpringFactoriesLoader` 扫描 classpath 下所有的 `META-INF/` 目录
- 加载文件：
  - Spring Boot 2.7 及之前：`META-INF/spring.factories`（键值对形式）
  - Spring Boot 3.0 及之后：`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`（每行一个全限定类名）

> 示例（3.0 后的 imports 文件内容）：
>
>     org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration
>     org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
>     ...

### 阶段二：条件过滤（按需筛选）

加载进来的配置类（可能有上百个）并不会全部生效。Spring 利用一系列 `@Conditional` 注解进行精确过滤：

| 条件注解 | 生效条件 |
| :--- | :--- |
| `@ConditionalOnClass` | classpath 中存在指定类 |
| `@ConditionalOnMissingClass` | classpath 中不存在指定类 |
| **`@ConditionalOnMissingBean`** | **容器中不存在指定 Bean（扩展核心）** |
| `@ConditionalOnBean` | 容器中存在指定 Bean |
| `@ConditionalOnProperty` | 配置文件中存在指定值（如 `redis.enabled=true`） |
| `@ConditionalOnWebApplication` | 当前环境是 Web 应用 |

只有所有条件都满足，该自动配置类才会进入下一阶段。

### 阶段三：注册 Bean 到容器

- 配置类通过 `@Bean` 方法创建实例
- 通过 `@ConfigurationProperties` 将 `application.yml` 中的属性绑定到配置属性类
- 最后将生成的 Bean 注册到 Spring IOC 容器

---

## 实战理解：以 RedisAutoConfiguration 为例

以下为 Redis 自动配置类的核心简化逻辑（仅示意）：

```java
    @Configuration
    @ConditionalOnClass(RedisOperations.class)
    @EnableConfigurationProperties(RedisProperties.class)
    public class RedisAutoConfiguration {

        @Bean
        @ConditionalOnMissingBean(name = "redisTemplate")
        public RedisTemplate<Object, Object> redisTemplate() {
            // 创建默认的 RedisTemplate
            RedisTemplate<Object, Object> template = new RedisTemplate<>();
            // ... 设置连接工厂、序列化等
            return template;
        }
    }
```

**关键点**：
- 如果开发者 **没有自定义** `RedisTemplate`，框架自动创建默认的。
- 如果开发者 **自定义了** `RedisTemplate`（即容器中已有同类型 Bean），那么 `@ConditionalOnMissingBean` 会使框架的默认 Bean **自动让位**，优先使用业务自定义的 Bean。

这就是“灵活定制”的实现基础。

---

## 核心入口注解：@SpringBootApplication

`@SpringBootApplication` 是一个组合注解，实际包含：

| 注解 | 作用 |
| :--- | :--- |
| `@SpringBootConfiguration` | 本质是 `@Configuration`，标注当前类为配置类 |
| **`@EnableAutoConfiguration`** | **开启自动装配（核心）** |
| `@ComponentScan` | 开启组件扫描，默认扫描启动类所在包及其子包 |

---

## 如何排除特定的自动配置

### 方式一：注解方式（在启动类上）

```java
    @SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
    public class Application {
        public static void main(String[] args) {
            SpringApplication.run(Application.class, args);
        }
    }
```
### 方式二：配置文件方式（application.yml）

```yml
    spring:
      autoconfigure:
        exclude:
          - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
          - org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
```

---

## 版本差异（Spring Boot 2.7 vs 3.0）

| 版本 | 加载文件路径 | 格式 |
| :--- | :--- | :--- |
| **2.7 及之前** | `META-INF/spring.factories` | 键值对，如 `org.springframework.boot.autoconfigure.EnableAutoConfiguration=\xxx` |
| **3.0 及之后** | `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` | 每行一个全限定类名，简洁无冗余 |

> 3.0 的改变是为了避免 `spring.factories` 中多种扩展（如 `ApplicationListener`、`FailureAnalyzer` 等）混在一起造成维护困难。

---

## 高频追问与标准答案

### Q1：`@SpringBootApplication` 包含哪三个注解？

> 包含三个：`@SpringBootConfiguration`（本质是 `@Configuration`）、**`@EnableAutoConfiguration`**（核心）、`@ComponentScan`（开启包扫描）。

### Q2：Spring Boot 2.7 和 3.0 加载路径有什么区别？

> 2.7 使用 `META-INF/spring.factories`（键值对，易臃肿），**3.0 改用 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`**（每行一个类，更简洁、更易读）。

### Q3：如何排除一个特定的自动配置类？

> 方式一：`@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)`  
> 方式二：`spring.autoconfigure.exclude` 配置（可指定多个）。

### Q4：`@ConditionalOnMissingBean` 的意义是什么？

> 它是框架 **“开放扩展”** 的核心。当开发者自定义了同类型 Bean 时，框架自动让位，不创建默认 Bean，从而实现 **“开箱即用 + 灵活定制”** 的平衡。这也是自动装配机制最巧妙的设计。

### Q5：为什么要将自动配置类的加载从 spring.factories 迁移到独立的 imports 文件？

> 在 2.7 中，`spring.factories` 不仅包含自动配置类，还包含监听器、初始化器等，混杂在一起容易冲突。3.0 单独为自动配置建一个文件，职责更清晰，且避免重复加载和覆盖问题。

---

## 总结金句

> Spring Boot 自动装配本质是 **“加载 → 过滤 → 注册”** 三阶段：
> 1. **加载**：通过 SPI 机制加载所有候选配置类
> 2. **过滤**：利用 `@Conditional` 条件注解按需筛选
> 3. **注册**：将生效的 Bean 注入容器
>
> 其核心设计理念是 **“开箱即用 + 灵活定制”** ——通过 `@ConditionalOnMissingBean` 为框架预留扩展点，让业务自定义 Bean 无缝覆盖框架默认实现，完美诠释了 **“约定优于配置”** 的哲学。

---