---
layout: article
title: "整合 SpringCloud 搭建智能搜索系统"
description: "方案设计：SpringCloud 体系内新建微服务，通过 OpenFeign 远程调用 Python AI 服务。 架构链路：前端 -> Gateway -> Java 微服务 -> OpenFeign -> Python AI 服务。 前端改造：增加搜索模式切换（传统/智能），新增“为你推荐”栏目。 配置管理：Nacos 集中配置，针对大模型推理慢的特点，调整 Feign 的超时时间。 代码实现：定义 DTO 结构，Service 层解析 AI 返回的 JSON 并转换为 Java 对象。"
date: 2026-11-13
category: "软件架构"
tags:
  - "微服务"
  - "SpringCloud"
  - "OpenFeign"
  - "AI大模型"
permalink: /posts/2026-11-13-springcloud-ai-search-integration.html
---

## 9.2.1 SpringCloud 与 Python AI 构建智能搜索系统

### 1、方案设计

#### 1）后端

（1）需求：

在 SpringCloud 体系内新建一个智能搜索微服务 mall-aisearch-service，该微服务内部使用 OpenFeign 远程调用 Python AI 服务（127.0.0.1:9010），不直接在 Gateway 写死转发 http://127.0.0.1:9010。

（2）架构链路：

    前端页面 -> SpringCloud Gateway -> mall-aisearch-service(SpringBoot)
                                                  |
                                              OpenFeign
                                                  |
                                     Python AI 服务(127.0.0.1:9010)

（3）优点：

- Python 服务地址全部收敛在 Java 微服务内部，网关不写死 ip 端口；

- Java 层可以做参数校验、统一异常处理、降级、日志、限流、封装返回体；

- Python 服务变更地址，只修改 mall-aisearch-service 的 Feign 配置，网关、前端无需改动。

#### 2）前端

（1）前端页面搜索框支持自然语言查询：增加切换按钮，可切换【传统 ES 关键词搜索】/【AI 自然语言智能搜索】，调用开发的 smart_search AI 微服务接口 /api/v1/recommend 和 /api/v1/extract：

- /v1/search/recommend 获取 AI 推荐；

- /v1/search/extract 解析查询条件，再调用 /search/product/page 到 ES 查询商品。

（2）“为你推荐”模块描述：

在商品列表下方新增一个“为你推荐”栏目。当用户使用 AI 自然语言智能搜索时，系统除了通过 ES 返回传统搜索结果外，还会将用户的大段自然语言 Query 发送给 AI 微服务。AI 微服务经过 Agent 推理和向量检索后，返回包含总结导语、推荐商品列表及推荐理由的 JSON 数据。前端解析该数据并在“为你推荐”栏目中展示，以类似导购的口吻为用户推荐最符合意图的商品。

（3）保留原有全部 ES 筛选逻辑：分类、品牌、价格区间、分页、加入购物车等原有功能完全不变。

### 2、创建项目

#### 1）创建项目

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype：

- Name: mall-aisearch-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.search
- ArtifactId: mall-aisearch-service
- Version: 1.0.0

#### 2）配置文件

（1）主配置文件 application.yml 内容

    spring:
      application:
        name: mall-aisearch-service
      profiles:
        active: dev
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            namespace: ${spring.profiles.active:public}

（2）开发环境配置文件 application-dev.yml 内容

    server:
      port: 9011

    spring:
      config:
        import:
          - nacos:log.yml
          - nacos:knife4j.yml
          - nacos:redis.yml

    # Feign 调用 Python AI 服务配置，建议在 nacos 配置中心配置
    # feign 日志与超时
    feign:
      client:
        config:
          default:
            loggerLevel: FULL
            connectTimeout: 10000
            readTimeout: 360000 #大模型推理慢，6 分钟超时 A

#### 3）创建启动程序

    @SpringBootApplication(scanBasePackages = "com.example.mall", exclude = {DataSourceAutoConfiguration.class})
    public class AiSearchServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(AiSearchServiceApplication.class, args);
        }
    }

## 9.2.2 智能搜索系统的实现

### 1、创建 DTO 文件

（1）条件拆分结果：

    @Data
    public class SearchConditionDTO {
        private String keyword;
        private Double minPrice;
        private Double maxPrice;
    }

（2）补全推荐结果 DTO（参考 Python 端的 Schema）：

    @Data
    public class ProductDTO {
        private Long id;
        private String skuName;
        private Double price;
        private String skuDefaultImg;
    }

    @Data
    public class ProductRecommendDTO {
        private String summary;
        private List<ProductDTO> productList;
        private List<String> reason;
    }

### 2、后端代码实现

（1）Service 接口定义：

    public interface IAiSearchService {
        SearchConditionDTO extract(String query);
        ProductRecommendDTO recommend(String query, String threadId);
    }

（2）OpenFeign 远程调用接口定义：

    @FeignClient(name = "python-ai-search", url = "http://127.0.0.1:9010")
    public interface AiPythonFeignClient {
        @PostMapping("/api/v1/extract")
        Result extract(@RequestParam("query") String query);

        @PostMapping("/api/v1/recommend")
        Result recommend(@RequestParam("query") String query, @RequestParam("threadId") String threadId);
    }

