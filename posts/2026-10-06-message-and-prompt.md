---
layout: article
title: "消息与提示词核心机制"
description: "- \"提示词：连接开发者与模型的核心媒介，具备角色定义、任务指令、格式约束与逻辑引导四大价值。\"   - \"消息：LangChain 交互的最小标准化单元，承载提示词并区分对话角色。\"   - \"四大消息：SystemMessage、HumanMessage、AIMessage、ToolMessage，优先级与生命周期各不相同。\"   - \"消息创建：支"
date: 2026-10-06
category: "AI"
tags:
  - "微服务"
  - "AI大模型"
  - "LangChain"
  - "提示词"
permalink: /posts/2026-10-06-message-and-prompt.html
---

## 1、什么是提示词

提示词（Prompt）是连接开发者、用户与大模型的核心交互媒介，是 AI 可控开发的第一核心要素，没有标准化提示词，模型输出将完全随机、不可复用、无法落地工程场景。

其核心作用可总结为四大核心价值：

- 角色定义：赋予模型专属身份与能力边界，明确模型可以做什么、禁止做什么，从根源约束模型行为，杜绝无效输出与幻觉内容。
- 任务指令：清晰传递用户核心需求、任务目标、执行步骤，解决模型语义理解偏差、需求拆解错误的问题。
- 格式约束：统一输出格式、排版规范、内容长度，让模型自由文本转化为标准化可复用内容，适配项目开发。
- 逻辑引导：引导模型遵循固定推理逻辑、思考步骤，提升答案精准度、逻辑性，适配复杂任务执行。

如【例 2.1-1】的提示词：

    你是专业的 Python 编程助教。
    【强制硬性规则，绝对不可违反】
    1. 只允许回答 Python 编程、代码语法、Python 实操相关问题
    2. 所有非 Python 相关问题，必须直接固定回复：抱歉，我仅可解答 Python 基础编程问题，不支持该类需求。
    3. 禁止强行作答、禁止跨界创作、禁止自作主张回答无关内容

【例 2.1-2】的提示词：

    你是专业天气预报助手，仅可调用 get_weather_for_location 工具查询城市天气，严格遵循规则：
    1. 用户询问任意城市天气，必须调用工具获取实时数据，禁止编造气温、天气状况；
    2. 工具返回结果后，按照指定结构化格式整理输出；
    3. 无对应城市数据如实告知，禁止虚构天气信息；
    4. 可结合上下文记忆回答用户追问。
    可用工具：get_weather_for_location（输入中文城市名，返回近 3 天分段天气）

提示词是零成本优化模型效果的核心手段，无需微调模型、无需算力投入，仅通过话术优化即可大幅提升智能体精准度、可控性、稳定性。

## 2、什么是消息

### （1）消息定义

消息是 LangChain 框架中和 LLM 交互的最小标准化单元，每条消息固定包含角色标识、文本内容、交互元数据三部分，区分对话来源，是提示词的标准化承载容器。普通纯文本字符串无角色区分，无法留存多轮上下文；而结构化消息可精准划分系统、用户、AI、工具四类对话身份，支撑完整多轮交互记忆。

### （2）消息与提示词从属关系

在 LangChain 及大语言模型（LLM）的交互体系中，提示词（Prompt）和消息（Message）是紧密关联但层次不同的概念，二者的关系可以概括为：消息是承载提示词的结构化载体，提示词是消息中传递给模型的核心指令内容。

- 提示词（Prompt）：传递给模型的指令、问题、上下文信息的总和。明确模型的任务目标，引导模型生成预期输出。如自然语言文本（写一篇关于 AI 的短文）。
- 消息（Message）：LangChain/LLM 交互中标准化的通信格式，包含角色、内容等元数据，区分对话角色（用户 / 工具 / 系统），携带上下文历史，让模型理解对话逻辑。如结构化对象（HumanMessage/AIMessage）。

