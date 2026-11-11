---
layout: article
title: "RAG 文档检索与文本分割器"
description: "必要性：解决模型上下文限制，提升检索精准度，降低计算成本。 核心接口：TextSplitter 统一标准，常用参数包括 chunk_size、chunk_overlap 等。 递归分割：RecursiveCharacterTextSplitter 是首选，按分隔符优先级递归切分，保留语义。 基础字符分割：CharacterTextSplitter 逻辑简单，适合轻量无复杂语义场景。 结构/代码分割：根据 Markdown、HTML、代码语法等天然结构进行无损分割。"
date: 2026-11-11
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "RAG"
  - "文本分割"
permalink: /posts/2026-11-11-rag-document-retrieval-splitters.html
---

# 5.3 文档检索

## 5.3.1 文本分割器

LangChain 中的文本分割器（Text Splitter）是处理长文档的核心组件，核心作用是将大篇幅、超出嵌入模型和 LLM 上下文窗口限制的文本，分割为大小合适、独立且保留关键上下文的小片段（Chunk），是 RAG 流程中文档加载后、嵌入存储前的必要步骤，直接影响后续检索器的检索效果和 LLM 生成回答的准确性。

文本分割器的设计遵循语义无损、大小可控、重叠补全三大核心原则，所有实现均基于 LangChain 统一的抽象层，支持自定义分割规则，适配不同类型的文本（纯文本、PDF、代码、Markdown 等）和业务场景。

### 1、文本分割的必要性

为什么必须进行文本分割？核心源于大模型和嵌入模型的上下文窗口限制，以及检索效率的要求：

（1）模型上下文限制：嵌入模型和 LLM 都有最大输入字符和令牌（Token）限制，超长文本直接传入会报错；

（2）检索精准性要求：长文档整体嵌入会导致语义模糊，分割为小片段后，每个片段的语义更聚焦，检索器能精准匹配与查询相关的片段，提升召回率；

（3）降低计算成本：小片段嵌入和存储的计算量、存储空间远低于长文档，且能减少 LLM 处理的上下文冗余，提升响应速度。

### 2、文档分割接口

TextSplitter 是 LangChain 中所有文本分割器的顶层抽象基类，定义了文本分割器的统一标准接口、核心方法规范和基础分割逻辑，所有具体的文本分割器均继承此类并实现专属分割逻辑。

接口的通用参数配置：

（1）chunk_size：限制分割后每个片段（Chunk）的最大尺寸，避免片段超出嵌入模型和 LLM 的上下文窗口限制，是最基础的分割控制参数。默认值：1000 字符。

（2）chunk_overlap：让相邻两个片段保留部分重复内容，解决分割导致的上下文断裂问题（如一个完整的语义或事件被切分到两个片段中，重叠部分可恢复完整上下文）。默认值：200 字符，一般设为 chunk_size 的 10%-20%。

（3）separators：自定义递归分隔符列表，指定分割文本的优先顺序，从特殊到普通递归分割，优先用能保留语义块的分隔符（如空行分割段落），分割失败则用下一个分隔符，直到直接截断。中英文专属适配配置（生产环境推荐）：
- 纯英文场景：["\n\n", "\n", " ", ""] （空行—换行—空格—直接截断）
- 纯中文场景：["\n\n", "\n", "。", "，", "；", "、", " ", ""] （空行—换行—句号—逗号—分号—顿号—空格—直接截断）
- 中英混合场景：["\n\n", "\n", "。", "，", " ", "", ".", ","] （兼顾中英文标点）

（4）length_function：替换默认的长度计数方式，实现按 Token 精准计数（贴合嵌入模型和 LLM 的实际上下文限制，推荐生产环境使用）。配置时与嵌入模型和 LLM 使用的 Tokenzier 保持一致（如 1 个中文字≈1 Token，1 个英文单词≈1.3 Token），避免片段实际 Token 数超出模型限制。默认值：len（Python 内置函数，按字符计数）。

（5）keep_separator：控制分割时是否将分隔符本身保留在对应片段的末尾，如需严格保留文本原始格式（如诗歌、代码、带特殊标点的专业文档）设为 True；通用纯文本分割（如知识库、问答文档）保持默认 False 即可。

（6）add_start_index：分割后为每个 Document 对象的 metadata 添加 start_index 字段，记录该片段在原始文本中的起始字符位置，便于溯源和后续文本还原。如需精准溯源片段来源、还原原始文本（如文档校对、法律文本分析）设为 True；通用 RAG 场景保持默认 False，减少元数据冗余。

（7）strip_whitespace：自动清理每个片段首尾的空白字符（空格、换行、制表符等），避免片段包含无效空白，减少冗余。如通用场景保持 True，提升文本整洁度；需保留原始文本首尾空白（如代码、格式严格的文档）设为 False。

### 3、LangChain 文本分割器

LangChain 内置了十余种文本分割器，按分割逻辑可分为基础字符分割、语义和结构感知分割、专用格式分割三大类：

#### 1）递归字符分割器 RecursiveCharacterTextSplitter

这是 LangChain 最通用、最推荐的默认分割器，适配 99% 的纯文本场景（TXT、PDF 解析后的文本、网页文本等），也是生产环境的首选。

（1）原理
- 按预设的字符分隔符列表递归分割文本；
- 先尝试用大分隔符（如空行）分割，保证语义块的完整性（如段落、章节），分割后的片段若仍超出阈值，再用更小的分隔符继续分割；
- 支持按字符（character）或令牌（token）计数，精准控制片段大小。

