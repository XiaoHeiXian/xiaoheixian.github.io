---
layout: article
title: "DeepSeek Harness 自定义插件开发"
description: "插件机制：插件是一个导出 apply 函数的 TypeScript 模块，通过 ctx 上下文注册能力。 工具定义：工具即为插件，使用 defineTool 定义名称、描述、参数和执行逻辑。 目录结构：在 deepseek-harness 目录下建立独立的 scratch-plugin/src 目录进行开发。 代码实现：通过导出的 apply 函数，将自定义的工具实例注册到 DSH 框架中。"
date: 2026-11-19
category: "软件架构"
tags:
  - "AI大模型"
  - "DeepSeek"
  - "Agent"
  - "插件开发"
permalink: /posts/2026-11-19-deepseek-harness-custom-plugin.html
---

## 1.3.3 自定义插件

在 Harness 中，插件是一个导出 apply 函数的 TypeScript 模块。框架在加载时调用 apply，传入一个 ctx（上下文对象），你通过 ctx 注册能力。工具就是一个插件。

1）创建本地项目插件目录

在 deepseek-harness 目录下创建目录 scratch-plugin/src

2）创建两个工具（参考官网）

（1）打招呼

    import type { Context } from '@deepseek-ai/cordis'
    import { defineTool } from '@deepseek-ai/dsh-tools'

    // 定义第一个工具：打招呼
    const greetTool = defineTool({
      name: 'greet',
      description: '向指定的人打招呼并返回问候语',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '对方的姓名'
          }
        },
        required: ['name']
      },
      execute: async ({ name }) => {
        return `你好, ${name}! 很高兴见到你。`
      }
    })

    // 定义第二个工具：简单的加法计算器
    const calculateAddTool = defineTool({
      name: 'calculate_add',
      description: '计算两个数字的和',
      parameters: {
        type: 'object',
        properties: {
          a: {
            type: 'number',
            description: '第一个加数'
          },
          b: {
            type: 'number',
            description: '第二个加数'
          }
        },
        required: ['a', 'b']
      },
      execute: async ({ a, b }) => {
        return String(a + b)
      }
    })

    // 导出 apply 函数，框架加载插件时会执行此方法
    export function apply(ctx: Context) {
      // 将定义的工具注册到 DSH 的上下文中
      ctx.tools.register(greetTool)
      ctx.tools.register(calculateAddTool)
      
      console.log('自定义插件 scratch-plugin 已成功加载并注册工具。')
    }

## 💡 **速记**

【核心考点】

DSH 自定义插件开发的基础流程：引入类型与工具定义函数 -> 编写工具配置与执行逻辑 -> 导出 apply 函数并向 ctx 注册。

核心 API：
- `defineTool`：用于声明一个 Agent 可调用的工具，需提供符合 JSON Schema 规范的 parameters。
- `ctx.tools.register`：在插件生命周期中，将工具实例注入框架的能力。

【高频逻辑链】

创建目录 -> 编写 TS 代码（定义工具 -> 编写 execute 逻辑 -> 导出 apply 注册） -> 在 DSH 配置中启用插件 -> Agent 调用测试。

【关键避坑】

确保 `parameters` 的 JSON Schema 定义准确，特别是 `required` 字段，否则大模型在生成工具调用参数时容易发生幻觉或缺少必要参数。
