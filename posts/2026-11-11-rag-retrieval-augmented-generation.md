---
layout: article
title: "检索增强生成（RAG）"
description: "四大痛点：知识截止、知识幻觉、无法访问私有知识、上下文窗口限制。 RAG 定义：检索组件与大模型结合，先检索外部知识，再让大模型基于检索结果生成回答。 RAG 与微调：RAG 适合动态知识、私有知识接入；微调适合固定知识、风格定制。 文本向量化：将文本转换为多维数值向量，通过计算向量距离衡量语义相似度。 向量数据库：解决海量非结构化数据的语义快速匹配问题，如 Redis Stack。 向量检索器：封装向量库检索能力，支持相似度检索、MMR 多样性检索等策略。"
date: 2026-11-11
category: "AI"
tags:
  - "AI大模型"
  - "RAG"
  - "LangChain"
  - "向量数据库"
permalink: /posts/2026-11-11-rag-retrieval-augmented-generation.html
---

【本章学习目标】

- 理解大语言模型知识截止、知识幻觉、无法访问私有领域知识、上下文窗口限制四大固有痛点的成因与业务落地表现。
- 掌握检索增强生成（RAG）定义、完整技术架构，清晰说明 RAG 如何针对性解决四大模型缺陷；区分 RAG 与模型微调的定位、适用场景、企业落地搭配方案。
- 吃透文本向量化底层原理与实操方法，熟练使用 OpenAIEmbeddings 完成文本向量化代码编写。
- 掌握向量存储核心作用，梳理主流向量数据库优缺点；精通 Redis 向量库配置、文档幂等去重方案，掌握 as_retriever() 检索器创建与检索参数配置。
- 掌握完整文档预处理全链路：各类文档加载器、RecursiveCharacterTextSplitter 分割器参数配置与设计原则，能根据文档格式选择对应加载/分割组件。
- 具备基于原生 LangChain Agent 搭建完整 RAG 系统实操能力，依靠 Agent 工具调用能力实现检索文档—判断有无相关资料—分支生成回答完整业务逻辑。
- 建立 RAG 是生产级大模型标准底座的认知，能结合农业种植、病虫害咨询等垂直业务选型匹配向量库、分割器、检索策略。

本章核心讲解检索增强生成（RAG）技术，专门解决原生大模型四大底层缺陷。先拆解大模型固有短板，引出「先检索、再生成」RAG 核心架构；分层讲解向量化、向量存储、文档预处理三大底层支撑模块；最后基于纯 LangChain 原生 Agent 搭建农业种植 PDF 知识库 RAG 综合案例，依靠 Agent 自主判断检索结果是否有效，分流实现两种回答逻辑，适配农业私有农技手册问答场景。

## 5.1 概述

### 5.1.1 大模型的四大固有痛点

大模型虽然强大，但它的底层机制决定了它存在无法通过自身优化彻底解决的缺陷：

（1）知识截止与时效性差

模型知识锁定在训练截止时间，无法获取训练结束后新政策、新品种、田间栽培新技术；更新知识需要重新预训练/微调，成本极高、周期漫长。

例如无法回答最新的农业补贴政策、刚发布的行业报告、实时的市场行情。

（2）知识幻觉

LLM 本质是概率文本生成模型，优先保证语句通顺连贯，而非输出客观事实，模型会一本正经地编造不存在的事实、数据、人名、文献或引用。

例如问“2026 年某作物新品种的亩产数据”，模型可能直接生成一个看似合理但完全虚假的数字。

知识幻觉在医疗、法律、金融、农业技术指导等专业领域或场景，幻觉即事故，会导致严重的决策错误。

（3）无法访问私有垂直领域知识

预训练数据源仅为公网公开内容，企业内部数据、田间实验报告、专属养殖规程无法被模型原生识别。

（4）上下文窗口限制

即使你把所有文档都发给模型，它能一次性“读”完的字数（Token）是有限的，因为 LLM 单次输入存在 Token 上限，无法一次性将成千上万页知识库全部传入模型处理。

### 5.1.2 检索增强的基础概念

1、定义

检索增强生成（Retrieval-Augmented Generation, RAG）是检索组件与大模型结合的标准技术架构，执行逻辑是在大模型生成回答前，先从外部知识库中检索和用户问题语义匹配的文档片段，再将检索片段作为上下文、结合用户提问一同送入 LLM，辅助 LLM 生成更准确、可靠、有依据的回答。

RAG 给大模型配了一个“动态知识库”，相当于给大模型外挂动态外部知识库，让模型回答问题时，先去查最新、最权威的资料，再基于查到的内容作答，而不是只依赖训练时学到的静态知识。