提示词是写入消息内部的指令文本，消息是承载提示词的结构化外壳；一段提示词不能脱离消息单独实现角色区分，一条消息内部必然包含对应提示内容。在 LangChain 的对话式交互中，用户输入的提示词会被封装成 HumanMessage，而模型的输出会被封装成 AIMessage。

## 3、四大标准消息类型

LangChain 定义了四类标准交互消息，各类消息的优先级、生命周期等核心属性如表 2.2-1 所示：

表 2.2-1 四类消息核心区分对照表

- 消息类型：系统消息
  类名：SystemMessage
  优先级：最高
  生命周期：整段对话全程永久生效，不会随单次提问消失
  核心使用场景：定义智能体身份、硬性禁止行为、统一输出格式

- 消息类型：用户消息
  类名：HumanMessage
  优先级：中等
  生命周期：单次提问临时生效，本轮对话结束后转为历史记录
  核心使用场景：承载用户实时提问、补充需求、额外指令

- 消息类型：AI 消息
  类名：AIMessage
  优先级：普通
  生命周期：存入记忆长期留存，仅作为上下文参考
  核心使用场景：存储模型上一轮完整应答内容

- 消息类型：工具消息
  类名：ToolMessage
  优先级：普通
  生命周期：单次工具调用后临时生效，本轮交互结束归档
  核心使用场景：存储网络、接口工具返回的原始观测数据

SystemMessage 优先级永久高于 HumanMessage，即便用户输入反向要求，模型也会优先执行系统内全部约束，这也是【例 2.1-1】可以拦截作文提问的底层原理。

## 4、消息三种标准化创建写法

（1）文本提示

纯文本简易提示，仅适用于单轮无上下文极简问答，无法区分角色：

    result = llm.invoke("写一段 Java 标准 HelloWorld 代码")

（2）消息对象创建

创建结构化消息对象，规范工程实训标准写法，可读性强：

    from langchain_core.messages import SystemMessage,HumanMessage

    system_msg = SystemMessage("你是农业病虫害科普专家，回答简短通俗")
    human_msg = HumanMessage("桔子黑点病如何提前预防？ ")
    msg_list = [system_msg, human_msg]
    result = llm.invoke(msg_list)

（3）角色方式创建

你还可以用字典的格式来区分角色，消息通过 role 字段（如 system/human/ai）明确文本的来源，模型会根据角色差异处理提示词：

    messages = [
        {"role":"system","content":"你是农业病虫害科普专家，回答简短通俗"},
        {"role":"human","content":"桔子黑点病如何提前预防？ "}
    ]
    result = llm.invoke(msg_list)

或者用元组格式来区分角色：

    messages = [
        ("system", "你是农业病虫害科普专家，回答简短通俗"),
        ("human", "桔子黑点病如何提前预防？ ")
    ]
    result = llm.invoke(messages)

## 5、AIMessage

模型调用后返回的 AIMessage 对象包含全套交互信息，除核心 content 应答文本外，还包含 token 消耗、调用 ID、工具调用标识等元数据，完整字段含义如表 2.2-2 所示：

表 2.2-2 AIMessage 元数据说明

- 属性名：content
  类型：str / list
  说明：AI 生成的核心内容。
  文本响应：直接为字符串。
  多模态响应：列表形式（如 [{"type": "text", "text": "这是图片描述"}, {"type": "image_url", "image_url": "xxx"}]）。

- 属性名：additional_kwargs
  类型：dict
  说明：扩展参数字典，用于存储模型特定的额外信息。
  模型是否拒绝回答：{"refusal": None}
  工具调用：{"function_call": {"name": "search", "arguments": {"query": "天气"}}}
  多模态元数据：{"image_width": 800, "image_height": 600}
  模型自定义参数：{"temperature": 0.7, "top_p": 0.9}。

