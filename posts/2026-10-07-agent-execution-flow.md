---
layout: article
title: "典型智能体完整运行流程"
description: "- \"定义：典型智能体将大语言模型与工具结合，创建能够对任务进行推理、决定使用哪些工具并迭代地解决问题的系统。\"   - \"核心架构：基于“感知-决策-执行”逻辑，由 request、model、memory、tools、result 五大模块构成。\"   - \"流程拆解：用户请求封装为 HumanMessage，模型结合记忆与提示词决策，调用工具获取数"
date: 2026-10-07
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "智能体"
permalink: /posts/2026-10-07-agent-execution-flow.html
---

## 1、典型智能体的整体运行流程

典型智能体将大语言模型与工具结合，创建能够对任务进行推理、决定使用哪些工具并迭代地解决问题的系统。图 2.3-1 是一个典型的智能体的整体运行流程示意图，展示了一个基于“感知 - 决策 - 执行”逻辑的系统运行过程：

![架构示意图](https://xiaoheixian.github.io/posts/assets/314_65.png)

    request
      |
      v
    model <--> memory
      |  \
      |   \--> observation
      v
    tools --> result

图 2.3-1：典型的智能体的整体运行流程

运行流程拆解说明：

（1）request（用户请求）

流程起始输入项，由用户输入自然语言问题、业务任务构成，会统一封装为标准 HumanMessage 消息，作为整个智能体循环的初始输入源。

（2）model（大模型推理核心）

智能体的决策大脑，同时接收当前用户请求与 memory 存储的全部历史对话消息；结合系统提示完成语义理解、任务判断、路径规划，自主生成下一步行动指令；若无需外部数据则直接生成最终应答，若需要实时外部信息则输出工具调用指令 action。

（3）memory（对话记忆存储模块）

智能体上下文存储载体，双向对接模型：一方面接收 model 产生的所有消息（用户提问、AI 回复、工具返回内容）并持久保存；另一方面在每一轮推理前，向 model 推送完整历史交互数据，为模型决策提供上下文支撑，实现连贯多轮对话。

（4）tools（外部工具执行集）

承接模型下发的 action 行动指令，是智能体获取外部实时数据、执行实操动作的执行单元。当模型判断需要外部信息或执行特定动作时，就会调用工具（比如数据库查询、计算器、API 调用等）。工具执行完毕后，将原始返回数据封装为 observation 观测信息回传给模型，补充推理所需外部真实信息。

（5）result（标准化输出结果）

当 model 整合用户提问、历史记忆、工具观测数据，判定信息充足时生成最终结构化应答，对外反馈给用户；同时本次完整交互的全部消息统一存入 memory 留存，观测信息同步回传模型，完成一轮完整执行闭环。

## 2、创建智能体

在 LangChain 中，create_agent 是构建智能体（Agent）的核心方法，智能体能够根据用户输入自主决策调用工具，完成复杂任务。

1）方法原型

    create_agent(
        model: str | BaseChatModel,
        tools: Sequence[BaseTool | Callable | dict[str, Any]] | None = None,
        *,
        system_prompt: str | None = None,
        middleware: Sequence[AgentMiddleware[AgentState[ResponseT], ContextT]] = (),
        response_format: ResponseFormat[ResponseT] | type[ResponseT] | None = None,
        state_schema: type[AgentState[ResponseT]] | None = None,
        context_schema: type[ContextT] | None = None,
        checkpointer: Checkpointer | None = None,
        store: BaseStore | None = None,
        interrupt_before: list[str] | None = None,
        interrupt_after: list[str] | None = None,
        debug: bool = False,
        name: str | None = None,
        cache: BaseCache | None = None,
    ) -> CompiledStateGraph[AgentState[ResponseT], ContextT, _InputAgentState, _OutputAgentState[ResponseT]]

2）核心参数说明

create_agent 的核心参数如表 2.3-1 所示：

表 2.3-1 create_agent 核心参数说明

参数名：model

类型：LLM/ChatModel 实例

核心作用：用于智能体的语言模型。可以是一个字符串标识符（例如，"openai:gpt-4"）或一个直接的聊天模型实例（例如，ChatOpenAI 或其他聊天模型）。

参数名：tools

类型：工具列表

核心作用：智能体可调用的工具。

参数名：system_prompt

类型：字符串 / ChatPromptTemplate

核心作用：一个可选的用于 LLM 的系统提示。提示会被转换为一个 SystemMessage 并添加到消息列表的开头。

参数名：context_schema

类型：Pydantic BaseModel

核心作用：结构化输入 schema，约束用户输入的格式。

参数名：response_format

类型：Pydantic BaseModel

核心作用：结构化输出 schema，强制智能体按固定格式返回结果。

参数名：checkpointer

类型：Checkpointer

核心作用：一个可选的检查点保存器对象。用于为单个线程（例如，单个对话）持久化图的状态（例如，作为聊天记忆）。

参数名：store

类型：存储实例（如 VectorStore/Redis）

核心作用：一个可选的存储对象。用于在多个线程（例如，多个对话/用户）之间持久化数据。

【例 2.3-1】一个能调用外部工具的典型的智能体

本案例基于 create_agent 搭建双工具多功能智能体，解决原生 LLM 两大核心缺陷：一是模型训练数据存在时间截止点，无法获取实时日期；二是模型纯文本估算字数容易产生幻觉误差。程序内置两类自定义工具，搭配高优先级系统提示约束模型行为，同时设置两组对照测试，直观对比原生 LLM 与具备自主工具调度能力的智能体的执行差异。

【程序代码】

    import datetime
    from langchain.agents import create_agent
    from langchain.tools import tool

    # 工具 1：实时日期获取工具（解决模型知识滞后）
    @tool
    def get_current_datetime() -> str:
        """
        获取当前系统标准北京时间，包含年月日、星期
        用于回答所有时间、日期、年份相关提问
        返回：标准化格式化时间字符串
        """
        week_list = ["星期一","星期二","星期三","星期四","星期五","星期六","星期日"]
        now = datetime.datetime.now()
        week = week_list[now.weekday()]
        return f"当前时间：{now.strftime('%Y年%m月%d日')} {week}"

    # 工具 2：文本字数统计工具（自定义业务工具）
    @tool
    def text_word_count(text: str) -> str:
        """
        统计输入文本的有效字数（不含空格、换行）
        参数：text - 需要统计的原始文本字符串
        返回：文本有效字数统计结果
        """
        if not text:
            return "输入文本为空，无法统计字数"
        clean_text = text.replace(" ", "").replace("\n", "")
        return f"文本有效字数为：{len(clean_text)}字"

    # 系统规则约束（最高优先级）
    SYSTEM_PROMPT = """"
    你是多功能实用助手，严格遵循以下规则：
    1. 时间、日期提问必须调用 get_current_datetime 工具，禁止编造时间
    2. 字数统计需求必须调用 text_word_count 工具，精准计算
    3. 非工具类问题直接自主回答，简洁精准、无冗余内容
    4. 杜绝 AI 幻觉，所有工具数据如实反馈
    """"

    # 组装多工具智能体
    agent = create_agent(
        model=llm,
        tools=[get_current_datetime, text_word_count],
        system_prompt=SYSTEM_PROMPT
    )

    # 综合场景测试
    if __name__ == "__main__":
        # 测试一：不用智能体
        result = llm.invoke("帮我查一下今天日期，再统计这句话的有效字数：人工智能让开发更高效")
        print("LLM 单场景执行结果：\n", result)

        # 测试二：多场景混合提问，验证自主工具决策能力
        result = agent.invoke({
            "messages":[
                "帮我查一下今天日期，再统计这句话的有效字数：人工智能让开发更高效"
            ]
        })
        print("智能体综合执行结果：\n", result["messages"][-1].content)

【程序模块拆解说明】

① 自定义工具模块

采用 @tool 装饰器实现两个可被模型自动识别的工具：

get_current_datetime：读取系统本地实时时间，格式化输出年月日 + 星期，专门处理日期、时间类提问，杜绝模型编造时间；

text_word_count：清洗文本空格、换行后精准统计有效字符，解决模型估算字数不准确的幻觉问题；

② 系统提示词模块

作为全局最高优先级 SystemMessage，明确四条硬性执行规则：区分两类问题对应的专属工具调用要求、普通问题直接作答、禁止编造虚假数据，全程约束模型推理逻辑，从规则层面规避 AI 幻觉。

③ 智能体组装模块

通过 create_agent 整合模型、双工具集合、系统提示，赋予模型自主判断需求、动态选择对应工具的能力，形成“推理—调用工具—获取真实数据—整合答案”的完整闭环。

④ 两组对照测试逻辑

测试一：直接调用原生 LLM，无工具调度能力，作为对照组；

测试二：调用完整智能体，一条提问同时包含日期查询、字数统计两类工具需求，验证智能体可自主识别多任务、依次调用对应工具、整合两份工具结果统一输出。

【程序运行结果解读】

① 原生独立 LLM 仅具备文本生成能力，无法对接外部实时资源、完成精确数值计算，存在严重幻觉问题；

② 搭配自定义 Tools + 智能体架构后，模型获得自主调度外部能力的权限，可按需调用工具获取客观真实数据；

③ 系统提示词是约束工具调用逻辑的关键，能强制模型在对应场景下必须使用工具，保障输出可信度；

④ 智能体支持复杂多任务拆解，可自动识别一条提问内多个工具需求，分步执行并整合结果，交互更贴合人类自然提问习惯。

## 3、智能体执行结果与查看方式

1）智能体执行消息存储规则

调用 agent.invoke() 运行智能体后，返回结果中的 messages 列表会严格按照交互时间顺序，完整存储本次调用全程产生的所有消息，完整记录“用户输入—AI 工具调用行为—工具返回数据—AI 最终答复”的全流程，列表内包含三类核心信息：

- 用户原始提问内容；
- AI 的推理记录与工具调用指令日志；
- 整合全部信息后生成的最终应答文本。

2）打印全流程消息

以【例 2.3-1】智能体为例，通过循环调用消息内置格式化方法，完整打印每一轮交互记录：

    if __name__ == "__main__":
        result = agent.invoke({
            "messages":[
                "帮我查一下今天日期，再统计这句话的有效字数：人工智能让开发更高效"
            ]
        })
        for m in result["messages"]:
            m.pretty_print()

标准完整输出展示：

    ================================ Human Message ================================
    帮我查一下今天日期，再统计这句话的有效字数：人工智能让开发更高效

    ================================ Ai Message ================================
    Tool Calls:
      get_current_datetime (019f89e09eeeafa0b67961f0fbd5fdad)
      Call ID: 019f89e09eeeafa0b67961f0fbd5fdad
      Args:
      text_word_count (019f89e09eeeafa0b67961f0fbd5fdae)
      Call ID: 019f89e09eeeafa0b67961f0fbd5fdae
      Args:
        text: 人工智能让开发更高效

    ================================ Tool Message ================================
    Name: get_current_datetime
    当前时间：2026 年 07 月 22 日 星期三

    ================================ Tool Message ================================
    Name: text_word_count
    文本有效字数为：10 字

    ================================ Ai Message ================================
    今天是 2026 年 07 月 22 日 星期三，"人工智能让开发更高效"这句话的有效字数为 10 字。

【执行结果解读】

invoke() 方法的返回值并非仅输出本次对话的最终一句话，而是存储了从本次提问发起至应答完成的完整消息数组。完整链路依次为：用户 Human 提问消息—携带工具调用标识的 AI 消息—两条工具返回 Tool 消息—整合信息后的最终 AI 应答消息。

将全部消息统一存入列表，能够完整追溯智能体全部思考、工具调用、数据返回环节，方便调试排查工具不执行、参数传错、输出异常等问题。

3）三类常用消息读取方式

（1）打印全部完整交互消息

所有消息类型（HumanMessage/AIMessage/ToolMessage/SystemMessage）都内置 pretty_print() 格式化打印方法，相比原生 print()，可以自动区分消息类型、清晰展示调用 ID、入参、返回内容，是 LangChain 专用调试方式：

    for m in result["messages"]:
        m.pretty_print()

（2）单独提取用户原始提问

消息列表首位固定为用户输入的 HumanMessage，通过下标 0 读取提问文本：

    result["messages"][0].content

（3）单独提取最终回复内容

经过工具调用、数据整合后的最终 AI 应答永远存放在 messages 列表末尾，使用下标 -1 快速获取结果：

    result["messages"][-1].content

## 4、流程图文字推演

### 智能体完整执行闭环流程

用户请求（request） --> 封装为 HumanMessage 消息 --> 传递至大模型推理核心（model） --> 结合历史记忆（memory）与系统提示进行语义理解与路径规划 --> 判断是否需要调用外部工具

需要外部数据 --> 输出 action 指令至外部工具集（tools） --> 工具执行并返回 observation 观测信息 --> 回传至模型

无需外部数据或已获取充足信息 --> 生成最终结构化应答（result） --> 对外反馈给用户 --> 同时完整交互消息存入记忆（memory） --> 完成一轮执行闭环

💡 **速记**

【核心考点】

典型智能体运行流程基于“感知-决策-执行”逻辑，核心模块包括：request（用户请求）、model（推理核心）、memory（记忆存储）、tools（工具执行集）、result（标准输出）。

create_agent 是 LangChain 中构建智能体的核心方法，核心参数包括 model（模型）、tools（工具列表）、system_prompt（系统提示）、checkpointer（检查点）、store（存储）。

【高频逻辑链】

智能体执行闭环：用户请求 --> 封装 HumanMessage --> 模型结合记忆与提示词决策 --> 判断是否需要工具 --> 调用工具获取观测数据 --> 整合结果生成应答 --> 存入记忆。

执行结果读取：`invoke()` 返回完整消息列表 --> `pretty_print()` 打印全流程（区分 Human/AI/Tool/System 消息） --> `[0].content` 提取原始提问 --> `[-1].content` 提取最终回复。

【关键避坑】

原生 LLM 存在训练数据时间截止点和文本估算不准确的两大幻觉缺陷，必须通过 Tools（工具）与系统提示词约束来弥补。

系统提示词（System Prompt）在智能体中具有最高优先级，是强制模型调用工具、杜绝幻觉的关键手段。

调试智能体时推荐使用 pretty_print() 而非普通 print()，以便清晰查看工具调用的 Call ID、入参和返回内容，快速定位工具不执行或参数传错的问题。
