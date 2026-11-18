---
layout: article
title: "AI 智能体开发工具链：Ollama 与 DeepSeek Harness"
description: "Harness 理念：模型 (Model) + Harness = 智能体 (Agent)，主张一切皆插件。 Ollama：本地运行 LLM 的开源工具，具备隐私安全、完全免费、离线可用等优势。 Ollama 部署：支持原生安装与 Docker 部署，通过标准 API 接入 LangChain。 DeepSeek Harness：基于 Node.js 的开源 Agent 框架，支持源码编译与 Web UI 运行。 模型接入：支持配置第三方 OpenAI 协议 API，如硅基流动大模型平台。"
date: 2026-11-19
category: "软件架构"
tags:
  - "AI大模型"
  - "LangChain"
  - "Ollama"
  - "DeepSeek"
permalink: /posts/2026-11-19-ai-agent-tools-ollama-harness.html
---

这是最近 AI 圈的热门话题，它的核心理念可以用一个公式概括：模型 (Model) + Harness = 智能体 (Agent)。

如果说大模型是“大脑”，负责思考和推理，那么 Harness 就是“身体”和“工具”，负责执行具体任务。它让 AI 不仅能“回答问题”，更能“动手办事”，例如读写文件、运行命令、调用软件、管理项目等。

Harness 最大的特点是“一切皆插件 (Everything is a Plugin)”。模型、工具、记忆、工作流程等所有组件，都像乐高积木一样可以自由插拔、替换和重组。这种设计让开发者能像 DIY 一样，高度定制自己的专属 AI 助手。

## 1.1 ollama

Ollama 是一个免费、开源的工具，让你能在自己的电脑上轻松运行大型语言模型 (LLM)。你可以把它想象成本地 AI 模型的“应用商店”和“运行环境”，告别对网络和云服务的依赖。

### 1、为什么选择 Ollama

（1）数据隐私与安全：所有数据处理都在本地完成，查询内容不上传至第三方服务器，非常适合处理敏感信息。

（2）完全免费：Ollama 本身及其支持的众多开源模型都完全免费。

（3）离线可用：模型下载到本地后，无需网络即可使用，在无网络或网络不稳定的环境下也能工作。

（4）操作简单：通过简单的命令行指令即可完成模型的下载、运行和切换，自动化处理依赖和环境配置。官方也提供了图形界面 (GUI) 客户端。

（5）绿色节能：利用本地硬件资源，相比庞大的云端数据中心更节能环保。

（6）模型丰富灵活：内置丰富的模型库，支持 Llama、DeepSeek、Qwen 等主流模型，并支持在同一台机器上安装和切换多个模型。

注意：Ollama 对 CPU 和内存要求很高，不建议安装算法能力强的大模型。

### 2、安装 Ollama

1）你可以通过以下方式安装：

