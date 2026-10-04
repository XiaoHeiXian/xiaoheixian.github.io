---
layout: article
title: "LangChain 快速实战案例"
description: "- \"环境规范：统一使用 Conda 虚拟环境与清华镜像源安装依赖。\"   - \"安全规范：使用 .env 文件全局配置密钥，禁止代码硬编码。\"   - \"模型标准：默认使用 Qwen3-8B，通过 temperature 控制输出精准度。\"   - \"案例一：通过系统提示词约束模型角色，验证消息层级与指令优先级。\"   - \"案例二：串联天气工具与 A"
date: 2026-10-04
category: "AI"
tags:
  - "微服务"
  - "AI大模型"
  - "LangChain"
  - "智能体"
permalink: /posts/2026-10-04-langchain-quick-start.html
---

全书实操案统一适配课程标准化开发环境，统一镜像源、模型、安全配置，规避环境报错、接口异常问题，全程技术口径统一。

## 1、依赖库安装

项目依赖统一安装命令，全程使用清华镜像源加速下载，解决超时、安装失败问题。

    # 激活环境
    conda activate ai_env

    # 安装依赖
    pip install python-dotenv langgraph-checkpoint-redis redis -i https://pypi.tuna.tsinghua.edu.cn/simple

## 2、环境配置规范

项目根目录新建 .env 全局配置文件隔离敏感信息，企业级安全规范，密钥禁止代码硬编码。具体配置步骤如下：

（1）新建专属项目文件夹，示例路径：E:\user\ai\langchain_exam；

（2）使用开发工具打开项目文件夹，在项目根目录创建 .env 全局配置文件；

（3）在文件中写入硅基流动平台（或其它平台）标准接口配置，统一全局接口地址与密钥认证：

    OPENAI_API_KEY=你的硅基流动 API 密钥
    BASE_URL=https://api.siliconflow.cn/v1
    CHAT_MODEL=Qwen/Qwen3-8B

## 3、模型统一标准

全书实操案例默认使用硅基流动开源模型：Qwen/Qwen3-8B，通过 temperature 参数精准适配不同业务场景，参数统一规范：

精准问答、技术答疑、工具调用场景设置 0.1-0.3，保障输出严谨无随机偏差；

创意文案、拓展生成场景设置 0.7-0.9，保留内容创作灵活性。

## 4、例题调试规范

全书实操题统一使用 Jupyter Notebook 分步调试、运行与效果验证。如，创建第二章.ipynb 文件，代码支持分段运行、实时查看结果、逐行打印消息排查逻辑，适配课堂分步演示、学生自主排错的授课需求。

