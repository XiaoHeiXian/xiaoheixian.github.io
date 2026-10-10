---
layout: article
title: "搭建 ES 搜索环境"
description: "- \"创建模块：在 mall-service 下新建 mall-es-service 模块。\"   - \"依赖引入：引入 spring-boot-starter-data-elasticsearch 依赖。\"   - \"配置管理：配置 Nacos 注册中心与 ES 连接信息。\"   - \"启动类：排除 DataSourceAutoConfiguratio"
date: 2026-10-10
category: "云商城"
tags:
  - "Elasticsearch"
  - "环境搭建"
permalink: /posts/2026-10-10-build-es-search-environment.html
---

## 1）创建项目

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype:

- Name: mall-es-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.es
- ArtifactId: mall-es-service
- Version: 1.0.0

## 2）依赖管理

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
    </dependency>

## 3）配置文件

（1）主配置文件 application.yml 内容

    spring:
      application:
        name: mall-es-service
      profiles:
        active: dev
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            namespace: ${spring.profiles.active:public}

（2）开发环境配置文件 application-dev.yml 内容

    # 服务端口（开发端口，避免冲突）
    server:
      port: 9006
    spring:
      config:
        import:
          - nacos:es.yml?group=ES_GROUP
          - nacos:knife4j.yml

（3）在配置中心创建配置文件

    Data ID：es.yml
    Group：ES_GROUP
    配置格式：yaml
    配置内容：见配置文件

es.yml 配置文件内容：

    spring:
      elasticsearch:
        uris: http://192.168.100.101:9200

## 4）启动项目

（1）创建启动程序

在 user 包下面创建启动类 EsServiceApplication.java：

    @SpringBootApplication(scanBasePackages = "com.example.mall", exclude = {DataSourceAutoConfiguration.class})
    public class EsServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(EsServiceApplication.class, args);
        }
    }

（2）启动项目

（略）

## 5、流程图文字推演

### ES 搜索环境搭建流程

创建 Maven 模块（mall-es-service） --> 引入 elasticsearch 依赖 --> 编写主配置文件（application.yml） --> 编写开发环境配置文件（application-dev.yml） --> 在 Nacos 配置中心创建 es.yml（配置 ES 服务地址） --> 编写启动类（排除 DataSourceAutoConfiguration） --> 启动项目完成搭建

💡 **速记**

【核心考点】

搭建 ES 搜索环境需独立创建模块（如 mall-es-service），避免与其他业务模块耦合。

引入 spring-boot-starter-data-elasticsearch 依赖后，Spring Boot 会自动配置 Elasticsearch 客户端。

在 Nacos 配置中心单独维护 ES 的连接信息（如 es.yml），便于统一管理和动态刷新。

【高频逻辑链】

创建模块 --> 引入依赖 --> 配置 Nacos 与连接信息 --> 编写启动类（排除数据源自动配置） --> 启动服务。

【关键避坑】

启动类中必须排除 DataSourceAutoConfiguration（exclude = {DataSourceAutoConfiguration.class}），因为该模块仅用于搜索，不需要连接 MySQL 数据库，否则会因缺少数据源配置而启动报错。

配置 ES 连接地址时，需确保 Nacos 中的配置 Data ID（如 es.yml）与本地 application-dev.yml 中 import 的保持一致。