（2）优点
- 通用无侵入，适配所有纯文本类型；
- 优先按自然语义块分割，最大程度保留上下文；
- 配置简单，支持自定义分割阈值和重叠度；

（3）适用场景
- 无特殊格式的纯文本文档（如小说、论文、知识库、PDF 解析文本）；
- 不确定文本格式时的兜底首选。

【例 5.3-1】分割实操示例

    from langchain_text_splitters import RecursiveCharacterTextSplitter
    # 1. 定义按 Token 计数的函数（适配 OpenAI 模型）
    import tiktoken
    def tiktoken_len(text):
        # cl100k_base 是 OpenAI Token 编码方案，返回的 tokenizer，是 OpenAI 目前主流的分词器
        tokenizer = tiktoken.get_encoding("cl100k_base")
        return len(tokenizer.encode(text))

    # 2. 待分割的 Document 对象（含元数据，RAG 主流使用方式）
    docs = [
        Document(
            page_content="""RecursiveCharacterTextSplitter是LangChain最通用的文本分割器，
    核心通过递归分隔符实现语义无损分割，支持字符/Token两种计数方式。
    生产环境推荐按Token计数，同时配置中文专属分隔符，提升分割效果。""",
            metadata={"source": "LangChain 开发文档", "type": "文本分割器"}
        )
    ]

    # 3. 初始化生产环境级分割器
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=50,      # 每个片段最大 50 Token
        chunk_overlap=5,    # 相邻片段重叠 5 Token（10%）
        separators=["\n\n", "\n", "。", "，", " ", ""], # 中文分隔符
        length_function=tiktoken_len, # 替换为 Token 计数
        add_start_index=True,  # 添加起始索引，便于溯源
        strip_whitespace=True  # 清理首尾空白
    )

    # 4. 分割 Document 对象（保留元数据，推荐）
    split_docs = text_splitter.split_documents(docs)
    for i, doc in enumerate(split_docs):
        print(f"【片段{i+1}】")
        print(f"内容：{doc.page_content}")
        print(f"元数据：{doc.metadata}（含起始索引）")
        print(f"Token 数：{tiktoken_len(doc.page_content)}\n")

#### 2）字符分割器 CharacterTextSplitter

最基础的分割器，逻辑简单，适合轻量、无复杂语义的纯文本场景。

（1）原理
按单一固定分隔符（默认 \n\n）分割文本，若分割后的片段超出阈值，直接从指定位置截断，无递归分割逻辑。

（2）优点
- 极致简单，计算速度快；
- 代码轻量化，无多余依赖；

（3）缺点
- 分割逻辑粗暴，易切断自然语义（如段落中间截断）；
- 仅支持单一分隔符，适配性差；

（4）适用场景
- 轻量测试场景、简单短文本分割；
- 对分割效果要求低，仅需快速切分的场景。

#### 3）结构感知分割：按标记或标题分割（适配结构化文档）

针对有明确格式结构的文档（Markdown、HTML、PDF 章节、带标题的文档），按天然的结构标记分割，保证片段与文档结构一致（如按标题、章节、层级分割），是结构化文档的最优选择。

（1）原理
- MarkdownTextSplitter：按 Markdown 标题（#、##、###）、代码块、列表分割。
- HTMLTextSplitter：按 HTML 标签（<h1>、<p>、<div>）分割。
- PDFPlumberTextSplitter：按 PDF 页码、章节、文本块分割（需配合专用 PDF 加载器）。

（2）优点
- 完全贴合文档天然结构，语义完整性最强；
- 分割后的片段自带层级信息，便于后续元数据标注；

（3）适用场景
- 技术文档、博客文章、知识库（多为 Markdown 格式）；
- 网页内容、结构化 PDF、带层级标题的官方文档。

#### 4）专用格式分割：代码和公式分割器

针对代码、数学公式等特殊格式文本，按其语法规则分割，避免切断代码块、函数、公式结构，适配技术类文档处理。

- PythonCodeTextSplitter/JavaScriptCodeTextSplitter：按代码语法（函数定义、类、代码块、换行）分割，保留代码完整性；
- LatexTextSplitter：按 LaTeX 语法（公式块、章节、命令）分割，适配数学/学术论文。

## 流程图文字推演

### 文档预处理与检索流程

加载长文本文档 --> 初始化 TextSplitter (配置 chunk_size, overlap, separators) --> 调用 split_documents 将长文切分为多个 Chunk --> 将各个 Chunk 传入 Embeddings 模型生成向量 --> 将向量与 Chunk 文本存入 VectorStore --> 用户提问 --> 从 VectorStore 检索相似 Chunk --> 生成回答

## 💡 **速记**

【核心考点】

文本分割是 RAG 的关键前置步骤，核心目的是突破大模型上下文限制，并提升检索的精准度。

三大原则：语义无损、大小可控、重叠补全（防止关键信息被切断）。

核心分割器：RecursiveCharacterTextSplitter 是首选，按字符/Token递归分割，兼顾语义完整性与配置灵活性。CharacterTextSplitter 仅适合极简场景。结构化/代码文本应使用专用的分割器。

【高频逻辑链】

选择分割器：纯文本(Recursive) --> 结构化(Markdown/HTML) --> 代码/公式(专用分割器)。

核心参数：chunk_size(控制大小) --> chunk_overlap(保持连贯) --> length_function(精准按Token控制)。

【关键避坑】

生产环境必须将 length_function 替换为基于 Token 的计算方式（如 tiktoken），默认按字符数计算容易导致 Token 超限报错。

chunk_overlap 不能设置过大，通常为 chunk_size 的 10%-20%，过大会导致检索结果大量重复。