2、RAG 解决四大的痛点的底层逻辑

检索增强的核心逻辑是：把“死记硬背知识”的任务，从模型身上剥离，交给“检索系统”，模型只负责“理解问题、整合信息、生成回答”。

它通过以下机制，精准破解大语言模型的痛点：

（1）根除幻觉，提供事实依据

RAG 强制模型仅基于检索到的真实文档片段生成回答。模型不再凭空想象，答案有明确的来源（如“根据《番茄种植技术手册》第 3 章...”），实现了可追溯、可验证，从根源上抑制幻觉。

（2）实时更新知识，无需重训模型

知识存储在外部数据库（向量库）中。有了新数据、新政策，只需向向量库中追加或更新数据即可，模型本身无需任何改动。知识更新成本从“月级”降到“秒级”。

（3）无缝接入私有垂直领域知识

将企业内部文档、行业数据向量化后存入私有向量库。通用大模型瞬间变身“行业专家”或“内部客服”，完美适配垂直场景。

（4）突破上下文限制，处理海量数据

先通过检索从海量数据中筛选出最相关的少量片段，再将这少量信息喂给模型。用“检索”做粗筛，用“模型”做精答，用极小的代价处理 TB 级别的知识库。

### 5.1.3 检索增强生成与模型微调

1、模型微调的定义

模型微调（Fine-tuning），是在预训练大模型（Base Model）的基础上，使用特定场景的数据集对模型进行二次训练，通过小幅更新模型参数权重，让模型适配垂直领域知识、特定任务逻辑或输出风格的技术手段，属于大模型从“通用能力”走向“场景化能力”的核心路径。

预训练大模型是“通识学霸”，微调就是给这个学霸做“专项集训”，让它精通某个细分领域的知识、掌握特定的答题方式，成为“领域专家”。

2、RAG 与模型微调

1）RAG 的核心适用场景

RAG 的优势是灵活、准确、低成本，适合知识动态变化、对事实准确性要求高、需接入私有海量知识的场景，是企业级应用的主流选择：

（1）垂直领域专业问答：农业技术咨询（基于最新种植手册、育种数据）、医疗问诊（医学文献、病例）、法律助手（法条、判例），需保证答案无幻觉、可追溯；

（2）实时、动态知识场景：最新政策解读、行业数据查询、实时行情分析，知识需频繁更新；

（3）企业私有知识应用：内部文档问答、员工培训、客服知识库，需接入涉密、私有数据，兼顾隐私合规；

（4）海量知识检索场景：科研文献库、企业全量文档库，需从千万级数据中快速筛选相关信息。

2）模型微调的核心适用场景

微调的优势是定制化、低延迟、风格统一，适合知识固定、需深度定制模型能力、追求推理效率的场景：

（1）输出风格定制：企业客服需统一话术、教育场景需口语化讲解、公文生成需正式风格，微调可让模型贴合业务语言习惯；

（2）基础推理逻辑优化：模型原生推理能力弱（如简单计算、步骤拆解），通过微调数据强化特定推理逻辑；

（3）固定知识场景：标准化产品问答、固定流程指引，知识长期不更新，无需动态调整；

（4）低延迟需求场景：实时交互类应用（如智能语音助手），需减少检索环节，提升响应速度。

微调适合“教模型做事”，如学习特定回复格式、推理逻辑，而 RAG 适合“给模型知识”。在企业级应用中，两者通常结合使用：微调基座能力 + RAG 提供动态事实知识。

总之，检索增强是让大语言模型从“只会说漂亮话的通用助手”，升级为“懂专业、够准确、跟得上时代的可靠生产力工具”的必经之路。它解决了大模型落地的最后一公里问题：

- 可信：解决幻觉，让输出可依赖。
- 可用：接入私有数据，适配垂直业务。
- 实时：跟上最新信息，永不落伍。
- 经济：低成本迭代，快速落地变现。

因此，在当前的大模型应用开发体系中，检索增强（RAG）不是可选项，而是构建任何严肃、生产级 AI 应用的标准底座和核心架构。

## 5.2 向量存储

### 5.2.1 文本向量化

1、向量化的概念

AI 大模型相比于传统的数据检索，最大的区别在于能够“理解”人类的语言。比如你向 DeepSeek 问“你是谁”和“你叫什么名字”，DeepSeek 都能够把他们正确“理解”成一个相似的问题。那么计算机是如何理解这些相似的话语之间的意思呢？

我们知道，计算机并不能理解人类的语言，本质上，他只能进行各种各样的数据计算。所以要让计算机理解人类的语言，我们只能将语言拆成 Token，再将 Token 数据化，转成一串串的数字，这样才能让计算机通过计算的方式去理解 Token 之间的相似性，从而进一步理解语言背后的语义信息。

