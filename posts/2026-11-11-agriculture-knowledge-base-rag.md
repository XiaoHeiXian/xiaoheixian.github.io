---
layout: article
title: "综合案例：农业知识库智能问答"
description: "概述：面向农业领域的智能问答系统，支持多轮对话、私有库优先、通用库兜底。 架构：基于 LangChain 搭建智能体，FastAPI 提供 SSE 流式接口，原生 JS 渲染打字机效果。 流程：输入问题 -> 检索私有知识库 -> 无匹配调用通用工具 -> 大模型流式输出。 优势：全异步架构响应快，工具调度策略灵活，基于 session_id 实现会话隔离。 优化：引入 RAG 检索增强替代硬编码字典，使用 Redis 持久化记忆，改用 POST 发起流式请求。"
date: 2026-11-11
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "FastAPI"
  - "SSE"
  - "RAG"
permalink: /posts/2026-11-11-agriculture-knowledge-base-rag.html
---

## 2.6 综合案例

### 2.6.1 系统功能概述

本项目搭建一套面向农业领域的智能问答原型系统，支持多轮对话记忆、私有知识库优先查询、通用知识兜底回答。

前端效果图展示：
    农业知识库智能问答
    （快捷提问按钮：水稻稻瘟病、小麦蚜虫、黄瓜霜霉病、脐橙施肥）
    用户输入：把我刚才询问的问题再回答一次
    系统回复：水稻稻瘟病防治措施如下：
    1. **药剂防治** - 发病初期喷施三环唑，或选用稻瘟灵、咪鲜胺等药剂，重点喷施叶片正反面。分蘖期防叶瘟，抽穗期防穗颈瘟，需根据病情发展及时施药。
    2. **田间管理** - 及时排水降湿，避免田间积水；合理施肥，忌偏施氮肥，增施磷钾肥增强抗病性。
    3. **防控重点** - 分蘖期密切巡查叶瘟症状（叶片出现褐色病斑），发现后立即处理。抽穗期加强穗颈瘟预防，结合药剂防治与田间检查同步进行。
    **小贴士**：播种前进行种子药剂处理（如浸种或包衣）可预防病害传播。高温高湿天气易诱发病害，需提前监测并做好预防。轮作非稻瘟病作物（如豆类、蔬菜）可降低病菌积累风险。
    （提示：以上信息仅供参考，具体种植请结合当地实际情况。）
    （来源标识：历史知识库）
    （状态：✅ 回答完成）

#### 1、核心业务流程

用户输入农业问题 -> 服务接收请求 -> 智能体优先检索私有农业知识库 -> 无匹配则调用通用农业知识工具 -> 大模型结果通过 SSE 实时流式推送前端 -> 前端逐字符打字机效果展示回答。

#### 2、主要功能模块

（1）FastAPI 流式接口服务：基于 SSE 协议提供长连接流式问答接口，支持跨域访问、异常捕获、会话隔离。

（2）LangChain 农业智能体：内置双工具调度策略，强制优先使用私有知识库，搭配大模型实现工具调用；基于内存实现多轮对话上下文记忆。

（3）前端交互页面：原生 HTML+JS 实现聊天界面，支持快捷提问、回车发送、请求中断、打字机动画，本地存储会话 ID 区分用户对话。

#### 3、设计优势

（1）全异步架构：异步接口搭配智能体异步流式输出，资源利用率高，响应速度快。

（2）成熟流式交互：基于标准 SSE 实现打字机效果，交互体验接近主流大模型对话产品。

（3）灵活工具调度策略：固化业务规则——私有内部知识库优先，通用知识兜底，贴合企业内部资料优先使用场景。

（4）会话隔离机制：通过 session_id 区分不同用户对话，支持多轮上下文连续问答。

#### 4、现存不足与优化方案

（1）知识库模块

现状：私有知识库采用硬编码字典存储，仅简单字符串匹配，无法承载大量文档，不支持 PDF、文档文件导入。

优化方案：接入 RAG 检索增强生成架构，实现文档加载、文本分割、Embedding 向量化、向量数据库相似度检索，替代现有简易匹配逻辑。

（2）会话记忆

现状：基于内存存储对话记录，服务重启数据丢失，不支持多实例分布式部署。

优化方案：替换为 Redis Checkpointer，实现对话持久化，支持集群部署。

（3）流式接口设计

