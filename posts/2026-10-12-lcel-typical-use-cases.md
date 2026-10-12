---
layout: article
title: "LCEL 典型应用场景"
description: "- \"场景一：带自定义工具的线性链式调用，通过 RunnableLambda 封装工具函数。\"   - \"工具链构建：提示词模板 -> LLM -> 输出解析器 -> 工具函数 1 -> 工具函数 2。\"   - \"强类型模型：使用 Pydantic 定义图片输入输出模型，包含参数校验逻辑。\"   - \"场景二：并行多任务链路，使用 RunnablePa"
date: 2026-10-12
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "LCEL"
permalink: /posts/2026-10-12-lcel-typical-use-cases.html
---

## 场景 1：带自定义工具的线性链式调用

Agent 原生循环逻辑不能直接用管道串联，需通过 RunnableLambda 封装工具函数适配 LCEL 链路。

【例 2.5-4】图像生成 + 保存完整工具链

功能：根据农业病害描述生成图像，自动下载保存本地，使用 Pydantic 强类型结构化输出。

智能体是循环调用的：提示词—模型—模型输出（决策）—工具调用—模型（结果）。所以带工具的智能体链式调用遵循以下步骤：

第一步定义基础链：提示词模板 | LLM | 输出解析器

第二步定义工具链：基础链 | 工具链 1 | 工具链 2 | ……

【程序代码】

    import os, time, requests
    from pydantic import BaseModel, Field, field_validator
    from langchain_core.prompts import ChatPromptTemplate
    from openai import OpenAI
    from langchain_core.output_parsers import PydanticOutputParser
    from langchain_core.runnables import RunnableLambda

    # 1. 定义图像输入输出强类型模型
    class Images(BaseModel):
        prompt: str = Field(description="图片生成提示词，农业领域相关",default=None)
        size: str = Field(description="图片分辨率",default="1024x1024")
        n: int = Field(description="图片数量", gt=1, lt=4,default=1)
        urls: list[str] = Field(description="图片远程 URL 列表或本地保存路径列表",default=None)
        timestamp: float = Field(description="图片生成时间戳",default=time.time())
        @field_validator("size")
        def validate_size(cls, value):
            valid_sizes = ["1024x1024", "960x1280", "768x1024", "720x1440", "720x1280"]
            if value not in valid_sizes:
                raise ValueError(f"分辨率无效，可选：{valid_sizes}")
            return value

    # 2. 封装工具函数
    # 2.1 封装图像生成工具函数
    def generate_image(params:Images) -> Images:
        """
        调用图像生成 API，返回图像 URL 列表
        参数：
        params: Images 图片参数
        返回：
        Images 图片输出模型
        """
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), base_url=os.getenv("BASE_URL"))
        response = client.images.generate(
            model="Kwai-Kolors/Kolors",
            prompt=params.prompt,
            size=params.size,
            n=params.n
        )
        return Images(
            prompt=params.prompt,
            size=params.size,
            n=params.n,
            urls=[item["url"] for item in response.images],
            timestamp=response.created
        )

    # 2.2 封装图片保存工具函数
    def save_image(images: Images) -> Images:
        """
        下载远程图片保存至本地，替换 URL 为本地文件路径
        参数：
        images: Images 图片输入模型
        返回：
        Images 图片输出模型
        """
        paths = []
        for i, url in enumerate(images.urls):
            file_name = f"{images.timestamp}_{i}.png"
            file_path = f"./{file_name}"
            img_response = requests.get(url)
            img_response.raise_for_status()
            with open(file_path, "wb+") as f:
                f.write(img_response.content)
            paths.append(file_path)
        return Images(
            prompt=images.prompt,
            size=images.size,
            n=images.n,
            urls=paths,
            timestamp=images.timestamp
        )

    # 3. 构建基础链路
    # 3.1 构建提示词
    PROMPT_TEMPLATE = """
    请根据以下用户描述，生成一个详细、专业的农业病害图片生成提示词：
    {user_input}

    要求：
    1. 包含病害特征的详细描述
    2. 描述叶片颜色、形状变化
    3. 增加光照、清晰度等要求
    4. 只输出优化后的提示词，不要其他内容
    5. 输出格式： {format_instructions}
    """
    prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    parser = PydanticOutputParser(pydantic_object=Images)
    prompt = prompt.partial(format_instructions=parser.get_format_instructions())

    # 3.2 构建基础链路
    base_chain = prompt | llm | parser

    # 4. 构建解析链路
    # 4.1 封装工具为 Runnable
    generate_image_runnable = RunnableLambda(generate_image)
    save_image_runnable = RunnableLambda(save_image)

    # 4.2 构建完整解析链路
    full_chain = base_chain | generate_image_runnable | save_image_runnable

    # 5. 链路调用测试
    if __name__ == "__main__":
        user_input = """
        描述：水稻稻叶上出现黄色小斑点，逐渐扩大并融合成斑块，黄化区域伴有霉层和小黑点等病菌特征。
        需求：绘制 2 张 720x1280 病害图片，要求清晰。"""
        try:
            result = full_chain.invoke(user_input)
            print(f"【结果】: \n{result}")
        except Exception as e:
            print(f"调用失败: {str(e)}")

