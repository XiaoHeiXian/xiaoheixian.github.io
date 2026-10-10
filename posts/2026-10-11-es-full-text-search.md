---
layout: article
title: "ES 全文检索"
description: "- \"核心工具：NativeQueryBuilder 用于构建原生 DSL，Query 定义查询条件。\"   - \"ElasticsearchTemplate：封装底层 API，执行复杂查询与聚合。\"   - \"查询实现：基于 Query 构建多条件组合，通过 NativeQueryBuilder 组装。\"   - \"结果解析：SearchHits 包含"
date: 2026-10-11
category: "云商城"
tags:
  - "Elasticsearch"
  - "全文检索"
  - "高亮"
permalink: /posts/2026-10-11-es-full-text-search.html
---

## 1、检索实工具

1）NativeQueryBuilder

NativeQueryBuilder 是 Spring Data Elasticsearch 中实现高度定制化查询的核心工具，适用于需要精细控制 DSL 或使用高级 ES 功能的场景。

- 用于在 Java 中构建 Elasticsearch 原生 DSL 查询
- 支持组合 QueryBuilder、AggregationBuilder 等底层 ES 对象，实现复杂查询逻辑

核心方法：

方法：withQuery(QueryBuilder)

用途：设置主查询条件（如 boolQuery、matchQuery）

方法：withAggregation(AggregationBuilder)

用途：添加聚合（如 terms、avg）

方法：withSort(SortBuilder)

用途：指定排序规则（如按字段值、地理距离）

方法：withPageable(Pageable)

用途：分页控制（页码、页大小）

方法：withFilter(QueryBuilder)

用途：添加过滤器（不参与评分）

2）Query

Query 是 Elasticsearch 中用于检索文档的核心机制，支持结构化查询（如精确匹配、范围查询）和全文检索（基于分词）。

- 叶子查询（Leaf Query）：针对单个字段的简单查询（如 term、match）
- 复合查询（Compound Query）：组合多个叶子查询（如 bool 查询）

在 Spring Data 项目中，Query 与 NativeQueryBuilder 两者常结合使用，通过 Query 生成子查询，再通过 NativeQueryBuilder 组合。

3）ElasticsearchTemplate

ElasticsearchTemplate 是 Spring Data Elasticsearch 提供的核心操作类，封装了 Elasticsearch 的底层 API，用于执行索引管理、文档 CRUD、复杂查询及聚合操作。

- 核心优势：简化原生 DSL 操作，提供类型安全的 Java API
- 典型用途：动态索引管理、高阶查询组合、聚合分析等场景

（1）查询方法

方法 search() 是 Spring Data Elasticsearch 提供的核心查询方法，用于执行原生 DSL 查询并返回分页结果。

- 输入参数：接受 Query 对象（如 NativeQuery、CriteriaQuery）和实体类类型。
- 返回值：返回 SearchHits<T> 包含匹配文档的高亮、评分等元数据

（2）结果解析

SearchHits 是 Elasticsearch Java API 中封装搜索结果的核心对象，包含匹配文档的元数据与内容。

- 结果容器：存储匹配的文档列表（SearchHit[]），每个 SearchHit 包含文档 ID、原始 JSON 数据（_source）、评分（_score）及排序值。支持获取总命中数（getTotalHits().value）和高亮信息（getHighlightFields()）。
- 查询与分页：分页参数通过 Pageable 注入，结果通过 getContent() 映射为实体对象
- 高亮结果显示：高亮标签需自定义（如 <em>），通过 hit.getHighlightFields() 按字段名提取
- 聚合结果解析：通过 getAggregations() 获取聚合桶（如 Terms、Stats），支持指标分析与分组统计

（3）ElasticsearchTemplate 与 ElasticsearchRepository

复杂查询使用 elasticsearchTemplate.search()，简单 CRUD 使用 ElasticsearchRepository。

## 2、全文检索实现

### 1）全文检索

（1）创建商品检索接口

    public interface IProductService {
        /**
         * 商品分页查询
         * @param queryDTO
         * @return
         */
        IPage page(ProductQueryDTO queryDTO);
    }