（3）Controller 层代码：

    @RestController
    @RequestMapping("/search")
    @RequiredArgsConstructor
    public class AiSearchController {

        @Autowired
        private IAiSearchService aiSearchService;

        @GetMapping("/recommend")
        public Result<ProductRecommendDTO> recommend(String query, String threadId){
            ProductRecommendDTO dto = aiSearchService.recommend(query, threadId);
            return Result.success(dto);
        }

        @GetMapping("/extract")
        public Result<SearchConditionDTO> extract(String query){
            SearchConditionDTO dto = aiSearchService.extract(query);
            return Result.success(dto);
        }
    }

（4）Service 实现类代码：

    @Service
    public class AiSearchServiceImpl implements IAiSearchService {

        @Autowired
        private AiPythonFeignClient aiPythonFeignClient;

        /**
         * 智能搜索，调用Python AI服务获取商品推荐数据
         * @param query 用户输入的自然语言搜索查询
         * @param threadId 会话标识，维护AI对话上下文
         * @return 商品推荐结果DTO，封装商品列表等信息
         */
        @Override
        public ProductRecommendDTO recommend(String query, String threadId) {
            // 通过OpenFeign远程调用Python AI智能搜索服务
            Result resp = aiPythonFeignClient.recommend(query, threadId);
            // 判断AI服务业务状态码，非200抛出业务异常
            if (resp.getCode() != 200) {
                throw new BusinessException(80001, "AI服务返回异常:"+resp.getMsg());
            }

            // 将AI返回的data数据转为JSON对象
            JSONObject recommendJson = JSONObject.parseObject(JSON.toJSONString(resp.getData()));
            // 提取商品列表数组
            JSONArray productListJson = JSONArray.parseArray(JSON.toJSONString(recommendJson.get("product_list")));
            List<ProductDTO> productList = new ArrayList<>();
            // 遍历商品数组，转换为业务ProductDTO对象
            for(Object obj : productListJson){
                JSONObject productJson = JSONObject.parseObject(JSON.toJSONString(obj));
                ProductDTO productDTO = CamelCastUtils.jsonToObject(productJson, ProductDTO.class);
                productList.add(productDTO);
            }
            // 将返回数据转换为推荐DTO，并手动设置转换完成的商品列表
            ProductRecommendDTO productRecommendDTO = CamelCastUtils.jsonToObject(recommendJson, ProductRecommendDTO.class);
            productRecommendDTO.setProductList(productList);

            return productRecommendDTO;
        }

        /**
         * 智能条件拆解，调用Python AI将自然语言解析为结构化搜索条件
         * @param query 用户原始自然语言查询语句
         * @return 结构化搜索条件DTO，包含价格、品牌、分类等筛选条件
         */
        @Override
        public SearchConditionDTO extract(String query) {
            // OpenFeign远程调用Python AI条件解析接口
            Result resp = aiPythonFeignClient.extract(query);
            // AI服务业务码非200，抛出自定义业务异常
            if (resp.getCode() != 200) {
                throw new BusinessException(80001, "AI服务返回异常:"+resp.getMsg());
            }
            // 将AI返回data字段转为JSON对象
            JSONObject jsonObject = JSONObject.parseObject(JSON.toJSONString(resp.getData()));
            // JSON转换为结构化搜索条件DTO返回
            SearchConditionDTO dto = CamelCastUtils.jsonToObject(jsonObject, SearchConditionDTO.class);
            return dto;
        }
    }

## 流程图文字推演

### 智能搜索网关到 AI 服务调用链路

前端发起智能搜索请求 --> 经 SpringCloud Gateway 路由至 mall-aisearch-service
--> Controller 接收请求
--> Service 层调用 AiPythonFeignClient (OpenFeign)
--> 发起 HTTP 请求至 Python AI 服务 (127.0.0.1:9010/api/v1/recommend)
--> Python AI 服务执行 LangChain Agent 和向量检索
--> 返回包含 summary, product_list, reason 的 JSON 结果
--> Java 端判断状态码 (200)
--> 使用 JSONObject 和 CamelCastUtils 将结果反序列化为 ProductRecommendDTO
--> Controller 封装为 Result 返回给前端页面

## 💡 **速记**

【核心考点】

SpringCloud 整合 AI 服务的最佳实践：通过独立的微服务作为桥梁，使用 OpenFeign 调用 Python 服务，实现架构解耦。

配置超时时间：大模型推理响应慢，必须针对 Feign 配置较长的 readTimeout（如 6 分钟），避免请求因默认超时而中断。

数据转换：跨语言调用时，Java 端接收到的是通用 JSON（如 FastJSON 的 JSONObject），需要通过工具类（如 CamelCastUtils）反序列化为强类型的 DTO，并手动处理嵌套集合（如 product_list）。

【高频逻辑链】

前端自然语言 Query -> Gateway -> Java 微服务 -> OpenFeign -> Python AI (RAG) -> 返回 JSON -> Java 解析映射 DTO -> 前端渲染“为你推荐”。

【关键避坑】

不要在 Gateway 或前端直接写死 Python AI 服务的 IP 和端口，必须通过 Java 微服务做一层代理转发，便于后续鉴权、限流和异常处理。

OpenFeign 默认的读取超时时间较短，在对接大模型这类耗时任务时，必须调整 `readTimeout` 参数，否则会导致 ReadTimeoutException 报错。