那么，我们如何用数字来表示语言，同时又要保留语言背后的语意呢？目前比较主流的方法是对语言进行一些语法和词法层面的分析，将一个文本转换成多维的向量，然后通过向量之间的计算来分析文本与文本之间的相似性。

向量代表一个有位置，有方向的变量。一个二维的向量可以理解为平面坐标轴上的一个坐标点(x,y)，他有 X 轴和 y 轴两个维度，在计算机中，就可以用一个二维的数组来表示(x,y)。类似的一个多维的数组就对应一个更多维度的向量。

向量化（Vectorization）就是将非结构化或结构化的数据，通过数学模型转换为低维、稠密的数值向量的过程。这个过程的核心目标是让计算机能够用数学方式理解、计算和比较数据的含义。

简单来说，就是把文字、图片、声音等“人类语言”，翻译成计算机能懂的“数学语言”。

在向量化的语境下，向量是一串有序的数字数组，例如：

    [0.12, -0.45, 0.89, ..., 0.31]

这串数字的长度称为维度（Dimension），常见的有 128 维、512 维、768 维、1024 维等。向量中的每一个数字，代表数据在某个抽象特征维度上的取值。语义相近的数据，其向量在空间中的距离也更近。

例如文本向量化：

①原始数据：苹果、香蕉、汽车
②向量化后：
- 苹果：[0.8, 0.1, 0.05, ...]
- 香蕉：[0.78, 0.12, 0.04, ...]
- 汽车：[0.02, 0.01, 0.9, ...]

③数学计算：通过计算向量间的余弦相似度或欧氏距离，计算机能立刻判断出：“苹果”和“香蕉”的距离更近，属于同类（水果）；而“汽车”与它们距离很远。

这就是向量化的魔力，它把抽象的语义，变成了可计算的几何关系。

2、向量化的主要作用

（1）统一多模态数据表达

文本、图像、音频、用户行为等不同模态的数据，最终都变成了同一种格式——数值向量，为跨模态分析提供了基础。

（2）支撑语义检索

传统搜索是关键词匹配（查字典），而向量搜索是语义匹配。例如搜索“如何防治小麦锈病”，即使文档中没有“锈病”二字，但只要内容相关，向量检索也能精准找到。

（3）降低存储与计算开销

稠密向量相比稀疏的编码，维度更低、信息密度更高，极大降低了计算复杂度和存储成本，是大模型时代的基础数据格式。

（4）驱动 AI 应用

大模型的知识库检索（RAG）、推荐系统、人脸识别、语音识别、聚类分析等核心功能，底层都依赖向量化技术。

【例 5.2-1】文本向量化

    # 通用代码
    import os
    from langchain_openai import OpenAIEmbeddings
    em_llm = OpenAIEmbeddings(
        base_url= os.getenv("BASE_URL"),
        api_key=os.getenv("OPENAI_API_KEY"),
        model= "BAAI/bge-m3", # 指定向量模型
    )

    #向量计算
    texts = ["苹果","香蕉","汽车"]
    embeddings = em_llm.embed_documents(texts)
    for text, embedding in zip(texts,embeddings):
        print(f'文本：{text}')
        print(f'向量：{embedding[:5]}...')

### 5.2.2 向量数据库

1、向量存储的定义

向量存储是专门用于持久化、索引、高速检索向量的专用数据库，是 RAG 架构底层存储基础设施，核心解决海量文本语义快速匹配问题。

简单来说，向量存储解决的核心问题是：如何快速从海量非结构化数据中，找到与用户查询“语义最相关”的内容，而非传统数据库的关键词精确匹配。

2、主流向量库对比

LangChain 支持如表 5.2-1 所示的多种向量数据库：

    数据库：Chroma
    特点：轻量级、内存/持久化，零服务部署
    适用场景：开发、小规模生产

    数据库：FAISS
    特点：Facebook 开源，单机高性能计算
    适用场景：大规模相似度搜索

    数据库：Zilliz Cloud
    特点：Milvus 云服务
    适用场景：企业级向量搜索

    数据库：AnalyticDB
    特点：阿里云向量引擎
    适用场景：云原生应用

    数据库：Tencent Cloud VectorDB
    特点：腾讯云向量数据库
    适用场景：腾讯云生态

    数据库：OpenSearch
    特点：AWS 开源搜索
    适用场景：企业搜索

    数据库：Qdrant
    特点：Rust 编写，高性能
    适用场景：生产级应用

    数据库：Redis Stack
    特点：内存数据库，亚毫秒级延迟
    适用场景：生产级应用

