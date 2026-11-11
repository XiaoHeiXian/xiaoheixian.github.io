---
layout: article
title: "RAG 文档检索与文本分割器"
description: "必要性：解决模型上下文限制，提升检索精准度，降低计算成本。 核心接口：TextSplitter 统一标准，常用参数包括 chunk_size、chunk_overlap 等。 递归分割：RecursiveCharacterTextSplitter 是首选，按分隔符优先级递归切分，保留语义。 基础字符分割：CharacterTextSplitter 逻辑简单，适合轻量无复杂语义场景。 结构/代码分割：根据 Markdown、HTML、代码语法等天然结构进行无损分割。 文档加载器：将各类多源异构数据统一转换为标准的 Document 对象。 加载方法：提供同步（load）、懒加载（lazy_load）、异步（aload）及一站式分割（load_and_split）。 综合实战：结合 SQLDatabaseLoader 读取结构化数据，经过文本分割后存入向量数据库，实现完整 RAG 链路。"
date: 2026-11-11
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "RAG"
  - "文本分割"
  - "文档加载"
permalink: /posts/2026-11-11-rag-document-retrieval-splitters.html
---

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

## 5.3.2 文档加载器

LangChain 中的文档加载器（Document Loader）是 RAG 流程的首个核心组件，其作用是将本地或网络中不同格式、不同存储位置的原始文档，统一加载并解析为 LangChain 标准的 Document 对象，为后续的文本分割、嵌入存储、检索提供标准化的数据输入，解决了多源异构文档统一处理的核心问题。

所有文档加载器均遵循 LangChain 统一设计规范，加载结果统一为 List[Document] 类型（每个 Document 包含 page_content 文本内容和 metadata 元数据），无需关注不同文档的底层解析细节，实现一键加载、格式统一。

### 1、文档加载器的必要性

在 RAG 应用中，原始知识库文档通常是多格式、多存储位置的（如本地 PDF/Word、网络网页、数据库、云存储文件等），直接处理这些异构文档会面临格式解析复杂、内容提取困难、元数据丢失等问题。文档加载器的核心价值体现在：

（1）格式统一：将 PDF、Word、Markdown、HTML、TXT 等数十种格式的文档，统一解析为 LangChain 标准 Document 对象，后续文本分割、嵌入等组件可直接处理，无需适配不同格式；

（2）内容精准提取：针对不同文档格式的特性，内置专属解析逻辑，精准提取纯文本内容，过滤格式标记、页眉页脚、无关样式等冗余信息；

（3）元数据自动保留和补充：加载时自动提取文档的原生元数据（如文件名、路径、页码、来源 URL 等），也支持自定义元数据，为后续检索器的元数据过滤（filter）提供基础；

（4）多源兼容：支持本地文件、网络资源、云存储（S3/OSS）、数据库、API 等多种存储位置的文档加载，覆盖企业级知识库的所有常见数据源；

（5）低代码集成：所有加载器调用方式高度统一，仅需几行代码即可实现不同文档的加载，大幅降低开发成本。

### 2、文档加载接口

BaseLoader 是 LangChain 中所有文档加载器的顶层抽象基类，定义了文档加载器的统一标准接口、核心方法规范和默认实现，所有具体的文档加载器均继承此类并实现和复用其方法。

1）通用参数配置
（1）file_path：指定本地文档的路径。
（2）web_path：网络文件的 URL。
（3）path：递归加载的根目录。
每个文档加载器可以定义自己的参数。

2）加载方法
（1）load()：同步加载所有文档并返回 Document 对象列表，是开发者最常调用的方法。
（2）lazy_load()：同步懒加载文档，返回 Document 类型的生成器迭代器，通过逐行、逐块、逐页生成 Document 对象，而非一次性生成列表，从根本上解决大文档加载的内存溢出问题。
（3）load_and_split(text_splitter)：一站式实现文档加载和文本分割，加载文档后直接调用文本分割器将长文档分割为小片段，返回分割后的 Document 列表，简化 RAG 流程中加载 + 分割的两步操作。
（4）aload()：异步版本的 load()，适配异步编程场景（如 FastAPI、Asyncio 项目），返回异步加载后的 Document 列表。
（5）alazy_load()：异步版本的 lazy_load()，返回 Document 类型的异步生成器迭代器，支持异步场景下的懒加载，避免大文档异步加载的内存溢出。

### 3、LangChain 主流文档加载器

LangChain 内置了上百种开箱即用的文档加载器，覆盖几乎所有常见的文档格式和存储位置，下面列举几个常用的文档加载器：

#### 1）本地纯文本加载：TextLoader

