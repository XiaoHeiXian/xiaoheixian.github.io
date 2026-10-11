---
layout: article
title: "结构化输出"
description: "- \"背景：LLM 原生输出为非结构化自然语言，直接用于程序逻辑处理易出错。\"   - \"方案：LangChain 提供结构化输出方案，约束智能体返回标准化数据。\"   - \"Pydantic：强类型数据校验工具库，提供数据说明书、校验器和容器三层能力。\"   - \"response_format：智能体内置原生结构化输出配置，支持 Pydantic、R"
date: 2026-10-12
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "结构化输出"
  - "Pydantic"
permalink: /posts/2026-10-12-structured-output.html
---

在 AI 应用开发场景中，大语言模型（LLM）原生输出内容为无规范约束的非结构化自然语言。若直接将这类文本用于程序逻辑处理，例如数据入库、接口参数传递、工具函数调用等场景，需要额外编写文本解析逻辑，不仅开发效率低下，还极易出现解析异常、数据错乱等问题。

LangChain 提供了一套成熟完整的结构化输出解决方案，可约束智能体按照开发者指定、格式可预测的标准返回数据。开发者无需手动编写自然语言解析代码，可直接获取 JSON 字符串、Pydantic 模型实例、数据类等标准化结构化数据，可直接在业务程序中读取、运算、存储。

## 1、Pydantic 模型基础

Pydantic 是 Python 生态中用于强类型数据校验、结构化数据定义的工具库，同时也是 LangChain 实现高精度结构化输出的底层核心依赖。

其核心作用是预先定义数据规范：包含字段名称、数据类型、数值、文本约束规则，同时自动对输入输出数据执行合法性校验，完美适配 LLM 标准化输出的业务需求。

对于编程初学者，可将 Pydantic 模型理解为三层能力载体：

（1）标准化数据说明书：强制规定数据必须包含的全部字段、每个字段对应数据类型（数字 / 字符串 / 列表等）、字段约束条件（例如价格数值必须大于 0）；

（2）全自动数据校验器：自动校验数据是否匹配预设规范，不合规数据直接抛出异常；同时支持自动类型转换，例如自动将字符串"9999"转换为数字 9999；

（3）便捷结构化数据容器：数据校验通过后，会生成模型实例对象，可直接通过.属性访问字段（如 obj.price），相比原生字典语法更简洁直观。

【例 2.3-6】基础 Pydantic 模型定义与校验示例

【程序代码】

    from pydantic import BaseModel, Field, field_validator

    # 自定义数据模型，必须继承 BaseModel 基类
    class User(BaseModel):
        # 字段定义：字段名: 数据类型 = Field(描述、默认值、约束条件)
        name: str = Field(description="用户姓名，不可为空")
        age: int = Field(description="用户年龄，整数", gt=0, le=150)
        city: str = Field(default="未知", description="用户居住城市，无填写时默认未知")
        hobbies: list[str] = Field(description="个人爱好字符串列表")

        # 自定义字段校验规则（可选，用于强化特殊业务约束）
        @field_validator("name")
        def name_not_empty(cls, value):
            # 校验姓名不能为纯空白字符串
            if not value.strip():
                raise ValueError("姓名不能为空")
            return value

    if __name__ == "__main__":
        # 场景 1：入参完全符合规范，正常实例化对象
        user1 = User(
            name="张三",
            age=25,
            city="北京",
            hobbies=["看书", "跑步"]
        )
        # 直接通过属性读取字段数据
        print(user1.name) # 输出：张三
        print(user1.age) # 输出：25
        # 模型转为字典，适配数据库存储、接口传参等场景
        print(user1.model_dump())

        print("="*50)

        # 场景 2：入参违反约束，自动抛出校验异常
        try:
            user2 = User(name="", age=0, hobbies=["打游戏"])
        except Exception as e:
            print(f"数据校验失败: {e}")

## 2、智能体 response_format 参数

create_agent 内置原生结构化输出能力，仅需配置 response_format 参数，即可统一约束模型输出格式。模型生成合规结构化数据后，框架会自动完成捕获、校验，最终存入智能体运行状态的 structured_response 字段中。

函数参数定义：

    create_agent(
        response_format: ResponseFormat[ResponseT] | type[ResponseT] | dict[str, Any] | None = None
    )

- 参数说明：response_format 为可选参数，用于配置智能体标准化输出格式
- 支持传入类型：Pydantic 模型类、标准 ResponseFormat 对象、JSON Schema 字典

