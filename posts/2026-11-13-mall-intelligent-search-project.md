---
layout: article
title: "云商城智能搜索的设计与实现"
description: "概述：面向电商业务的 AI 商品智能搜索微服务，基于大模型 + 向量检索实现自然语言查询。 功能：商品向量同步、查询条件结构化提取、Agent 智能推荐与会话记忆。 架构：FastAPI 提供 RESTful 接口，LangChain Agent 编排检索工具，Redis 存储向量与记忆。 工程化：基于 Pydantic 管理配置与数据模型，封装 Tools 工具类，统一异常响应格式。 数据同步：懒加载 MySQL 数据，自定义 Mapper 拼接文本，生成 MD5 保证幂等，分批写入向量库。"
date: 2026-11-13
category: "AI"
tags:
  - "微服务"
  - "AI大模型"
  - "RAG"
  - "智能搜索"
  - "LangChain"
permalink: /posts/2026-11-13-mall-intelligent-search-project.html
---

# 第九章 云商城智能搜索的设计与实现

## 9.1 智能搜索的设计与实现

### 9.1.1 构建智能搜索系统

#### 1、项目概述

本项目是面向电商业务的 AI 商品智能搜索微服务，基于大模型 + 向量检索技术，实现自然语言商品查询、条件解析、智能商品推荐、商品向量数据同步能力。用户使用口语化自然语言即可完成商品检索，系统自动识别价格、品牌、性能等需求，返回结构化商品推荐结果，解决传统关键词搜索需要用户精准输入搜索词的痛点，适配电商场景下用户模糊化、口语化查询诉求。

#### 2、主要功能

（1）商品向量同步能力：从 MySQL 读取商品原始数据，向量化处理后写入向量数据库，构建商品知识库，完成业务数据向 AI 检索知识库的转换。

（2）查询条件结构化提取：接收用户自然语言查询，通过大模型解析出结构化搜索条件，包括价格区间、品牌、产品特性等，把人类口语转化为机器可识别的筛选参数。

（3）Agent 智能商品推荐：基于 LangChain Agent 智能体，自主调用向量检索工具，结合会话记忆，完成多轮对话式商品推荐；支持 thread_id 区分不同用户会话，记住历史对话上下文。

（4）会话记忆能力：支持多轮对话，同一 thread_id 下可以承接上一轮搜索上下文，实现连续对话搜索。

（5）HTTP 接口服务：基于 FastAPI 对外提供 RESTful 接口，包含向量同步、商品推荐、条件提取接口，提供接口文档、全局异常捕获，方便业务系统对接调用。

（6）统一返回封装：统一响应体格式，成功 / 异常返回标准化 JSON 结构，便于前端、微服务调用方解析。

#### 3、技术实现逻辑

（1）数据准备阶段：调用同步接口读取 MySQL 商品数据，将商品描述文本向量化，连同价格、图片、SKU 名称等元数据存入向量库，构建商品知识库。

（2）用户查询处理：用户传入自然语言查询，可选择先执行条件提取链路，解析出价格上限、品牌等结构化筛选条件。

（3）Agent 智能体执行：LangChain Agent 接收用户 query 以及解析出来的过滤条件，自主调用向量检索工具；工具执行向量相似度召回。

（4）大模型整理输出：Agent 结合工具返回的商品素材，输出标准化的推荐结果，包含商品列表、推荐理由，输出为强类型结构体。

（5）会话记忆：通过 checkpoint 保存每轮对话，同一 thread_id 多轮查询可以复用上下文。

（6）HTTP 接口对外透出结果，全局异常捕获保证服务稳定性。

#### 4、项目产出结果

（1）一套可独立部署的 AI 搜索微服务，提供 REST 接口，其他业务系统可以直接 HTTP 调用，不需要关心底层大模型、向量库细节。

（2）支持自然语言模糊搜索，用户不需要记忆精确关键词，例如“5000 元以下续航强的华为手机”这类口语化查询可以得到符合条件商品。

（3）支持多轮会话搜索，用户可以延续上一次提问继续追问筛选。

（4）输出结构化 JSON 结果，包含商品 ID、SKU 名称、价格、图片、推荐理由，方便前端直接渲染页面。

#### 5、生产业务意义

（1）提升用户搜索体验：区别传统关键词搜索，支持口语化、模糊查询，降低用户搜索门槛，提升电商平台搜索体验，间接提升商品点击率。

