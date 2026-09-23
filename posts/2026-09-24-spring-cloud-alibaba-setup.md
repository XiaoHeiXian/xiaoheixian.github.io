---
layout: article
title: "Spring Cloud 环境搭建"
description: "- \"版本适配：Spring Boot/Cloud/Alibaba 三者版本必须严格匹配\"   - \"推荐稳定组合：Boot 3.2.4 + Cloud 2023.0.1 + Alibaba 2023.0.1.0\"   - \"版本选择：优先选择稳定版（Stable Release），避免 RC 版\"   - \"历史项目维护：升级需同步更新三大组件，避免版"
date: 2026-09-24
category: "微服务架构"
tags:
  - "微服务"
  - "Spring Cloud"
permalink: /posts/2026-09-24-spring-cloud-alibaba-setup.html
---

1、版本适配

Spring Boot、Spring Cloud、Spring Cloud Alibaba 三者版本必须严格匹配以确保兼容性，下表为常见版本对应关系：

| Spring Boot | Spring Cloud | Spring Cloud Alibaba |
| :--- | :--- | :--- |
| 3.2.x | 2023.0.x (Kilburn) | 2023.0.1 |
| 2.6.x | 2021.0.x (Jubilee) | 2021.0.5.0 |
| 2.5.x | 2020.0.x (Ilford) | 2021.0.4.0（向下兼容） |
| 2.4.x | Hoxton.SR12 | 2.2.9.RELEASE |

版本选择建议：

（1）优先选择稳定版（Stable Release）

避免使用 RC（候选版本）或未经验证的实验性版本。

示例：Spring Boot 3.2.4 + Spring Cloud 2023.0.1 + Spring Cloud Alibaba 2023.0.1.0（推荐稳定组合）。

（2）历史项目维护

若需升级旧版（如 Spring Boot 2.4.x），需同步升级 Spring Cloud 和 Spring Cloud Alibaba 至兼容版本，避免版本冲突。

2、环境搭建

（1）将 SpringBoot、SpringCloud、SpringCloud Alibaba 三大组件版本锁定。

在 mall-micro-cloud 的 pom 文件中锁定三大组件：

    <properties>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <spring-cloud.version>2023.0.1</spring-cloud.version>
        <spring-cloud-alibaba.version>2023.0.1.0</spring-cloud-alibaba.version>
    </properties>
    <!-- 依赖组件版本管理 -->
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <dependency>
                <groupId>com.alibaba.cloud</groupId>
                <artifactId>spring-cloud-alibaba-dependencies</artifactId>
                <version>${spring-cloud-alibaba.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

---

💡 **速记**

**【版本适配原则（核心踩分点）】**
Spring Boot、Spring Cloud、Spring Cloud Alibaba 三者版本必须严格匹配。
*   **3.2.x** 对应 **2023.0.x** 对应 **2023.0.1**
*   **2.6.x** 对应 **2021.0.x** 对应 **2021.0.5.0**
*   **2.5.x** 对应 **2020.0.x** 对应 **2021.0.4.0**
*   **2.4.x** 对应 **Hoxton.SR12** 对应 **2.2.9.RELEASE**

**【版本选择建议】**
优先选择稳定版（Stable Release），避免 RC 或实验性版本。
推荐组合：Spring Boot 3.2.4 + Spring Cloud 2023.0.1 + Spring Cloud Alibaba 2023.0.1.0。
历史项目升级：需同步升级三大组件，避免版本冲突。

**【环境搭建核心配置（pom.xml）】**
1.  在 `<properties>` 中锁定版本变量：`spring-cloud.version` 和 `spring-cloud-alibaba.version`。
2.  在 `<dependencyManagement>` 中使用 `<scope>import</scope>` 和 `<type>pom</type>` 导入 BOM：
    *   `spring-cloud-dependencies`
    *   `spring-cloud-alibaba-dependencies`
3.  这样配置后，子模块引入具体组件（如 Nacos、Sentinel）时无需再指定版本号，由父工程统一管理。