（1）适用场景
加载本地纯文本文档，如 .txt、.md（简单无格式）、.csv（纯文本）等，轻量、高效，无额外依赖。

（2）优势
- 无第三方依赖，加载速度最快；
- 支持自定义编码（如 utf-8、gbk），解决中文乱码问题；
- 自动保留文件路径、文件名等元数据。

【例 5.3-2】加载本地 txt 文档

    from langchain_community.document_loaders import TextLoader
    # 初始化加载器：指定文件路径，设置编码为 utf-8（解决中文乱码）
    loader = TextLoader(
        file_path="e:/user/ai/knowledge_base/rag_intro.txt", # 本地纯文本文件路径
        encoding="utf-8" # 中文场景必配，避免乱码
    )
    # 核心加载方法：返回 List[Document]
    docs = loader.load()
    # 打印结果
    for doc in docs: # 默认返回 List[Document]
        print(f"文档内容：\n{doc.page_content}")
        print(f"元数据：{doc.metadata}") # 自动包含 source（文件路径）

#### 2）本地 PDF 加载：PyPDFLoader

使用 PDF 本地加载器，需要安装 pypdf 库：

    pip install pypdf -i https://pypi.tuna.tsinghua.edu.cn/simple

（1）适用场景
加载本地 PDF 文档，是 LangChain 中最推荐的 PDF 加载器，适配绝大多数标准 PDF。

（2）优势
- 解析精度高，能精准提取文本内容，保留段落结构；
- 自动按页码分割为多个 Document 对象（每页一个），元数据包含 page 页码；
- 轻量依赖，仅需安装 pypdf 库，适配性强。

【例 5.3-3】加载 PDF 文档

    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.document_loaders import PyPDFLoader
    # 初始化 PDF 加载器：指定本地 PDF 文件路径
    loader = PyPDFLoader(file_path="e:/user/ai/knowledge_base/rag_intro.pdf")
    # 加载 PDF：每页返回一个 Document 对象，元数据含 page（页码）、source（路径）
    docs = loader.load()
    print(f"PDF 总页数：{len(docs)}")
    print(f"第 1 页内容：\n{docs[0].page_content[:300]}\n...")
    print(f"第 1 页元数据：{docs[0].metadata}") # {'source': 'xxx.pdf, 'page': 0}（页码从 0 开始）

    # 可选：加载后直接分割（结合文本分割器）
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    split_docs = loader.load_and_split(text_splitter=text_splitter)
    print(f"加载并分割后片段数：{len(split_docs)}")

#### 3）本地 Word 加载：Docx2txtLoader

使用 Word 本地加载器，需要安装 docx2txt 库：

    pip install docx2txt -i https://pypi.tuna.tsinghua.edu.cn/simple

（1）适用场景
加载本地 Microsoft Word 文档（.docx 格式，.doc 格式需额外转换），是 LangChain 中最常用的 Word 加载器。

（2）优势
- 解析速度快，能提取文本和简单表格内容；
- 轻量依赖，仅需安装 docx2txt 库；
- 自动保留文件路径、文件名等元数据。

#### 4）网络网页加载：WebBaseLoader

使用 WebBaseLoader 从网站爬取内容，需要安装爬虫依赖：

    pip install beautifulsoup4 requests -i https://pypi.tuna.tsinghua.edu.cn/simple

（1）适用场景
加载网络网页的文本内容（如博客、官方文档、新闻资讯），内置爬虫逻辑，自动提取网页正文，过滤广告、导航、侧边栏等冗余信息。

（2）优势
- 无需手动编写爬虫，一键爬取网页正文；
- 支持自定义请求头（headers），解决反爬限制；
- 自动保留网页 URL、标题等元数据；
- 支持批量爬取多个网页。

【例 5.3-4】从网页加载文档

    from langchain_community.document_loaders import WebBaseLoader
    # 配置请求头：解决部分网站反爬（模拟浏览器请求）
    custom_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    # 方式 1：爬取单个网页
    loader = WebBaseLoader(
        web_path="https://api-docs.siliconflow.cn/docs/api/chat-completions-post", # 网页 URL
        # requests_kwargs 可传入 requests.get 所有参数
        requests_kwargs={
            "headers": custom_headers,
        }
    )
    docs = loader.load()
    print(f"网页标题：{docs[0].metadata['title']}")
    print(f"网页正文：\n{docs[0].page_content[:200]}...")

    # 方式 2：批量爬取多个网页
    urls = [
        "https://api-docs.siliconflow.cn/docs/api/messages-post",
        "https://api-docs.siliconflow.cn/docs/api/embeddings-post"
    ]
    loader = WebBaseLoader(web_paths=urls, requests_kwargs={"headers": custom_headers})
    batch_docs = loader.load()
    print(f"批量爬取网页数：{len(batch_docs)}")
    for i,doc in enumerate(batch_docs):
        print(f"第{i}个网页正文：\n{doc.page_content[:200]}...")