（1）Linux/macOS/Windows：访问 Ollama 官网下载 (https://ollama.com/download) 页面，下载并安装对应的安装包即可。

（2）Docker：官方提供了 Docker 镜像 ollama/ollama，可在 Docker Hub 获取。

2）Docker 安装 ollama：

（1）创建大模型存储目录

将宿主机的 /data/ollama_models 目录挂载到容器内存储模型的位置。

    mkdir -p /data/ollama_models

（2）运行容器

    docker run -d -v /data/ollama_models:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

（3）安装大模型

全部 AI 大模型网址：https://ollama.com/search

以安装 Qwen3:4B 模型为例：

    docker exec -it ollama ollama pull Qwen3:4B

查看安装的模型：

    docker exec -it ollama ollama list

测试模型：

    docker exec -it ollama ollama run Qwen3:4B "你好，请回答：1+1等于几？"

### 3、Langchain 使用 ollama 模型

在 .env 文件中配置参数：

    # ollama
    OPENAI_API_KEY=sk-ollama # 任意字符串，Ollama 不验证
    BASE_URL=http://192.168.100.101:11434/v1
    CHAT_MODEL=Qwen3:4B

## 1.2 DeepSeek Harness

### 1、环境安装

1）下载安装 Node.js

下载地址：nodejs.org/en/download

2）下载安装 Git

下载地址：git-scm.com/install/windows

3）安装 pnpm：

    npm install -g pnpm

4）检查有没有安装成功：

    node -v
    npm -v
    git --version
    pnpm -v

### 2、安装 DeepSeek Harness

DeepSeek Harness 官网：deepseek.com/harness/

方法 1. 通过 npm 运行（非专业）

    npx @deepseek-ai/dsh web

该命令会启动 Web UI，默认地址：http://127.0.0.1:3080

方法 2. 从源码运行（推荐安装）

（1）创建安装目录

如在 D 盘创建 deepseek 目录。

（2）安装

打开 powershell，进入安装目录：

    d:
    cd deepseek

（3）从 GitHub 克隆 DeepSeek Harness 项目的完整源代码到本地：

    git clone https://github.com/deepseek-ai/deepseek-harness.git

（4）进入项目根目录（所有后续操作都在此目录下执行）：

    cd deepseek-harness

（5）使用 pnpm（高性能的 Node.js 包管理器）安装项目所有依赖包：

    pnpm install

（6）执行项目构建，将 TypeScript 源码编译为可执行的 JavaScript 代码：

    # 构建产物通常输出到 dist/ 或 lib/ 目录
    pnpm run build

（7）启动 DeepSeek Harness 的 Web 界面服务：

    # 成功执行后，浏览器访问 http://127.0.0.1:3080 即可使用
    pnpm dsh web

### 3、接入 DeepSeek API

1）添加第三方模型

添加硅基流动或阿里百炼模型，以硅基流动为例：

（1）点击左下角设置 -> 模型 -> 添加自定义提供方

（2）填写以下信息：

提供方 ID: siliconflow, 显示名称: 硅基流动

API 地址: https://api.siliconflow.cn/v1, 密钥: 你的平台 key

API 协议: openai-completions

添加模型: Qwen/Qwen3-8B, 显示名称: Qwen/Qwen3-8B

（3）测试

在对话窗口选择模型。

## 流程图文字推演

### Ollama 与 Harness 协同工作流程

用户本地环境启动 Ollama 服务 (Docker 或原生)
-> 下载并加载本地大模型 (如 Qwen3:4B)
-> 启动 DeepSeek Harness Web UI
-> 在 Harness 中配置模型提供方 (对接本地 Ollama 接口或第三方云端接口)
-> 用户在 Harness 输入 Prompt
-> Harness 调度工具并调用配置好的模型
-> 返回推理与执行结果

## 💡 **速记**

【核心考点】

Harness 是连接大模型“大脑”与执行“身体”的枢纽，通过插件化机制实现 Agent 能力。

Ollama 是本地化运行 LLM 的神器，利用 Docker 部署方便快捷，并且无缝兼容 OpenAI API 协议标准（配置本地 URL 和任意 API Key 即可）。

DeepSeek Harness 基于 Node.js 生态构建，安装依赖 pnpm，支持通过源码编译启动（pnpm run build -> pnpm dsh web）。

【高频逻辑链】

环境准备：安装 Node.js 与 pnpm -> 克隆 DeepSeek Harness 源码 -> 安装依赖并构建 -> 启动 Web 服务。

模型对接：配置提供方 ID 和 API 地址（如硅基流动或本地 Ollama） -> 协议选 openai-completions -> 填入模型名称（如 Qwen/Qwen3-8B） -> 开始对话。

【关键避坑】

使用 Docker 部署 Ollama 时，务必挂载数据卷（如 /data/ollama_models），否则容器一旦销毁，下载的庞大模型文件将会丢失。

接入 Ollama 本地模型时，API Key 可以随便填（如 sk-ollama），但 Base URL 必须指向 Ollama 的兼容接口（如 http://ip:11434/v1），且模型名称必须与 `ollama list` 中的一致。
