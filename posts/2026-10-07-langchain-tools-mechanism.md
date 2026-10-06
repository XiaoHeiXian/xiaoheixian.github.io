---
layout: article
title: "LangChain Tools 工具机制与实战"
description: "- \"定义：大语言模型通过 Tools 机制突破自身能力局限，获取实时外部数据。\"   - \"核心逻辑：由大模型自主判断需求，主动调用外部 API、本地函数或第三方服务。\"   - \"工具作用：连接外部资源、执行实体操作任务、消除 AI 幻觉并提升决策准确度。\"   - \"闭环流程：模型决策 -> 工具调用 -> 数据回传 -> 结果整合，依赖四大组件协"
date: 2026-10-07
category: "AI"
tags:
  - "AI大模型"
  - "LangChain"
  - "工具调用"
permalink: /posts/2026-10-07-langchain-tools-mechanism.html
---

大语言模型的知识全部来源于训练阶段的数据集，模型固化的训练数据存在时间截止点，无法获取实时、动态外部信息，也不能主动执行各类程序操作。想要突破模型自身能力局限，拓展模型可处理任务的边界，LangChain 提供的 Tools 工具机制是标准解决方案。

工具机制的核心逻辑是由大模型自主判断需求，主动调用外部 API、本地函数、第三方服务，获取真实外部数据并交给模型整合分析，以此弥补模型静态知识库的短板。

## 1、工具的作用

LangChain 工具作为智能体对接外部世界的标准载体，核心能力分为三类：

（1）连接各类外部资源：可访问数据库、实时公开 API（天气、日期、股票等）、本地文本文件、网页文本；

（2）执行实体操作任务：运行 Python 计算代码、发送 HTTP 网络请求、调用计算器、读写 Excel 表格；

（3）消除 AI 幻觉，提升决策准确度：模型不再单纯依靠训练数据凭空编造内容，可依托工具返回的客观真实数据生成回答，大幅降低虚假输出概率。

【例 2.3-2】无工具智能体：直观展示模型“幻觉”问题

【程序代码】

    if __name__ == "__main__":
        result = llm.invoke("今天是几号？ ")
        print(result.content)

【执行结果解读】

原生大模型无法获取设备实时系统时间，训练数据集仅包含历史时间信息。即便模型能够输出一个日期数字，该结果大概率与真实当前日期不符，这种现象称为 AI 幻觉。

想要解决该问题，为模型补充获取实时信息的能力，就需要引入 Tools 工具机制，给模型提供可调用的外部数据获取渠道。

## 2、LangChain 工具标准使用闭环流程

LangChain 智能体调用工具遵循模型决策—工具调用—数据回传—结果整合标准化闭环，整套流程依赖四大核心组件协同工作：

- Tool 工具：封装单一完整功能的函数，如日期读取、天气查询、数值计算；
- Agent 智能体：整体调度核心，自主判断是否需要调用工具、选用哪一款工具、填充哪些入参；
- LLM 大模型：驱动智能体完成语义理解、需求拆解、工具参数生成的推理核心；
- Toolkit 工具集：将功能相近的多款工具打包封装，例如数据库工具集包含连接、查询、插入工具。

## 3、自定义工具创建规范

（1）@tool 装饰器

LangChain 创建自定义工具最简便、最通用的方式是使用 @tool 装饰器封装 Python 函数，装饰器从 langchain.tools 包导入 LangChain。

默认规则：工具名称自动复用函数名；工具描述直接读取函数内部文档注释（docstring），大模型依靠这段注释判断工具适用场景、入参要求，因此工具注释必须清晰完整。

写法 1：基础无参装饰器

    @tool
    def get_current_datetime() -> str:
        """
        获取当前系统标准北京时间，包含年月日、星期
        用于回答所有时间、日期、年份相关提问
        返回：标准化格式化时间字符串
        """
        week_list = ["星期一","星期二","星期三","星期四","星期五","星期六","星期日"]
        now = datetime.datetime.now()
        week = week_list[now.weekday()]
        return f"当前时间：{now.strftime('%Y年%m月%d日')} {week}"

写法 2：自定义工具名称

如需修改模型识别的工具名称，可在装饰器中传入字符串参数重命名：

    @tool("get_today_date")

写法 3：精细化参数描述工具

工具支持接收自定义入参，需在函数注释中清晰标注参数名称、参数类型、参数含义、示例，大模型可自动识别参数结构并完成参数填充，如【例 2.1-2】的天气工具：

    @tool
    def get_weather_for_location(city: str) -> str:
        """
        获取指定中文城市近 3 天天气预报
        参数 city：国内/海外城市中文名称，如南昌、深圳、北京
        返回：标准化天气 JSON 文本，包含实时温度、昼夜气温、天气状况
        """