（2）接口实现

    @Service
    public class ProductServiceImpl implements IProductService {
        @Autowired
        private ElasticsearchTemplate elasticsearchTemplate;

        @Autowired
        private SkuInfoMapper skuInfoMapper;

        @Override
        public IPage page(ProductQueryDTO queryDTO) {
            // 1. 拼接筛选条件
            // 用于封装多条件
            List<Query> queryList = new ArrayList<>();
            // 1.1 商品名称：模糊查询（支持分词匹配）
            if (queryDTO.getProductName() != null) {
                Query query = buildMatchQuery("sku_name", queryDTO.getProductName());
                queryList.add(query);
            }
            // 1.2 三级分类：精确匹配一级、二级、三级类目 ID（只构建三级分类，一级二级分类自行构建）
            if (queryDTO.getThirdCategoryId() != null) {
                Query query = buildTermQuery("category_id", queryDTO.getThirdCategoryId());
                queryList.add(query);
            }
            // 1.3 品牌：精确匹配品牌 ID
            if (queryDTO.getBrandId() != null) {
                Query query = buildTermQuery("brand_id", queryDTO.getBrandId());
                queryList.add(query);
            }
            // 1.4 价格区间：范围查询
            if(queryDTO.getMinPrice() != null && queryDTO.getMaxPrice() != null) {
                Query query = buildRangeQuery("price", queryDTO.getMinPrice(), queryDTO.getMaxPrice());
                queryList.add(query);
            }
            // 1.5 构建分页（注意：Elasticsearch 从第 0 页开始）
            int pageNum = queryDTO.getPageNum().intValue() - 1;
            int pageSize = queryDTO.getPageSize().intValue();
            Pageable pageable = PageRequest.of(pageNum, pageSize);
            // 2. 创建条件构建器
            NativeQueryBuilder queryBuilder = NativeQuery.builder();
            queryBuilder
                .withQuery(b -> b.bool(m -> m.must(queryList)))
                .withPageable(pageable)
                .withSourceFilter(new FetchSourceFilter(
                    new String[]{
                        "id",
                        "spuId",
                        "skuName",
                        "num",
                        "price",
                        "skuDefaultImg",
                        "images",
                        "skuAttribute",
                        "htmlUrl"
                    }, null)
                );
            // 3. 执行查询
            SearchHits<SkuInfo> searchHits = elasticsearchTemplate.search(queryBuilder.build(), SkuInfo.class);

            // 4. 转换为 IPage 对象
            // 4.1 转换为 ProductDTO 对象
            List<ProductDTO> records = searchHits.stream()
                .map(e -> JsonUtils.toObj(e.getContent(), ProductDTO.class))
                .collect(Collectors.toList());

            // 4.2 使用 MyBatis-Plus 的 Page 实现类
            Page<ProductDTO> pageResult = new Page<>(queryDTO.getPageNum(), queryDTO.getPageSize());
            pageResult.setRecords(records);
            pageResult.setTotal(searchHits.getTotalHits());
            return pageResult;
        }

        /**
         * 构建模糊查询条件
         * @param fieldName
         * @param value
         * @return
         */
        private Query buildMatchQuery(String fieldName, Object value) {
            return Query.of(builder ->
                builder.match(
                    match -> match.field(fieldName).query(value.toString())
                )
            );
        }

        /**
         * 构建精确查询条件
         * @param fieldName
         * @param value
         * @return
         */
        private Query buildTermQuery(String fieldName, Object value) {
            return Query.of(builder ->
                builder.term(term ->
                    term.field(fieldName).value(value.toString())
                )
            );
        }

        /**
         * 构建范围查询条件
         * @param fieldName
         * @param minValue
         * @param maxValue
         * @return
         */
        private Query buildRangeQuery(String fieldName, Object minValue, Object maxValue) {
            return Query.of(builder ->
                builder.range(range ->
                    range.field(fieldName)
                        .gte(JsonData.of(minValue))
                        .lte(JsonData.of(maxValue))
                )
            );
        }
    }

（3）创建检索控制器

    @Tag(name = "商品搜索服务")
    @RestController
    @RequestMapping("/product")
    public class ProductController {
        @Autowired
        private IProductService productService;

        @Operation(summary = "商品搜索")
        @GetMapping("/page")
        public Result <IPage> page(ProductQueryDTO queryDTO) {
            IPage page = productService.page(queryDTO);
            return Result.success(page);
        }
    }

（4）测试（略）

### 2）高亮显示

（1）高亮的核心原理

在 Elasticsearch 中，高亮显示（Highlight）是指在搜索结果中，将匹配查询条件的文本片段用自定义标签（如 <em>）标记出来，以便用户直观地看到搜索词在文档中的位置。

高亮的核心原理：

查询阶段：Elasticsearch 执行搜索，找到匹配的文档。

高亮阶段：对匹配文档的指定字段，根据查询条件重新分析文本，找到匹配的词汇或短语。