（2）业务解耦：独立微服务，商品业务系统只需要调用 HTTP 接口，向量库、大模型逻辑全部封装在本服务，业务侧无需感知 AI 底层实现。

（3）可扩展：后续可以扩展更多工具，例如库存过滤、类目筛选；可以把内存会话存储替换为 Redis 持久化会话，支持生产环境多实例部署。

（4）标准化输出：强 Schema 约束大模型输出，降低大模型幻觉带来的格式错乱问题，保障业务系统稳定对接。

（5）数据闭环：支持从业务 MySQL 数据源一键同步商品向量，业务侧更新商品数据后，可以调用同步接口更新 AI 知识库，保证搜索内容和业务库数据一致。

#### 6、目录结构

系统的目录结构如下：

    mall-micro-ai-search/
      ├── .env                            # 环境变量
      ├── pyproject.toml                  # python 项目配置、依赖管理
      ├── src/                            # 源码根目录
      │   └── smart_search/               # 实际包名，可 pip 安装
      │       ├── main.py                 # FastAPI 入口
      │       ├── api/                    # 接口层：路由、请求响应
      │       │   └── v1.py               # /api/v1 接口
      │       ├── config/                 # 配置、提示词、工具封装
      │       │   ├── settings.py         # 管理配置
      │       │   ├── prompts.py          # 封装提示词
      │       │   └── tools.py            # 自定义工具定义
      │       ├── core/                   # 核心业务服务层
      │       │   ├── vector_sync_service.py # 数据同步接口
      │       │   └── search_service.py      # 智能搜索接口
      │       └── models/                 # pydantic schema、数据库 ORM 模型
      │           └── schemas.py          # 数据模型
      ├── tests/                          # 单元测试，与 src 包结构一一对应
      │   ├── test_vector_sync_service.py
      │   └── test_search_service.py
      ├── docs/                           # 文档
      └── logs/                           # 运行日志目录

命名规范说明：
- 包、模块文件全部 snake_case：Python PEP8 规范，禁止大驼峰文件名。
- 测试文件必须 test_ 开头：pytest 自动识别用例。
- 分层原则：
  - api：只处理 http 请求，不写业务逻辑，调用 core 层。
  - core：存放业务 service，向量同步、RAG 搜索核心逻辑。
  - config：配置、提示词、工具定义。
  - models：所有 pydantic schema / 数据结构。

#### 7、环境搭建

（1）创建开发环境：

    conda create -n rag_env python=3.13 -y

（2）创建项目环境：

进入项目创建 `pyproject.toml` 依赖管理文件，并激活开发环境，安装依赖。

    [project]
    name = "mall-micro-ai-search"
    version = "0.1.0"
    dependencies = [
        "fastapi>=0.112.0",
        "uvicorn>=0.30.0",
        "python-dotenv>=1.0.0",
        "pydantic-settings>=2.5.0",
        "pydantic>=2.10.0",
        "langchain>=1.2.10",
        "langchain_community>=0.4.0",
        "langchain-openai>=0.2.0",
        "langchain-redis>=0.2.0",
        "langgraph-checkpoint-redis>=0.2.0",
        "redis>=5.2.0",
        "pymysql>=1.1.0",
        "mysql-connector-python>=8.0.0",
        "sqlalchemy>=2.0.0",
        "langgraph>=1.2.10"
    ]

    [project.optional-dependencies]
    dev = [
        "pytest>=8.3.0"
    ]

    [tool.setuptools]
    package-dir = { "" = "src" }
    [tool.setuptools.packages.find]
    include = ["smart_search*"]

    [tool.pytest.ini_options]
    testpaths = ["tests"]
    pythonpath = ["src"]
    addopts = "-v"

    [build-system]
    requires = ["setuptools>=61.0"]
    build-backend = "setuptools.build_meta"

执行安装命令：

    conda activate rag_env
    pip install -e .

#### 8、基本配置