3、向量模型

OpenAIEmbeddings 是 LangChain 框架中用于对接 OpenAI 嵌入模型（Embedding Models）的核心类，主要功能是将文本转换为固定长度的向量（Embeddings），用于语义搜索、检索增强生成（RAG）、文本聚类、相似度计算等场景。

OpenAIEmbeddings 封装 OpenAI 的 Embeddings API 请求逻辑，无缝对接 LangChain 的向量数据库、检索器、RAG 链等组件，是构建检索类应用的基础。

OpenAIEmbeddings 初始化时的核心参数如表 5.2-3 所示：

    model：str，选择 OpenAI 嵌入模型
    dimensions：int，自定义输出向量维度，可按需缩减维度降低存储/计算成本，不损失核心语义
    api_key：str，传入 OpenAI API Key
    base_url：str，自定义 API 基础路径，兼容 OpenAI API 的第三方模型服务
    chunk_size：int，批量请求的文本分块大小，默认 2000（避免单次请求超出 API token 限制）

4、接口

在 LangChain 框架中，为向量存储提供了一套标准化的抽象接口 VectorStore。它对底层不同类型的向量存储和向量数据库（如本地轻量型、云端托管型、企业级自建型）的能力进行统一封装，提供通用的向量数据操作与语义检索 API，让开发者无需关注不同向量存储的底层实现差异，实现“一次编码、多存储适配”，大幅降低向量存储的接入、切换与开发成本。

VectorStore 与 Embeddings、Retriever 是 LangChain 向量应用的核心三角组件，分工明确、层层衔接：

- Embeddings：生产者，负责将非结构化文本转换为机器可识别的高维向量，是 VectorStore 的数据来源；
- VectorStore：管理者，负责向量的持久化、索引和底层相似度计算，是向量的仓库；
- Retriever：消费者，基于 VectorStore 封装的标准检索接口，向下游应用（如 RAG 链）提供简单的传入查询，返回相似文本能力，是 VectorStore 与业务层的桥梁。

VectorStore 接口定义了向量存储的基础核心能力，所有实现该接口的向量存储类都必须实现这些方法，保证调用逻辑的一致性。以下是最常用的核心方法：

1）批量导入向量

（1）from_texts(texts, embedding, metadatas=None)：从原始文本列表批量生成向量并导入 VectorStore，自动调用传入的 Embeddings 模型生成向量，支持传入元数据列表（与文本一一对应）；

（2）from_documents(docs, embedding)：从 LangChain 标准 Document 对象列表导入，Document 内置 page_content（文本内容）和 metadata（元数据），更适合结构化文档处理。

2）相似度搜索

（1）similarity_search(query, k=4, filter=None)：核心检索方法，传入原始查询文本（无需手动生成向量），自动调用 Embeddings 模型生成查询向量，返回前 k 个语义最相似的文本结果，支持 filter 参数按元数据过滤。返回结果为文档对象列表（List [Document]），每个 Document 对象包含核心属性：

- page_content：文档的文本内容（检索到的核心信息）
- metadata：文档元数据（如来源、页码、路径、时间等，用于溯源和过滤）

（2）similarity_search_with_score(query, k=4)：检索语义最相似的文档，并同步返回每个文档的相似度分数（核心为余弦相似度，部分实现为欧氏距离），分数越接近 1（余弦相似度）或越接近 0（欧氏距离）表示语义越相似，方便根据分数做二次筛选（如过滤低相似度结果）。返回结果除了文档对象列表（List [Document]），还包含 score 列表。

（3）similarity_search_by_vector(embedding, k=4, filter=None)：传入已生成的查询向量（适合批量查询/自定义向量场景），直接检索相似文本，避免重复生成向量，提升效率。

3）向量增删改

（1）add_texts(texts, metadatas=None)：批量添加新的文本及对应向量（自动生成）；
（2）add_documents(documents=documents, ids=ids)：批量添加结构化文档及对应向量，支持自定义 ID 实现幂等更新；
（3）delete(ids)：根据向量唯一 ID 删除指定向量及关联文本；
（4）update(ids, texts, metadatas=None)：根据 ID 更新文本、向量或元数据（部分实现支持）。

5、Redis 实现向量存储实操

企业级生产推荐使用 Redis-stack 作为向量存储的数据库。

VectorStore 提供了 Redis 的实现：

安装 langchain-redis：

    pip install langchain-redis redis

导入 RedisVectorStore 和 RedisConfig：

    from langchain_redis import RedisVectorStore,RedisConfig

1）RedisConfig 类