现状：SSE 采用 GET 请求，长问题存在 URL 长度限制；后端添加人为延时模拟打字效果，占用服务资源。

优化方案：改用 POST 传输提问内容；删除后端 sleep 延时，打字动画逻辑统一交由前端控制。

### 2.6.2 编码实现

#### 1、LangChain 农业智能体

代码内置双工具调度策略，强制优先使用私有知识库，搭配大模型实现工具调用；基于内存实现多轮对话上下文记忆。文件名：agri_agent.py

    # 文件名: agri_agent.py
    import os
    import asyncio
    from dotenv import load_dotenv
    from langchain_openai import ChatOpenAI
    from langchain.tools import tool
    from langchain.agents import create_agent
    from langgraph.checkpoint.memory import InMemorySaver
    from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
    from pydantic import BaseModel, Field

    # 1. 加载环境变量 & 初始化大模型
    load_dotenv(override=True)

    llm = ChatOpenAI(
        base_url=os.getenv("BASE_URL"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        model=os.getenv("CHAT_MODEL"),
        temperature=0.1,
        streaming=True # 启用流式
    )

    # 2. 自定义双工具
    @tool
    def query_private_agri_db(question: str) -> str:
        """
        【优先级最高】查询私有农业知识库
        """
        private_knowledge_base = {
            "水稻稻瘟病防治": "发病初期喷施三环唑，田间排水降湿，避免偏施氮肥；分蘖期重点巡查叶瘟，抽穗期防穗颈瘟。",
            "赣南脐橙施肥方案": "春季萌芽肥高氮，膨果期氮磷钾均衡，采果后施有机肥恢复树势，忌夏季单一尿素。",
            "小麦蚜虫特效药": "吡虫啉、噻虫嗪，清晨施药，重点喷洒叶片背面，连片农田统一防治。",
            "大棚黄瓜霜霉病": "控温 22-26℃，降低棚内湿度，药剂可选霜霉威盐酸盐，7 天一次轮换用药。"
        }

        match_content = ""
        for key, val in private_knowledge_base.items():
            if key[:4] in question or question[:4] in key:
                match_content = val
                break

        if match_content:
            return f"【私有知识库数据】 {match_content}"
        else:
            return "无匹配数据"

    @tool
    def general_agri_knowledge(question: str) -> str:
        """
        兜底工具：私有知识库无匹配内容时调用
        """
        return f"【通用农业常识】 请基于全国主流种植技术回答问题：{question}，内容客观、无编造，区分南北方种植差异。"

    # 3. 系统提示词
    SYSTEM_PROMPT = """
    你是专业农业知识问答助手，严格遵守工具调用顺序规则：
    1. 用户提问后，必须先调用 query_private_agri_db 私有知识库工具
    2. 若私有工具返回无匹配数据：再调用 general_agri_knowledge 通用工具
    仅基于工具返回数据或历史记忆回答，禁止编造额外信息，禁止 AI 幻觉！
    输出格式：简洁专业的农业解答，包含必要的小贴士。
    """

    # 4. 组装带记忆农业智能体
    checkpointer = InMemorySaver()
    agri_agent = create_agent(
        model=llm,
        tools=[query_private_agri_db, general_agri_knowledge],
        system_prompt=SYSTEM_PROMPT,
        checkpointer=checkpointer
    )

    # 5. 流式入口
    async def agri_stream_chat(user_question: str, session_id: str = "agri_chat_001"):
        config = {"configurable": {"thread_id": session_id}}
        input_msg = {"messages": [HumanMessage(content=user_question)]}

        # 用于追踪状态
        full_answer = ""
        source = "history_know"
        tool_used = False

        async for chunk in agri_agent.astream(
            input_msg,
            config=config,
            stream_mode="messages"
        ):
            try:
                # 处理元组格式 (message, metadata)
                if isinstance(chunk, tuple) and len(chunk) >= 1:
                    msg = chunk[0]
                    metadata = chunk[1] if len(chunk) > 1 else {}

                    # 捕获工具返回消息
                    if isinstance(msg, ToolMessage) and msg.content:
                        content = msg.content
                        print(f"工具返回: {content[:100]}...")

                        # 判断来源
                        if "【私有知识库数据】" in content:
                            source = "private_db"
                            # 提取纯答案
                            answer = content.replace("【私有知识库数据】", "").strip()
                            full_answer = answer
                            tool_used = True
                            # 直接发送工具结果
                            yield {"type": "tool_result", "content": answer, "source": source}
                        elif "【通用农业常识】" in content:
                            source = "general_tool"
                            # 通用工具通常只返回提示词，不直接输出，交由 LLM 生成
                            tool_used = True
                            yield {"type": "status", "content": "正在查询通用农业常识..."}

                    # 处理大模型生成内容
                    elif isinstance(msg, AIMessage) and msg.content:
                        # 如果不涉及工具调用，或者是最终生成的回答
                        if not tool_used or source == "general_tool":
                            full_answer += msg.content
                            yield {"type": "text", "content": msg.content, "source": source}

            except Exception as e:
                print(f"流式处理异常: {e}")
                yield {"type": "error", "content": "处理请求时发生异常，请稍后重试。"}

        # 结束后返回最终聚合的完整答案（可选）
        yield {"type": "done", "content": full_answer, "source": source}

#### 2、FastAPI 流式接口服务

在 `main.py` 中提供 SSE 接口：

    # 文件名: main.py
    from fastapi import FastAPI, Query, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import StreamingResponse
    from pydantic import BaseModel
    import json
    from agri_agent import agri_stream_chat

    app = FastAPI()

    # 跨域配置
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class ChatRequest(BaseModel):
        question: str
        session_id: str = "default_session"

    @app.post("/api/chat")
    async def chat_endpoint(request: ChatRequest):
        """
        使用 POST 接收问题，SSE 返回流式数据
        """
        async def event_generator():
            try:
                async for chunk in agri_stream_chat(request.question, request.session_id):
                    # 格式化为 SSE 要求的数据格式
                    yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
            except Exception as e:
                error_data = {"type": "error", "content": str(e)}
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

#### 3、前端交互页面 (原生 HTML+JS)

由于我们使用 POST 请求 SSE，原生 `EventSource` 不支持 POST，因此前端使用 `fetch` 配合 `ReadableStream` 读取流式数据：

    <!-- 文件名: index.html -->
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>农业知识库智能问答</title>
        <style>
            /* 简单的聊天界面样式 */
            body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            #chat-box { border: 1px solid #ccc; height: 500px; overflow-y: auto; padding: 10px; margin-bottom: 10px; }
            .message { margin-bottom: 10px; padding: 10px; border-radius: 5px; }
            .user-msg { background-color: #e3f2fd; text-align: right; }
            .bot-msg { background-color: #f1f8e9; text-align: left; white-space: pre-wrap; }
            .source-tag { font-size: 12px; color: #888; margin-top: 5px; }
            #input-area { display: flex; gap: 10px; }
            #question-input { flex: 1; padding: 10px; }
            #send-btn { padding: 10px 20px; }
        </style>
    </head>
    <body>
        <h1>🌾 农业知识库智能问答</h1>
        <div id="chat-box"></div>
        <div id="input-area">
            <input type="text" id="question-input" placeholder="请输入您想咨询的农业问题..." />
            <button id="send-btn" onclick="sendMessage()">发送</button>
        </div>

        <script>
            // 生成或获取本地会话 ID
            let sessionId = localStorage.getItem("chat_session_id");
            if (!sessionId) {
                sessionId = "session_" + Date.now();
                localStorage.setItem("chat_session_id", sessionId);
            }

            async function sendMessage() {
                const inputEl = document.getElementById("question-input");
                const question = inputEl.value.trim();
                if (!question) return;

                // 渲染用户消息
                appendMessage("user", question);
                inputEl.value = "";
                document.getElementById("send-btn").disabled = true;

                // 准备机器人消息容器
                const botMsgDiv = appendMessage("bot", "");
                const sourceDiv = document.createElement("div");
                sourceDiv.className = "source-tag";
                botMsgDiv.appendChild(sourceDiv);

                try {
                    // 使用 fetch 发起 POST 请求获取流
                    const response = await fetch("http://localhost:8000/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ question: question, session_id: sessionId })
                    });

                    if (!response.ok) throw new Error("网络请求失败");

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder("utf-8");
                    let buffer = "";

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n\n");
                        // 保留最后一段未完整的数据
                        buffer = lines.pop();

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const dataStr = line.replace("data: ", "");
                                const data = JSON.parse(dataStr);

                                if (data.type === "text" || data.type === "tool_result") {
                                    // 打字机效果追加文本
                                    typeWriter(botMsgDiv, data.content);
                                    if (data.source) {
                                        updateSourceTag(sourceDiv, data.source);
                                    }
                                } else if (data.type === "error") {
                                    botMsgDiv.innerText += "\n[异常]: " + data.content;
                                } else if (data.type === "done") {
                                    document.getElementById("send-btn").disabled = false;
                                }
                            }
                        }
                    }
                } catch (error) {
                    botMsgDiv.innerText = "请求发生错误：" + error.message;
                    document.getElementById("send-btn").disabled = false;
                }
            }

            // 回车发送
            document.getElementById("question-input").addEventListener("keypress", function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    sendMessage();
                }
            });

            function appendMessage(role, text) {
                const chatBox = document.getElementById("chat-box");
                const div = document.createElement("div");
                div.className = `message ${role === 'user' ? 'user-msg' : 'bot-msg'}`;
                div.innerText = text;
                chatBox.appendChild(div);
                chatBox.scrollTop = chatBox.scrollHeight;
                return div;
            }

            // 简单的打字机效果实现
            function typeWriter(element, text) {
                let i = 0;
                function type() {
                    if (i < text.length) {
                        // 兼容文本节点与标记结构
                        element.childNodes[0].nodeValue += text.charAt(i);
                        i++;
                        document.getElementById("chat-box").scrollTop = document.getElementById("chat-box").scrollHeight;
                        setTimeout(type, 20); // 控制打字速度
                    }
                }
                // 如果元素还没有文本节点，先加一个
                if (element.childNodes.length === 0) {
                    element.appendChild(document.createTextNode(""));
                }
                type();
            }

            function updateSourceTag(element, source) {
                let tagText = "";
                if (source === "private_db") tagText = "📚 历史知识库";
                else if (source === "general_tool") tagText = "🌐 通用农业常识";
                else if (source === "history_know") tagText = "🧠 上下文记忆";
                element.innerText = "来源：" + tagText;
            }
        </script>
    </body>
    </html>

