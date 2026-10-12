---
layout: article
title: "大模型异步与流式处理体系"
description: "- \"核心能力：流式传输是构建高交互、低等待 AI 应用的关键，LangChain 统一提供 5 套调用接口。\"   - \"同步调用：invoke() 单次阻塞，batch() 批量并发，适合本地调试与离线任务。\"   - \"异步调用：ainvoke() 非阻塞高并发，astream() 流式打字机效果，abatch() 异步批量处理。\"   - \"流式"
date: 2026-10-12
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "异步"
  - "流式处理"
permalink: /posts/2026-10-12-llm-async-and-streaming.html
---

流式传输是构建高交互、低等待 AI 农业应用的核心能力。LangChain 中所有 Runnable 组件（LLM、Chain、Agent）统一提供同步/异步、单次/批量、流式 5 套标准调用接口，同时支持 3 种流式输出模式，适配本地调试、后端高并发、前端 SSE 实时聊天、工具日志监控全场景。

## 1 五大标准调用接口

所有 Agent、LLM、LCEL 链路共享同一套标准化调用接口，分为同步、异步两大类，覆盖单次、批量、流式场景。

### 1、同步单次 invoke() 调用

同步阻塞执行，等待整条链路执行完整执行完毕后一次性返回完整结果，适合本地脚本、离线调试、单次问答。

【例 1】Agent 五大标准调用方式

【程序代码】

    SYSTEM_PROMPT = """
    你是一个农业专家，能够根据用户输入的农业问题给出对应的回答。
    """
    agent = create_agent(model=llm,system_prompt=SYSTEM_PROMPT)
    # 同步单次调用
    if __name__ == "__main__":
        res = agent.invoke({"messages": "玉米每亩适宜种植密度？"})
        print(res["messages"][-1].content)

### 2、同步批量 batch() 调用

一次性传入多条用户提问，批量执行完整的生成流程，多条任务并行处理，适合批量问答、批量文档摘要、批量知识库检索场景。

    # 批量同步执行
    if __name__ == "__main__":
        batch_questions = [
            "小麦拔节期施肥方案",
            "玉米密植每亩多少株合适",
            "水稻稻田综合种养注意事项"
        ]
        # 将问题列表转换为字典列表
        batch_inputs = [{"messages": q} for q in batch_questions]
        # 执行批量调用
        batch_results = agent.batch(batch_inputs)
        # max_concurrency 控制并发请求数量，避免接口限流
        # batch_results = agent.batch(batch_inputs,config={"max_concurrency": 2})
        # 遍历打印结果
        for q, ans in zip(batch_questions, batch_results):
            print(f"【问题】{q}")
            print(f"【回答】{ans['messages'][-1].content}\n" + "-"*60)

### 3、异步单次 ainvoke() 调用

异步非阻塞执行完整链路，适配 FastAPI 后端、Web 服务高并发场景，不阻塞主线程，支持同时处理多条用户请求。

    import asyncio
    # 异步单次问答
    async def single_ainvoke(input:dict):
        ans = await agent.ainvoke(input)
        print(ans["messages"][-1].content)

    if __name__ == "__main__":
        question = "小麦抗旱拌种方法"
        input = {"messages": question}
        # Jupyter 内置支持直接执行 await 顶层协程，直接写 await 调用异步函数。
        await single_ainvoke(input)
        # .py 文件执行时，必须使用 asyncio.run() 函数执行异步程序。
        # asyncio.run(single_ainvoke(input))

### 4、异步流式 astream() 调用

异步逐块（分片）流式输出，打字机实时效果，对接前端 SSE 聊天窗口，边检索边分段返回文字，大幅降低用户等待感知。

如果希望直接获取 AIMessageChunk，可以在调用 astream 时指定 stream_mode="messages"：

    async def stream_astream(input: dict):
        # 异步循环读取分片
        async for chunk in agent.astream(input,stream_mode="messages"):
            # 此时 chunk 通常是 (AIMessageChunk, metadata) 元组,chunk[0] 为 AIMessageChunk 分片对象
            # end=""：打印后不换行，文字连续拼接
            # flush=True：强制刷新输出缓冲区，文字立刻打印，实现打字机实时效果；
            print(chunk[0].content, end="", flush=True)

    if __name__ == "__main__":
        question = "小麦拔节期钾肥施用注意事项"
        input = {"question": question}
        await stream_astream(input)

### 5、异步批量 abatch()

异步批量处理多条提问，高并发服务场景最优选择。

    from typing import List
    async def batch_abatch(questions: List[str]):
        results = await agent.abatch([{"messages": question} for question in questions])
        for question,result in zip(questions,results):
            print(f"【问题】：{question}")
            print(f"【回答】：\n{result['messages'][-1].content}")

    if __name__ == "__main__":
        questions = [
            "小麦拌种抗旱技巧",
            "玉米滴灌施肥方案"
        ]
        await batch_abatch(questions)