RedisConfig 是 LangChain 框架（langchain-redis 包）中用于统一配置 RedisVectorStore 核心参数的专用配置类，所有与 Redis 连接、向量索引、检索策略相关的配置均通过该类封装，让 RedisVectorStore 初始化更简洁、配置更集中，是对接 Redis 向量存储的核心配置入口。

RedisConfig 常用的核心参数如表 5.2-4 所示：

    redis_url：必传，Redis 连接地址，格式为 redis://[用户名:密码@]主机:端口/数据库编号
    index_name：必传，Redis 中向量索引的唯一名称，用于区分不同业务的向量库，多业务共用 Redis 时必须自定义，避免索引冲突
    distance_metric：可选，向量相似度计算策略，核心配置：
        - "COSINE"（余弦相似度），分数 0~1，越接近 1 语义越相似（推荐用）；
        - "L2"（欧氏距离），值越小越相似；
        - "IP"（点积），归一化向量下效果同余弦。
    embedding_dimensions：可选，向量维度
    key_prefix：可选，Redis 中存储向量文档的 Key 前缀，用于隔离同一索引下的不同数据，或避免与 Redis 中其他业务 Key 冲突，如设置为 "agri:"，则文档 Key 为 agri:doc_001
    redis_client_kwargs：可选，Redis 客户端额外配置参数，如超时时间、编码方式等，示例：{"socket_timeout": 10, "decode_responses": False}（decode_responses 需保持 False，适配向量二进制存储）

2）RedisVectorStore 类

RedisVectorStore 是 VectorStore 接口基于 Redis 实现的向量存储核心组件，实现文本向量持久化存储、高性能语义相似度检索、结构化元数据过滤。

初始化 RedisVectorStore 时仅需传入两个必要参数：

- config：RedisConfig 实例；
- embeddings：向量模型实例。

【例 5.2-2】Redis 向量入库和查询基础示例

    config = RedisConfig(
        index_name="agri_wheat",
        redis_url="redis://:123456@192.168.100.101",
        distance_metric="COSINE"
    )

    vector_store = RedisVectorStore(config=config, embeddings=em_llm)

    if __name__:
        texts = [
            "小麦抗旱播种每亩 10-12 公斤",
            "小麦拔节期每亩施用钾肥 10 公斤增强抗逆",
            "玉米密植每亩 4000-4500 株搭配滴灌"
        ]
        # 添加向量
        vector_store.add_texts(texts)
        # 查询向量
        res = vector_store.similarity_search_with_score(query="小麦播种用量",k=4)
        for doc,score in res:
            print(f"相似度 {score:.2f} 内容：{doc.page_content}")

【程序执行结果解读】

许多向量存储库为了统一接口（因为 L2 和 IP 都是距离概念，越小越好），在返回 score 时，默认返回的是 距离（Distance），score 通常代表“距离（Distance）”而非“相似度（Similarity）”，或者它是经过转换的距离值。

①如果底层使用的是“余弦距离”
定义：余弦距离 = 1 - 余弦相似度（cos(θ)）
余弦相似度范围：[-1,1]，越接近 1 越相似。
余弦距离范围：[0,2]，越接近 0 越相似。

示例的场景分析：
查询：“小麦播种用量”
结果 1：“小麦抗旱播种...” - 语义非常相关 - 余弦相似度可能为 0.78 - 余弦距离 = 1 - 0.78 = 0.22
结果 3：“玉米密植...” - 语义不相关 - 余弦相似度可能为 0.36 - 余弦距离 = 1 - 0.36 = 0.64

现象：0.22 < 0.64，所以分数越小，代表距离越近，相似度越高。

②如果底层使用的是“欧氏距离”（向量间的直线距离）
范围：[0,+∞)，越接近 0 越相似。
同样符合“分数越小，相似度越高”的逻辑。

6、幂等性去重

在【例 5.2-2】中，多次运行之后，在 RedisVectorStore 检索时出现重复数据，是因为文本未指定唯一 ID 导致重复保存。要保证 RedisVectorStore 中已存储的向量被新数据覆盖而非重复新增，必须依靠唯一文档 ID 的幂等性机制——为每个文档指定全局唯一的 ID，当使用相同 ID 再次执行添加操作时，RedisVectorStore 会自动覆盖该 ID 对应的原有向量、文本及元数据，从根本上避免重复数据，同时实现数据更新。

生产环境，彻底杜绝检索重复问题将文本转换成文档：

    from langchain_core.documents import Document
    docs = [Document(page_content=text) for text in texts]

生成的唯一 ID 的通用规则是计算取文本的 page_content 做 MD5 哈希码，确保相同文本生成相同 MD5：

    import hashlib
    ids = [hashlib.md5(doc.page_content.strip().encode("utf-8")).hexdigest() for doc in docs]