#### 5）Markdown 加载：UnstructuredMarkdownLoader

使用 UnstructuredMarkdownLoader 加载器，需要安装 unstructured 库：

    pip install unstructured -i https://pypi.tuna.tsinghua.edu.cn/simple

（1）适用场景
加载本地 / 远程 Markdown 文档（.md），精准保留 Markdown 结构（标题、列表、代码块、引用等），是技术文档、知识库的主流格式。

（2）优势
- 保留 Markdown 原生结构，避免文本混乱；
- 支持提取代码块、公式块等特殊内容；
- 轻量依赖，解析精度高。

#### 6）本地多格式批量加载：DirectoryLoader

（1）适用场景
批量加载指定目录下的所有文档，支持自动识别 / 指定文件格式（PDF/Word/TXT/MD 等），是企业级知识库批量加载的核心工具。

（2）优势
- 一键批量加载目录内所有 / 指定格式文件，无需逐个初始化加载器；
- 支持递归加载子目录文件（recursive=True）；
- 可指定加载器映射，为不同格式文件配置专属加载器；
- 自动保留每个文件的路径、文件名、格式等元数据。

【例 5.3-5】批量加载文件

    # 使用多个 glob 模式（推荐）
    loader = DirectoryLoader(
        path="e:/user/ai/knowledge_base", # 本地知识库根目录
        glob="**/*.pdf", # 先加载 PDF
        loader_cls=PyPDFLoader, # 指定 PDF 加载器
        recursive=True, # 开启递归加载子目录
        show_progress=True, # 显示加载进度条
    )
    # 分别加载不同格式的文件
    pdf_docs = loader.load()
    # 创建新的 loader 加载 txt 文件
    txt_loader = DirectoryLoader(
        path="knowledge_base",
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"}, # 中文编码
        recursive=True,
    )
    txt_docs = txt_loader.load()

    # 创建新的 loader 加载 docx 文件
    docx_loader = DirectoryLoader(
        path="knowledge_base",
        glob="**/*.docx",
        loader_cls=Docx2txtLoader,
        recursive=True,
    )
    docx_docs = docx_loader.load()

    # 合并所有文档
    all_docs = pdf_docs + txt_docs + docx_docs
    print(f"批量加载文档总数：{len(all_docs)}")
    print(f"PDF 文档数：{len(pdf_docs)}")
    print(f"TXT 文档数：{len(txt_docs)}")
    print(f"DOCX 文档数：{len(docx_docs)}")
    # 遍历查看每个文档的来源和类型
    for doc in all_docs:
        print(f"来源：{doc.metadata['source']} | 内容长度：{len(doc.page_content)} 字符")

#### 7）Excel 加载：PandasExcelLoader

加载本地 Excel 文档，需要安装 pandas（处理 Excel），openpyxl（支持.xlsx 格式）库：

    pip install pandas openpyxl -i https://pypi.tuna.tsinghua.edu.cn/simple

（1）适用场景
加载本地 Excel 文档（.xlsx、.xls），提取表格内容为纯文本，适用于结构化数据知识库（如产品参数、业务报表）。

（2）优势
- 基于 Pandas 解析，支持多工作表、指定列提取；
- 可将表格内容按「行 / 列」拼接为纯文本，适配后续文本分割；
- 自动保留「文件名、工作表名」等元数据。

#### 8）关系型数据加载：SQLDatabaseLoader

SQLDatabaseLoader 帮你把关系型数据库（比如 MySQL、PostgreSQL）里的数据，读取并转换成 LangChain 能直接处理的 Document 对象，存入 page_content，表字段自动存入 metadata：

    pip install langchain-community sqlalchemy pymysql -i https://pypi.tuna.tsinghua.edu.cn/simple

（1）工作原理：
- 连接数据库：它通过 SQLDatabase 工具来与数据库交互，而 SQLDatabase 底层使用的是 SQLAlchemy 引擎
- 执行查询：执行 SQL 查询语句（query）
- 转换为文档：查询结果的每一行数据都会被转换成一个独立的 Document 对象

