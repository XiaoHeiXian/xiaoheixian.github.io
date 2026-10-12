---
layout: article
title: "LangChain 表达式语言基础"
description: "- \"核心定义：LCEL 是一种声明式编排语言，通过管道符串联组件。\"   - \"基础单元：Prompt、LLM、Parser 都实现了 Runnable 接口。\"   - \"执行方式：支持同步调用（invoke）、流式输出（stream）、批量调用（batch）。\"   - \"解析器：分为 StringOutputParser、JsonOutputPa"
date: 2026-10-12
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "LCEL"
  - "表达式语言"
permalink: /posts/2026-10-12-langchain-expression-language-basics.html
---

## 1、LCEL 核心概念

LangChain 表达式语言（LangChain Expression Language，简称 LCEL）是一种声明式的编排语言。它的核心目的是让开发者能够以一种直观、简洁的方式将不同的组件（如提示词模板、大模型、解析器、检索器等）串联起来。

在 LCEL 出现之前，开发者通常需要继承特定的 Chain 类并实现其方法，代码冗长且不够灵活。LCEL 引入了“管道”语法，极大地简化了开发流程。

LCEL 的核心特性包括：

（1）统一的接口：所有核心组件都实现了 Runnable 接口。这意味着它们都支持同一套调用方法，包括同步调用（invoke）、流式输出（stream）、批量调用（batch）和异步调用（ainvoke/astream/abatch）。

（2）管道符连接：使用 | 符号可以像 Linux 管道一样，将上一个组件的输出作为下一个组件的输入。这种方式可以让数据自动从左到右流经每个组件。

（3）天然的流式支持：LCEL 构建的链会自动获得流式输出能力。当使用 stream 方法时，数据会在各个组件之间逐块传递，无需额外开发。

## 2、执行调用

在使用 LCEL 构建好链之后，可以通过以下几种方式执行调用：

（1）同步调用

    content = chain.invoke(输入数据)
    print(content)

（2）流式输出

    for chunk in chain.stream(输入数据):
        print(chunk, end="", flush=True)

## 3、解释器

LangChain 解析器的核心作用是将大语言模型（LLM）返回的非结构化文本，转换成结构化的数据（如字典、列表、Pydantic 模型等），让你能直接用代码处理模型输出，而不用手动写字符串处理逻辑。

（1）简单解析器

StringOutputParser 是最基础的解析器，仅将模型输出转为纯字符串，适合不需要结构化的场景。

（2）结构化解析器

JsonOutputParser 是将模型输出转为 JSON 格式（Python 字典），适合需要提取多字段信息的场景（如提取作物名称、病虫害、风险等级）。

（3）强类型解析器

PydanticOutputParser 是基于 Pydantic 模型定义输出结构，强制模型输出符合格式的内容，还能自动校验字段类型，适合生产环境。

使用 JsonOutputParser 或 PydanticOutputParser 类型转换时，必须在 Prompt 模板中指定 get_format_instructions()。它的核心作用是自动生成清晰、标准化的格式说明文本，并将其传入提示词中，告诉大语言模型（LLM）必须按照你定义的 Pydantic 模型结构来输出内容。

    prompt = prompt.partial(format_instructions=parser.get_format_instructions())

同时在系统提示词中说明“格式要求：{format_instructions}”。占位符 {format_instructions} 是将 get_format_instructions() 生成的标准格式指令，嵌入到发给大语言模型的提示词中，让模型明确知道“必须按照这个格式输出”，是连接 Pydantic 模型和 LLM 输出的关键桥梁。

最基础的调用是“提示词模板 + LLM + 输出解析器”的链式组合，应用在没有调用工具的智能体中。

## 4、链式调用案例

【例 2.5-1】简单的链式调用

在示例中，让 LLM 回答专业性问题，程序执行流程为：

第一步：构建提示词，接收用户输入，生成完整的提示词；

第二步：把提示词传给 LLM，调用模型生成响应；

第三步：把 LLM 响应传给字符串解析器，解析为纯字符串。

这个步骤概括起来就是输入数据（Prompt） | 调用模型（LLM） | 解析结果（Parser），这三个步骤串联成一个可执行的“流水线”，让数据自动从左到右流经每个组件完成处理。

【程序代码】

    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.prompts import ChatPromptTemplate

    # 1. 构建提示词
    prompt = ChatPromptTemplate.from_messages([
        ("system", "你是一个农业助手，请简单解答我的问题，回答时不需要添加额外内容。"),
        ("human", "{question}")
    ])

    # 2. 选取结果解析器
    parser = StrOutputParser()

    # 3. 构建调用链
    chain = prompt | llm | parser

    # 4. 链式调用
    if __name__ == "__main__":
        question = {"question": "冬天下雪，会给来年作物生长带来哪些方面的好处？"}
        # 5.1 同步调用
        # content = chain.invoke(question)
        # print(content)
        # 5.2 异步调用
        for chunk in chain.stream(question):
            print(chunk, end="", flush=True)

## 5、流程图文字推演

### LCEL 链式调用执行流程

用户输入问题 --> 传入 Prompt 模板 --> 模板将变量填充并生成完整提示词 --> 通过管道符（|）传递给 LLM --> LLM 生成响应文本 --> 通过管道符（|）传递给 Parser 解析器 --> 解析器将非结构化文本转换为目标格式 --> 返回最终结果给用户

### 流式输出流程

用户输入问题 --> Prompt 模板生成提示词 --> LLM 开始生成文本 --> 管道逐块传输 --> Parser 逐块解析 --> 前端逐字渲染显示

💡 **速记**

【核心考点】

LCEL（LangChain 表达式语言）通过管道符（|）将提示词、大模型、解析器串联成流水线，实现数据自动流转。

所有核心组件都实现了 Runnable 接口，天然支持同步调用（invoke）、流式输出（stream）和批量调用（batch）。

解析器分为三种：StringOutputParser（纯字符串）、JsonOutputParser（字典）、PydanticOutputParser（强类型模型）。

【高频逻辑链】

链式调用构建：构建 Prompt 模板 --> 选择输出解析器 --> 组合链（Prompt | LLM | Parser） --> 执行调用（invoke 或 stream）。

强类型解析器配合：定义 Pydantic 模型 --> 创建 PydanticOutputParser --> 调用 get_format_instructions() 获取格式指令 --> 通过 prompt.partial() 注入模板 --> 构建链并执行。

【关键避坑】

使用 JsonOutputParser 或 PydanticOutputParser 时，必须在提示词模板中通过占位符 {format_instructions} 将格式指令传递给大模型，否则模型不知道应该输出什么样的格式，会导致解析失败。

链式调用时，数据必须从左到右依次流经每个组件，前一个组件的输出类型必须匹配后一个组件的输入类型，否则会在运行时报错。
