window.BLOG_ARTICLES = [
  {
    "id": "2026-09-30-message-queue",
    "title": "消息队列",
    "url": "posts/2026-09-30-message-queue.html",
    "publishedAt": "2026-09-30",
    "category": "云商城",
    "tags": [
      "微服务",
      "消息队列"
    ],
    "summary": "- \"同步调用：系统A直接调用系统B，互相依赖，一个故障全链路报错\"   - \"异步调用：系统A发消息给MQ后直接返回，系统B自行拉取处理，实现解耦\"   - \"三大核心作用：异步化提升性能、降低耦合度、流量削峰\"   - \"异步化性能对比：无MQ 220ms，有MQ 25ms\"   - \"流量削峰：A集群抗1万QPS，B集群控制在6000QPS读取DB"
  },
  {
    "id": "2026-09-30-seata-at-transaction-impl",
    "title": "分布式事务实现（Seata）总结",
    "url": "posts/2026-09-30-seata-at-transaction-impl.html",
    "publishedAt": "2026-09-30",
    "category": "云商城",
    "tags": [
      "微服务",
      "分布式事务",
      "Seata"
    ],
    "summary": "- \"核心角色：TM(事务管理器,发起方)、RM(资源管理器,执行方)、TC(事务协调者,服务端)\"   - \"第一阶段：本地事务执行（获取XID、生成前后镜像、写UNDO_LOG、提交本地事务）\"   - \"第二阶段-全局提交：TC通知RM，异步删除UNDO_LOG，释放全局锁\"   - \"第二阶段-全局回滚：TC通知RM，根据UNDO_LOG反向补偿"
  },
  {
    "id": "2026-09-30-ai-coding-demos",
    "title": "AI 编程入门案例",
    "url": "posts/2026-09-30-ai-coding-demos.html",
    "publishedAt": "2026-09-30",
    "category": "AI",
    "tags": [
      "AI",
      "编程",
      "Copilot"
    ],
    "summary": "- \"案例1：AI辅助前端开发——本地记账小工具（纯HTML，本地存储）\"   - \"案例1步骤：建文件夹 -> VS Code打开 -> 发送Prompt -> 审核代码 -> 生成index.html\"   - \"案例2：数据可视化实践——农作物数据分析（CSV，数据清洗+图表+报告）\"   - \"案例2准备：复制CSV文件，安装pandas（con"
  },
  {
    "id": "2026-09-29-jupyter-notebook",
    "title": "Jupyter Notebook 交互式编程环境",
    "url": "posts/2026-09-29-jupyter-notebook.html",
    "publishedAt": "2026-09-29",
    "category": "AI",
    "tags": [
      "开发环境",
      "Jupyter"
    ],
    "summary": "- \"Jupyter定义：基于Web的交互式编程环境，用于数据科学、机器学习\"   - \"核心特点：交互式编程（实时执行展示结果）、富文档混合（Markdown/LaTeX/HTML）\"   - \"安装方式：Anaconda预装、VSCode创建.ipynb、手动conda install\"   - \"核心快捷键：Y(代码)、M(Markdown)、DD"
  },
  {
    "id": "2026-09-28-project-env-setup",
    "title": "项目开发环境标准化搭建",
    "url": "posts/2026-09-28-project-env-setup.html",
    "publishedAt": "2026-09-28",
    "category": "AI",
    "tags": [
      "AI",
      "开发环境",
      "Conda",
      "VSCode"
    ],
    "summary": "- \"Conda核心功能：包管理、环境管理、跨平台支持\"   - \"Conda与pip区别：多语言包 vs 仅Python包，隔离性强 vs 弱\"   - \"安装选型：Anaconda(完整版,约3GB) vs Miniconda(轻量版,约100MB)\"   - \"Windows安装：Next -> I Agree -> All Users/Just"
  },
  {
    "id": "2026-09-28-ai-llm-basics",
    "title": "AI大模型核心认知",
    "url": "posts/2026-09-28-ai-llm-basics.html",
    "publishedAt": "2026-09-28",
    "category": "AI",
    "tags": [
      "AI",
      "LLM",
      "MaaS"
    ],
    "summary": "- \"搜索到模型：搜索是找东西(关键词匹配)，大模型是造东西(语义理解并生成答案)\"   - \"四大特征：参数规模庞大、训练数据海量、算力需求极高、涌现能力\"   - \"分类维度：按模态(纯文本/多模态/视觉)、按功能(生成式/推理型/具身智能)\"   - \"底层原理：概率式文本生成，Transformer架构，全局注意力机制\"   - \"核心边界：模拟"
  },
  {
    "id": "2026-09-28-ai-rag-langchain",
    "title": "AI+RAG 与 LangChain",
    "url": "posts/2026-09-28-ai-rag-langchain.html",
    "publishedAt": "2026-09-28",
    "category": "AI",
    "tags": [
      "AI",
      "RAG",
      "LangChain"
    ],
    "summary": "- \"搜索现状：ES 擅长关键词匹配、过滤聚合、高并发，但不懂意图\"   - \"ES 痛点：缺乏语义理解、无法多轮对话、不能对比推荐\"   - \"引入 AI+RAG：不是替代 ES，而是补齐‘理解用户、辅助决策’的短板\"   - \"新增能力1：AI Agent 智能导购（意图理解、多轮对话、对比决策）\"   - \"新增能力2：语义搜索与以图搜图（向量匹配"
  },
  {
    "id": "2026-09-28-linux-disk-swap",
    "title": "Linux 磁盘扩容和创建虚拟内存",
    "url": "posts/2026-09-28-linux-disk-swap.html",
    "publishedAt": "2026-09-28",
    "category": "Linux",
    "tags": [
      "Linux",
      "运维",
      "磁盘"
    ],
    "summary": "- \"创建虚拟内存：查看内存(free -h) -> 创建文件(dd) -> 设置权限(chmod) -> 格式化(mkswap) -> 启用(swapon) -> 开机自启(fstab)\"   - \"磁盘扩容：虚拟机设置扩展硬盘 -> fdisk 创建分区 -> partprobe 刷新 -> mkfs 格式化 -> mount 挂载 -> fstab"
  },
  {
    "id": "2026-09-28-seata-distributed-transaction",
    "title": "分布式事务实现（Seata）",
    "url": "posts/2026-09-28-seata-distributed-transaction.html",
    "publishedAt": "2026-09-28",
    "category": "云商城",
    "tags": [
      "微服务",
      "分布式事务",
      "Seata"
    ],
    "summary": "- \"Seata定义：阿里开源的高性能分布式事务解决方案，2019年开源\"   - \"四大模式：AT(自动事务,零侵入,主流)、TCC(手动补偿)、SAGA(长事务)、XA(性能差)\"   - \"三大角色：TC(协调者,Server端)、TM(管理者,Client端,发起全局事务)、RM(资源管理者,Client端,分支事务)\"   - \"AT模式机制："
  },
  {
    "id": "2026-09-28-distributed-transaction",
    "title": "分布式事务",
    "url": "posts/2026-09-28-distributed-transaction.html",
    "publishedAt": "2026-09-28",
    "category": "云商城",
    "tags": [
      "云商城",
      "分布式事务"
    ],
    "summary": "- \"问题引入（场景三）：库存扣减跨库成功，订单本地事务回滚，数据不一致\"   - \"三类场景：跨库事务、分库分表事务、跨应用(微服务)事务\"   - \"CAP理论：一致性(C)、可用性(A)、分区容错性(P)，最多满足两点\"   - \"BASE理论：基本可用(BA)、软状态(S)、最终一致性(E)\"   - \"刚柔事务：刚性(ACID) vs 柔性(B"
  },
  {
    "id": "2026-09-28-spring-local-transaction",
    "title": "本地事务与 Spring 事务",
    "url": "posts/2026-09-28-spring-local-transaction.html",
    "publishedAt": "2026-09-28",
    "category": "云商城",
    "tags": [
      "云商城",
      "本地事务"
    ],
    "summary": "- \"本地事务：操作单一数据库，默认一条SQL独占一个事务且自动提交\"   - \"Spring事务分类：编程式事务(代码侵入高) vs 声明式事务(AOP无侵入)\"   - \"声明式事务核心：@Transactional注解\"   - \"核心参数1：isolation(隔离级别)、propagation(传播行为)\"   - \"核心参数2：timeout"
  },
  {
    "id": "2026-09-28-transaction-management",
    "title": "事务管理",
    "url": "posts/2026-09-28-transaction-management.html",
    "publishedAt": "2026-09-28",
    "category": "云商城",
    "tags": [
      "云商城",
      "事务管理"
    ],
    "summary": "- \"问题引入：订单入库异常导致数据不一致（有明细无主单）\"   - \"问题引入：跨服务库存扣减异常导致订单与库存不一致\"   - \"解决方案：本地数据库事务 + 分布式事务框架(Seata) + 操作日志\"   - \"事务定义：不可分割的数据库操作序列，要么全成功，要么全失败\"   - \"ACID特性：原子性、一致性、隔离性、持久性\"   - \"并发问"
  },
  {
    "id": "2026-09-27-order-design-implementation",
    "title": "订单的设计与实现",
    "url": "posts/2026-09-27-order-design-implementation.html",
    "publishedAt": "2026-09-27",
    "category": "云商城",
    "tags": [
      "云商城",
      "订单"
    ],
    "summary": "- \"项目搭建：创建 mall-order-service，配置 Nacos 和数据库\"   - \"代码生成：调整主键策略(ASSIGN_ID)，配置自动填充和逻辑删除\"   - \"生成订单需求：生成订单和明细、扣减库存、删除购物车\"   - \"库存扣减：SkuInfoService 添加 decreaseStock，遍历校验库存并批量更新\"   - \""
  },
  {
    "id": "2026-09-27-order-database-design",
    "title": "订单数据库设计",
    "url": "posts/2026-09-27-order-database-design.html",
    "publishedAt": "2026-09-27",
    "category": "云商城",
    "tags": [
      "微服务",
      "订单",
      "数据库设计"
    ],
    "summary": "- \"核心实体：用户、商品、订单、订单明细\"   - \"关系拆解：用户与商品多对多 -> 拆解为 用户(1)对订单(N)，订单(1)对订单明细(N)\"   - \"订单属性：订单编号、时间、用户、金额、支付方式、状态、类型等\"   - \"订单明细属性：编号、订单id、SKU_ID、名称、图片、价格、数量、金额\"   - \"关系转换：在多的一方(订单、明细)"
  },
  {
    "id": "2026-09-27-mongodb-shopping-cart-service",
    "title": "MongoDB 实现购物车（项目搭建与服务实现）",
    "url": "posts/2026-09-27-mongodb-shopping-cart-service.html",
    "publishedAt": "2026-09-27",
    "category": "云商城",
    "tags": [
      "SpringCloud",
      "微服务",
      "mongodb"
    ],
    "summary": "- \"项目创建：mall-cart-service，父工程 mall-services\"   - \"依赖引入：spring-boot-starter-data-mongodb\"   - \"配置核心：application.yml 集成 Nacos，application-dev.yml 导入 mongodb.yml\"   - \"MongoDB 配置：ur"
  },
  {
    "id": "2026-09-27-mongodb-shopping-cart",
    "title": "MongoDB 实现购物车",
    "url": "posts/2026-09-27-mongodb-shopping-cart.html",
    "publishedAt": "2026-09-27",
    "category": "云商城",
    "tags": [
      "MongoDB",
      "购物车"
    ],
    "summary": "- \"推荐选型：购物车数据结构多变，推荐使用非关系型数据库 MongoDB\"   - \"关系型数据库：先定结构，再存数据，遵守相同字段，不可随意新增\"   - \"非关系型数据库：自由变结构，不用提前定义/改表，支持嵌套结构\"   - \"选型原因：结构多变适配业务迭代、读多写多并发高、Redis吃内存不适合\"   - \"核心概念：文档(Document)、"
  },
  {
    "id": "2026-09-27-spu-static-page-oss",
    "title": "SPU 静态页面存储与前后端联调",
    "url": "posts/2026-09-27-spu-static-page-oss.html",
    "publishedAt": "2026-09-27",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "OSS"
    ],
    "summary": "- \"前后端联调：配置Gateway跨域，配置网关路由，放行API白名单\"   - \"原系统问题：文件生成本地服务器磁盘，集群部署多实例时文件分散，无法共享\"   - \"解决方案：模板渲染至内存字符串，直接转字节流上传OSS，不落地本地磁盘\"   - \"原系统修正：表加html_url字段，实体加属性，分页查询加字段，Service加更新方法\"   -"
  },
  {
    "id": "2026-09-27-aliyun-oss",
    "title": "OSS 对象存储",
    "url": "posts/2026-09-27-aliyun-oss.html",
    "publishedAt": "2026-09-27",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "OSS"
    ],
    "summary": "- \"定义：阿里云提供的海量、安全、低成本的云存储服务\"   - \"核心对比：本地磁盘/NAS(有限/文件路径/单机故障) vs OSS(无限/HTTP URL/多副本高可用)\"   - \"核心术语1：Endpoint(访问域名)、Bucket(存储空间/顶级文件夹)\"   - \"核心术语2：Object(单个文件)、Object Key(唯一标识符)、"
  },
  {
    "id": "2026-09-26-openfeign-sentinel-fallback",
    "title": "sentinel 之 Feign 远程调用熔断降级",
    "url": "posts/2026-09-26-openfeign-sentinel-fallback.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "OpenFeign",
      "Sentinel",
      "熔断"
    ],
    "summary": "- \"雪崩问题：下游服务超时/宕机导致上游线程阻塞，资源耗尽引发连锁故障\"   - \"Sentinel方案：检测下游故障达阈值后，切断调用，执行兜底，释放线程\"   - \"开启降级：配置 feign.sentinel.enabled: true\"   - \"兜底方法1：fallback，接口粒度独立兜底，适用多业务模块不同返回\"   - \"兜底方法2：F"
  },
  {
    "id": "2026-09-26-sentinel-fallback",
    "title": "Sentinel 兜底返回",
    "url": "posts/2026-09-26-sentinel-fallback.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Sentinel",
      "兜底"
    ],
    "summary": "- \"定义：限流、熔断、异常触发后，系统不再抛出报错，而是执行预设兜底方法\"   - \"作用：返回正常业务提示或默认数据，保证服务不报错、不崩溃、用户体验友好\"   - \"异常抛出时机：AOP切面或Web过滤器在进入Controller前拦截并抛出BlockException\"   - \"两大核心方法：blockHandler(拦截Sentinel规则)"
  },
  {
    "id": "2026-09-26-sentinel-hot-param-flow",
    "title": "Sentinel 热点参数限流",
    "url": "posts/2026-09-26-sentinel-hot-param-flow.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Sentinel",
      "热点参数限流"
    ],
    "summary": "- \"定义：流量控制的一种特例，流控控制资源，热点参数限流控制参数\"   - \"热点：高频访问的参数值（爆款商品ID、热门直播间ID、高频用户ID等）\"   - \"作用：对单个参数值单独限流，只拦截高频访问的热点参数，不影响其他普通参数\"   - \"区别：全局限流（整接口总QPS，参数共享阈值） vs 热点参数限流（每个参数独立统计）\"   - \"底层原"
  },
  {
    "id": "2026-09-26-sentinel-circuit-breaker",
    "title": "Sentinel 熔断降级",
    "url": "posts/2026-09-26-sentinel-circuit-breaker.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Sentinel",
      "熔断"
    ],
    "summary": "- \"定义：防止服务雪崩的核心容错机制，自动切断调用链路，执行兜底降级逻辑\"   - \"熔断类比：电路短路保险丝熔断，保护整机\"   - \"触发条件1：慢调用比例，请求耗时超过最大RT比例达标\"   - \"触发条件2：异常比例，接口报错比例达标\"   - \"触发条件3：异常数，短时间异常请求数量达标\"   - \"熔断后表现：不执行业务代码、返回兜底提示、"
  },
  {
    "id": "2026-09-25-jmeter-guide",
    "title": "JMeter 使用说明",
    "url": "posts/2026-09-25-jmeter-guide.html",
    "publishedAt": "2026-09-25",
    "category": "微服务架构",
    "tags": [
      "JMeter",
      "测试",
      "Sentinel"
    ],
    "summary": "- \"JMeter简介：开源压力测试工具，图形化操作，验证Sentinel流控规则\"   - \"安装启动：官网下载zip，解压免安装，运行jmeter.bat/sh\"   - \"步骤1：创建测试计划（线程组）\"   - \"步骤2：添加HTTP请求（配置接口信息）\"   - \"步骤3：携带鉴权头（HTTP信息头管理器）\"   - \"步骤4：添加断言（响应断"
  },
  {
    "id": "2026-09-26-sentinel-flow-control2",
    "title": "Sentinel 流量控制",
    "url": "posts/2026-09-26-sentinel-flow-control2.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Sentinel"
    ],
    "summary": "- \"定义：对请求流量进行拦截、限速、排队、拒绝，避免打垮服务\"   - \"流控规则：资源名 + 阈值类型(QPS/并发线程) + 流控模式(直接/关联/链路) + 流控效果(快速失败/Warm Up/排队等待)\"   - \"阈值类型1：QPS，限制每秒请求数，防突发高并发\"   - \"阈值类型2：并发线程数，限制同时处理的工作线程数\"   - \"流控模"
  },
  {
    "id": "2026-09-26-sentinel-flow-control",
    "title": "Sentinel",
    "url": "posts/2026-09-26-sentinel-flow-control.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Sentinel"
    ],
    "summary": "- \"什么是服务雪崩：下游故障导致上游资源耗尽，逐级瘫痪\"   - \"根本原因：链式依赖、资源未释放、级联扩散\"   - \"解决方案：超时处理、线程隔离、熔断降级、流量控制\"   - \"Sentinel定义：阿里开源的轻量级流量控制、熔断降级、容错防护组件\"   - \"核心能力：流量控制、熔断降级、系统自适应保护、热点限流、统一兜底降级\"   - \"环境"
  },
  {
    "id": "2026-09-26-openfeign-interceptor",
    "title": "OpenFeign 拦截器",
    "url": "posts/2026-09-26-openfeign-interceptor.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "OpenFeign"
    ],
    "summary": "- \"背景问题：Spring MVC请求头仅保存在ThreadLocal，Feign调用默认不复制上游请求头\"   - \"解决方案：使用OpenFeign拦截器透传请求头，实现全链路透传\"   - \"核心场景：统一鉴权(Token)、链路追踪(traceId)、解决跨服务Header丢失、统一预处理限流\"   - \"核心接口：RequestInterce"
  },
  {
    "id": "2026-09-26-openfeign-loadbalancer",
    "title": "OpenFeign 负载均衡",
    "url": "posts/2026-09-26-openfeign-loadbalancer.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "OpenFeign",
      "负载均衡"
    ],
    "summary": "- \"定义：将负载（工作任务、访问请求）分摊到多个操作单元执行\"   - \"服务端负载均衡：发生在服务提供者一方（如 Nginx）\"   - \"客户端负载均衡：发生在服务请求方（如 OpenFeign）\"   - \"OpenFeign 依赖 Spring Cloud LoadBalancer 完成负载均衡\"   - \"策略1：轮询 (RoundRobin"
  },
  {
    "id": "2026-09-26-openfeign-remote-call",
    "title": "OpenFeign 远程调用的实现",
    "url": "posts/2026-09-26-openfeign-remote-call.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "OpenFeign"
    ],
    "summary": "- \"调用基本流程：提供者注册 -> 暴露接口 -> 消费者订阅 -> Feign 自动调用\"   - \"整体方案：模型集中管理 + 调用客户端集中管理\"   - \"模型集中管理：消除冗余、统一口径、全局复用\"   - \"客户端集中管理：统一接口定义、统一配置、统一拦截与熔断\"   - \"实战依赖：引入 openfeign 和 loadbalancer"
  },
  {
    "id": "2026-09-26-openfeign-vs-grpc",
    "title": "OpenFeign 与 gRPC",
    "url": "posts/2026-09-26-openfeign-vs-grpc.html",
    "publishedAt": "2026-09-26",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "远程调用"
    ],
    "summary": "- \"OpenFeign：声明式 HTTP 客户端，简化 RESTful 调用\"   - \"OpenFeign优点：代码简洁、开发效率高、深度集成 Spring Cloud\"   - \"OpenFeign缺点：仅支持 HTTP/REST，性能低于二进制协议\"   - \"gRPC：Google 开源的高性能 RPC 框架，基于 HTTP/2 和 Proto"
  },
  {
    "id": "2026-09-24-gateway-integrate-knife4j",
    "title": "Gateway 整合 Knife4j",
    "url": "posts/2026-09-24-gateway-integrate-knife4j.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "网关",
      "Knife4j"
    ],
    "summary": "- \"核心目的：解决微服务架构中接口文档分散的问题\"   - \"统一聚合：只需访问网关的文档地址，即可查看所有服务的接口\"   - \"版本要求：Knife4j从v4.0开始提供专门针对Gateway的聚合组件\"   - \"整合步骤：加入依赖(knife4j-gateway-spring-boot-starter)\"   - \"配置前先删除微服务私有的Kn"
  },
  {
    "id": "2026-09-24-gateway-authorization",
    "title": "Gateway 权限控制",
    "url": "posts/2026-09-24-gateway-authorization.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "网关",
      "权限控制"
    ],
    "summary": "- \"微服务修正：删除API前缀，禁用微服务拦截器，修正返回值拦截器\"   - \"请求流程：客户端 -> Gateway(RtGlobalFilter -> AuthGlobalFilter) -> 微服务 -> Gateway(RtGlobalFilter) -> 客户端\"   - \"全局过滤器 RtGlobalFilter：记录请求开始/结束时间、U"
  },
  {
    "id": "2026-09-24-spring-cloud-gateway-routing",
    "title": "Gateway 路由",
    "url": "posts/2026-09-24-spring-cloud-gateway-routing.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "网关"
    ],
    "summary": "- \"路由四要素：id(唯一标识)、uri(目标地址)、predicates(断言)、filters(过滤器)\"   - \"内置断言工厂：Path、Method、Header、Cookie、Query、时间、Host\"   - \"断言规则：多个断言之间是 AND 关系，需全部满足\"   - \"Path断言作用：请求路由、服务隔离、对外屏蔽内部结构\""
  },
  {
    "id": "2026-09-24-spring-cloud-gateway",
    "title": "Gateway 网关",
    "url": "posts/2026-09-24-spring-cloud-gateway.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "网关"
    ],
    "summary": "- \"定位：微服务架构的“守门神”，所有请求的统一入口\"   - \"功能1：请求路由（根据URL/请求头转发，解耦客户端与微服务）\"   - \"功能2：权限控制（统一鉴权，拦截未授权请求）\"   - \"功能3：流量控制（限流，保护后端服务免受压垮）\"   - \"技术选型：Spring Cloud Gateway（响应式编程，性能优于Zuul）\"   -"
  },
  {
    "id": "2026-09-24-nacos-config-center",
    "title": "Nacos 配置中心",
    "url": "posts/2026-09-24-nacos-config-center.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Nacos"
    ],
    "summary": "- \"定义：集中托管、动态更新、安全管控各类应用配置\"   - \"核心功能：集中管理、动态更新、版本控制与审计、权限治理\"   - \"应用场景：微服务架构、灰度发布、多环境协同\"   - \"原理：长轮询机制，客户端拉取+服务端推送(UDP/HTTP)\"   - \"服务端架构：持久化存储(MySQL/Derby)，Config Service模块，Raft"
  },
  {
    "id": "2026-09-24-nacos-registry",
    "title": "Nacos 注册中心",
    "url": "posts/2026-09-24-nacos-registry.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Nacos"
    ],
    "summary": "- \"定位：微服务架构中高效可靠的注册中心解决方案\"   - \"服务注册：客户端发送请求(服务名/IP/端口/元数据)，服务端写入注册表并同步集群\"   - \"服务发现：客户端订阅，服务端返回健康实例，动态推送变更(长轮询/UDP)\"   - \"健康检查：客户端心跳(5秒间隔，15秒超时，30秒剔除) + 服务端主动探测\"   - \"使用实战：引入dis"
  },
  {
    "id": "2026-09-24-nacos-registry-config-center",
    "title": "Nacos 注册与配置中心",
    "url": "posts/2026-09-24-nacos-registry-config-center.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务",
      "Nacos"
    ],
    "summary": "- \"定义：面向云原生应用的动态服务发现、配置管理与治理平台\"   - \"核心功能：服务发现与健康监测（TCP/PING/HTTP/MySQL）\"   - \"核心功能：动态配置管理（实时推送，无需重启）\"   - \"核心功能：动态 DNS 与流量治理、服务元数据管理\"   - \"架构优势：高可用（双集群流量迁移）、多协议、弹性扩展\"   - \"部署：支持"
  },
  {
    "id": "2026-09-24-spring-cloud-alibaba-setup",
    "title": "Spring Cloud 环境搭建",
    "url": "posts/2026-09-24-spring-cloud-alibaba-setup.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "微服务",
      "Spring Cloud"
    ],
    "summary": "- \"版本适配：Spring Boot/Cloud/Alibaba 三者版本必须严格匹配\"   - \"推荐稳定组合：Boot 3.2.4 + Cloud 2023.0.1 + Alibaba 2023.0.1.0\"   - \"版本选择：优先选择稳定版（Stable Release），避免 RC 版\"   - \"历史项目维护：升级需同步更新三大组件，避免版"
  },
  {
    "id": "2026-09-24-spring-cloud-alibaba",
    "title": "SpringCloud Alibaba",
    "url": "posts/2026-09-24-spring-cloud-alibaba.html",
    "publishedAt": "2026-09-24",
    "category": "微服务架构",
    "tags": [
      "SpringCloud",
      "微服务"
    ],
    "summary": "- \"背景：阿里开源，2018年加入Spring Cloud官方生态\"   - \"核心组件：Nacos(注册/配置)、Gateway(网关)、OpenFeign(调用)\"   - \"核心组件：Sentinel(限流/熔断)、Seata(分布式事务)、RocketMQ(消息)\"   - \"核心组件：Dubbo(RPC)、OSS(存储)\"   - \"特点：整"
  },
  {
    "id": "2026-09-23-database-diversification",
    "title": "数据库多样化",
    "url": "posts/2026-09-23-database-diversification.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "数据库多样化"
    ],
    "summary": "- \"核心架构：MySQL(存储) + Redis(缓存) + Elasticsearch(检索) + Druid(分析)\"   - \"关系型(RDBMS)：表格/外键/事务，代表：MySQL/PostgreSQL/Oracle\"   - \"非关系型(NoSQL)：灵活模式，高扩展，代表：Redis/MongoDB/Cassandra/Neo4j\""
  },
  {
    "id": "2026-09-23-high-speed-cache",
    "title": "高速缓存",
    "url": "posts/2026-09-23-high-speed-cache.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "高速缓存"
    ],
    "summary": "- \"高并发方案：缓存、限流、降级\"   - \"缓存原理：先查缓存，未命中查库并回写\"   - \"方案1：反向代理缓存（Nginx/Varnish/Squid）\"   - \"方案2：分布式缓存（Redis/Memcached/Hazelcast）\"   - \"方案3：本地缓存（Caffeine/Guava/Ehcache）\"   - \"多级缓存架构：客户"
  },
  {
    "id": "2026-09-23-sharding",
    "title": "分库分表",
    "url": "posts/2026-09-23-sharding.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "分库分表"
    ],
    "summary": "- \"目标：解决单机数据库五大瓶颈（存储、I/O、网络、CPU、连接）\"   - \"垂直拆分-分库：按业务模块划分（如用户库、商品库、订单库）\"   - \"垂直拆分-分表：冷热字段分离，大字段（BLOB/TEXT）独立建表\"   - \"水平拆分：同业务数据分散到多实例，通过哈希或ID等属性路由\"   - \"分表参考阈值：500万内优化SQL，超500万考"
  },
  {
    "id": "2026-09-23-mysql-master-slave",
    "title": "主从读写",
    "url": "posts/2026-09-23-mysql-master-slave.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "主从读写"
    ],
    "summary": "- \"主从复制：允许从库复制主库数据，提升读性能和可用性\"   - \"复制三步：主库写Binlog -> 从库IOthread读并写Relay Log -> 从库SQLthread重放\"   - \"读写分离：读请求发从库，写请求发主库\"   - \"模式1：一主多从（主库写，从库读，但主库宕机无法写入）\"   - \"模式2：双主多从（互为主从，解决单点故障"
  },
  {
    "id": "2026-09-23-single-database-architecture",
    "title": "单数据库",
    "url": "posts/2026-09-23-single-database-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "数据架构",
    "tags": [
      "单数据库"
    ],
    "summary": "- \"定义：一个应用只使用一个数据库服务器\"   - \"连接：Tomcat 直接通过 JDBC 连接单库\"   - \"痛点：读写扎堆，IO/CPU 性能很快达到上限\"   - \"瓶颈1：连接池耗尽（解法：合理配置连接池参数）\"   - \"瓶颈2：SQL 效率低（解法：优化索引，避免函数致索引失效）\"   - \"瓶颈3：并发冲突（解法：乐观/悲观锁，控制事"
  },
  {
    "id": "2026-09-23-microservices-architecture",
    "title": "微服务架构",
    "url": "posts/2026-09-23-microservices-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "微服务"
    ],
    "summary": "- \"SOA：面向服务架构，通过可复用服务实现互操作\"   - \"SOA特点：松耦合、服务复用、标准化接口、自治性、可组合性\"   - \"微服务：SOA演进，功能模块拆分为高度自治的小型服务\"   - \"微服务核心：独立部署、独立数据库、轻量级通信(HTTP API)\"   - \"微服务组成：注册发现、网关、服务、缓存、负载均衡、配置中心、权限控制\""
  },
  {
    "id": "2026-09-23-cluster-architecture",
    "title": "集群架构",
    "url": "posts/2026-09-23-cluster-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "集群"
    ],
    "summary": "- \"背景：单机扛不住高并发（如商品190万，订单180万QPS），分布式拆分后单节点仍可能撑不住\"   - \"定义：同一业务部署到多台服务器上，组成整体\"   - \"核心：节点运行相同程序，提供相同功能，由负载均衡器统一分发\"   - \"特点1：可扩展性（动态加机器，水平扩展）\"   - \"特点2：高可用性（故障节点被其他节点接管）\"   - \"负载均"
  },
  {
    "id": "2026-09-23-distributed-architecture",
    "title": "分布式架构",
    "url": "posts/2026-09-23-distributed-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "分布式"
    ],
    "summary": "- \"背景：单机QPS达瓶颈 -> 拆分服务/水平扩展\"   - \"定义：多节点网络协作，资源分散共享\"   - \"特点1：独立部署（网络通信协作）\"   - \"特点2：独立运行（高可用/易扩容，单点故障不影响整体）\"   - \"通信1：RPC（同步，像调本地方法，需获取结果）\"   - \"通信2：MQ（异步，发布订阅，解耦/削峰，无需立即获取结果）\""
  },
  {
    "id": "2026-09-23-middle-platform-architecture",
    "title": "中台架构",
    "url": "posts/2026-09-23-middle-platform-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "中台"
    ],
    "summary": "- \"背景：阿里“大中台，小前台”战略\"   - \"核心：抽象解耦，抽离通用模块（如支付/推荐）为自治服务供前台复用\"   - \"分类：业务、数据、技术、研发、组织、智能\"   - \"优点：敏捷开发、快速创新、低成本复用\"   - \"缺点：流量激增时，集中式中台仍会成整体瓶颈\""
  },
  {
    "id": "2026-09-23-monolithic-architecture",
    "title": "单体架构",
    "url": "posts/2026-09-23-monolithic-architecture.html",
    "publishedAt": "2026-09-23",
    "category": "软件架构",
    "tags": [
      "单体"
    ],
    "summary": "- \"初期：单服务器部署，架构简单\"   - \"痛点1：扩展性/可靠性差（单点故障，无法抗高并发）\"   - \"痛点2：协作效率低（重复造轮子，如短信/支付）\"   - \"痛点3：上线周期长（代码耦合，公共API变更牵一发动全身）\""
  },
  {
    "id": "2026-09-03-springboot-autoconfig",
    "title": "Spring Boot的自动配置原理",
    "url": "posts/2026-09-03-springboot-autoconfig.html",
    "publishedAt": "2026-09-03",
    "category": "Spring",
    "tags": [
      "Spring Boot",
      "自动配置",
      "源码"
    ],
    "summary": "启动类`@EnableAutoConfiguration`从`META-INF/spring.factories`加载配置类，结合`@Conditional`条件注解按需创建Bean。"
  },
  {
    "id": "2026-09-03-hashmap-underlying",
    "title": "Java中HashMap的底层实现原理和扩容机制是什么？",
    "url": "posts/2026-09-03-hashmap-underlying.html",
    "publishedAt": "2026-09-03",
    "category": "Java",
    "tags": [
      "HashMap",
      "集合框架",
      "扩容"
    ],
    "summary": "基于数组+链表/红黑树实现，通过key的hash值定位桶索引，达到负载因子0.75时触发2倍扩容并重新计算hash分配位置。"
  },
  
  
  {
    id: 'springcloud',
    title: 'Spring Cloud 常用组件',
    url: 'posts/2026-08-26-springcloud.html',
    publishedAt: '2026-08-26',
    category: 'Java',
    tags: ['spring Cloud', 'Nacos', 'Gateway', 'OpenFeign', 'Sentinel'],
    summary: 'Spring Cloud 是一套微服务治理的生态工具集。配置和注册中心用 Nacos，网关用 Gateway，服务调用用 OpenFeign，负载均衡用 Spring Cloud LoadBalancer，限流降级用 Sentinel，链路追踪用 Zipkin。 项目中最常用的就是 Nacos + Gateway + Sentinel + OpenFeign 这套技术组合。'
  },
  {
    id: 'mysql-topsql',
    title: '慢查询优化',
    url: 'posts/2026-08-26-mysql-topsql.html',
    publishedAt: '2026-08-26',
    category: 'mysql',
    tags: ['慢查询', 'EXPLAIN'],
    summary: '慢查询优化遵循 “先定位 → 再分析 → 后调优” 三步走。开启慢日志抓 TOP SQL，用 EXPLAIN 看执行计划，通过索引优化、SQL 改写、分表归档逐级解决。核心目标：让所有核心查询都走索引。'
  },
  {
    id: 'jar',
    title: 'jar包冲突',
    url: 'posts/2026-08-26-jar.html',
    publishedAt: '2026-08-26',
    category: 'maven',
    tags: ['jar', 'maven'],
    summary: 'Jar 包冲突本质是 依赖传递导致的类路径污染。核心解决思路分两步：Maven Dependency Tree 定位冲突 → exclusions 排除 + 父 POM 锁版，遇到无法排除的硬编码 SPI 加载时用 Shade 插件重命名隔离。NoSuchMethodError / NoClassDefFoundError 大概率是 Jar 包冲突导致'
  },
  {
    id: 'mysql-index',
    title: '索引优化',
    url: 'posts/2026-08-26-mysql-index.html',
    publishedAt: '2026-08-26',
    category: 'mysql',
    tags: ['最左原则', '索引优化'],
    summary: '索引优化本质是 “让查询尽量少读、尽量顺序读”。我将索引设计归纳为四层：选列：最左前缀 + 高基数优先 + 等值在前；防失效：禁止函数运算、隐式转换、左模糊；控成本：单表不超 5 索引，杜绝冗余；架构降维：千万级走冷热分离或分库分表。最终目标：核心查询全部做到覆盖索引。'
  },
  {
    id: 'springboot',
    title: 'Spring Boot 自动配置原理',
    url: 'posts/2026-08-26-springboot.html',
    publishedAt: '2026-08-26',
    category: 'Java',
    tags: ['spring boot', '自动配置原理'],
    summary: 'Spring Boot 自动配置分为三个阶段。加载，拿到全部候选自动配置类。过滤，通过条件注解筛掉不匹配当前环境的配置。注册，把生效的 Bean 注册到 Spring 容器。如果我们自定义了这个 Bean，框架干脆就不创建默认的 Bean 了。所以它可以做到开箱即用，同时支持灵活定制。'
  },
  {
    id: 'java-thread',
    title: '线程池的核心参数及其含义',
    url: 'posts/2026-08-25-thread.html',
    publishedAt: '2026-08-25',
    category: 'Java',
    tags: ['thread', '并发'],
    summary: '线程池的核心参数一共有 7 个，分别是 `corePoolSize`（核心线程数）、`maximumPoolSize`（最大线程数）、`keepAliveTime`（空闲存活时间）、`TimeUnit`（时间单位）、`BlockingQueue`（阻塞队列）、`ThreadFactory`（线程工厂）、`RejectedExecutionHandler`（拒绝策略）。'
  },
  {
    id: 'java-jvm',
    title: 'JVM内存模型与各个区域的作用',
    url: 'posts/2026-08-25-jvm.html',
    publishedAt: '2026-08-25',
    category: 'Java',
    tags: ['jvm', '内存模型'],
    summary: 'JVM 内存分为 线程私有（程序计数器、虚拟机栈、本地方法栈）和 线程共享（堆、方法区）两大部分。在项目中，堆 是 GC 主要关注区，栈 决定线程数量，方法区 存类元信息。'
  },
  {
    id: 'java-final',
    title: 'Java 中 final 关键字的作用',
    url: 'posts/2026-08-25-final.html',
    publishedAt: '2026-08-25',
    category: 'Java',
    tags: ['final'],
    summary: '修饰类不可继承、方法不可重写、变量引用不可变。'
  },
  // {
  //   id: 'moon-robot-playthrough',
  //   title: '月亮机器人双线毕业流程',
  //   url: 'posts/2026-08-25-moon-robot-playthrough.html',
  //   publishedAt: '2026-08-25',
  //   category: '兴趣记录',
  //   tags: ['游戏流程', '饥荒联机版', 'WX-78'],
  //   summary: '从前期加点到月亮与暗影双线推进的一份完整流程记录。'
  // },
  // {
  //   id: 'circuit-recipes',
  //   title: '电路改装配方与效果一览',
  //   url: 'posts/2026-08-24-circuit-recipes.html',
  //   publishedAt: '2026-08-24',
  //   category: '兴趣记录',
  //   tags: ['游戏资料', '电路改装', '饥荒联机版'],
  //   summary: '整理电路的制作配方、插口占用、效果、扫描对象和技能树强化。'
  // }
];