- 属性名：response_metadata
  类型：dict
  说明：模型响应的元数据（LangChain 自动填充）。
  token_usage：token 消耗（大模型按 token 计费的依据）。completion_tokens 模型生成回答消耗的 token 数（输出 token）。prompt_tokens 你的提问消耗的 token 数（输入 token）。total_tokens 总消耗 token 数（输入 + 输出）。
  id：本次调用的唯一标识（可用于排查调用问题）。
  model_name：生成模型名称（如 "Qwen/Qwen3-8B"）。
  response_time：响应耗时（秒）。
  finish_reason：模型停止原因。

- 属性名：id
  类型：str
  说明：消息唯一标识（默认自动生成 UUID），用于对话历史追踪和去重。

- 属性名：tool_calls
  类型：list
  说明：模型生成的有效工具调用指令。

- 属性名：invalid_tool_calls
  类型：list
  说明：模型生成的无效工具调用指令。

- 属性名：usage_metadata
  类型：dict
  说明：LangChain 标准化的 token 消耗统计，和 response_metadata 中的 token_usage 内容一致。

AIMessage 元数据中的 Token 是 AI 认识世界的最小“文字碎片”。就像我们人类学语言要先认识字一样，AI 大模型看不懂完整的句子，它只能看懂被切碎后的“最小意义单元”。这个最小单元，就是 Token。LLM 的训练、推理、上下文限制、成本计费，全部围绕 Token 展开。

举个具体的例子：

英文单词 "unhappiness" 可能被拆成 ["un", "happi", "ness"] 三个 Token。

中文句子“今天天气真好” 可能被拆成 ["今", "天", "天", "气", "真", "好"] 六个 Token。

换算公式：一般来说，1 个 Token ≈ 1.5~2 个汉字。也就是说，一篇 1000 字的文章，大约会消耗 1500~2000 个 Token。

因为 AI 模型会区分消息的来源（是人发的、系统指令、还是 AI 自己发的），所以我们可以手动造一条“AI 风格的回复”插入对话记录，让模型后续处理时把这条“假”回复当成真实上下文，从而达到特定目的。比如你希望 AI 按固定话术回复，先手动插入一条符合要求的 AIMessage 到历史里，模型后续会参考这条“假回复”的风格 / 内容，输出更符合预期的结果。例如：

    # 第二轮对话
    if __name__ == "__main__":
        messages_again = [
            ("ai","如果你要购买桔子，我会告诉你挑选没有黑点病桔子的方法"),
            ("human","我想买 1 公斤桔子")
        ]
        result_again = llm.invoke(messages_again)
        print(result_again.content)

在提示词前添加一条 AIMessage，当模型处理“我想买 1 公斤桔子”这个问题时，会以为“如果你要购买桔子，我会告诉你挑选没有黑点病桔子的方法”这句话是它自己之前说的，它就会将挑选的方法告诉你。

如果在提示词前没有添加 AIMessage，它回复的问题就不会是挑选桔子的问题了，可能购买渠道和价格之类的信息。

## 6、消息模板

LangChain 的消息模板（Message Templates）是标准化 Prompt 结构、动态填充变量、支持多角色对话（System/Human/Assistant）的核心工具，适用于单轮生成、多轮对话、工具调用等场景。

LangChain 中消息模板主要是 ChatPromptTemplate（对话型模板），支持动态变量填充、局部参数预填充，适配多场景批量生成需求，是工业级提示词标准化方案。

1）消息点位符

使用 {变量名} 作为动态填充标记，运行时传入参数替换对应文本。

2）创建模板方法

（1）from_template()：只用单一段文本创建简易模板，适合单条简单提示。

    prompt = ChatPromptTemplate.from_template("给我写{num}句{style}宣传语")

（2）from_messages()：按 system、user 等多角色消息结构创建模板，适合多轮对话提示。

    prompt = ChatPromptTemplate.from_messages([
        ("system", "你是{type}专家，回答简短"),
        ("human", "讲解{topic}基础知识")
    ])

3）填充变量方法

