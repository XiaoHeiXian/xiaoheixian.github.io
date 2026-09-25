---
layout: article
title: "JMeter 使用说明"
description: "- \"JMeter简介：开源压力测试工具，图形化操作，验证Sentinel流控规则\"   - \"安装启动：官网下载zip，解压免安装，运行jmeter.bat/sh\"   - \"步骤1：创建测试计划（线程组）\"   - \"步骤2：添加HTTP请求（配置接口信息）\"   - \"步骤3：携带鉴权头（HTTP信息头管理器）\"   - \"步骤4：添加断言（响应断"
date: 2026-09-25
category: "微服务架构"
tags:
  - "JMeter"
  - "测试"
  - "Sentinel"
permalink: /posts/2026-09-25-jmeter-guide.html
---

1、JMeter 简介

Apache JMeter 开源压力测试工具，图形化操作，专门用来验证 Sentinel 各类流控规则（直接 / 关联 / 链路 / 快速失败 / 预热 / 匀速排队），支持自定义并发、QPS、请求头 Token，能清晰区分正常响应、限流拦截异常，是微服务限流调试首选工具。

2、安装启动

（1）官网 https://dlcdn.apache.org/jmeter/binaries/apache-jmeter-5.6.3.zip 下载二进制包，解压后无需安装
（2）Windows 运行 bin/jmeter.bat；Linux/Mac 执行 bin/jmeter.sh；

3、基础压测步骤

步骤 1：创建测试计划

左侧右键「测试计划」→ 添加 → 线程（用户）→ 线程组

线程组核心参数：
- 线程数：并发请求数（模拟同时多少用户访问），填写：1000
- 调度器：可设置持续压测时长，适合长时间验证限流稳定性，填写 5
- 循环次数：每个线程循环请求多少次，填写：1

一次压测模拟 1000 个用户，5 秒内启动，总请求数 =1000，平均每秒 200 个请求。

步骤 2：添加 HTTP 请求

右键线程组 → 添加 → 取样器 → HTTP 请求

填写接口信息：
- 协议：http /https
- 服务器名称或 IP：服务 IP
- 端口号：项目端口
- 路径：测试接口路径，例 /order/query
- 参数：有查询参数 parameters 和 JSON 参数 data

步骤 3（可选）携带鉴权头

右键 HTTP 请求 → 添加 → 配置元件 → HTTP 信息头管理器

新增参数：
- Name: Authorization
- 值：xxx（业务登录 token）

步骤 4 添加断言

右键 HTTP 请求 → 添加 → 断言 → 响应断言

填写信息：
- Apply to：保持 Main sample only（仅主请求，默认不用改）
- Field to Test（测试字段）：勾选 Response Code
- Pattern Matching Rules（匹配规则）：勾选 Equals（完全相等）
- Patterns to Test 区域点击 Add，输入：200
- Custom failure message（自定义失败提示）填写：测试成功

步骤 5：添加结果查看监听器（查看限流返回）

右键线程组 → 添加 → 监听器，推荐两个组件：

查看结果树：逐条看每个请求返回内容，限流会返回 Blocked by Sentinel 或自定义兜底提示。

聚合报告：统计总请求、平均响应、错误率，限流请求会统计到 Error 中，直观验证阈值是否生效。

---

💡 **速记**

**【JMeter 核心作用】**
开源压力测试工具，图形化操作。专门用来验证 Sentinel 各类流控规则（直接/关联/链路/快速失败/预热/匀速排队），能清晰区分正常响应和限流拦截异常。

**【基础压测五步走】**
1. **建测试计划**：右键测试计划 -> 添加 -> 线程(用户) -> 线程组。
   * 核心参数：线程数=1000（并发用户），调度器=5（秒），循环次数=1。总请求=1000，平均每秒200请求。
2. **加 HTTP 请求**：右键线程组 -> 添加 -> 取样器 -> HTTP 请求。
   * 配置：协议(http)、IP(localhost)、端口(10000)、路径(/order/query)、参数。
3. **带鉴权头（可选）**：右键HTTP请求 -> 添加 -> 配置元件 -> HTTP信息头管理器。
   * 添加 Name: Authorization，值：业务登录 Token。
4. **加断言**：右键HTTP请求 -> 添加 -> 断言 -> 响应断言。
   * 勾选 Response Code，匹配规则 Equals，Patterns to Test 填写 200。
5. **加监听器**：右键线程组 -> 添加 -> 监听器。
   * **查看结果树**：逐条看返回，限流会返回 Blocked by Sentinel。
   * **聚合报告**：统计总请求、平均响应、错误率，限流请求会统计到 Error 中。