当用户提问南昌今天的天气如何时，智能体会自动提取“南昌”作为 city 参数传入工具执行。

（2）工具开发注意事项

- 函数参数必须添加类型注解，框架可自动识别参数结构生成参数校验规则 reference...；
- 文档注释是模型识别工具的唯一依据，注释模糊会导致智能体不会调用、传参错误；
- 工具内部建议增加异常捕获逻辑，接口超时、参数错误时返回友好提示文本，避免程序中断。

【例 2.3-3】搭建气象咨询专用智能体

本案例基于 LangChain 框架搭建气象咨询专用智能体，全部网络接口统一使用国内平台接口盒子（apihz.cn）免费 API，实现三大核心能力：自动获取本地系统日期、通过公网 IP 自动定位用户所在城市、输入城市名称查询当日天气预报。

① 依赖包导入

    import datetime
    import requests
    from langchain.tools import tool
    from langchain.agents import create_agent

② 三大工具模块

工具 1：get_current_date 获取系统当前日期

功能：读取本地系统时间，匹配中文星期，输出标准化日期字符串

触发规则：用户提问未指定查询日期时，智能体自动调用

    @tool
    def get_current_date() -> str:
        """
        获取本机系统当前年月日、星期；用户提问未指定查询日期时自动调用
        返回：格式化日期字符串
        """
        week_list = ["星期一","星期二","星期三","星期四","星期五","星期六","星期日"]
        now = datetime.datetime.now()
        week = week_list[now.weekday()]
        return f"当前日期：{now.strftime('%Y年%m月%d日')} {week}"

工具 2：get_current_city 自动 IP 定位城市（双层嵌套结构）

该工具分为内层辅助函数 get_current_ip、外层智能体工具 get_current_city。

内层函数 get_current_ip（非 @tool 工具，仅内部调用）

    def get_current_ip() -> str:
        """
        获取公网 IP
        返回：公网 IP；定位失败则返回引导文本
        """
        try:
            # 获取公网 IP，需要到接口盒子 https://apihz.cn/api/chaip.html 去申请 id 和 key
            url = "https://cn.apihz.cn/api/ip/getapi.php?id=10019433&key=fe034a161aeec2bf45f841b6024e898b"
            ip_res = requests.get(url, timeout=8)
            ip_res.raise_for_status()
            data = ip_res.json()
            if data.get("code") != 200:
                return "无法获取公网 IP"
            return data.get("ip")
        except Exception as err:
            return "无法获取公网 IP: {str(err)}"

外层工具 get_current_city（@tool 标记，智能体可直接调用）

执行逻辑：先调用 get_current_ip 拿到公网 IP，再将 IP 传入归属地查询 API。

解析接口返回 shi 字段（城市名称），成功则返回城市名；接口异常、无城市数据则返回友好失败提示。

触发规则：用户提问未写明查询城市时，智能体自动调用，实现无需用户手动输入城市即可查询本地天气。

    @tool
    def get_current_city() -> str:
        """
        用户提问未提供城市时自动调用，通过公网 IP 获取归属城市
        返回：IP 归属城市；定位失败则返回引导文本
        """
        try:
            # 获取公网 IP
            ip = get_current_ip()
            # 获取归属城市
            url = f"https://cn.apihz.cn/api/ip/chaapi.php?id=10019433&key=fe034a161aeec2bf45f841b6024e898b&ip={ip}"
            ip_res = requests.get(url, timeout=8)
            ip_res.raise_for_status()
            data = ip_res.json()
            if data.get("code") != 200:
                return "未知城市"
            city = data.get("shi")
            if city:
                return city
            else:
                return "未知城市"
        except Exception as err:
            return f"自动定位城市失败：{str(err)}"

工具 3：get_weather_by_city_name 城市天气查询工具

功能：根据中文城市名称直接查询 7 日天气预报

    @tool
    def get_weather_by_city_name(city: str) -> str:
        """
        根据中文城市名称直接查询 7 日天气预报
        参数 city：中文城市名称，例如南昌、北京、上海
        返回：当日天气
        """
        url = f"https://cn.apihz.cn/api/tianqi/tqyb.php?id=10019433&key=fe034a161aeec2bf45f841b6024e898b&place={city}&day=7"
        try:
            res = requests.get(url, timeout=10)
            res.raise_for_status()
            data = res.json()
            # 接口返回非 200 代表查询失败
            if data.get("code") != 200:
                return f"天气查询失败：{data.get('msg')}，请确认城市名称正确"
            return data
        except Exception as err:
            return f"气象接口请求异常，查询失败：{str(err)}"

③ 系统提示词 SYSTEM_PROMPT 规则

