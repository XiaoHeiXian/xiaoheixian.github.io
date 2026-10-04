---
layout: article
title: "LangChain 大模型应用开发框架"
description: "- \"定义：基于 Python 的开源大模型应用工程化编排框架。\"   - \"定位：连接大模型、私有数据、外部工具、记忆能力的桥梁。\"   - \"核心价值：统一调用接口，避免重复造轮子，模块化可扩展。\"   - \"六大组件：Models、Prompts、Indexes、Memory、Chains、Agents。\"   - \"分层生态：Core、Commu"
date: 2026-10-04
category: "AI"
tags:
  - "微服务"
  - "AI大模型"
  - "LangChain"
permalink: /posts/2026-10-04-langchain-core-framework.html
---

LangChain 是本课程唯一核心开发框架，所有智能搜索、RAG 问答、Agent 自主决策功能均基于该框架实现，本章建立全局架构认知，后续单元逐一拆解落地。

## 1 核心定义

LangChain 是基于 Python 的开源大模型应用工程化编排框架，核心定位是连接大模型、私有数据、外部工具、记忆能力的桥梁。核心价值是封装通用开发逻辑，避免重复造轮子，让开发者快速搭建企业级大模型应用。

LangChain 就像“大模型应用的乐高积木”——把大模型、数据、工具、记忆等核心能力封装成可复用的模块，你只需拼搭这些模块，就能快速实现复杂功能。

典型应用场景：

- 智能问答系统（基于私有知识库）
- 多轮对话机器人（带记忆功能）
- 工具调用代理（调用计算器、API、数据库）
- RAG 检索增强生成（结合外部文档回答）

核心价值：

- 统一大模型调用接口：无论调用阿里百炼、OpenAI 还是 DeepSeek，都用同一套代码写法，切换模型只需改一行配置。
- 避免重复造轮子：封装了对话记忆、提示词管理、工具调用、数据连接等通用能力，开发者只需专注业务逻辑。
- 模块化+可扩展：所有功能拆分为独立模块，可按需组合。比如只用 Memory 模块增强问答，或组合全部模块实现智能代理。
- 生态兼容极广：支持几乎所有主流大模型（阿里百炼、OpenAI、通义千问、DeepSeek 等）、工具（Python 函数、REST API、数据库、代码解释器等）、数据源（PDF、Excel、知识库、向量库等）。

## 2 六大核心组件

LangChain 所有高阶功能均由六大基础组件组合而成，各组件职责独立、模块化可复用。具体组成如图所示：

