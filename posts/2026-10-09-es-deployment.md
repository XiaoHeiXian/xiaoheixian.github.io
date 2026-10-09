---
layout: article
title: "ES 部署"
description: "- \"部署方式：使用 docker-compose 组合安装 Elasticsearch 和 Kibana。\"   - \"目录准备：创建映射目录并赋权，创建 docker-compose 存放目录。\"   - \"容器配置：配置 ES 与 Kibana 的镜像、端口、环境变量及网络。\"   - \"安装验证：通过浏览器访问 9200 和 5601 端口验证安"
date: 2026-10-09
category: "云商城"
tags:
  - "Elasticsearch"
  - "部署"
  - "Kibana"
permalink: /posts/2026-10-09-es-deployment.html
---

使用 docker-compose 组合安装 Elasticsearch 和 Kibana。

Kibana 是为 Elasticsearch 设计的开源分析和可视化平台。你可以使用 Kibana 来搜索，查看存储在 Elasticsearch 索引中的数据并与之交互。你可以很容易实现高级的数据分析和可视化，以图表的形式表现出来。

kibana 中提供了一个 DevTools 界面，这个界面中可以编写 DSL 来操作 elasticsearch。并且对 DSL 语句有自动补全功能。

DSL(Domain Specific Language)：领域特定语言，DSL 指的是专注于某个应用程序领域的计算机语言，又译作领域专用语言。Elasticsearch 的查询 DSL（查询领域特定语言）是一种 JSON-based（基于 JSON）的语法。

## 1、创建挂载目录

创建映射目录，在 /data/local/ 目录下创建 es 映射目录

    [root@104 ~]# mkdir -p /data/local/es/data /data/local/es/plugins
    [root@104 ~]# chmod -R 777 /data/local/es

## 2、安装 ES 和 Kibana

（1）创建 docker-compose 目录

在 /opt 目录下创建 es 映射目录

    [root@104 ~]# mkdir /opt/es

（2）创建 docker-compose.yml 文件

在 /opt/es 目录下创建 docker-compose.yml 文件：

    version: "3"
    services:
      elasticsearch:
        container_name: es
        image: elasticsearch:8.10.4
        environment:
          - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
          - "xpack.security.enabled=false"
          - "discovery.type=single-node"
        ports:
          - "9200:9200"
          - "9300:9300"
        volumes:
          # 1. 数据目录映射
          - /data/local/es/data:/usr/share/elasticsearch/data
          # 2. 插件目录映射
          - /data/local/es/plugins:/usr/share/elasticsearch/plugins
        networks:
          elk-net:
            ipv4_address: 192.168.20.10

      kibana:
        container_name: kibana
        image: kibana:8.10.4
        environment:
          - "ELASTICSEARCH_HOSTS=http://192.168.20.10:9200"
          - "XPACK_SECURITY_ENABLED=false"
        ports:
          - "5601:5601"
        networks:
          elk-net:
            ipv4_address: 192.168.20.11

    networks:
      elk-net:
        driver: bridge
        ipam:
          config:
            - subnet: 192.168.20.0/24
              gateway: 192.168.20.1

因为 kibana 已经与 elasticsearch 在一个网络，因此可以用容器名直接访问 elasticsearch

（3）启动容器

    [root@192 es]# docker-compose down && docker-compose up -d

（4）安装后，在浏览器输入地址 http://主机 ip:9200，出现如下页面，ES 安装成功。

JSON 返回示例：

    {
      "name": "d65ac195d0d7",
      "cluster_name": "docker-cluster",
      "cluster_uuid": "lua208BCRlafnC0f8W59kA",
      "version": {
        "number": "8.10.4",
        "build_flavor": "default",
        "build_type": "docker",
        "build_hash": "b4a62ac808e886ff032700c391f45f1408b2538c",
        "build_date": "2023-10-11T22:04:35.506990650Z",
        "build_snapshot": false,
        "lucene_version": "9.7.0",
        "minimum_wire_compatibility_version": "7.17.0",
        "minimum_index_compatibility_version": "7.0.0"
      },
      "tagline": "You Know, for Search"
    }