提示词是智能体最高优先级执行约束，定义 5 条硬性运行规则，管控智能体全部行为：

    SYSTEM_PROMPT = """"
    你是专业气象咨询助手，严格遵守以下执行规则：
    1. 处理用户天气提问时，自动判断缺失信息：
       1.1 提问未写明查询城市:自动调用 get_current_city 获取本地城市
       1.2 提问未写明查询日期:自动调用 get_current_date 获取当天日期
    2. 天气查询固定流程：
       仅需调用 get_weather_by_city_name 工具，直接传入城市名称即可查询天气
    3. 数据真实性约束：
       禁止编造城市、日期、气温、天气状况，所有气象数据必须通过工具获取
    4. 异常处理规则：
       工具返回报错、定位失败、城市不存在等信息，直接原样告知用户，不得自行编造修正
    5. 输出规范：
       最终回答整合三项信息：查询日期、目标城市、当日完整天气预报（天气、气温、风向、风级），回答清晰完整。
    """"

④ 智能体组装

    agent = create_agent(
        model=llm,
        tools=[get_current_date, get_current_city, get_weather_by_city_name],
        system_prompt=SYSTEM_PROMPT
    )

⑤ 测试入口（main 函数）

程序提供三组典型用户提问测试用例，覆盖全部业务场景，验证智能体自动补全缺失信息、工具自主调度能力：

    if __name__ == "__main__":
        # 测试 1：指定城市，无日期，自动补全今日日期
        msg1 = ["查询南昌的天气"]
        res1 = agent.invoke({"messages": msg1})
        print("=====测试 1 输出=====\n", res1["messages"][-1].content)
        print("-" * 80)

        # 测试 2：无城市、无日期，自动 IP 定位城市+自动获取今日日期
        msg2 = ["天气怎么样"]
        res2 = agent.invoke({"messages": msg2})
        print("=====测试 2 输出=====\n", res2["messages"][-1].content)
        print("-" * 80)

        # 测试 3：同时指定城市与日期(7天内)
        msg3 = ["查询 2026 年 07 月 30 日北京的天气"]
        res3 = agent.invoke({"messages": msg3})
        print("=====测试 3 输出=====\n", res3["messages"][-1].content)

【程序执行结果解读】

本程序基于 LangChain @tool 装饰器封装三类独立工具，通过 create_agent 构建具备自主推理、工具自动调用能力的气象智能体，实现自动化交互设计：用户模糊提问无需补充参数，智能体自动获取本地城市、今日日期，降低用户操作成本。并依靠系统提示词强约束 AI 行为，从根源杜绝 AI 幻觉、编造数据。

LangChain 智能工具是由 Agent 自主调度、封装单一业务能力、内置异常捕获的可调用功能组件。引入工具后，模型可获取真实客观的外部实时数据，从根源减少 AI 幻觉；同时大幅拓展模型可处理任务范围，显著提升复杂业务任务的处理准确度与稳定性。

## 4、流程图文字推演

### 智能体工具调用闭环流程

用户提问 --> Agent 智能体接收输入 --> LLM 解析意图与需求拆解 --> 判断是否需要工具及缺失参数

若缺少城市信息 --> 调用 get_current_city 工具 --> 通过公网 IP 自动定位并返回城市名

若缺少日期信息 --> 调用 get_current_date 工具 --> 读取本地系统时间并返回日期

获取到完整参数后 --> 调用 get_weather_by_city_name 工具 --> 请求外部天气 API --> 返回原始天气数据 --> LLM 整合所有信息 --> 输出标准化天气报告给用户

💡 **速记**

【核心考点】

Tools 机制的核心逻辑是大模型自主判断需求并调用外部 API 或本地函数，以突破训练数据的时间截止点限制，解决 AI 幻觉问题。

工具创建使用 @tool 装饰器，核心依赖函数的文档字符串（docstring），大模型依靠该注释判断工具适用场景与入参要求。

【高频逻辑链】

工具调用闭环：模型决策（判断是否需要工具） -> 工具调用（传入参数） -> 数据回传（获取外部数据） -> 结果整合（模型生成最终回答）。

工具创建规范：添加类型注解 -> 编写清晰文档字符串（描述用途、参数、返回） -> 内部增加异常捕获逻辑。

【关键避坑】

文档字符串是模型识别工具的唯一依据，注释模糊会导致智能体不会调用或传参错误，必须清晰准确。

工具内部必须增加异常捕获（try-except），接口超时或参数错误时返回友好提示文本，避免整个程序崩溃。

在系统提示词（SYSTEM_PROMPT）中需明确规范工具调用逻辑与异常处理规则，强制模型在对应场景下必须使用工具，保障输出可信度。
