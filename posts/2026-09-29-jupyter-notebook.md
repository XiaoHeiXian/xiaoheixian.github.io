---
layout: article
title: "Jupyter Notebook 交互式编程环境"
description: "- \"Jupyter定义：基于Web的交互式编程环境，用于数据科学、机器学习\"   - \"核心特点：交互式编程（实时执行展示结果）、富文档混合（Markdown/LaTeX/HTML）\"   - \"安装方式：Anaconda预装、VSCode创建.ipynb、手动conda install\"   - \"核心快捷键：Y(代码)、M(Markdown)、DD"
date: 2026-09-29
category: "AI"
tags:
  - "开发环境"
  - "Jupyter"
permalink: /posts/2026-09-29-jupyter-notebook.html
---

Jupyter Notebook 是一个基于 Web 的交互式编程环境，广泛应用于数据科学、机器学习、学术研究等领域。

1、核心特点

- 交互式编程：代码可实时执行并显示结果（图表、表格等）
- 富文档混合：支持 Markdown 文本、LaTeX 公式、HTML 和多媒体内容

2、安装方式

- 使用 Anaconda：已预装 Jupyter，无需额外安装
- 使用 VS Code：创建 .ipynb 文件即可使用（已集成 Jupyter）
- 手动安装：conda install -c conda-forge jupyter

3、核心操作快捷键

核心操作快捷键如表 1.2-4 所示：

表 1.2-4：Jupyter 核心操作快捷键

| 快捷键 | 功能 |
| :--- | :--- |
| Y | 切换为代码单元格 |
| M | 切换为 Markdown 单元格 |
| DD | 删除当前单元格 |
| Ctrl+Enter / Shift+Enter | 仅运行当前单元格，Shift+Enter 执行同时创建新单元格 |
| Shift+L | 显示/隐藏行号 |

4、Markdown

在 Jupyter Notebook 中，使用 Markdown 单元格添加注释说明是提升代码可读性和文档完整性的关键方法。

（1）添加 Markdown 单元格：先选中已有单元格（蓝色边框），按快捷键 M。

（2）编辑 Markdown 内容：

- 标题层级注释语法：用 # 表示标题，层级从 #（一级标题）到 ######（六级标题），清晰划分文档结构
- 普通文本：直接输入
- 列表：在文本前加一个减号

例如：

    ## 数据预处理步骤
    本步骤对原始水稻产量数据进行清洗，包括：
    - 删除缺失值超过 30%的列
    - 对异常值进行截尾处理

按 Shift+Enter 渲染后，会显示为格式化的标题和列表，如图所示：

![Markdown](https://xiaoheixian.github.io/posts/assets/20260930203626_263_65.png)

（3）最佳实践

- 代码与注释分离：每个代码块上方添加 Markdown 注释，避免在代码中写冗长注释（代码内仅保留简短单行注释 #）。
- 折叠单元格：点击单元格左侧的箭头（或按 Shift+O）折叠 Markdown 注释，聚焦代码编辑。

---

💡 **速记**

**【Jupyter 是什么？】**
基于 Web 的交互式编程环境，用于数据科学、机器学习。核心是“交互式编程”（实时执行展示结果）和“富文档混合”（支持 Markdown/LaTeX/HTML）。

**【安装方式】**
1. Anaconda（预装，直接可用）
2. VS Code（新建 .ipynb 文件）
3. 手动安装：`conda install -c conda-forge jupyter`

**【核心快捷键（高频考点）】**
*   `Y`：切换为代码单元格
*   `M`：切换为 Markdown 单元格
*   `DD`：删除当前单元格
*   `Ctrl+Enter`：运行当前单元格
*   `Shift+Enter`：运行当前单元格并创建新单元格
*   `Shift+L`：显示/隐藏行号

**【Markdown 语法】**
*   标题：`#` 到 `######`（1-6级）
*   列表：文本前加 `-`
*   普通文本：直接输入
*   渲染：按 `Shift+Enter` 执行渲染

**【最佳实践】**
代码与注释分离：Markdown 写在代码块上方，代码内只保留极简短注释。点击左侧箭头或按 `Shift+O` 可以折叠 Markdown 注释，聚焦代码。
