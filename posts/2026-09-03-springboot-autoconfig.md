---
layout: article
title: "Spring Boot的自动配置原理"
description: "启动类`@EnableAutoConfiguration`从`META-INF/spring.factories`加载配置类，结合`@Conditional`条件注解按需创建Bean。"
date: 2026-09-03
category: "Spring"
tags:
  - "Spring Boot"
  - "自动配置"
  - "源码"
permalink: /posts/2026-09-03-springboot-autoconfig.html
---

- **作用**：根据项目依赖的 Jar 包和配置文件，自动创建所需的 Spring Bean，极大简化初始化配置。
- **实现**：启动类上的 `@SpringBootApplication` 组合了 `@EnableAutoConfiguration`，其通过 `SpringFactoriesLoader` 读取 `META-INF/spring.factories` 文件中声明的配置类全限定名。
- **原理**：配置类内部利用 `@Conditional`（如 `@ConditionalOnClass`、`@ConditionalOnMissingBean`）条件注解，仅当满足类存在或缺省 Bean 未定义等条件时才实例化该 Bean，实现按需装配。
