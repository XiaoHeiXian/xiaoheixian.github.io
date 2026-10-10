---
layout: article
title: "ES 数据同步"
description: "- \"创建索引：使用 @Document 注解定义实体类，自动创建索引。\"   - \"数据同步：包含全量导入与增量导入两种策略，全量用于初始化。\"   - \"增量同步：基于 Canal 监听 MySQL binlog，通过 RocketMQ 异步同步。\"   - \"Repository：继承 ElasticsearchRepository，实现 CRUD"
date: 2026-10-11
category: "云商城"
tags:
  - "Elasticsearch"
  - "数据同步"
  - "Canal"
permalink: /posts/2026-10-11-es-data-sync.html
---

## 1、创建 ES 索引

1）创建实体类 domain.entity.SkuInfo

    @Data
    @Document(indexName = "sku_info", createIndex = true)
    public class SkuInfo {
        @Id
        @Field(type = FieldType.Keyword)
        private String id;
        @Field(name = "spu_id", type = FieldType.Long)
        private Long spuId;
        @Field(type = FieldType.Double)
        private Long price;
        @Field(name = "sku_name", type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart")
        private String skuName;
        @Field(name = "sku_attribute", type = FieldType.Text)
        private String skuAttribute;
        @Field(type = FieldType.Integer)
        private Integer num;
        @Field(name = "brand_id", type = FieldType.Long)
        private Long brandId;
        @Field(name = "brand_name", type = FieldType.Keyword)
        private String brandName;
        @Field(name = "category_id", type = FieldType.Long)
        private Long categoryId;
        @Field(name = "category_name", type = FieldType.Keyword)
        private String categoryName;
        @Field(name = "sku_default_img", type = FieldType.Keyword)
        private String skuDefaultImg;
        @Field(type = FieldType.Keyword)
        private String images;
        @Field(type = FieldType.Integer)
        private Integer status;
        @Field(name = "create_time", type = FieldType.Keyword)
        private String createTime;
        @Field(name = "update_time", type = FieldType.Keyword)
        private String updateTime;
        @Field(name = "html_url", type = FieldType.Keyword)
        private String htmlUrl;
    }

实体类注解：

- @Setting：定义分片数、副本数等物理配置
- @Mapping：通过 JSON 文件或注解配置字段映射规则
- @Document：创建索引
    - createIndex = true 表示当应用启动时，若目标索引不存在则自动创建，但需配合 ElasticsearchRepository 使用才会生效。仅添加该参数而无 Repository 接口时，索引不会自动创建。
- @Id：标记文档主键
- @Field：定义字段类型（如 FieldType.Text）

在 Spring Data Elasticsearch 中，@Field 注解的分词配置需注意以下关键点：

- 必须指定 FieldType.Text，只有文本类型字段才能启用分词器，其他类型（如 Keyword）会忽略分词配置。
- 双分析器配置
    - analyzer：索引时分词逻辑（如细粒度拆分 ik_max_word）
    - searchAnalyzer：查询时分词逻辑（如粗粒度 ik_smart）

2）创建 ES 索引

（1）创建 Mapper 接口

在 mapper 包下创建 Mapper 接口：

    public interface SkuInfoMapper extends ElasticsearchRepository<SkuInfo, String> {
    }

ElasticsearchRepository 接口：

作为 Spring Data Elasticsearch 的核心接口，继承自 CrudRepository 和 PagingAndSortingRepository，提供基础的 CRUD 及分页排序功能。

- 支持通过方法命名规则自动生成 DSL 查询（如 findByCategoryIdAndBrandId 会转换为 bool must 查询）
- 支持 save()、deleteById() 等标准方法
- 通过 ElasticsearchRestTemplate 执行实际请求，将返回的 JSON 数据反序列化为实体对象
- 通过返回 SearchHits<T> 获取命中文档的得分和排序信息

（2）启动主程序

启动主程序后，通过继承 ElasticsearchRepository 并配合实体类注解，无需显式使用 @Document 即可完成映射。即创建 ES 索引。

在 kibana 控制台左侧菜单 -> Management -> Stack Management -> Index Management 查看索引：

    Name: sku_info
    Health: yellow
    Status: open
    Primaries: 1
    Replicas: 1

## 2、数据同步

在 Spring Boot 项目中实现 MySQL 到 Elasticsearch 的数据同步，包含全量和增量导入是两种策略。全量用于初始化或重建索引，而增量用于持续同步变更，保持数据一致性。

（1）全量导入：批量构建初始索引

全量导入的核心是一次性将数据库中的全部数据（或大部分数据）读取出来，并通过批量 API 写入 Elasticsearch。

（2）增量导入：捕获数据变更

增量导入的目标是只同步发生变化的数据（新增、更新、删除），实现准实时同步。

实时同步推荐使用 CDC 工具（Canal / Debezium），这是实现准实时、无侵入同步的主流方案，也是很多生产环境的标配。通过 Canal 这类 Change Data Capture（CDC）工具，伪装成 MySQL 的 Slave，实时监听并解析 MySQL 的 binlog 日志。当数据库发生增、删、改操作时，CDC 工具会捕获到这些事件，并推送给你的 Spring Boot 应用。

## 3、全量导入的实现

1）创建获取所有库存商品的 API

（1）创建库存商品 DTO：

    @Data
    public class SkuInfoDTO implements Serializable {
        private static final long serialVersionUID = 1L;

        private String id;

        private Long spuId;

        private Long price;

        private String skuName;

        private String skuAttribute;

        private Integer num;

        private Long brandId;

        private String brandName;

        private Long categoryId;

        private String categoryName;

        private String skuDefaultImg;

        private String images;

        private Integer status;

        private LocalDateTime createTime;

        private LocalDateTime updateTime;

        private String htmlUrl;
    }

（2）在 mall-product-service 的 SkuInfoController 控制器创建接口方法：

    @Operation(summary = "查询所有商品信息")
    @GetMapping("/listAll")
    public Result<List<SkuInfoDTO>> listAll() {
        List<SkuInfo> skuInfos = skuInfoService.list();
        List<SkuInfoDTO> list = JsonUtils.toList(skuInfos, SkuInfoDTO.class);
        return Result.success(list);
    }

（3）创建 Feign 接口

在 SkuInfoFeignClient 控制器创建接口方法：

    @GetMapping("/skuInfo/listAll")
    public Result<List<SkuInfoDTO>> listAll();

2）全量同步到 ES

（1）创建 ISkuInfoService 接口：

    public interface ISkuInfoService {
        void saveAll();
    }

（2）接口实现：

    public class SkuInfoServiceImpl implements ISkuInfoService {
        @Autowired
        private SkuInfoMapper skuInfoMapper;
        @Autowired
        private SkuInfoFeignClient skuInfoFeignClient;

        @Override
        public void saveAll() {
            Result<List<SkuInfoDTO>> result = skuInfoFeignClient.listAll();
            if(result.getCode() != 200) {
                throw new BusinessException(result.getCode(), result.getMsg());
            }
            List<SkuInfo> skuInfo = JsonUtils.toList(result.getData(), SkuInfo.class);
            skuInfoMapper.saveAll(skuInfo);
        }
    }

（3）创建全量导入控制器

    @RestController
    @RequestMapping("/search")
    public class SkuInfoController {
        @Autowired
        private ISkuInfoService skuInfoService;

        @GetMapping("/importAll")
        public Result importAll() {
            skuInfoService.saveAll();
            return Result.success();
        }
    }

（4）导入

在浏览器或测试工具输入 http://localhost:9006/search/importAll

在 Kibana 控制台的索引表里发现文档数：

    Name: sku_info
    Health: yellow
    Status: open
    Primaries: 1
    Replicas: 1
    Docs count: 26

全量数据导入完成。

## 4、增量导入实现

本系统通过 Canal 将 MySQL 数据增量同步到 Elasticsearch (ES)，是一种无侵入、准实时的解决方案。其核心思想是让 Canal 充当 MySQL 的“从库”，实时解析数据库的 binlog 日志，同步到 ES。

为了提升系统吞吐和稳定性，使用 Canal + RocketMQ 模式。让 Canal 将事件投递到 RocketMQ，然后消费者处理同步，这样可以更好地削峰填谷，并通过消息重试机制保证最终一致性。

![架构示意图](https://xiaoheixian.github.io/posts/assets/335_65.png)

优点：

- 没有代码侵入、没有硬编码；
- 原有系统不需要任何变化，没有感知；
- 性能高；
- 业务解耦，不需要关注原来系统的业务逻辑。

1）部署 MySQL 主库

（1）迁移数据

将原 MySQL 的数据迁移到宿主机。

创建映射目录：

    mkdir -p /data/local/mysql/data /data/local/mysql/conf /data/local/mysql/logs

迁移数据：

    docker cp mysql8:/var/lib/mysql /data/local/mysql/data

授权：

    chown -R 999:999 /data/local/mysql/data/mysql

（2）重新部署主库：

删除原 MySQL：

    docker stop mysql8 && docker rm mysql8

创建配置文件：

在 /data/local/mysql/conf 目录下创建 my.cnf 文件：

    [mysqld]
    # 集群唯一 ID，主从不能重复
    server-id = 1
    # 开启二进制日志
    log_bin = /var/lib/mysql/mysql-bin
    # 推荐行模式，同步最稳定
    binlog_format = ROW
    # 日志自动清理天数 7*24*60*60(秒)
    binlog_expire_logs_seconds=604800
    # 可选：只同步指定库
    binlog_do_db = shop_goods
    # 可选：忽略系统库不同步
    binlog_ignore_db = mysql

部署：

    docker run --name=mysql8 --restart always -p 3306:3306 --privileged=true -v /data/local/mysql/logs:/logs -v /data/local/mysql/data/mysql:/var/lib/mysql -v /data/local/mysql/conf/my.cnf:/etc/my.cnf -e MYSQL_ROOT_PASSWORD=root -d mysql

2）部署从库

（1）配置目标 MySQL 上的 canal 用户

    # 进入终端
    docker exec -it mysql8 /bin/bash
    bash-5.1# mysql -uroot -proot
    # 创建用户
    mysql> CREATE USER canal IDENTIFIED BY 'canal';
    mysql> GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'canal'@'%';
    mysql> FLUSH PRIVILEGES;

（2）部署简易 Canal

    docker run --name canal -p 11111:11111 -d docker.io/canal/canal-server

（3）创建配置目录，并复制配置文件模板

    mkdir -p /data/local/canal
    docker cp canal:/home/admin/canal-server/conf /data/local/canal/

（4）配置

进入容器 /data/local/canal/conf 目录，修改核心配置 canal.properties 和 instance.properties 两个配置文件，canal.properties 是 canal 自身的配置，instance.properties 是需要同步数据的数据库连接配置，不同的数据使用不同的 instance.properties。

① 配置 canal.properties：

    # 打开文件后：在第一行添加：
    canal.id = 2

    # 找到如下行，修改日志的目的地
    # tcp, kafka, rocketMQ, rabbitMQ, pulsarMQ
    canal.serverMode = rocketMQ

    # 找到如下行，修改 rocketMQ 的通信地址
    rocketmq.namesrv.addr = 192.168.100.101:9876

② 配置 instance.properties

在 example 目录，编辑 instance.properties 文件，内容如下：

    # 找到如下行，修改数据库主机地址
    canal.instance.master.address=192.168.100.101:3306
    # 找到如下行，添加修改数据库同步表
    # canal.instance.filter.regex=.*\\..*
    canal.instance.filter.regex=shop_goods\\.\\..* # 同步数据库 shop_goods 所有表
    # 找到如下行，设置 mq 主题
    # mq config
    canal.mq.topic=sync_skuinfo

如果一个 canal server 需要监听多个 instance（各个业务线的数据库都是独立的，如商品 shop_goods，订单 shop_order），一个 instance 监听一个数据库，这是最常见的需求了，这时候我们就需要配置多个 instance，可以直接把 example 文件夹拷贝两份（shop_goods,shop_order），分别用数据库名命名新文件夹这样方便我们快速了解该文件夹对应的 instance 是哪个业务线的。然后就是调整 canal.properties:canal.destinations = example,shop_goods,shop_order，就是指定 instance 实例的查找位置。

（5）重新部署

删除 canal：

    docker stop canal && docker rm canal

部署：

    docker run -d --name canal -p 11111:11111 -v /data/local/canal/conf/canal.properties:/home/admin/canal-server/conf/canal.properties -v /data/local/canal/conf/example/instance.properties:/home/admin/canal-server/conf/example/instance.properties canal/canal-server

（6）测试

在数据表添加一条数据，在消息队列中查看数据：

    {
      "data": [
        {
          "id": "36",
          "sku_name": "华为智慧屏V65i 65英寸 HEGE-560B 4K全面屏智能电视机 多方视频通话 AI升降摄像头 4GB+32GB 星际黑",
        }
      ],
      "table": "sku_info",
      "ts": 1749299368242,
      "type": "INSERT"
    }

注意，canal 采集的数据是增量采集，data 中的 key 是字段名。

## 5、ElasticsearchRepository 接口

ElasticsearchRepository 是 Spring Data Elasticsearch 提供的一个核心接口，它让你能够用非常熟悉和简洁的代码来操作 Elasticsearch，就像操作普通数据库一样。

1）定义与原理

ElasticsearchRepository 是一个仓库接口，它继承自 Spring Data 的 CrudRepository 和 PagingAndSortingRepository。这意味着它为你提供了基础的 CRUD（增删改查）和分页排序功能，无需编写实现代码。

它的核心设计理念是约定优于配置：

（1）实体映射：通过在你的数据类上添加 @Document 注解，可以将它映射到 Elasticsearch 中的一个索引和类型。

（2）自动实现：你只需要定义一个继承 ElasticsearchRepository 的接口，Spring 会在运行时自动生成其实现类（SimpleElasticsearchRepository），让你可以直接注入使用。

2）实现 CRUD

（1）在 Mapper 接口添加两个自定义方法：

    public interface SkuInfoMapper extends ElasticsearchRepository<SkuInfo, String> {
        /**
         * 根据分类 id 查询
         * 方法名：按 by 字段名匹配
         * @param categoryId
         * @return
         */
        List<SkuInfo> findByCategoryId(Long categoryId);

        /**
         * 根据价格区间查询
         * @param min
         * @param max
         * @return
         */
        List<SkuInfo> findByPriceBetween(Double min, Double max);
    }

（2）在 ISkuInfoService 添加接口方法：

    void save(SkuInfoDTO skuInfoDTO);

    void deleteById(String id);

    void updateById(SkuInfoDTO skuInfoDTO);

    SkuInfoDTO findById(String id);

    List<SkuInfoDTO> findByCategoryId(Long categoryId);

    List<SkuInfoDTO> findByPriceBetween(Double min, Double max);

（3）接口实现：

    @Override
    public void save(SkuInfoDTO skuInfoDTO) {
        SkuInfo skuInfo = JsonUtils.toObj(skuInfoDTO, SkuInfo.class);
        skuInfoMapper.save(skuInfo);
    }

    @Override
    public void deleteById(String id) {
        skuInfoMapper.deleteById(id);
    }

    @Override
    public void updateById(SkuInfoDTO skuInfoDTO) {
        SkuInfo skuInfo = JsonUtils.toObj(skuInfoDTO, SkuInfo.class);
        skuInfoMapper.deleteById(skuInfo.getId());
        skuInfoMapper.save(skuInfo);
    }

    @Override
    public SkuInfoDTO findById(String id) {
        Optional<SkuInfo> optional = skuInfoMapper.findById(id);
        if (!optional.isPresent()) {
            return null;
        }
        SkuInfoDTO skuInfoDTO = JsonUtils.toObj(optional.get(), SkuInfoDTO.class);
        return skuInfoDTO;
    }

    @Override
    public List<SkuInfoDTO> findByCategoryId(Long categoryId) {
        List<SkuInfo> skuInfoList = skuInfoMapper.findByCategoryId(categoryId);
        List<SkuInfoDTO> skuInfoDTOList = JsonUtils.toList(skuInfoList, SkuInfoDTO.class);
        return skuInfoDTOList;
    }

    @Override
    public List<SkuInfoDTO> findByPriceBetween(Double min, Double max) {
        List<SkuInfo> skuInfoList = skuInfoMapper.findByPriceBetween(min, max);
        List<SkuInfoDTO> skuInfoDTOList = JsonUtils.toList(skuInfoList, SkuInfoDTO.class);
        return skuInfoDTOList;
    }

（4）测试

    @SpringBootTest
    public class SkuInfoServiceTest {
        @Autowired
        private ISkuInfoService skuInfoService;

        @Test
        public void findByCategoryId() {
            List<SkuInfoDTO> skuInfoDTOS = skuInfoService.findByCategoryId(61L);
            System.out.println(skuInfoDTOS);
        }

        @Test
        public void findByPriceBetween() {
            List<SkuInfoDTO> skuInfoDTOS = skuInfoService.findByPriceBetween(1000.0, 5000.0);
            System.out.println(skuInfoDTOS);
        }
    }

## 6、创建 OpenFeign 接口

（1）在 SkuInfoController 添加接口方法：

    @PostMapping("/save")
    public Result save(@RequestBody SkuInfoDTO skuInfoDTO) {
        skuInfoService.save(skuInfoDTO);
        return Result.success();
    }

    @DeleteMapping("/delete/{id}")
    public Result delete(@PathVariable Long id) {
        skuInfoService.deleteById(String.valueOf(id));
        return Result.success();
    }

    @PutMapping("/update")
    public Result update(@RequestBody SkuInfoDTO skuInfoDTO) {
        skuInfoService.updateById(skuInfoDTO);
        return Result.success();
    }

（2）创建 Feign 接口：

    @FeignClient(name = "mall-es-service", contextId = "skuInfo-es-feign")
    public interface SkuInfoEsFeignClient {
        @PostMapping("/search/save")
        Result save(@RequestBody SkuInfoDTO skuInfoDTO);

        @DeleteMapping("/search/delete/{id}")
        Result delete(@PathVariable Long id);

        @PutMapping("/search/update")
        Result update(@RequestBody SkuInfoDTO skuInfoDTO);
    }

## 7、数据同步

（1）创建驼峰转换工具

在 mall-common 的 util 包下创建转换工具类 CamelCastUtils：

    public class CamelCastUtils {
        /**
         * 字段名转换成属性名
         * @param field
         * @return
         */
        public static String UnderlineToHump(String field) {
            String[] parts = field.split("_");
            StringBuilder hump = new StringBuilder(parts[0]);
            for(int i = 1; i < parts.length; i++) {
                // 首字母转换成大写
                String capitalizedString = Character.toString(parts[i].charAt(0)).toUpperCase() + parts[i].substring(1);
                hump.append(capitalizedString);
            }
            return hump.toString();
        }

        /**
         * JSONObject 转换成实体类
         * @param json
         * @param clazz
         * @return
         */
        public static <T> T jsonToObject(JSONObject json, Class<T> clazz) {
            JSONObject jsonObject = new JSONObject();
            json.entrySet().stream().forEach(entry -> {
                String key = entry.getKey();
                Object value = entry.getValue();
                String fieldName = UnderlineToHump(key);
                jsonObject.put(fieldName, value);
            });
            T obj = JSONObject.parseObject(jsonObject.toJSONString(), clazz);
            return obj;
        }
    }

（2）创建消费者

在项目 mall-consumer-service 创建消费者：

    @Component
    public class SyncDataToEsHandler {
        @Autowired
        private SkuInfoEsFeignClient skuInfoEsFeignClient;
        @Autowired
        private RedisTemplate<String,Object> redisTemplate;
        @Autowired
        private MqHeaderUtil mqHeaderUtil;

        @Bean
        public Consumer<Message<String>> syncDataInput() {
            return message -> {
                // 1. 获取数据
                // 获取消息体
                String body = message.getPayload();
                // 将 MQ 转换成 Map
                Map<String, Object> canalData = JSON.parseObject(body, Map.class);
                // 获取 SkuInfo 对象集合
                List<JSONObject> data = (List<JSONObject>) canalData.get("data");
                // 获取 SkuInfo 对象，并同步到 Es
                if(data == null || data.isEmpty()) {
                    return;
                }
                // 将 json 对象转换成 SkuInfoDTO 对象（驼峰转换）
                SkuInfoDTO skuInfoDTO = CamelCastUtils.jsonToObject(data.get(0), SkuInfoDTO.class);
                // 获取商品 ID
                String key = skuInfoDTO.getId();
                String lockKey = "que:lock:" + key;
                // 2. 幂等校验
                Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, "1", 30, TimeUnit.SECONDS);
                if (!Boolean.TRUE.equals(acquired)) {
                    return;
                }
                // 3. 同步数据
                try {
                    // 3.1 构建请求上下文
                    mqHeaderUtil.buildMockRequestContext();
                    // 3.2 同步操作
                    // 获取操作类型
                    String type = canalData.get("type").toString().toUpperCase();
                    switch (type) {
                        case "INSERT":
                            // 保存
                            skuInfoEsFeignClient.save(skuInfoDTO);
                            break;
                        case "UPDATE":
                            // 修改
                            skuInfoEsFeignClient.update(skuInfoDTO);
                            break;
                        case "DELETE":
                            // 删除
                            skuInfoEsFeignClient.delete(Long.valueOf(skuInfoDTO.getId()));
                            break;
                    }
                } catch (Exception e) {
                    // 抛出异常触发 Stream 自动重试，达到 max-attempts 进入死信
                    throw new RuntimeException("消费同步数据到 Es 异常", e);
                } finally {
                    // 必须清理 ThreadLocal，线程池复用防串上下文
                    mqHeaderUtil.clearContext();
                }
            };
        }
    }

（3）配置消费者

    spring:
      cloud:
        function:
          definition: deleteCartInput;updateOrderStatusInput;orderCheckInput;syncDataInput
        stream:
          bindings:
            ......
            # 同步数据
            syncDataInput-in-0:
              destination: sync_skuinfo
              group: sync-skuinfo-group
              consumer:
                max-attempts: 3 # 消费最大重试次数

（4）测试

在数据库中对数据进行增、删、改操作，检查数据是否同步。

## 8、流程图文字推演

### 全量数据导入流程

启动 ES 服务 --> 调用 /search/importAll 接口 --> 通过 Feign 调用商品服务获取全部商品数据 --> 将 DTO 转换为 SkuInfo 实体 --> 调用 SkuInfoMapper.saveAll() 批量写入 ES --> 在 Kibana 中查看索引文档数量

### 增量数据同步流程

MySQL 数据发生增删改 --> Canal 监听 binlog --> 将变更事件投递到 RocketMQ（topic: sync_skuinfo） --> 消费者 SyncDataToEsHandler 拉取消息 --> 解析消息体并做驼峰转换 --> 基于商品 ID 做 Redis 幂等校验 --> 恢复 Web 请求上下文 --> 根据操作类型（INSERT/UPDATE/DELETE）调用 Feign 接口 --> ES 服务执行对应的保存、更新或删除操作 --> 清理 ThreadLocal

💡 **速记**

【核心考点】

使用 @Document 注解在实体类上自动创建 ES 索引，配合 ElasticsearchRepository 实现 CRUD 与自定义查询。

数据同步分为全量导入（初始化或重建索引）和增量导入（持续同步变更，保持一致性）。

增量同步推荐使用 Canal 监听 MySQL binlog，通过 RocketMQ 异步解耦，提升吞吐与稳定性。

Canal 配置需修改 canal.properties（指定 serverMode 为 rocketMQ 及 namesrv 地址）和 instance.properties（指定数据库地址、同步表、MQ topic）。

消费者需处理幂等（Redis setIfAbsent）、驼峰转换（CamelCastUtils）和 ThreadLocal 清理。

【高频逻辑链】

全量导入：Feign 调用商品服务获取数据 -> 转换实体 -> saveAll 批量写入 ES。

增量同步：MySQL 变更 -> Canal 捕获 binlog -> RocketMQ 投递 -> 消费者解析 -> 幂等校验 -> 调用 Feign 接口 -> ES 更新。

【关键避坑】

@Document 的 createIndex = true 必须配合 ElasticsearchRepository 使用才会自动创建索引，仅添加注解而无 Repository 接口时索引不会自动创建。

Canal 采集的数据中，data 的 key 是数据库字段名（下划线格式），需要转换为 Java 实体类的驼峰属性名。

消费者必须做幂等校验，避免重复消费导致数据重复或异常；同时必须在 finally 中清理 ThreadLocal，防止线程池复用串数据。
