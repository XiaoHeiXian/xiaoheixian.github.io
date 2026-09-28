---
layout: article
title: "项目开发环境标准化搭建"
description: "- \"Conda核心功能：包管理、环境管理、跨平台支持\"   - \"Conda与pip区别：多语言包 vs 仅Python包，隔离性强 vs 弱\"   - \"安装选型：Anaconda(完整版,约3GB) vs Miniconda(轻量版,约100MB)\"   - \"Windows安装：Next -> I Agree -> All Users/Just"
date: 2026-09-28
category: "AI"
tags:
  - "AI"
  - "开发环境"
  - "Conda"
  - "VSCode"
permalink: /posts/2026-09-28-project-env-setup.html
---

1.2 项目开发环境标准化搭建

本课程所有代码、案例、项目均基于统一环境开发，本章完成全套环境搭建，后续所有单元无需重复配置，实现一次搭建、全程复用。

1.2.1 conda 虚拟环境管理

Conda 是一个开源的跨平台包管理和环境管理系统，主要用于解决软件包依赖冲突和多版本管理问题。

1、核心功能

- 包管理：安装、更新和卸载软件包，自动处理依赖关系。
- 环境管理：创建隔离的虚拟环境，避免不同项目间的依赖冲突。
- 跨平台支持：在 Windows、macOS 和 Linux 上一致运行。

2、与 pip 的区别

Conda 与 pip 的区别如表 1.2-1 所示：

表 1.2-1：Conda 与 pip 区别

| 对比维度 | pip | Conda |
| :--- | :--- | :--- |
| 管理范围 | 仅管理 Python 第三方包 | 支持 Python、C++、R 等多语言包 |
| 依赖处理 | 依赖处理能力弱，易出现版本冲突 | 自动解析、适配所有依赖，彻底规避冲突 |
| 环境隔离 | 需配合 venv 使用，隔离性弱 | 原生支持虚拟环境，完全隔离多项目 |
| 适用场景 | 简单小型 Python 项目 | AI 复杂项目、多依赖工程化项目（本课程选用） |

3、安装选型

- Anaconda：包含 Conda 和大量数据科学库的完整发行版。新手和数据科学用户安装 Anaconda（约 3GB）
- Miniconda：轻量版，仅包含 Conda 和 Python，适合自定义安装。熟练开发者安装 Miniconda（约 100MB）

4、Anaconda 安装

1）下载安装包

- 官网下载：在官方网站下载。
- 支持 Windows 10/11、macOS 10.13+、Linux（Ubuntu/CentOS 等）。
- 根据系统选择对应安装包（如 Windows 选.exe，macOS 选.pkg，Linux 选.sh）。

2）Windows 系统安装步骤

运行安装程序，根据安装向导点击“Next” > “I Agree” 接受许可协议。

（1）安装类型：

- All Users（需管理员权限，适合多用户电脑）。
- Just Me（仅当前用户，推荐个人使用）。

（2）安装路径：建议默认路径（如 d:\Program Files\anaconda3），避免中文。

（3）关键勾选：Add Anaconda3 to my PATH environment variable（添加环境变量，避免后续手动配置）

（4）完成安装：安装成功后点击 Close，不勾选 Learn More about Anaconda 等附加选项。

（5）验证安装：打开终端（cmd），输入：

    conda -V

显示版本号（如 conda 25.x.x）即成功。

（6）配置国内镜像（加速下载）

课程统一使用清华镜像源，终端执行以下命令完成配置，全程生效：

    conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
    conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free
    conda config --set show_channel_urls yes

验证配置：

    conda config --show channels

5、常用命令速查

Conda 常用命令如表 1.2-2 所示：

表 1.2-2：Conda 常用命令

| 命令 | 功能 |
| :--- | :--- |
| conda create -n 环境名 python=版本号 | 创建环境 |
| conda activate 环境名 | 激活/进入环境 |
| conda env list | 查看所有环境 |
| conda deactivate | 退出当前环境 |
| conda env remove -n 环境名 | 删除环境 |
| conda install -c conda-forge 包名 | 从 conda-forge 渠道安装包 |

6、conda 环境创建

对于不同项目有不同的需求，如果在同一个环境下运行这些项目，很可能会出现某些包的版本冲突等问题。 因此需要虚拟环境来隔离不同的项目，以避免环境冲突。 conda 支持多环境隔离，用户可通过命令行实现环境管理，常用命令包括创建环境、切换环境等。

创建 AI 开发环境示例：

    # 创建名为 ai_env、Python 3.13 的环境
    conda create -n ai_env python=3.13 -y

    # 激活环境
    conda activate ai_env

    # 验证 Python 版本
    python --version