（1）.env 环境变量

    # MySQL
    MYSQL_HOST=192.168.100.101
    MYSQL_PORT=3306
    MYSQL_USER=root
    MYSQL_PASSWORD=root
    MYSQL_DB=shop_goods

    # Redis
    REDIS_URL=redis://:123456@192.168.100.101:6379
    REDIS_HOST=192.168.100.101
    REDIS_PORT=6379
    REDIS_PASSWORD=123456

    # 向量模型
    EMBED_MODEL=BAAI/bge-m3
    EMBED_BASE_URL=https://api.siliconflow.cn/v1
    EMBED_API_KEY=你的硅基流动api_key

    # 大语言模型
    LLM_MODEL=qwen3.7-flash-2026-07-15
    OPEN_API_KEY=你的百炼api_key
    BASE_URL=https://llm-7ydhlbtu5e3ldxca.cn-beijing.maas.aliyuncs.com/compatible-mode/v1

    # 向量库名称
    INDEX_NAME=sku_vector_index

（2）管理配置文件 settings.py

定义了一个名为 Settings 的配置类，继承自 BaseSettings。BaseSettings 是 Pydantic 提供的自动从环境变量读取配置的基类。一旦继承，类的字段就会自动去环境变量中找对应的值（不区分大小写）。

    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=".env", # 注意会优先读取 windows 环境变量
            env_nested_delimiter="__",
            env_file_encoding="utf-8",
            extra="ignore"
        )

        # MySQL
        MYSQL_HOST: str
        MYSQL_PORT: int
        MYSQL_USER: str
        MYSQL_PASSWORD: str
        MYSQL_DB: str

        # Redis
        REDIS_URL: str
        REDIS_HOST: str
        REDIS_PORT: int
        REDIS_PASSWORD: str

        # Embedding
        EMBED_BASE_URL: str
        EMBED_API_KEY: str
        EMBED_MODEL: str

        # LLM
        BASE_URL: str
        OPEN_API_KEY: str
        LLM_MODEL: str

        # Redis 向量索引名称
        INDEX_NAME: str

    settings = Settings()

（3）数据模型类 schemas.py

    from typing import Generic, List, Optional, TypeVar
    from pydantic import BaseModel, Field

    T = TypeVar("T")

    class GoodsInfo(BaseModel):
        """商品 SKU 信息"""
        id: int
        spu_id: int
        sku_name: str
        price: float
        sku_default_img: str

    class Result(BaseModel, Generic[T]):
        """接口通用返回体"""
        code: int = Field(default=200)
        msg: str = Field(default="操作成功")
        data: Optional[T] = None

    class SearchCondition(BaseModel):
        """从自然语言解析出来的商品搜索条件"""
        keyword: Optional[str] = Field(None, description="商品关键字，如手机、电视、骁龙865")
        min_price: Optional[float] = Field(description="最低价格", default=0)
        max_price: Optional[float] = Field(description="最高价格", default=100000)

    class ProductRecommendResponse(BaseModel):
        """商品大模型推荐返回结果"""
        summary: str = Field(description="总结导语")
        product_list: List[GoodsInfo] = Field(description="推荐商品列表")
        reason: List[str] = Field(description="整体推荐理由")

（4）基本工具类 tools.py

    from smart_search.config.settings import settings
    from langchain_core.embeddings import embeddings
    import mysql.connector
    from langchain_redis import RedisConfig
    from langchain_openai import OpenAIEmbeddings, ChatOpenAI
    from langchain_redis import RedisVectorStore
    import redis
    from sqlalchemy import create_engine

    class Tools:

        # 获取 MySQL 连接
        def get_mysql_conn(self):
            return mysql.connector.connect(
                host=settings.MYSQL_HOST,
                port=settings.MYSQL_PORT,
                user=settings.MYSQL_USER,
                password=settings.MYSQL_PASSWORD,
                database=settings.MYSQL_DB
            )

        # 获取 Redis 连接
        def get_redis_conn(self):
            return redis.Redis.from_url(
                url=settings.REDIS_URL,
                decode_responses=True,  # 自动将 bytes 解码为 str，避免手动解码
                socket_timeout=5,       # 连接超时时间
                retry_on_timeout=True   # 超时重试
            )

        # 获取向量模型
        def get_embeddings(self):
            return OpenAIEmbeddings(
                base_url=settings.EMBED_BASE_URL,
                api_key=settings.EMBED_API_KEY,
                model=settings.EMBED_MODEL
            )

        # 获取大语言模型
        def get_model(self):
            return ChatOpenAI(
                base_url=settings.BASE_URL,
                api_key=settings.OPEN_API_KEY,
                model=settings.LLM_MODEL,
                temperature=0.1,
                extra_body={
                    "enable_thinking": False
                }
            )

        # 获取向量库
        def get_vector_store(self):
            config = RedisConfig(
                index_name=settings.INDEX_NAME,
                redis_url=settings.REDIS_URL
            )
            return RedisVectorStore(
                embeddings=self.get_embeddings(),
                config=config
            )

        # 创建 SQLAlchemy 引擎
        def get_sql_engine(self):
            url = f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DB}"
            return create_engine(url)

    tools = Tools()