在调用 VectorStore 的 add_documents 方法时传入生成的唯一 ID，依托 RedisVectorStore 的唯一 ID 幂等性机制。

    vector_store.add_documents(documents=docs,ids=ids)

### 5.2.3 向量检索器

LangChain 中的检索器（Retriever）是连接外部知识库与大语言模型（LLM）的核心组件，核心作用是从海量文档和知识库中精准检索出与用户查询最相关的信息片段，并将这些信息作为上下文传递给 LLM，让模型基于检索到的知识 + 自身能力生成准确、贴合场景的回答，解决大模型知识过时、事实错误、上下文有限等核心问题。

检索器接受字符串查询作为输入，并返回文档列表作为输出，每个 Document 对象包含核心属性：

- page_content：文档的文本内容（检索到的核心信息）
- metadata：文档元数据（如来源、页码、路径、时间等，用于溯源和过滤）

LangChain 内置了多种开箱即用的检索器，适配不同场景需求。其中 VectorStoreRetriever 是基于语义嵌入的向量检索器，将查询和文档都转换为高维向量，通过余弦相似度、欧氏距离计算语义相似度。它与嵌入模型相结合，理解语义，捕捉文本深层关联。是生产环境 RAG 的首选。

向量检索器可以从向量存储创建，所有向量存储都可以转换为检索器：

    retriever = vector_store.as_retriever(...)

as_retriever() 是 LangChain 中所有 VectorStore（向量库）内置的核心方法，核心作用是将当前向量库实例直接转换为可直接使用的 VectorStoreRetriever，是 RAG 流程中向量库与检索器的桥梁，无需手动初始化 VectorStoreRetriever，直接通过向量库快速生成检索器，简化开发流程。

该方法会继承向量库的嵌入模型、文档向量数据等核心信息，同时支持通过入参灵活配置检索策略、返回数量、过滤规则等，最终返回一个开箱即用的检索器实例，可直接调用 invoke(query) 执行检索。

as_retriever() 的关键字参数：

（1）核心检索类型 search_type
定义检索器的核心算法策略。支持以下三种主流类型：

①similarity（默认）：
- 逻辑：基于向量相似度（如余弦相似度、欧氏距离等）进行排序，返回 Top-K 最相似的文档。
- 适用场景：绝大多数通用 RAG 场景，兼顾速度与效果，是基础首选。

②mmr (Maximal Marginal Relevance)：
- 逻辑：最大边际相关性检索。首先检索出 fetch_k 个候选文档，然后通过 MMR 算法在“相关性”和“多样性”之间进行权衡重排序，最终返回 k 个文档。
- 适用场景：需要避免结果冗余、希望获得多样化信息的场景（如文献综述、多维度问答）。

③similarity_score_threshold：
- 逻辑：基于相似度阈值的过滤检索。仅返回相似度分数高于指定 score_threshold 的文档。
注意：返回的文档数量是不固定的（可能为 0 到 k 之间），取决于有多少文档超过阈值。

（2）通用检索参数 search_kwargs
这是一个字典类型参数，用于向底层的向量存储搜索方法传递具体配置。不同 search_type 下有效的参数有所不同：

①k (int)：
- 含义：最终返回给用户的文档数量。
- 默认值：4（注意：这是 LangChain Retriever 层面的默认行为，具体取决于底层 VectorStore 的实现，但通常默认为 4）。
- 作用：控制上下文窗口的大小。

②filter (Dict 或特定格式)：
- 含义：基于文档元数据（metadata）进行预过滤或后过滤。
- 作用：仅检索符合特定条件（如 {"source": "news"}）的文档。具体语法取决于底层向量数据库（如 Chroma, Pinecone, FAISS 等）的支持情况。

（3）特定类型专属参数

①fetch_k (int)：
- 有效类型：仅对 mmr 类型有效。
- 含义：在 MMR 重排序之前，先从向量数据库中初步召回的候选文档数量。MMR 算法会从这个大小为 fetch_k 的池子中选出最终的 k 个文档。
- 默认值：通常为 20。如果 fetch_k 设置过小（如等于 k），MMR 将退化为普通的相似度搜索，失去多样性优势。

②lambda_mult (float)：
- 有效类型：仅对 mmr 类型有效。
- 含义：MMR 算法中多样性与相关性的权重系数。
- 范围：0 到 1。
    - 1：完全忽略多样性，等同于相似度搜索。
    - 0：完全忽略相关性，只追求最大多样性。
- 默认值：通常为 0.5。