1.2.2 开发工具标准化配置

1、VS Code 核心配置

VS Code 是微软推出的免费开源代码编辑器，凭借轻量高效、插件生态丰富成为全球开发者首选工具。

1）核心特点：

- 完全免费开源，无功能阉割
- 支持 Windows、macOS、Linux 全平台
- 内置 Git 集成、调试器、终端
- 插件生态极其丰富（数万款扩展）

2）AI 助手说明：

- VS Code 内置的 GitHub Copilot 分为免费版（有限额）和付费版

3）首次启动必做配置

首次启动必做配置步骤如表 1.2-3 所示：

表 1.2-3：首次启动必做配置步骤

| 步骤 | 操作 |
| :--- | :--- |
| ①安装中文扩展 | Ctrl+Shift+X -> 搜索“Chinese (Simplified)” -> 安装后重启 |
| ②切换主题 | Ctrl+Shift+P -> 输入“颜色主题” -> 选择喜欢的主题 |
| ③安装通义灵码 | Ctrl+Shift+X -> 搜索“Qoder” -> 安装 Qoder CN 扩展 -> 登录 |
| ④安装 Python 支持 | Ctrl+Shift+X -> 搜索 Python -> 安装由 Microsoft 发布的官方 Python 扩展（含代码补全、调试、Jupyter 支持） |
| ⑤选择 Python 解释器 | Ctrl+Shift+P -> “Python: Select Interpreter” -> 选择 ai_env(必须先创建 conda 环境) |

4）创建项目：

（1）新建项目：新建一个空文件夹（如 my-demo-project）
（2）打开项目：VS Code 中选择菜单文件 -> 打开文件夹 -> 选择该文件夹
（3）新建文件：左侧空白处右键 -> 新建文件（如 main.py 或 test.ipynb）

5）GitHub Copilot Chat

Copilot Chat 大家俗称“VS Code 自带 AI 聊天”，使用时需要登录 GitHub 账号。它面向代码开发的对话式 AI 助手，依托云端大模型（Claude），自动读取当前文件、选中代码、报错、终端日志，支持：

- 自然语言提问：解释代码、修复 Bug、写函数 / 接口
- 编辑指令：重构、优化、加注释、单元测试
- 斜杠快捷命令：/fix /explain /doc /test
- Agent：项目级分析、多文件检索、终端命令生成

（1）两个易混淆概念区分

- 行内代码补全（Inline Completion）：敲代码弹出灰色提示，Tab 一键接收，独立额度；
- Copilot Chat 对话窗口：侧边聊天面板、Ctrl+I 唤起弹窗，单独占用月度聊天额度；

（2）免费版（Copilot Free）官方固定额度（2026 现行标准）

仅需免费 GitHub 账号，无需信用卡、无需试用，永久免费分层限制，每月 1 号自动重置额度：

代码行内补全：2000 次 / 月。输入代码弹出的灰色建议，按 Tab 确认才算消耗 1 次，只预览不 Tab 不计次数。补全 2000 次用完后不再弹出代码提示，到下月刷新。
Copilot Chat 对话请求：50 次 / 月。每发送 1 轮提问 = 1 次额度；多轮连续追问、Agent 复杂任务统一扣减聊天次数。聊天 50 次用完后 Chat 面板禁用，等到下月刷新。

2、Cursor AI 编辑器

Cursor 是基于 VS Code 深度定制的 AI 代码编辑器，核心升级为 Agent 智能体工作流、Composer 多文件编辑、Background Agents 后台自治、MCP 应用生态，全面从“代码补全”升级为“AI 驱动开发平台”。适合项目高阶迭代开发，可作为备选开发工具。

Cursor 随着版本的更新，免费功能被功能阉割，AI 助手免费限额减少。

---

💡 **速记**

**【Conda 环境管理】**
*   **与 pip 区别**：管理范围广（多语言）、依赖处理强（自动适配）、原生隔离环境、适用于复杂AI项目。
*   **安装选型**：Anaconda（完整版，3GB） vs Miniconda（轻量版，100MB）。
*   **常用命令（核心）**：`conda create -n 环境名 python=版本号`、`conda activate 环境名`、`conda env list`、`conda deactivate`、`conda env remove -n 环境名`。
*   **镜像配置**：`conda config --add channels` 加上清华源链接。

**【VS Code 与 Copilot】**
*   **必做配置**：中文扩展、主题、通义灵码、Python 扩展、选择解释器。
*   **Copilot 免费额度（2026标准）**：行内补全 2000 次/月，Chat 对话 50 次/月。
*   **Cursor AI**：基于 VS Code 的深度定制，核心是 Agent 智能体、多文件编辑、MCP生态。