![架构示意图](https://xiaoheixian.github.io/posts/assets/309_65.png)

    LangChain
       |
       +-- Index <-- 各类外部文件
       |
       +-- Memory <-- (输入到 Prompts)
       |
       +-- Prompts <-- 用户提问
       |
       +-- Models --> 大模型推理结果
       |
       +-- Chains (底层组合)
       |
       +-- Agents (底层协调)

（1）Models（模型）：负责处理自然语言输入并生成响应，是整个系统的“大脑”。如 OpenAI 的 GPT 模型、阿里百炼的通义千问模型、DeepSeek V3.2 等。

（2）Prompts（提示词）：为模型提供输入指令，引导模型生成特定类型的响应。如用户输入的问题或指令，如“解释量子计算”。

（3）Indexes（索引）：用于存储和检索外部数据，支持模型访问知识库或数据库。如向量数据库（如 Pinecone）、关系型数据库（如 PostgreSQL）。

（4）Memory（记忆）：存储对话历史或上下文信息，使模型能够记住之前的交互。如对话历史记录、用户偏好设置。

（5）Chains（链）：将多个组件（如模型、提示词、索引）串联起来，形成一个完整的处理流程。如从用户输入到模型响应的完整流程。

（6）Agents（代理）：负责协调和管理其他组件，根据任务需求动态选择和调用合适的组件。如任务调度器、工作流管理器。

## 3 分层生态系统

LangChain 的分层生态系统是其“模块化、可解耦、按需扩展”设计理念的核心体现，整体遵循底层抽象 -> 中间集成 -> 上层应用 -> 部署运维的逻辑，覆盖从“框架开发”到“应用上线”的全生命周期，同时适配不同角色开发者（框架贡献者、集成开发者、应用开发者、运维人员）的需求。LangChain 分层生态系统如图所示：

![架构示意图](https://xiaoheixian.github.io/posts/assets/310_65.png)

    LangServer
    LangChain | LangGraph | LangSmith
    LangChain-Community
    LangChain-Core

### 1、各层详解

1）核心抽象层 LangChain Core（最底层）

LangChain 生态的“地基”，定义所有组件的标准化接口与数据结构，实现功能解耦，保障所有模型、工具、数据源可无缝切换、兼容适配。不包含任何具体的第三方集成，仅提供标准化的“骨架”。

（1）核心作用

- 统一全生态的核心接口：比如 Runnable（所有可执行组件的基类，.invoke()/.stream()/.batch() 方法都来自这个抽象）、BaseLanguageModel（所有大模型的基类）、BasePromptTemplate（提示词模板基类）；
- 提供基础数据结构：比如 Message（SystemMessage/HumanMessage 等）、Document（数据接入层的文档结构）；
- 解耦上层逻辑：无论集成哪个大模型 / 工具，都遵循 Core 层的接口，切换集成时无需修改核心代码。

（2）关键包安装

    conda install -c conda-forge langchain-core

注意：

① 安装包时激活 ai_env 环境。

    conda activate ai_env

② 如果安装 langchain 包：

    conda install -c conda-forge langchain

包含了：langsmith, langchain-core, langchain-text-splitters, langchain。

2）社区集成层 LangChain Community（中间层）

对接“第三方生态”的集成层，由社区维护，包含非官方核心合作的第三方工具 / 模型 / 数据源的集成实现（Core 层是抽象，Community 层是这些抽象的具体落地）。

（1）核心作用

- 低成本对接小众 / 社区级生态：比如阿里百炼（DashScope）、国内大模型（通义千问、文心一言）、开源向量库（FAISS、Chroma）、文档加载器（PyPDFLoader、ExcelLoader）、工具（本地脚本、小众 API）；
- 兼容 Core 层接口：所有集成都遵循 Core 层的抽象，比如 ChatDashScope 实现了 Core 层 BaseChatModel 接口。

（2）关键包安装

    conda install -c conda-forge langchain-community

如果需要对接第三方，安装以下包：

    conda install -c conda-forge langchain-openai

对接阿里百炼平台的 Dashscope：

    conda install -c conda-forge dashscope

3）应用构建层：LangChain / LangGraph（上层应用层）

基于底层抽象 / 集成层封装的“高阶应用组件”，面向应用开发者，无需关注底层接口，直接复用预制的“场景化能力”。

LangChain 的核心是基础 Agent，LangGraph 是 LangChain 生态下的高级工作流编排库，是 LangChain 线性流程能力的补充与升级。

（1）核心作用

- 降低应用开发门槛：封装了常见场景的完整逻辑，比如 RAG（检索增强生成）、智能代理、多轮对话机器人；
- 提供预制模板：比如 RetrievalQA（知识库问答链）、create_openai_tools_agent（工具调用代理）都属于这一层的预制组件。

（2）关键组件

预制 Chains、Agents、RAG 流水线、对话机器人模板。

4）部署运维层 LangServer + LangSmith（运维观测层）

面向生产环境的部署、调试、监控层，解决开发完应用如何上线、如何排查问题的核心需求。

核心组件与功能如表 3-1 所示：

表 3-1：部署运维层的核心组件与功能

工具：LangServer

定位：部署工具

核心功能：将 LangChain 的 Chains/Agents 封装为 REST API，支持批量调用、流式响应，适配生产部署。

工具：LangSmith

定位：调试/监控平台

核心功能：可视化追踪链 / 代理的执行流程、记录模型调用日志、评估回答质量、调试提示词效果。

### 2、搜索 + 大模型 + LangChain

今天的 AI 应用已经不再是单一工具，而是搜索引擎 + 大语言模型 + LangChain 框架的协同工作，它们的作用和地位如表 3-2 所示：

表 3-2：搜索引擎 + 大语言模型 + LangChain 框架的作用和地位

层级：数据层

组件：搜索引擎 + 向量数据库

职责：获取最新信息或检索私有知识库，解决知识滞后、无私有数据问题。

层级：推理层

组件：大语言模型

职责：理解问题、生成回答、调用工具，即负责语义理解、知识整合、答案生成。

层级：编排层

组件：LangChain

职责：串联整个流程：接收问题 -> 检索数据 -> 调用模型 -> 生成答案。管控逻辑、规避幻觉、实现自主决策。

这就是“会用工具的大模型”——搜索负责找事实，大模型负责理解和表达，LangChain 负责编排整个流程。

## 4 流程图文字推演

### LangChain 核心组件协作流程

用户提问 --> Prompts 接收输入 --> 结合 Memory 中的对话历史 --> 结合 Indexes 检索的外部数据 --> 组装为完整的 Prompt --> 传递给 Models 大模型 --> 调用 Chains 或 Agents 进行流程编排 --> 生成大模型推理结果

### 搜索 + 大模型 + LangChain 协同流程

用户提问 --> LangChain 编排层接收问题 --> 调用数据层（搜索引擎 + 向量数据库）检索最新信息或私有知识库 --> 将检索结果与问题组合 --> 传递至推理层（大语言模型） --> 大模型进行语义理解、知识整合与答案生成 --> 返回结果给用户

💡 **速记**

【核心考点】

LangChain 是基于 Python 的工程化编排框架，核心定位是连接大模型、数据、工具和记忆的桥梁，核心价值在于统一接口、避免重复造轮子、模块化可扩展。

六大核心组件：Models（大脑）、Prompts（指令）、Indexes（外部数据）、Memory（记忆）、Chains（串联流程）、Agents（动态协调）。

分层生态架构：LangChain-Core（底层抽象接口） -> LangChain-Community（第三方集成） -> LangChain/LangGraph（高阶应用组件） -> LangServer/LangSmith（部署运维）。

【高频逻辑链】

LangChain 协同架构：数据层（搜索/向量库，找事实） -> 推理层（大模型，理解与表达） -> 编排层（LangChain，串联流程与规避幻觉）。

应用构建流程：定义 Prompts -> 配置 Models -> 接入 Indexes 与 Memory -> 使用 Chains 串联 -> 使用 Agents 自主决策 -> 通过 LangServer 部署上线。

【关键避坑】

安装 langchain-core 或 langchain 包时，需确保已激活对应的 Python 虚拟环境（如 ai_env）。

对接国内大模型（如通义千问、文心一言）时，需要安装对应的社区集成包（如 dashscope）并实现 Core 层的 BaseChatModel 接口。