③score_threshold (float)：
- 有效类型：主要对 similarity_score_threshold 类型有效。
- 含义：最低相似度阈值。只有相似度分数大于等于该值的文档才会被返回。
注意：在某些实现中，similarity 模式也可能支持此参数作为后过滤条件，但其核心用途是配合 similarity_score_threshold 搜索类型使用。

【例 5.2-3】检索器创建与基础问答链路

    from langchain_core.prompts import ChatPromptTemplate
    # 聊天模型
    llm = ChatOpenAI(
        base_url=os.getenv("BASE_URL"),
        api_key=os.getenv("OPENAI_API_KEY"),
        model=os.getenv("CHAT_MODEL"),
        temperature=0
    )
    # 向量数据库
    config = RedisConfig(
        index_name="agri_wheat",
        redis_url="redis://:123456@192.168.100.101",
        distance_metric="COSINE"
    )
    # 初始化向量数据库
    vector_store = RedisVectorStore(config=config,embeddings=em_llm)
    # 初始化向量检索器，配置核心参数
    retriever = vector_store.as_retriever(
        search_type="similarity",
        # 返回 Top3 相关文档
        search_kwargs={"k": 3}
    )
    prompt = ChatPromptTemplate.from_template("""
    请基于提供的上下文信息回答用户的问题，不要编造信息。如果上下文没有相关答案，请说明“暂无相关信息”。
    上下文：{context}
    用户问题：{question}
    """)
    # RAG 流程
    def rag_pipeline(question):
        """RAG 流程的逐步执行"""
        # 1. 检索相关文档
        retrieved_docs = retriever.invoke(question)
        # 2. 格式化上下文（将文档列表转换为字符串）
        context = "\n".join([doc.page_content for doc in retrieved_docs])
        # 3. 填充提示词模板
        formatted_prompt = prompt.invoke({"context": context, "question": question})
        # 4. 调用 LLM 生成回答
        llm_response = llm.invoke(formatted_prompt)
        # 5. 输出
        return llm_response.content

    if __name__ == "__main__":
        print("========测试 1========")
        query1 = "小麦拔节期如何施肥？"
        answer1 = rag_pipeline(query1)
        print(answer1)

        print("========测试 2========")
        query2 = "玉米拔节期如何施肥？"
        answer2 = rag_pipeline(query2)
        print(answer2)

将 VectorStore 转换为 VectorStoreRetriever 是 LangChain 构建 RAG 应用的关键设计，核心好处是让向量库的检索能力适配 LangChain 标准化生态，同时实现检索逻辑封装、使用简化、能力扩展，既降低了开发复杂度，又保证了组件间的兼容性和可扩展性。

## 5.3 RAG 综合实战：基于 Agent 的检索问答链路

虽然前面的 `rag_pipeline` 实现了基础的检索增强，但在实际的企业级应用中，用户的问题千变万化，如果仅仅依靠简单的 Top-K 检索，往往会遭遇“检索不到相关内容，大模型强行回答”的幻觉问题。因此，我们需要引入 Agent，通过工具调用的方式，让大模型自主判断“是否需要检索”、“检索结果是否有效”，从而自主决定后续逻辑。

（结合课程学习目标，下面补充 Agent 模式的 RAG 实操逻辑）

### 1、文档加载与分割预处理

在存入向量库前，通常需要对农业 PDF 手册进行预处理：

    from langchain_community.document_loaders import PyPDFLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    # 1. 加载文档
    loader = PyPDFLoader("./data/agri_manual.pdf")
    docs = loader.load()

    # 2. 文本分割（按段落/字符切分，保留重叠部分以维持语义连贯）
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", "。", "！", "？", " ", ""]
    )
    split_docs = text_splitter.split_documents(docs)

    # 3. 存入向量库（复用前文的 vector_store）
    vector_store.add_documents(split_docs)

### 2、将 Retriever 封装为 Agent Tool

为了让 Agent 能够自主决定何时检索，我们需要将向量检索能力封装为标准工具。

    from langchain.tools import tool
    from langchain_core.prompts import ChatPromptTemplate

    # 定义 Prompt
    rag_prompt = ChatPromptTemplate.from_template("""
    你是一个农业知识助手。请严格基于以下检索到的文档片段回答用户问题。
    如果文档片段中没有相关信息，请直接回复“知识库中暂无相关记载”，严禁自行编造。
    文档片段：{context}
    用户问题：{question}
    """)

    @tool
    def search_agri_knowledge(question: str) -> str:
        """
        用于查询农业种植、病虫害防治等专业领域的私有知识库。
        当用户询问具体的农技操作规程、农作物病害症状或特定药剂用法时调用此工具。
        """
        # 1. 调用检索器召回文档
        retrieved_docs = retriever.invoke(question)

        # 2. 如果没有检索到任何内容，直接返回提示
        if not retrieved_docs:
            return "未检索到相关专业资料，请尝试换种问法或依赖通用常识回答。"

        # 3. 判断相似度距离是否过大（可选，假设使用的是距离度量，这里略过具体判断，直接拼接）
        context = "\n".join([doc.page_content for doc in retrieved_docs])

        # 4. 调用 LLM 整合答案并返回给 Agent
        formatted_prompt = rag_prompt.invoke({"context": context, "question": question})
        llm_response = llm.invoke(formatted_prompt)

        return llm_response.content