（2）适用场景：
- 连接标准的关系型数据库：无论你的数据存储在 MySQL、PostgreSQL、SQLite 还是其他 SQLAlchemy 支持的数据库中，它都可以作为统一的入口。
- 构建 RAG 应用的数据准备阶段：当你的知识库（如企业产品文档、操作手册）的一部分数据存储在关系型数据库中，需要将它们提取、分块并向量化，以便进行语义检索时。
- 处理结构化数据中的文本字段：如果你的数据库表中包含大段的文本说明、备注等字段，需要将其提取出来作为独立的文档单元。
- 批量、定期地导入数据：你可以编写脚本，使用 SQLDatabaseLoader 定期从数据库中批量读取数据，保持向量库中的内容与源数据同步。

（3）优势
- 通用性强，避免厂商锁定：它通过 SQLAlchemy 工作，这意味着更换数据库（例如从 MySQL 迁移到 PostgreSQL）时，你的数据加载代码几乎不需要改动，只需更改连接字符串即可。
- 灵活性高，可自定义转换：它提供了 page_content_mapper 和 metadata_mapper 等参数。你可以通过编写简单的 Python 函数，精确控制如何将数据库的一行记录拼接成文档内容，以及如何提取元数据，而不是受限于固定的列映射。
- 与 LangChain 生态无缝集成：它是 LangChain 官方社区库的一部分，与 RecursiveCharacterTextSplitter、OpenAIEmbeddings 和 RedisVectorStore 等组件配合流畅，形成一个标准的“加载-分割-向量化-入库”工作流。
- 利用 SQL 的强大表达能力：你可以通过 query 参数传入任何合法的 SQL 语句，灵活地筛选、聚合和连接数据，从而在数据源头就进行预处理，只加载你真正需要的字段和记录。

总的来说，SQLDatabaseLoader 是一个轻量、通用且高度可控的数据桥梁，非常适合在 LangChain 项目中，将关系型数据库作为灵活的数据源。

【例 5.3-6】加载 MySQL 数据

【场景说明】
MySQL 库 agri_db 存有小麦种植数据表 wheat_tech，字段：id、variety、sowing_dosage、fertilizer_note、disease_note，读取表数据转为文档入库 Redis 向量库。

【创建数据库】
① MySQL 建库、建表、插入测试数据
打开 MySQL 客户端 / Navicat / DBeaver 执行以下 SQL 脚本：

    -- 1. 创建农业数据库
    CREATE DATABASE IF NOT EXISTS agri_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    USE agri_db;

    -- 2. 创建小麦种植技术表 wheat_tech
    CREATE TABLE IF NOT EXISTS wheat_tech (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
        variety VARCHAR(64) NOT NULL COMMENT '小麦品种名称',
        sowing_dosage VARCHAR(128) NOT NULL COMMENT '播种用量/播种规范',
        fertilizer_note TEXT COMMENT '施肥管理要点',
        disease_note TEXT COMMENT '病害防治方案'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小麦种植技术知识库';

    -- 3. 插入多条农业测试数据
    INSERT INTO wheat_tech (variety, sowing_dosage, fertilizer_note, disease_note)
    VALUES
    (
        '济麦 44',
        '旱地每亩播种 10-11kg，水浇地 9kg，10 月中旬适期播种',
        '拔节期亩施钾肥 10kg、尿素 8kg；灌浆期叶面喷施磷酸二氢钾',
        '小麦锈病：发病初期喷施三唑酮，7 天一次，连续 2 次；避免田间积水降低湿度'
    ),
    (
        '山农 28',
        '壤土地块每亩 11-12kg，黏土增加 1kg，浅播 3cm 以内',
        '基肥搭配腐熟农家肥，返青肥少施氮肥，防止徒长倒伏',
        '纹枯病：播种前拌种，春季拔节期喷井冈霉素，清除田间杂草减少病菌'
    ),
    (
        '鲁麦 23',
        '晚播地块每亩加大至 13kg，采用条播均匀下种',
        '扬花期禁止大量施氮肥，易造成穗粒早衰，以磷钾肥为主',
        '白粉病：高湿天气易发，通风降湿，发病用醚菌酯喷雾防治'
    );

② 执行完成验证：

    SELECT * FROM agri_db.wheat_tech;

能看到 3 条小麦种植记录即数据库准备完成。

【程序代码】

    from langchain_community.document_loaders import SQLDatabaseLoader
    from langchain_community.utilities import SQLDatabase
    from sqlalchemy import create_engine
    import tiktoken
    import hashlib
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_redis import RedisVectorStore, RedisConfig

    # 1. 初始化数据库连接
    # 创建 SQLAlchemy 引擎
    engine = create_engine("mysql+pymysql://root:root@192.168.100.101:3306/agri_db")

    # 用 SQLDatabase 包装引擎
    db = SQLDatabase(engine)

    # 2. 初始化 MySQL 加载器
    loader = SQLDatabaseLoader(
        query="SELECT id, variety, sowing_dosage, fertilizer_note, disease_note FROM wheat_tech;",
        db=db, # 传入 SQLDatabase 对象
    )

    # 3. 加载数据库数据，得到 Document 列表
    docs = loader.load()
    print(f"读取小麦农技数据库记录条数：{len(docs)}")
    print("单条文档内容：", docs[0].page_content)
    print("元数据：", docs[0].metadata)

    # 4. 文本分割（复用本章标准分割器）
    def tiktoken_len(text):
        tokenizer = tiktoken.get_encoding("cl100k_base")
        return len(tokenizer.encode(text))

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=256,
        chunk_overlap=25,
        separators=["\n\n", "\n", "。", "，", " ", ""],
        length_function=tiktoken_len,
        strip_whitespace=True
    )
    split_docs = splitter.split_documents(docs)

    # 5. 初始化向量库，批量入库（幂等MD5去重）
    redis_config = RedisConfig(
        index_name="wheat_mysql_know",
        redis_url="redis://:123456@192.168.100.101",
        distance_metric="COSINE"
    )
    vector_store = RedisVectorStore(config=redis_config, embeddings=em_llm)

    # 生成唯一ID，避免重复向量
    doc_ids = [hashlib.md5(d.page_content.strip().encode("utf-8")).hexdigest() for d in split_docs]
    vector_store.add_documents(documents=split_docs, ids=doc_ids)
    print("MySQL农业数据向量化入库完成！")