（5）在浏览器输入地址 http://主机 ip:5601，出现如下页面，Kibana 安装成功。

## 3、安装分词器

分词器的作用是什么？创建倒排索引时对文档分词。用户搜索时，对输入的内容分词。

IK 分词器有以下两种模式：

- ik_smart：智能切分，粗粒度。这种模式结合了理解歧义和未知词的算法，对文本进行词典分词的同时，也会智能识别词汇的边界，从而提高分词的准确性。

- ik_max_word：最细切分，细粒度。这种模式会将文本最大程度地切分成独立的词汇。

在 Elasticsearch 中，analyzer 与 search_analyzer 是控制文本分析流程的关键配置，两者的区别和用法如下：

- analyzer（索引分析器）：文档索引写入时生效，将原始文本切分为词项，构建倒排索引。

- search_analyzer（搜索分析器）：用户发起搜索请求时生效。对查询关键词进行分词处理，确保与倒排索引的词项匹配，默认继承 analyzer 配置，可单独指定。

（1）安装分词器

    [root@104 ~]# docker exec -it es bin/elasticsearch-plugin install https://release.infinilabs.com/analysis-ik/stable/elasticsearch-analysis-ik-8.10.4.zip

（2）重启服务

    [root@192 ~]# docker restart es

（3）用 kibana DevTools 测试

打开 DevTools：

    GET _search
    {
      "query": {
        "match_all": {}
      }
    }

    GET _analyze
    {
      "analyzer":"standard",
      "text":"中华人民共和国"
    }

    GET _analyze
    {
      "analyzer":"ik_max_word",
      "text":"中华人民共和国"
    }

    GET _analyze
    {
      "analyzer":"ik_smart",
      "text":"中华人民共和国"
    }

分词完成。

## 4、流程图文字推演

### ES 与 Kibana 部署与验证流程

创建挂载目录（data/plugins）并赋权 --> 创建 docker-compose 存放目录 --> 编写 docker-compose.yml（定义 ES、Kibana 服务与自定义网络） --> 执行 docker-compose up -d 启动容器 --> 浏览器访问 http://主机IP:9200 验证 ES 安装 --> 浏览器访问 http://主机IP:5601 验证 Kibana 安装 --> 进入 Kibana DevTools 界面准备测试

### IK 分词器安装与测试流程

下载 IK 分词器安装包 --> 执行 docker exec 进入 ES 容器安装插件 --> 重启 ES 容器使插件生效 --> 打开 Kibana DevTools --> 发送 GET _analyze 请求 --> 分别使用 standard、ik_max_word、ik_smart 分析器对“中华人民共和国”进行分词测试 --> 查看返回的 tokens 结果

💡 **速记**

【核心考点】

通过 docker-compose 可以快速组合部署 Elasticsearch 与 Kibana，需提前创建好数据与插件挂载目录并赋予权限。

Kibana 的 DevTools 提供了便捷的 DSL 编写与调试环境，支持自动补全。

IK 分词器提供 ik_smart（粗粒度）与 ik_max_word（细粒度）两种模式，需在索引和搜索时正确配置 analyzer 与 search_analyzer。

【高频逻辑链】

部署链路：创建目录 --> 编写 docker-compose.yml --> 启动容器 --> 验证端口（9200/5601） --> 安装 IK 分词器 --> 重启 ES --> DevTools 测试分词。

分词器区别：analyzer 在索引写入时生效，构建倒排索引；search_analyzer 在用户搜索时生效，对查询词进行分词。

【关键避坑】

挂载目录必须提前创建并赋予 777 权限，否则容器启动会因权限不足而失败。

安装 IK 分词器后必须重启 Elasticsearch 容器，插件才会生效。

ES 与 Kibana 需在同一个自定义网络中（如 elk-net），否则 Kibana 无法通过容器名或内网 IP 直接访问 ES。