（5）系统提示词 prompts.py

    class Prompt:
        def __init__(self):
            self.SEARCH_EXTRACT_PROMPT = """
            你是商品搜索条件提取助手，根据用户查询提取商品筛选条件。
            需要提取的参数：
            1. keyword: 搜索关键词
            2. min_price: 最低价格，若没有提取到值，min_price=0
            3. max_price: 最高价格，若没有提取到值，max_price=100000
            示例：
            查询："我想买一个 2000-4000 元的小米手机"
            返回：{"keyword": "小米手机", "min_price": 2000, "max_price": 4000}

            只输出 JSON，不要额外文字：{format_instructions}"""

            self.SEARCH_PROMPT = """
            请严格依据上下文内真实信息回答用户问题，**严禁编造不存在的商品信息**。
            规则要求：
            1. 根据用户问题调用 vector_search_tool 工具检索商品知识库，返回的商品信息生成上下文；
            2. 仅使用上下文存在的数据进行商品推荐，并给出推荐理由；
            3. 若上下文没有匹配内容：summary="暂无相关信息", product_list=[], reason=[]；
            4. 输出格式必须是纯粹标准 JSON，禁止附带 Markdown、```json、注释等额外文字。"""

### 9.1.2 构建 RAG 数据同步

#### 1、数据同步接口

思路：将商品字段拼接为文档，增强语义搜索能力，再将文档存储到 Redis。

创建业务接口 vector_sync_service.py：

    import logging
    import hashlib
    import tiktoken

    from langchain_community.utilities import SQLDatabase
    from langchain_community.document_loaders import SQLDatabaseLoader
    from langchain_core.documents import Document
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    from smart_search.config.tools import tools

    logger = logging.getLogger(__name__)

    # 向量化配置常量
    CHUNK_SIZE = 256
    CHUNK_OVERLAP = 25
    BATCH_SIZE = 100
    TIKTOKEN_ENCODING = "cl100k_base"

    def tiktoken_len(text: str) -> int:
        """tiktoken 计算 token 长度"""
        tokenizer = tiktoken.get_encoding(TIKTOKEN_ENCODING)
        return len(tokenizer.encode(text))

    class ProductVectorSyncService:
        def __init__(self):
            self.sql_engine = tools.get_sql_engine()
            self.vector_store = tools.get_vector_store()

        @staticmethod
        def custom_page_content_mapper(row) -> str:
            """将商品字段拼接为文档 page_content"""
            fields = ["sku_name", "sku_attribute", "brand_name", "category_name", "price"]
            content_parts = [str(getattr(row, field, "")) for field in fields]
            return "。".join(content_parts)

        @staticmethod
        def custom_metadata_mapper(row) -> dict:
            """把数据库行全部字段填充为文档 metadata"""
            metadata = {}
            for key in row.keys():
                metadata[key] = getattr(row, key)
            return metadata

        @staticmethod
        def _generate_doc_id(doc: Document) -> str:
            """根据 sku_id+chunk 内容生成 md5 唯一文档 id"""
            raw = f"{doc.metadata['id']}_{doc.page_content.strip()}".encode("utf-8")
            return hashlib.md5(raw).hexdigest()

        def load_sku_from_mysql(self) -> str:
            """
            从 MySQL 读取 SKU 商品，流式分批写入 Redis 向量库
            :return: 执行结果信息字符串
            """
            db = SQLDatabase(self.sql_engine)
            sql_query = """
                SELECT
                    id, spu_id, price, sku_name, sku_attribute, brand_name, category_name, sku_default_img
                FROM sku_info WHERE deleted=0
            """

            loader = SQLDatabaseLoader(
                query=sql_query,
                db=db,
                page_content_mapper=self.custom_page_content_mapper,
                metadata_mapper=self.custom_metadata_mapper,
            )

            # 懒加载数据，避免一次性加载所有数据到内存中
            doc_iterator = loader.lazy_load()

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=CHUNK_SIZE,
                chunk_overlap=CHUNK_OVERLAP,
                separators=["\n\n", "\n", "。", "，", " ", ""],
                length_function=tiktoken_len,
                strip_whitespace=True
            )

            batch_docs: list[Document] = []
            total_chunk = 0

            # 分批次处理数据
            for doc in doc_iterator:
                chunk_texts = splitter.split_text(doc.page_content)
                for chunk in chunk_texts:
                    chunk_doc = Document(page_content=chunk, metadata=doc.metadata.copy())
                    batch_docs.append(chunk_doc)
                    total_chunk += 1

                # 达到批次阈值，批量写入向量库
                if len(batch_docs) >= BATCH_SIZE:
                    doc_ids = [self._generate_doc_id(d) for d in batch_docs]
                    self.vector_store.add_documents(documents=batch_docs, ids=doc_ids)
                    logger.info(f"批量入库 {len(batch_docs)} 条，累计分片：{total_chunk}")
                    batch_docs.clear()

            # 处理剩余不足一整批的数据
            if batch_docs:
                doc_ids = [self._generate_doc_id(d) for d in batch_docs]
                self.vector_store.add_documents(documents=batch_docs, ids=doc_ids)
                logger.info(f"收尾入库 {len(batch_docs)} 条分片")

            result_msg = f"MySQL 数据向量化入库完成！总分片数量：{total_chunk}"
            logger.info(result_msg)
            return result_msg