## 5.3.3 懒加载大表优化（海量数据防内存溢出）

在处理大型数据库表或巨大文件时，传统的 `load()` 方法会将所有数据一次性加载到内存中，极易导致 `OutOfMemoryError`。`lazy_load()` 返回一个生成器，每次只产生一个 `Document` 对象，极大降低了内存消耗。

    # 1. 初始化数据库连接
    # 创建 SQLAlchemy 引擎
    engine = create_engine("mysql+pymysql://root:root@192.168.100.101:3306/agri_db")
    db = SQLDatabase(engine)

    # 2. 初始化加载器
    loader = SQLDatabaseLoader(
        query="SELECT * FROM wheat_tech;",
        db=db
    )

    # 3. 使用 lazy_load 迭代加载，防止内存溢出
    for doc in loader.lazy_load():
        # 逐条处理文档，例如直接写入向量库或进行其他流式处理
        print(doc.page_content)
        # vector_store.add_documents([doc]) # 示例：单条入库

## 流程图文字推演

### RAG 完整数据处理与检索生成流程

数据准备阶段：
加载原始数据（Text/PDF/Word/Web/SQL） --> 解析为 Document 对象（page_content + metadata）
--> 文本分割（TextSplitter，配置 chunk_size/overlap） --> 转换为小片段 Chunk
--> 向量化（OpenAIEmbeddings） --> 存入向量数据库（RedisVectorStore，生成 MD5 唯一 ID 防重复）

问答检索阶段：
用户输入提问 --> 将提问向量化 --> 在向量数据库中执行相似度检索（Retriever）
--> 返回 Top-K 相关文档片段（Context） --> 组装 Prompt（System Prompt + Context + User Question）
--> 传入大语言模型（LLM） --> 生成有事实依据的准确回答

## 💡 **速记**

【核心考点】

文本分割：推荐 `RecursiveCharacterTextSplitter`。核心参数 `chunk_size`（控制大小）、`chunk_overlap`（防止语义截断）、`length_function`（按 Token 算）。

文档加载：统一使用 `BaseLoader`。常用有 `PyPDFLoader`、`TextLoader`、`WebBaseLoader`、`SQLDatabaseLoader`。海量数据必用 `lazy_load()` 防内存溢出。

向量入库：结合 `RedisVectorStore`，存储前使用 MD5 对内容生成唯一 ID，实现幂等去重。

【高频逻辑链】

数据流向：多源加载（Load） --> 语义切分（Split） --> 向量化（Embed） --> 入库（Store） --> 检索召回（Retrieve） --> 上下文注入（Prompt） --> 生成（LLM）。

【关键避坑】

处理大规模文件或海量数据库记录时，绝对不要直接使用 `load()`，必须使用 `lazy_load()` 或 `alazy_load()` 流式处理。

文本切割时 `chunk_overlap` 不宜过大（推荐 10%-20%），否则检索时容易召回大量重复的冗余信息。

关系型数据库查询出的字段名（如 `disease_note`）可能不符合自然语言习惯，必要时需利用 `page_content_mapper` 自定义拼接文本。
