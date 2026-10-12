---
layout: article
title: "Runnable 组件"
description: "- \"核心抽象：所有能被管道串联的组件，本质上都是 Runnable。\"   - \"统一接口：实现 Runnable 接口即拥有 invoke、stream、batch 方法。\"   - \"管道兼容：只有 Runnable 组件才能用管道符语法串联。\"   - \"基础组件：内置提示词模板、聊天模型、解析器均为 Runnable。\"   - \"自定义组件："
date: 2026-10-12
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "Runnable"
  - "组件"
permalink: /posts/2026-10-12-langchain-runnable-components.html
---

Runnable 是 LangChain 框架的核心抽象，简单来说，所有能被管道（|）串联的组件，本质上都是 Runnable。它定义了统一的接口（invoke()/stream()/batch()），让不同功能的组件（提示词、模型、工具、解析器等）能像“乐高积木”一样灵活组合，这也是“|”语法构建调用链的底层基础。

## 1、Runnable 核心作用

1）统一接口：

无论是什么组件（模型、提示词、自定义函数），只要实现 Runnable 接口，就拥有 invoke()（单次调用）、stream()（流式输出）、batch()（批量调用）方法；

2）管道兼容：

只有 Runnable 组件才能用“|”语法串联，保证“前一个输出就是后一个输入”的流畅衔接；

3）状态隔离：

每个 Runnable 都是独立的，调用时互不干扰，便于调试和复用。

## 2、常用 Runnable 组件类型

LangChain 内置了大量开箱即用的 Runnable 组件，主要包括以下几类：

1）基础 Runnable 组件

这些组件是内置组件，无需手动封装，实现了 Runnable 接口。即直接用“|”串联的都是 Runnable。

- 提示词模板：BaseChatPromptTemplate
- 聊天模型：BaseChatOpenAI
- 解析器：BaseOutputParser

2）自定义 Runnable 组件

（1）RunnableLambda

这是最常用的自定义方式。将普通函数封装为 Runnable，适配管道语法。

【例 2.5-2】用 RunnableLambda 将普通函数封装为 Runnable

【程序代码】

    from langchain_core.runnables import RunnableLambda

    # 普通函数（输入数字，返回平方）
    def square(x: int) -> int:
        return x * x

    # 封装为 Runnable
    square_runnable = RunnableLambda(square)

    # 调用（支持 invoke/管道）
    print(square_runnable.invoke(5)) # 输出：25

    # 串联到管道中
    chain = RunnableLambda(lambda x: x + 1) | square_runnable
    print(chain.invoke(4)) # (4+1)^2=25 -> 输出：25

（2）RunnableSequence

如果需要更灵活的组合，可以用 RunnableSequence。其实“|”语法本质上就是创建 RunnableSequence。

管道输出可以使用 RunnableSequence：

    # 方式 1：用|创建
    chain1 = prompt | llm | parser

    # 方式 2：显式创建（等价于方式 1）
    chain2 = RunnableSequence(first=prompt, middle=[llm], last=parser)

（3）RunnableParallel

并行即同时执行多个 Runnable，每个分支返回结果以字典形式封装。

（4）RunnableBranch

根据条件选择不同的分支 Runnable 执行，类似 if-else 语句。

【例 2.5-3】并行和分支 Runnable

【程序代码】

    from langchain_core.runnables import RunnableParallel,RunnableBranch

    # 定义两个 Runnable
    r1 = RunnableLambda(lambda x: x + 1)
    r2 = RunnableLambda(lambda x: x * 2)

    # 并行执行
    parallel_chain = RunnableParallel(add_one=r1, multiply_two=r2)
    result = parallel_chain.invoke(5)
    print(result) # 输出：{"add_one": 6, "multiply_two": 10}

    # 分支执行
    branch_chain = RunnableBranch(
        (lambda x: x > 0 , r1),
        (lambda x: x < 0 , r2),
        #默认分支
        r1
    )
    result = branch_chain.invoke(5)
    print(result) # 输出 6

    result = branch_chain.invoke(-5)
    print(result) # 输出-10

## 3、流程图文字推演

### Runnable 管道执行流程

输入数据 --> RunnableLambda 处理 --> 通过管道符传递至下一个 Runnable --> RunnableSequence 按序执行 --> 最后输出结果

### 并行与分支执行流程

输入数据 --> 判断执行模式

并行模式（RunnableParallel） --> 同时分发至多个分支（r1, r2） --> 各分支独立计算 --> 合并结果为字典输出

分支模式（RunnableBranch） --> 根据条件判断（如 x > 0） --> 命中对应分支执行 --> 未命中则执行默认分支 --> 返回结果

💡 **速记**

【核心考点】

Runnable 是 LangChain 的核心抽象，所有可被管道（|）串联的组件均实现该接口，统一提供 invoke（同步）、stream（流式）、batch（批量）方法。

内置 Runnable 组件：提示词模板（BaseChatPromptTemplate）、聊天模型（BaseChatOpenAI）、解析器（BaseOutputParser）。

自定义 Runnable 组件：RunnableLambda（函数封装）、RunnableSequence（顺序组合）、RunnableParallel（并行执行）、RunnableBranch（条件分支）。

【高频逻辑链】

自定义封装：普通函数 --> RunnableLambda --> 实现 invoke/stream/batch 方法 --> 接入管道。

组合执行：RunnableSequence（顺序执行，等价于 | 符号）、RunnableParallel（并行执行，返回字典）、RunnableBranch（条件判断，类似 if-else）。

【关键避坑】

只有实现了 Runnable 接口的组件才能使用管道符“|”进行串联，普通函数必须通过 RunnableLambda 封装后才能接入。

RunnableBranch 的最后一个参数是默认分支，必须提供，否则当所有条件都不匹配时会抛出异常。
