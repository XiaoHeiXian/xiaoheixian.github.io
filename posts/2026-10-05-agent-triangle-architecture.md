---
layout: article
title: "基础智能体三角架构"
description: "- \"定义：最简无工具智能体统一由 Prompt、Model、Result 三大模块构成循环闭环。\"   - \"Prompt：承载角色定义与任务指令，是控制模型行为的唯一人工入口。\"   - \"Model：接收消息完成推理并生成原始输出文本，是整个三角架构的运算核心。\"   - \"Result：模型生成的原始应答，可反向作为历史消息存入记忆，形成循环优化"
date: 2026-10-05
category: "AI"
tags:
  - "微服务"
  - "AI大模型"
  - "LangChain"
  - "智能体"
permalink: /posts/2026-10-05-agent-triangle-architecture.html
---

所有最简无工具智能体统一由 Prompt 提示词、Model 模型、Result 结果三大模块构成循环闭环，三角流转逻辑如图 1 所示：

![架构示意图](https://xiaoheixian.github.io/posts/assets/312_65.png)

    Prompt
      |
      v
    Model --> Result --> Prompt (循环迭代)

图 2.2-1：基础智能体三角闭环架构

三者完整流转逻辑：

（1）Prompt 提示词：承载全部角色定义、任务指令、输出约束，通过标准化消息封装后传递至模型，是控制模型行为的唯一人工入口；

（2）Model 模型：接收全部消息与提示内容完成推理、生成原始输出文本，是整个三角架构的运算核心；

（3）Result 结果：模型生成的原始应答，既作为对外展示内容，也可反向作为 AI 历史消息存入记忆，参与下一轮对话的提示词构建，形成循环优化闭环。

三者单向流转、循环迭代，任意智能体、固定链路都不会脱离该三角底层逻辑，所有工具、记忆、结构化输出均为三角架构的拓展衍生模块。

【例 2.2-1】三角架构极简农业问答智能体

【程序代码】

    import os
    # 1. 构建提示词
    messages = [
        ("system","你是专业农业技术专家，所有回答简洁精炼，不添加多余铺垫文字。"),
        ("human","冬天下雪对来年农作物生长存在哪些有利影响？")
    ]

    # 2. 初始化标准化模型
    llm = ChatOpenAI(
        base_url=os.getenv("BASE_URL"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        model=os.getenv("CHAT_MODEL"),
        temperature=0.1
    )

    # 3. 模型执行，完成三角架构流转
    if __name__ == "__main__":
        result = llm.invoke(messages)
        print("三角架构标准化输出结果：")
        print(result.content)

本例通过提示词—模型—结果构建了一个极简的智能体，通过结果可循环优化闭环。若需要优化输出效果，仅需要修改 system 系统消息内的提示词规则，无需调整模型与调用逻辑，直观体现 Prompt 提示词在三角架构中的核心调控作用。

## 2.2.2 流程图文字推演

根据三角闭环架构图，智能体的基础执行链路可以推演如下：

构建 Prompt 提示词（包含 System 角色定义与 Human 任务指令） --> 封装为标准化消息（messages） --> 传递给 Model 模型 --> 模型完成推理并生成原始输出文本（Result） --> 结果作为对外展示内容返回给用户 --> 同时反向作为 AI 历史消息存入记忆 --> 参与下一轮对话的提示词构建 --> 形成循环优化闭环

💡 **速记**

【核心考点】

基础智能体的三角架构由 Prompt（提示词）、Model（模型）、Result（结果）三大模块构成，是所有最简无工具智能体的底层逻辑。

三者单向流转、循环迭代：Prompt 驱动 Model 生成 Result，Result 再作为历史记忆反哺下一轮 Prompt，形成闭环。

【高频逻辑链】

构建提示词（System + Human） --> 初始化模型（ChatOpenAI） --> 模型执行推理（invoke） --> 输出结果（Result） --> 结果存入记忆 --> 参与下一轮提示词构建。

【关键避坑】

在三角架构中，若需要优化输出效果，核心关键在于修改 System 提示词规则，无需调整模型参数或调用逻辑。这直观体现了 Prompt 在智能体行为控制中的核心调控作用。

System Prompt 用于设定全局角色与约束，Human Prompt 用于传递当前轮次的具体任务，二者优先级不同，不可混淆。