#### 2、测试

（1）创建测试类 test_vector_sync_service.py：

    from smart_search.core.vector_sync_service import ProductVectorSyncService

    if __name__ == "__main__":
        svc = ProductVectorSyncService()
        result = svc.load_sku_from_mysql()
        print(result)

（2）执行测试：

    python -m tests.test_vector_sync_service

测试结果如下：

    MySQL 数据向量化入库完成！总分片数量：27

## 流程图文字推演

### RAG 数据同步与智能搜索流程

数据同步：
连接 MySQL -> SQLDatabaseLoader 懒加载数据 (lazy_load)
-> 经过 custom_page_content_mapper 拼接文本，custom_metadata_mapper 获取元数据
-> 经 RecursiveCharacterTextSplitter 按 Token 切分
-> 累积到批次阈值 (BATCH_SIZE)
-> 生成 MD5 唯一 ID
-> 写入 Redis 向量库 (RedisVectorStore)

智能搜索：
用户发送自然语言提问
-> 调用 LLM 提取结构化搜索条件 (SearchCondition)
-> LangChain Agent 接收提问及条件
-> Agent 调用向量检索工具 (as_retriever)
-> 从 Redis 向量库召回相似商品信息
-> 大模型基于召回信息与强 Schema (ProductRecommendResponse) 生成推荐结果
-> FastAPI 统一封装 Result 对象返回前端

## 💡 **速记**

【核心考点】

云商城智能搜索的核心架构是“微服务 + RAG + Agent”。

工程化规范：通过 Pydantic Settings 管理环境变量配置，定义严格的 Schema 保证输入输出格式（如 `Result`, `SearchCondition`, `ProductRecommendResponse`）。

数据同步防溢与幂等：数据入库时必须使用 `lazy_load` 逐行流式处理，使用 `BATCH_SIZE` 分批写入。为防止重复写入，采用“业务ID + 文本内容”计算 MD5 作为唯一文档 ID。

【高频逻辑链】

数据流向：业务表 (MySQL) --> 懒加载 (Loader) --> 文本切分 (Splitter) --> 向量化 (Embeddings) --> 向量库 (Redis)。

搜索链路：自然语言 Query --> Agent 意图识别与条件抽取 --> 向量检索召回商品 --> 大模型结构化输出 (JSON) --> HTTP 响应。

【关键避坑】

大模型输出带有 Markdown 格式的 JSON（如包裹 ```json）会导致后端 JSON 反序列化失败。必须在 Prompt 中明确约束“只输出纯粹标准 JSON，禁止附带额外文字”。

自定义 `page_content_mapper` 时，遇到空字段（None）需要转为空字符串（`str(getattr(row, field, ""))`），防止字符串拼接或向量化报错。