### 2.6.3 流程图文字推演

#### 核心问答交互流程

用户在前端输入问题（如：水稻稻瘟病怎么治） --> 前端构造包含 session_id 的 POST 请求发往 FastAPI --> FastAPI 验证请求，开启 SSE 流式响应

后端 LangChain Agent 开始执行：
    --> 接收输入，检查内存中的历史记录（Checkpointer）
    --> 根据 System Prompt 强制调用私有知识库工具
    --> 私有库工具返回匹配数据（或返回无匹配）
    --> 如果无匹配，Agent 自动调用通用农业知识工具
    --> 大模型基于工具返回结果生成最终回答

FastAPI 将大模型生成的增量文本（Tokens）持续推送给前端 --> 前端利用 ReadableStream 持续接收 SSE 数据包 --> JS 利用 typeWriter 函数将文本逐字渲染到页面 --> 根据 metadata 中的来源字段更新 UI 标签（如“历史知识库”） --> 接收完毕，渲染完成，允许下一次提问

## 💡 **速记**

【核心考点】

AI 智能体综合实战：结合 LangChain 的多工具调度（私有库+通用兜底）、内存记忆（Checkpointer）以及 FastAPI 的 SSE（Server-Sent Events）流式接口，打造丝滑的智能问答体验。

核心技术点：基于 `@tool` 装饰器定义业务工具，依靠 System Prompt 约束工具调用顺序；利用 `astream` 实现异步流式输出；前端通过 `fetch` + `ReadableStream` 处理流式文本。

优化方向（进阶考点）：将硬编码字典升级为 RAG（检索增强生成）架构；将内存记忆替换为 Redis 持久化；优化接口设计，采用 POST 解决 URL 长度限制，并交由前端处理打字机动画以节省后端资源。

【高频逻辑链】

用户提问 --> 触发 Agent --> 优先查私有知识库 --> 无匹配查通用知识库 --> 大模型生成 --> SSE 流式推送 --> 前端接收渲染打字机效果。

【关键避坑】

原生 `EventSource` API 仅支持 GET 请求。如果在 SSE 场景中需要携带大量数据（如长文本提问），必须使用 POST 请求结合 `fetch` 读取流（ReadableStream），或者在 URL 中携带 Token 鉴权。

后端使用 `stream_mode="messages"` 时，需特别注意过滤出属于最终回答的文本片段（如忽略中间状态的 ToolMessage），避免前端重复渲染工具原始数据。