### 五种调用方式对比

在 LangChain 中，Chain、Agent、LLM 等核心组件的标准执行方法主要是五种调用方式，它们在输出形式、类型、适用场景上存在本质区别，如表 1 所示：

表 1 五种调用方式的区别

调用方法：invoke()

类型：同步单次

核心适用场景：本地调试、单次简单问答

输出特点：完整文本一次性返回

调用方法：batch()

类型：同步批量

核心适用场景：离线批量生成问答、批量摘要

输出特点：同步等待全部任务完成，返回结果列表

调用方法：ainvoke()

类型：异步单次

核心适用场景：Web 后端接口、高并发单用户请求

输出特点：非阻塞，后台执行，一次性返回完整回答

调用方法：astream()

类型：异步流式

核心适用场景：前端聊天实时打字效果

输出特点：逐 Token 分片实时输出

调用方法：abatch()

类型：异步批量

核心适用场景：后端批量高并发任务

输出特点：异步并行批量处理多条提问

## 2 三类流式输出模式

流式传输是构建高响应 AI 应用的核心能力。借助分片实时输出，无需等待完整响应生成，即可向用户推送内容，大幅优化用户体验。LangChain 提供三类独立流式输出模式，分别适配实时打字、工具进度日志、Agent 执行流程监控三大场景。

### 1、LLM Token 流式输出

（1）核心原理

大模型生成文本时不会等全部内容生成完毕再统一返回，每生成一组 Token 就实时通过流传输给客户端，实现边生成、边传输、边展示的打字机交互效果。

LangChain 中分片数据载体为 AIMessageChunk，是完整 AI 消息 AIMessage 的分片子类；在流式模式下，迭代器返回元组（AIMessageChunk, 元数据字典），通过 chunk[0].content 提取文本分片。

（2）关键约束

必须显式指定 stream_mode="messages"，否则无法获取 AIMessageChunk 对象。

在异步迭代时，必须使用 async for 逐块读取。

打印输出时，必须设置 end="" 取消自动换行，并设置 flush=True 强制刷新输出缓冲区，否则文字会积压在缓冲区无法实现打字机效果。

（3）代码示例

    async def stream_astream(input: dict):
        # 异步循环读取分片
        async for chunk in agent.astream(input, stream_mode="messages"):
            # 此时 chunk 通常是 (AIMessageChunk, metadata) 元组, chunk[0] 为 AIMessageChunk 分片对象
            # end=""：打印后不换行，文字连续拼接
            # flush=True：强制刷新输出缓冲区，文字立刻打印，实现打字机实时效果
            print(chunk[0].content, end="", flush=True)

    if __name__ == "__main__":
        question = "小麦拔节期钾肥施用注意事项"
        input = {"messages": question}
        await stream_astream(input)

### 2、Agent 执行流程流式输出

（1）核心原理

在复杂的 Agent 任务中，大模型不会直接给出最终答案，而是经历“思考 -> 调用工具 -> 获取结果 -> 再思考 -> 最终回答”的多步流程。

使用 stream_mode="updates" 模式，可以实时捕获 Agent 在每一步执行后的状态更新。例如，可以看到 Agent 决定调用哪个工具、传入什么参数、工具返回了什么原始数据。这不仅是流式输出，更是 Agent 执行流程的监控窗口。

（2）关键约束

指定 stream_mode="updates" 时，返回的是每一步节点的增量状态，而不是完整的对话历史。

数据结构通常为字典，键是节点名称，值是节点在这一步更新的数据（如包含 tool_calls 或 AIMessage 对象）。

（3）代码示例

    async def stream_agent_updates(input: dict):
        # 监听 Agent 执行过程的状态更新
        async for chunk in agent.astream(input, stream_mode="updates"):
            print("=== 当前步骤更新 ===")
            print(chunk)
            print("\n")

    if __name__ == "__main__":
        question = "查询北京今天的天气并告诉我该穿什么衣服"
        input = {"messages": question}
        await stream_agent_updates(input)

### 3、工具进度日志流式输出

（1）核心原理

当 Agent 调用了一个极其耗时的工具（如长文档解析、大批量数据检索、执行长时间的外部 API 调用）时，只展示 Token 或步骤更新是不够的，用户需要知道工具内部的进度。

通过 stream_mode="custom" 模式，结合 get_stream_writer() 方法，开发者可以在工具函数内部，自定义推送细粒度的进度日志（如“已完成 20% 解析”、“正在检索第 3 个文件”）。这些日志会实时发送给前端。

（2）关键约束

必须在工具函数或节点内部调用 get_stream_writer() 获取写入器。