## 3、轻量级 JSON 格式输出

若业务无需复杂的数据类型、字段合法性校验，可采用轻量化 JSON 输出方案。该方案无需配置 response_format 参数，仅通过系统提示词严格约束输出规则，强制模型返回可直接解析的标准 JSON 字符串。

【例 2.3-7】轻量化 JSON 输出

【程序代码】

    import json

    # 系统提示词，严格约束 JSON 输出规范
    SYSTEM_PROMPT = """
    你是农业病虫害诊断助手，输出必须严格遵守以下规则：
    1. 返回 JSON 包含固定 4 个字段：
        - crop: 作物名称（示例：小麦、水稻、苹果）
        - disease: 病虫害名称（示例：小麦条锈病、水稻稻飞虱）
        - risk_level: 风险等级，仅允许填写：低、中、高
        - suggestion: 简易防治建议，文字不超过 50 字
    2. 仅输出纯 JSON 文本，禁止额外解释、说明、标题、换行注释；
    3. 保证 JSON 语法标准、可被程序直接解析。
    """

    # 组装智能体
    agent = create_agent(
        model=llm,
        system_prompt=SYSTEM_PROMPT
    )

    if __name__ == "__main__":
        user_input = ["分析当前麦田出现的黄叶、锈斑症状，给出病虫害诊断结果"]
        result = agent.invoke({"messages": user_input})
        # 取出模型原始输出文本
        raw_text = result["messages"][-1].content

        # 手动解析 JSON
        try:
            diagnosis = json.loads(raw_text)
            print(f"作物: {diagnosis.get('crop')}")
            print(f"病虫害: {diagnosis.get('disease')}")
            print(f"风险等级: {diagnosis.get('risk_level')}")
            print(f"防治建议: {diagnosis.get('suggestion')}")
        except Exception as e:
            print(f"JSON 文本解析失败: {str(e)}")
            print("模型原始输出内容: ", raw_text)

## 4、Pydantic 模型结构化输出

LangChain 结构化输出官方推荐使用 Pydantic 数据模型，该方案适配所有支持工具调用的主流大模型，覆盖绝大多数业务场景。

【例 2.3-8】基于 Pydantic 的智能体结构化输出

本案例采用 LangChain 官方推荐的 Pydantic 结构化输出方案，通过 response_format 参数进行配置。该方案配合 Pydantic 模型使用，框架会自动完成捕获、校验，最终存入智能体运行状态的 structured_response 字段中。

（图片末尾内容截断，核心逻辑为：定义 Pydantic 模型 -> 创建 Agent 时传入 response_format 参数 -> 调用 Agent 获取 structured_response 结果）

## 5、流程图文字推演

### 轻量级 JSON 输出流程

定义 System Prompt（约束 JSON 字段与格式） --> 创建 Agent --> 用户输入提问 --> LLM 生成纯 JSON 字符串 --> 手动解析 JSON（json.loads） --> 异常兜底处理 --> 业务逻辑使用数据

### Pydantic 结构化输出流程

定义 Pydantic 数据模型（字段、类型、约束） --> 创建 Agent 时配置 response_format 参数 --> 用户输入提问 --> LLM 生成结构化数据 --> 框架自动捕获与校验 --> 存入 structured_response 字段 --> 获取 Pydantic 实例对象 --> 业务逻辑直接使用属性

💡 **速记**

【核心考点】

LLM 原生输出为非结构化自然语言，直接用于程序处理会导致解析异常和数据错乱，LangChain 提供结构化输出方案解决此问题。

Pydantic 是实现结构化输出的底层核心依赖，具备三层能力：标准化数据说明书、全自动数据校验器、便捷结构化数据容器。

【高频逻辑链】

轻量级方案：通过 System Prompt 约束 JSON 格式 --> 手动解析（json.loads） --> 需自行编写 try-except 兜底。

推荐方案：定义 Pydantic 模型 --> 创建 Agent 时配置 response_format 参数 --> 框架自动校验并存入 structured_response --> 直接获取实例对象。

【关键避坑】

轻量级 JSON 输出容易受模型幻觉影响，可能返回带有 Markdown 代码块标记（如 ```json）或多余解释的文本，导致 json.loads 解析失败，必须做好异常捕获和格式清洗。

Pydantic 结构化输出方案需要模型支持工具调用（Function Calling）能力，如果模型能力不足，可能无法正确返回结构化数据。