全书通用标准化模型初始化基础模板，所有案例统一复用，减少重复代码编写：

    # 1. 导入核心依赖库
    import os
    from langchain_openai import ChatOpenAI
    from langchain.agents import create_agent
    from dotenv import load_dotenv

    # 2. 加载环境变量（企业级安全规范，覆盖重复配置）
    load_dotenv(override=True)

    # 3. 初始化标准化模型（全书统一配置）
    llm = ChatOpenAI(
        base_url=os.getenv("BASE_URL"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        model=os.getenv("CHAT_MODEL"),
        temperature=0.1 # 低温度适配精准问答场景，规避随机输出偏差
    )

## 5、基础角色定制智能体

【例 2.1-1】基础角色定制智能体

本案例聚焦系统提示词控参核心逻辑，通过定制系统角色约束模型行为，让初学者直观理解提示词定义能力、模型执行能力的基础架构，无复杂工具依赖，快速入门可控 AI 开发。

【程序代码】

    # 1. 系统角色定义（核心：约束模型身份、能力、输出规则）
    SYSTEM_PROMPT = """你是专业的 Python 编程助教。

【强制硬性规则，绝对不可违反】

1. 只允许回答 Python 编程、代码语法、Python 实操相关问题
2. 所有非 Python 相关问题，必须直接固定回复：抱歉，我仅可解答 Python 基础编程问题，不支持该类需求。
3. 禁止强行作答、禁止跨界创作、禁止自作主张回答无关内容
"""

    # 2. 构建专属智能体
    agent = create_agent(model=llm, system_prompt=SYSTEM_PROMPT)

    # 3. 场景测试
    if __name__ == "__main__":
        # 合法场景提问
        res1 = agent.invoke({"messages":["请写一个 Python 读取本地 txt 文件的极简代码"]})
        print("编程助教应答：\n", res1["messages"][-1].content)

        # 跨界提问（验证角色约束效果）
        res2 = agent.invoke({"messages":["帮我写一篇古代人物的作文"]})
        print("\n跨界问题应答：\n", res2["messages"][-1].content)

【运行结果解读】

程序执行后分为两段输出：

第一段为合规代码提问应答，模型严格按照系统提示输出带单行注释的极简文件读取代码；

第二段用户提出作文需求，用户输入优先级低于系统全局规则，模型直接输出固定兜底回复，不会生成作文内容。

本案例完整验证消息层级差异、提示词强制约束两大核心知识点，是后续所有复杂智能体的交互底层基础。

## 6、多功能天气查询智能体

【例 2.1-2】多功能天气查询智能体

本案例串联工具开发、外部 API 调用、结构化输出、会话记忆四大智能体核心技术，衔接【例 2.1-1】基础角色约束案例，由单一角色管控升级为带外部资源交互的工程化智能体，是智能搜索项目工具调用模块前置核心实训。

运行后智能体完整实现 6 项核心能力：

① 自主判断调用天气工具，不会编造气象数据；

② 读取 API 接口获取实时天气原始数据；

③ 按照固定 Weather 模型结构化输出，字段统一规范；

④ 依托 thread_id 保存对话上下文，支持无城市追问；

⑤ 接口异常自动捕获，返回友好错误提示；

⑥ 全程遵循系统提示词约束，不会生成虚假天气信息。

【程序代码】

    # 0. 引入依赖包
    import requests
    from pydantic import BaseModel, Field
    from langchain.tools import tool
    from langgraph.checkpoint.memory import InMemorySaver

    # 1. 精细化系统提示词（清晰工具说明+行为约束，规范智能体决策逻辑）
    SYSTEM_PROMPT = """你是专业天气预报助手，仅可调用 get_weather_for_location 工具查询城市天气，严格遵循规则：

1. 用户询问任意城市天气，必须调用工具获取实时数据，禁止编造气温、天气状况；
2. 工具返回结果后，按照指定结构化格式整理输出；
3. 无对应城市数据如实告知，禁止虚构天气信息；
4. 可结合上下文记忆回答用户追问。

可用工具：get_weather_for_location（输入中文城市名，返回近 3 天分段天气）
"""

    # 2. 创建外部天气查询工具（对接公共天气接口）
    # 定义 Weather 数据模型（结构化输出）
    class Weather(BaseModel):
        location: str = Field(description="城市名称")
        temperature: str = Field(description="温度")
        condition: str = Field(description="天气状况")

    @tool
    def get_weather_for_location(location: str) -> str:
        """
        获取指定城市的天气信息。
        输入参数：location - 中文城市名
        返回：近 3 天分段天气数据
        """
        try:
            # 模拟调用公共天气接口
            # 实际项目中可替换为真实的 API 接口请求
            # 这里使用模拟数据作为示例
            weather_data = {
                "北京": "北京近3天天气：今天晴，15-26℃；明天多云，14-24℃；后天小雨，12-20℃。",
                "上海": "上海近3天天气：今天阴，18-25℃；明天小雨，17-22℃；后天多云，16-23℃。",
                "广州": "广州近3天天气：今天阵雨，22-30℃；明天多云，23-31℃；后天晴，24-32℃。"
            }
            
            result = weather_data.get(location)
            if result:
                return result
            else:
                return f"抱歉，暂未查询到 {location} 的天气数据，请检查城市名称是否正确。"
                
        except Exception as e:
            # 接口异常自动捕获
            return f"天气查询服务暂时不可用，请稍后再试。错误信息：{str(e)}"

    # 3. 初始化会话记忆存储（基于内存，生产环境可替换为 Redis）
    memory = InMemorySaver()

    # 4. 创建智能体（绑定工具、系统提示词与记忆）
    agent = create_agent(
        model=llm,
        tools=[get_weather_for_location],
        system_prompt=SYSTEM_PROMPT,
        checkpointer=memory
    )

    # 5. 测试与验证
    if __name__ == "__main__":
        # 配置会话 ID，用于区分不同用户的对话上下文
        config = {"configurable": {"thread_id": "weather_session_001"}}

        # 场景一：直接询问指定城市天气
        print("=== 场景一：直接询问指定城市天气 ===")
        res1 = agent.invoke(
            {"messages": ["北京今天天气怎么样？"]},
            config=config
        )
        print("智能体应答：\n", res1["messages"][-1].content)

        # 场景二：无城市追问（验证上下文记忆）
        print("\n=== 场景二：无城市追问（验证记忆） ===")
        res2 = agent.invoke(
            {"messages": ["那明天呢？"]},
            config=config
        )
        print("智能体应答：\n", res2["messages"][-1].content)

        # 场景三：查询不存在的城市（验证异常处理与友好提示）
        print("\n=== 场景三：查询不存在的城市 ===")
        res3 = agent.invoke(
            {"messages": ["火星今天天气怎么样？"]},
            config=config
        )
        print("智能体应答：\n", res3["messages"][-1].content)

【运行结果解读】

场景一中，智能体识别到用户意图为查询天气，自动调用 get_weather_for_location 工具，并将返回的文本整理输出，而不是凭空编造数据。

场景二中，由于配置了 checkpointer 与 thread_id，智能体保留了上一轮对话中“北京”这个上下文，自动补全为“北京明天天气”，并调用工具查询，体现了会话记忆能力。

场景三中，工具内部判断该城市无数据，返回友好提示，智能体将其直接透传给用户，体现了接口异常捕获与系统提示词约束的有效性。

## 7、流程图文字推演

### 天气查询智能体执行流程

用户提问（如：北京今天天气怎么样？） --> 智能体接收输入 --> 系统提示词约束判断 --> 识别意图为天气查询 --> 调用 get_weather_for_location 工具 --> 工具内部请求 API 或查询本地数据 --> 返回原始天气数据 --> 智能体根据结构化模型整理输出 --> 返回最终结果给用户

用户追问（如：那明天呢？） --> 通过 thread_id 获取历史对话上下文 --> 自动补全城市名称 --> 再次调用天气工具 --> 返回结果

用户提问不存在的城市 --> 工具返回友好错误提示 --> 智能体遵守系统提示词约束 --> 直接透传错误提示给用户，不产生幻觉

💡 **速记**

【核心考点】

环境隔离使用 Conda 虚拟环境，敏感信息使用 .env 文件管理，模型默认使用 Qwen3-8B，通过 temperature 控制精准度（0.1-0.3 用于严谨场景，0.7-0.9 用于创意场景）。

系统提示词（System Prompt）的优先级高于用户输入，是约束模型行为的核心手段。

智能体通过工具的调用与外部世界交互，通过记忆（Memory / Checkpointer）实现多轮对话的连贯性。

【高频逻辑链】

环境安装（pip / conda） --> 配置读取（dotenv） --> 模型初始化（ChatOpenAI） --> 提示词设计（System Prompt） --> 工具开发（@tool 装饰器） --> 智能体构建（create_agent + checkpointer） --> 会话测试（invoke + thread_id）。

【关键避坑】

必须使用 load_dotenv(override=True) 加载环境变量，避免硬编码密钥引发安全风险。

使用基于状态的智能体时，必须传递 config={"configurable": {"thread_id": "xxx"}}，否则模型无法在多轮对话中记住上下文。

工具函数的文档字符串（docstring）至关重要，它是智能体决定是否调用该工具、如何理解参数的关键依据。