写入的数据可以是任意可序列化的对象（字符串、字典等），但为了前端方便渲染，通常推荐使用结构化字典。

消费端需要指定 stream_mode="custom" 才能接收到这些自定义日志。

（3）代码示例

    from langchain_core.tools import tool
    from langgraph.config import get_stream_writer

    @tool
    def long_running_task(query: str):
        """
        模拟一个耗时的长任务，实时推送内部进度日志
        """
        writer = get_stream_writer()
        
        # 推送第一条进度日志
        writer({"progress": "10%", "message": "开始解析查询参数..."})
        
        # 模拟耗时操作
        import time
        time.sleep(1)
        
        # 推送第二条进度日志
        writer({"progress": "50%", "message": "正在检索核心数据源..."})
        time.sleep(1)
        
        # 推送第三条进度日志
        writer({"progress": "90%", "message": "正在生成最终摘要..."})
        time.sleep(1)
        
        return f"关于 {query} 的最终结果：已完成全部处理。"

    async def stream_tool_custom(input: dict):
        # 监听工具内部的自定义流式输出
        async for chunk in agent.astream(input, stream_mode="custom"):
            print(f"【工具进度】{chunk}")

    if __name__ == "__main__":
        question = "帮我执行长任务"
        input = {"messages": question}
        await stream_tool_custom(input)

## 3、流程图文字推演

### 五大调用接口执行流程

用户发起请求 --> 判断调用方式

同步单次 invoke() --> 阻塞等待全链路完成 --> 一次性返回完整文本

同步批量 batch() --> 并发执行多条任务 --> 全部完成后返回结果列表

异步单次 ainvoke() --> 非阻塞后台执行 --> 处理完成后返回完整回答

异步流式 astream() --> 循环读取 AIMessageChunk --> 逐 Token 实时输出至前端

异步批量 abatch() --> 高并发异步处理多条提问 --> 批量返回结果

### LLM Token 流式输出流程

LLM 生成 Token --> 封装为 AIMessageChunk --> 指定 stream_mode="messages" --> 异步迭代器返回 (AIMessageChunk, metadata) 元组 --> 提取 chunk[0].content --> 打印并设置 end="" 与 flush=True --> 前端实现打字机效果

### Agent 执行流程流式输出流程

Agent 接收用户提问 --> 进行思考与规划 --> 决定调用工具 --> 指定 stream_mode="updates" --> 异步迭代器返回每一步的增量状态字典 --> 解析字典中的 tool_calls 或 AIMessage --> 前端展示 Agent 当前思考步骤与工具调用详情

### 工具进度日志流式输出流程

Agent 决定调用耗时长工具 --> 工具内部调用 get_stream_writer() 获取写入器 --> 工具执行过程中多次调用 writer() 推送进度字典 --> 指定 stream_mode="custom" --> 异步迭代器捕获自定义进度字典 --> 前端渲染进度条或日志面板 --> 工具执行完毕后返回最终结果

💡 **速记**

【核心考点】

LangChain 的 Runnable 组件统一提供五种标准调用接口：invoke()、batch()、ainvoke()、astream()、abatch()。

同步调用（invoke、batch）适合本地调试与离线任务；异步调用（ainvoke、abatch）适合 Web 后端与高并发；流式调用（astream）适合前端实时聊天。

三类流式输出模式分别对应不同的 stream_mode 参数：messages（Token 级）、updates（步骤级）、custom（工具日志级）。

【高频逻辑链】

调用方式选择：本地单次调试用 invoke -> 批量离线摘要用 batch -> Web 高并发用 ainvoke -> 前端打字机效果用 astream -> 后端批量高并发用 abatch。

流式实现链路：LLM 生成 Token -> 封装 AIMessageChunk -> 设置 stream_mode="messages" -> 异步循环遍历 -> 提取 chunk[0].content -> 打印时设置 end="" 与 flush=True。

Agent 流程监控：stream_mode="updates" -> 捕获每一步节点增量状态 -> 展示工具调用与思考过程。

工具进度日志：工具内 get_stream_writer() -> writer() 推送进度字典 -> stream_mode="custom" 捕获 -> 前端渲染。

【关键避坑】

在 .py 文件中执行异步函数必须使用 asyncio.run()，而在 Jupyter Notebook 中可直接使用 await 顶层协程。

使用 astream() 时必须指定 stream_mode="messages" 才能获取 AIMessageChunk 对象，否则可能返回其他类型的流式块。

打印流式输出时，必须设置 end="" 取消自动换行，并设置 flush=True 强制刷新输出缓冲区，否则无法实现打字机实时效果。

使用 custom 模式时，必须配合 get_stream_writer()，否则工具内部的日志无法被外部流式接口捕获。

updates 模式返回的是增量状态，而不是完整上下文，解析时需要注意数据结构的嵌套层级。