（1）format_messages(**kwargs)：一次性传入所有变量，完整渲染生成消息列表。

【例 2.2-2】农产品文案提示词模板

【程序代码】

    from langchain_core.prompts import ChatPromptTemplate

    # 分层模板，系统模板+用户模板，内置动态变量
    system_template = "你是农产品电商文案师，生成{times}条{style}风格宣传文案，文字简短适配短视频平台"
    human_template = "产品名称：{product_name}，核心卖点：{key_features}，目标受众：{target_audience}"

    # 组装对话提示模板
    chat_prompt = ChatPromptTemplate.from_messages([
        ("system", system_template),
        ("user", human_template)
    ])

    if __name__ == "__main__":
        # 模式 1：完整填充全部变量
        full_msg = chat_prompt.format_messages(
            times=5,
            style="治愈温柔",
            product_name="赣南脐橙",
            key_features="果肉脆嫩汁水充足",
            target_audience="学生、中老年群体"
        )
        res1 = llm.invoke(full_msg)
        print("脐橙文案：\n", res1.content)

（2）format(**kwargs)：一次性传入所有变量，完整渲染生成消息字符串。

与 format_messages 的区别如表 2.2-3 所示：

表 2.2-3 format_messages 与 format 对比

- 方法：format_messages
  返回类型：List[BaseMessage]（消息对象列表）
  核心用途：直接传入 LLM 的 invoke 方法，保留角色等元数据，支持多轮对话逻辑。
  适用场景：LangChain 智能体开发的标准做法。

- 方法：format
  返回类型：str（纯文本字符串）
  核心用途：仅需要拼接提示词文本，传递给非 LangChain 组件或进行字符串展示。
  适用场景：与其他框架集成或纯文本提示词场景。

## 7、流程图文字推演

### 消息与提示词渲染执行流程

定义 ChatPromptTemplate 模板（含 System 与 User 角色） --> 使用 {变量名} 占位 --> 调用 format_messages() 并传入参数 --> 渲染生成结构化消息对象列表 [SystemMessage, HumanMessage] --> 传入 llm.invoke() 执行 --> 模型返回 AIMessage 对象（包含 content 与元数据） --> 提取 content 作为最终输出。

### 消息角色流转与优先级控制流程

定义 SystemMessage（全局人设与硬性规则） --> 定义 HumanMessage（用户当前轮次提问） --> 组合为消息列表传入模型 --> 模型内部按优先级处理：SystemMessage 优先级最高，约束 HumanMessage --> 生成 AIMessage 回复 --> 将 AIMessage 存入历史记忆 --> 参与下一轮消息列表构建，形成闭环。

💡 **速记**

【核心考点】

提示词是连接开发者与模型的核心媒介，具备角色定义、任务指令、格式约束、逻辑引导四大价值。

消息是承载提示词的结构化容器，LangChain 定义四大标准消息：SystemMessage（最高优先级，全局生效）、HumanMessage（用户提问）、AIMessage（模型回复）、ToolMessage（工具返回数据）。

SystemMessage 优先级永久高于 HumanMessage，这是系统提示词能拦截越界提问的底层原理。

【高频逻辑链】

消息与提示词关系：提示词（指令内容） --> 封装进消息（结构化外壳） --> 区分角色（system/human/ai/tool） --> 传入模型执行。

模板渲染流程：ChatPromptTemplate.from_messages() --> 传入变量 --> format_messages() 或 format() --> 生成消息列表或字符串 --> llm.invoke()。

【关键避坑】

纯文本字符串无法区分角色，无法留存多轮上下文，无法实现复杂的多轮对话记忆，工程中必须使用结构化消息对象或模板。

Token 是模型计费和上下文长度的计量单位，1 Token 约等于 1.5~2 个汉字，需注意上下文窗口的 Token 限制。

可以通过手动构造 AIMessage 插入历史记录，引导模型按预期风格或内容进行回复，利用模型对消息来源的区分机制。