## 场景 2：并行多任务链路

【例 2.5-5】图像生成 + 病虫害防治方案同时执行

基于上例图像生成链路，新增病虫害诊断防治链，使用 RunnableParallel 并发执行两个任务，同时返回图片本地路径与病害防治方案。

①添加一条病虫害防治方案调用链，并构建并行链：

    from langchain_core.runnables import RunnableParallel

    # 构建防治链（生成病虫害防治方案）
    # 提示词
    diagnosis_prompt = ChatPromptTemplate.from_messages([
        ("system","你是一个农业病虫害专家，请根据输入的病害描述，给出简单的病虫害防治方案"),
        ("human","{user_input}")
    ])

    # 输出格式
    diagnosis_parse = StrOutputParser()

    # 调用链
    diagnosis_chain = diagnosis_prompt | llm | diagnosis_parse

    # 构建并行链
    parallel_chain = RunnableParallel(images=full_chain,diagnosis=diagnosis_chain)

②调用并行链

    if __name__ == "__main__":
        user_input = """
        描述：水稻稻叶上出现黄色小斑点，逐渐扩大并融合成斑块，黄化区域伴有霉层和小黑点等病菌特征。
        需求：绘制 2 张 720x1280 病害图片，要求清晰。"""
        try:
            # 执行管道调用（一行代码完成所有流程）
            result = parallel_chain.invoke(user_input)
            print(f"【 生 成 图 片 】 : \n{result['images'].urls}\n【 防 治 方 案 】 : \n{result['diagnosis']}\n")
        except Exception as e:
            print(f"调用失败: {str(e)}")

## 流程图文字推演

### 场景一：线性链式调用流程

用户输入病害描述 --> 提示词模板生成完整提示词 --> 传入 LLM 生成响应 --> 通过 PydanticOutputParser 解析为 Images 模型对象 --> 传入 generate_image 工具生成图片 URL --> 传入 save_image 工具下载并保存图片至本地 --> 返回包含本地路径的 Images 对象

### 场景二：并行多任务链路流程

用户输入病害描述 --> RunnableParallel 分发请求

分支一（images） --> full_chain（生成图片 + 保存图片） --> 返回图片本地路径列表

分支二（diagnosis） --> diagnosis_chain（提示词 -> LLM -> 字符串解析器） --> 返回防治方案文本

合并两个分支的结果为字典 --> 返回给用户

💡 **速记**

【核心考点】

使用 RunnableLambda 可以将普通函数（如生成图片、保存图片）封装成 Runnable，从而接入 LCEL 管道。

构建带工具的线性链式调用步骤：构建基础链（提示词 | LLM | 解析器）--> 封装工具为 Runnable --> 使用管道符串联基础链与工具链。

使用 RunnableParallel 可以并行执行多个独立的链，返回结果以字典形式封装（键为分支名称，值为对应链的输出）。

【高频逻辑链】

线性链路构建：Prompt 模板定义（含 format_instructions）--> 创建 PydanticOutputParser --> 组装基础链（prompt | llm | parser）--> 封装工具（RunnableLambda）--> 串联完整链路（base_chain | tool1 | tool2）。

并行链路构建：定义分支链（如图片链、诊断链）--> 使用 RunnableParallel 组合 --> 调用 invoke 一次性获取所有分支结果。

【关键避坑】

工具函数必须通过 RunnableLambda 封装后才能接入管道，普通函数直接放入管道会报错。

在提示词模板中使用 PydanticOutputParser 时，必须通过 prompt.partial(format_instructions=parser.get_format_instructions()) 注入格式指令，否则模型输出格式可能不匹配导致解析失败。