### 3、构建带记忆的 RAG Agent

基于 LangChain 原生 Agent，构建具备判断能力的主控流。

    from langchain.agents import create_agent
    from langgraph.checkpoint.memory import InMemorySaver

    SYSTEM_PROMPT = """
    你是一位资深农业技术专家。
    规则：
    1. 优先使用 search_agri_knowledge 工具查询内部知识库。
    2. 如果工具返回“知识库中暂无相关记载”或“未检索到相关专业资料”，你可以结合自身的通用农业常识进行回答，但必须在回答开头注明【通用常识解答】。
    3. 任何情况下都不允许编造数据或凭空捏造不存在的药剂。
    """

    # 初始化记忆存储器
    memory = InMemorySaver()

    # 创建 Agent
    agri_rag_agent = create_agent(
        model=llm,
        tools=[search_agri_knowledge],
        system_prompt=SYSTEM_PROMPT,
        checkpointer=memory
    )

    def chat_with_agent(question: str, thread_id: str):
        config = {"configurable": {"thread_id": thread_id}}
        result = agri_rag_agent.invoke(
            {"messages": [("user", question)]},
            config=config
        )
        return result["messages"][-1].content

    # 测试
    if __name__ == "__main__":
        print(chat_with_agent("水稻稻瘟病怎么防治？", "user_001"))
        # 如果知识库没有该数据，Agent 会切换为通用常识回答
        print(chat_with_agent("如何种植火星土豆？", "user_001"))

## 流程图文字推演

### RAG 核心执行流程

用户提问 --> 将问题转为向量（Embeddings）
--> 在向量数据库中进行相似度检索（Retriever）
--> 检索出相关的文本片段（Context）
--> 将原始问题与检索到的文本片段拼接成完整的 Prompt
--> 发送给大语言模型（LLM）
--> 生成有事实依据的回答

### Agent 模式下的 RAG 分流流程

用户提问 --> 接收问题 --> Agent 思考判断
--> 调用 `search_agri_knowledge` 工具进行私有库检索
--> 判断相似度是否达标 / 结果是否为空

结果有效且达标 --> 基于检索内容生成严谨回答 --> 返回前端

结果无效或为空 --> 降级处理 --> 调用大模型通用知识生成回答 --> 附加【通用常识解答】标签 --> 返回前端

## 💡 **速记**

【核心考点】

大模型四大痛点：知识截止、知识幻觉、无法访问私有知识、上下文限制。RAG 是解决这四大痛点、构建企业级 AI 应用的标准底座。

RAG 与微调：RAG 负责“给模型提供动态知识”，微调负责“教模型特定风格与逻辑”，两者常结合使用。

文本向量化：将文本转为多维数值向量，保留语义。相似度计算常用“余弦相似度”（越接近 1 越相似）或“欧氏距离”（越接近 0 越相似）。

向量存储：Redis Stack 是高效的生产级选择。入库时强烈建议根据文本内容计算 MD5 生成唯一 ID，实现幂等去重，避免重复存入。

检索器优化：`as_retriever` 支持 `similarity`（基础）、`mmr`（增加多样性，避免重复）和 `similarity_score_threshold`（阈值过滤，保证相关性）。

【高频逻辑链】

RAG 基础链路：文档预处理（Load/Split） --> 向量化（Embedding） --> 入库（VectorStore） --> 检索（Retriever） --> 拼接 Prompt --> 生成回答。

Agent RAG 链路：提问 --> Agent 判断并调用检索工具 --> 若检索有结果则依据文档作答；若检索无结果则触发降级策略，依靠通用大模型兜底作答。

【关键避坑】

在使用向量检索的 `score` 时，需明确底层是距离（Distance）还是相似度（Similarity）。大部分距离度量（如欧氏距离、余弦距离）都是**数值越小，表示越相似**。

构建 RAG 时，一定要注意文本切分（Splitter）的粒度。切得太大容易超出大模型上下文限制或包含过多无关噪音；切得太小容易导致语义截断，检索出的片段缺乏完整信息。