标记输出：用你指定的标签（如 <em>）包裹匹配的词汇，返回高亮片段。

高亮配置参数详解：

参数：numberOfFragments

说明：返回高亮片段的数量

推荐值：1（只需一个片段）

参数：fragmentSize

说明：每个片段的字符长度

推荐值：100（根据前端显示需求调整）

参数：preTags

说明：高亮前缀标签

推荐值：<em> 或 <span class="highlight">

参数：postTags

说明：高亮后缀标签

推荐值：</em> 或 </span>

参数：requireFieldMatch

说明：高亮字段是否必须与查询字段匹配

推荐值：true（确保高亮只出现在匹配的字段上）

（2）高亮查询

在业务类添加高亮查询方法：

    /**
     * 创建高亮查询条件
     * @param fieldName
     */
    private Highlight buildHighlightQuery(String fieldName) {
        // 配置高亮参数
        HighlightFieldParameters parameters = HighlightFieldParameters.builder()
            .withNumberOfFragments(1)
            .withFragmentSize(100)
            .withPreTags("<strong style=\"color:red;font-size:16px;\">")
            .withPostTags("</strong>")
            .withRequireFieldMatch( true)
            .build();
        // 配置高亮字段
        HighlightField highlightField = new HighlightField(fieldName, parameters);
        return new Highlight(List.of(highlightField));
    }

添加高亮查询条件：

    // 1.6 构建高亮查询
    HighlightQuery highlightQuery = new HighlightQuery(buildHighlightQuery("sku_name"), SkuInfo.class);

    // 2. 创建条件构建器
    NativeQueryBuilder queryBuilder = NativeQuery.builder();
    queryBuilder
        .withQuery(b -> b.bool(m -> m.must(queryList)))
        .withPageable(pageable)
        .withHighlightQuery(highlightQuery)
        ......

修改替换转换代码：

    // 4.1 转换为 ProductDTO 对象
    List<ProductDTO> records = searchHits.stream()
        .map(e -> {
            // 提取高亮片段
            Map<String, List<String>> highlights = e.getHighlightFields();
            // 替换掉高亮片段
            String skuName = highlights.get("skuName") != null ?
                highlights.get("skuName").get(0) :
                e.getContent().getSkuName();
            ProductDTO obj = JsonUtils.toObj(e.getContent(), ProductDTO.class);
            obj.setSkuName(skuName);
            return obj;
        })
        .collect(Collectors.toList());

（3）测试

用商品名分词测试，发现测试结果的商品名称分词片段添加了 HTML 标签。

## 3、前后端联调

（略）

## 4、流程图文字推演

### 全文检索与高亮处理流程

用户提交搜索请求 --> 控制器接收 ProductQueryDTO --> 服务层拼接筛选条件（match、term、range） --> 构建 NativeQueryBuilder（含分页、字段过滤） --> 构建 HighlightQuery（配置前后缀标签） --> 执行 elasticsearchTemplate.search() --> 获取 SearchHits 结果集 --> 解析高亮字段（getHighlightFields） --> 将高亮片段替换原始字段 --> 映射为 ProductDTO 列表 --> 封装为 IPage 返回 --> 前端渲染高亮结果

💡 **速记**

【核心考点】

NativeQueryBuilder 用于构建原生 DSL，支持组合 Query、Aggregation、Sort、Pageable 和 Filter。

Query 分为叶子查询（term、match）和复合查询（bool），通过 NativeQueryBuilder 组装。

ElasticsearchTemplate 执行复杂查询，SearchHits 封装结果，支持高亮和聚合解析。

高亮显示通过 HighlightQuery 配置片段数量、长度、前后标签，并在结果解析时用高亮片段替换原字段。

【高频逻辑链】

全文检索实现：拼接查询条件（match/term/range） --> 构建 NativeQueryBuilder --> 设置分页与字段过滤 --> 执行 search --> 映射结果到 IPage。

高亮实现：构建 HighlightQuery（设置标签与片段） --> 加入 NativeQueryBuilder --> 执行查询 --> 提取高亮字段 --> 替换原始内容 --> 返回前端。

【关键避坑】

分页页码 Elasticsearch 从 0 开始，而业务通常从 1 开始，需要 pageNum - 1。

高亮字段名称必须与索引中的字段名一致，且 requireFieldMatch 建议设为 true，避免无关字段出现高亮。

使用 withSourceFilter 可以只返回需要的字段，减少网络传输和解析开销。
