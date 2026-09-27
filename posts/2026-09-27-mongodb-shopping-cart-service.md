---
layout: article
title: "MongoDB 实现购物车（项目搭建与服务实现）"
description: "- \"项目创建：mall-cart-service，父工程 mall-services\"   - \"依赖引入：spring-boot-starter-data-mongodb\"   - \"配置核心：application.yml 集成 Nacos，application-dev.yml 导入 mongodb.yml\"   - \"MongoDB 配置：ur"
date: 2026-09-27
category: "云商城"
tags:
  - "SpringCloud"
  - "微服务"
  - "mongodb"
permalink: /posts/2026-09-27-mongodb-shopping-cart-service.html
---

1、创建项目

1）创建项目

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype：

- Name: mall-cart-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.cart
- ArtifactId: mall-cart-service
- Version: 1.0.0

2）配置文件

配置文件 application.yml 是项目的全局参数表，所有框架、数据库、业务参数都写在这里，解耦代码、方便维护和环境切换，是 SpringBoot 项目标配文件：

- 替换硬编码：数据库地址、端口、账号密码、路径、开关等，不写在代码里，统一放配置文件，改配置不用重写代码。
- 集中管理项目参数：端口、数据库、MyBatis、Redis、日志、线程池、自定义业务参数全部统一配置。
- 多环境切换：开发 / 测试 / 生产环境，一键切换配置，不用改代码。
- 框架自动加载：SpringBoot 启动时自动读取，注入到容器、自动装配组件。

在 src/main 目录下创建 resources 目录，在 resources 目录下创建资源文件和目录：

| 路径 | 内容 |
| :--- | :--- |
| application.yml | 主配置文件 |
| application-dev.yml | 开发环境配置 |
| application-prod.yml | 生产环境配置 |

（1）主配置文件 application.yml

    spring:
      application:
        name: mall-cart-service
      profiles:
        active: dev
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            namespace: ${spring.profiles.active:public}

（2）开发环境配置文件 application-dev.yml

application-dev.yml 内容：

    server:
      port: 9003
    spring:
      config:
        import: 
          - nacos:mongodb.yml?group=CART_GROUP
          - nacos:log.yml

在配置中心创建 mongodb.yml，组为 CART_GROUP：

    spring:
      #MongoDB 配置
      data:
        mongodb:
          #sh - 用户名、sh- 密码、192.168.100.104 - 数据库地址、27017- 端口号、shop - 库名
          uri: mongodb://sh:sh@192.168.100.101:27017/shop

3）启动项目

（1）创建启动程序

在 cart 包下面创建启动类 CartServiceApplication.java：

    @SpringBootApplication(scanBasePackages = "com.example.mall", exclude = {DataSourceAutoConfiguration.class})
    public class CartServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(CartServiceApplication.class, args);
        }
    }

（2）集成 MongoDB

集成 MongoDB 需要引入依赖包 spring-boot-starter-data-mongodb：

    <!--MongoDB-->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-mongodb</artifactId>
    </dependency>

（3）启动

正常启动没有异常。

2、实体规范

创建实体类 com.example.mall.cart.domain.entity.Cart：

    @Data
    @Document(collection = "cart") // 指定集合名称，默认为类名小写
    public class Cart {
        @Id // MongoDB _id 主键
        private String id; // 编号
        @Field("user_id") // 映射文档字段名, 默认与属性名一致
        private String userId; // 用户 ID
        @Field("sku_name")
        private String skuName; // 商品名称
        private Double price; // 价格
        private String image; // 图片
        @Field("sku_id")
        private String skuId; // 商品 ID
        private Integer quantity; // 数量
        @Field("create_time")
        private LocalDateTime createTime; // 创建时间
    }

3、MongoDB 接口

Spring 整合 MongoDB 有两种方式，第一种是继承 MongoRepository<T,ID> 的 Mapper 来整合 MongoDB，第二种是使用 MongoTemplate 整合 MongoDB，复杂的操作推荐使用 MongoTemplate，简单的增删改查使用第一种即可。

1）MongoTemplate

MongoTemplate 是 Spring Data MongoDB 底层核心操作类，替代原生 MongoClient，封装 CRUD、聚合、索引、事务、复杂查询，兼容 MongoDB 所有语法。

（1）新增操作

| 方法 | 作用 | 特点 |
| :--- | :--- | :--- |
| insert(T entity) | 插入单条文档 | _id 重复直接抛异常，仅新增 |
| insertAll(Collection<?> list) | 批量插入多条 | 批量新增，主键冲突报错 |
| save(T entity) | 保存文档（新增 / 覆盖） | 根据 _id 判断，有则全量覆盖，无则新增 |

（2）查询操作

| 方法 | 作用 | 特点 |
| :--- | :--- | :--- |
| findById(String id, Class<T> clazz) | 根据主键查询单条 | 精准查_id，效率高 |
| findOne(Query query, Class<T> clazz) | 查询匹配第一条数据 | 无数据返回 null |
| find(Query query, Class<T> clazz) | 查询全部匹配集合 | 支持条件、分页、排序、字段投影 |
| distinct(String field, Class<T> clazz, Class<R> resultType) | 字段去重查询 | 获取该字段所有不重复值 |
| count(Query query, Class<T> clazz) | 统计匹配总数量 | 分页计算 total 专用 |
| exists(Query query, Class<T> clazz) | 判断是否存在匹配数据 | 返回 boolean，性能优于 count |

（3）条件查询

Criteria：构建查询条件（where、等于、大于、模糊、in、数组等）

Query：承载 Criteria、分页、排序、字段投影、limit/skip

Criteria 条件对照表：

| 条件类型 | 代码写法 | 等价 Mongo 语法 | 说明 |
| :--- | :--- | :--- | :--- |
| 等值匹配 | Criteria.where("name").is("张三") | {name:"张三"} | 精确匹配 |
| 不等于 | Criteria.where("age").ne(18) | {age:{$ne:18}} | 不等于 |
| 大于 | Criteria.where("age").gt(20) | {age:{$gt:20}} | >20 |
| 大于等于 | Criteria.where("age").gte(20) | {age:{$gte:20}} | ≥20 |
| 小于 | Criteria.where("age").lt(20) | {age:{$lt:20}} | <20 |
| 小于等于 | Criteria.where("age").lte(20) | {age:{$lte:20}} | ≤20 |
| in 包含 | Criteria.where("id").in(List.of(1,2,3)) | {id:{$in:[1,2,3]}} | 在数组内 |
| not in | Criteria.where("id").nin(List.of(1,2)) | {id:{$nin:[1,2]}} | 不在数组内 |
| 模糊匹配 | Criteria.where("name").regex("张") | {name:/ 张 /} | 包含 "张" |
| 左模糊 | Criteria.where("name").regex("^张") | /^ 张 / | 以张开头 |
| 右模糊 | Criteria.where("name").regex("三$") | / 三 $/ | 以三结尾 |
| 字段存在 | Criteria.where("phone").exists(true) | {phone:{$exists:true}} | 该字段不为 null |
| 字段不存在 | Criteria.where("phone").exists(false) | {phone:{$exists:false}} | 无此字段 |
| and 且 | criteria.and("status").is(1) | 多条件同时满足 | 链式拼接默认 and |
| or 或 | new Criteria().orOperator(c1,c2) | {$or:[条件 1, 条件 2]} | 满足其一即可 |
| 数组包含单个 | Criteria.where("tags").is("学生") | {tags:"学生"} | 数组内包含该元素 |
| 数组全部匹配 | Criteria.where("tags").all(List.of("男","学生")) | {tags:{$all:["男","学生"]}} | 同时包含两个值 |
| 数组长度 | Criteria.where("tags").size(2) | {tags:{$size:2}} | 数组长度等于 2 |

Query 常用配置对照表：

| Query 操作 | 代码 | 作用 |
| :--- | :--- | :--- |
| 绑定条件 | Query query = Query.query(criteria) | 将 Criteria 装入查询 |
| 分页偏移 | query.skip((pageNum-1)*pageSize) | 跳过多少条 |
| 每页条数 | query.limit(pageSize) | 限制返回数量 |
| 排序 | query.with(Sort.by(Sort.Direction.DESC,"createTime")) | 按创建时间倒序 |
| 只返回指定字段 | query.fields().include("name","age") | 只查 name、age |
| 排除字段 | query.fields().exclude("_id","password") | 不返回_id、密码 |

（4）更新操作

| 方法 | 作用 | 核心特性 |
| :--- | :--- | :--- |
| updateFirst(Query q, Update u, Class<T>) | 更新匹配到的第一条文档 | 只改第一条，不存在则无操作 |
| updateMulti(Query q, Update u, Class<T>) | 更新所有匹配文档 | 批量更新多条 |
| upsert(Query q, Update u, Class<T>) | 有则更新，无则插入新文档 | 新增 + 更新一体，业务常用 |
| findAndModify(Query, Update, Options, Class<T>) | 原子查询并更新 | 可返回更新前 / 更新后数据，原子操作防并发 |

Update 常用修改动作：

| Update 方法 | 功能 |
| :--- | :--- |
| set("key", val) | 赋值字段 |
| inc("key", num) | 数字自增 / 自减 |
| push("arr", val) | 数组追加元素 |
| pull("arr", val) | 删除数组指定元素 |
| unset("key") | 删除文档字段 |

（5）删除操作

| 方法 | 作用 | 说明 |
| :--- | :--- | :--- |
| remove(Query query, Class<T> clazz) | 删除所有匹配文档 | 返回 DeleteResult，可获取删除条数 |
| findAndRemove(Query query, Class<T> clazz) | 删除匹配第一条，并返回被删对象 | 原子操作，删除同时拿到数据 |

（6）集合 / 辅助通用操作

| 方法 | 用途 |
| :--- | :--- |
| collectionExists(Class<T>) | 判断集合是否存在 |
| createCollection(Class<T>) | 创建集合 |
| dropCollection(Class<T>) | 删除整个集合 |
| indexOps(Class<T>).ensureIndex() | 创建索引 |
| aggregate(Aggregation, String coll, Class) | 聚合查询（分组、联表、统计） |

2）创建业务接口

（1）创建 DTO

    @Data
    public class CartDTO implements Serializable {
        private static final long serialVersionUID = 1L;
        private String id;
        private String userId;
        private String skuName;
        private Double price;
        private String image;
        private String skuId;
        private Integer quantity;
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
        private LocalDateTime createTime;
    }

（2）创建查询 DTO

    @Data
    public class CartQueryDTO implements Serializable {
        private static final long serialVersionUID = 1L;
        private String userId;
        private String skuName;
        private Double minPrice;
        private Double maxPrice;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }

（3）创建业务接口

    public interface ICartService {
        /**
         * 添加到购物车
         * @param cart
         */
        void addToCart(Cart cart);

        /**
         * 批量添加到购物车
         * @param carts
         */
        void addToCart(List<Cart> carts);

        /**
         * 获取购物车列表
         * @return
         */
        Page<CartDTO> page(CartQueryDTO cartQueryDTO);

        /**
         * 获取用户购物车列表
         * @param userId
         */
        List<CartDTO> list(String userId);

        /**
         * 删除购物车
         * @param id
         */
        void removeCart(String id);

        /**
         * 批量删除购物车
         * @param ids
         */
        void removeCart(List<String> ids);
    }

（4）接口实现

    @Service
    public class CartServiceImpl implements ICartService {
        @Autowired
        private MongoTemplate mongoTemplate;

        @Override
        public void addToCart(Cart cart) {
            // 购物车 ID 由 userId+skuId 生成
            cart.setId(cart.getUserId() + "-" + cart.getSkuId());
            cart.setCreateTime(LocalDateTime.now());
            // 查询购物车中是否存在该用户商品，如果存在，则更新数量
            Cart old = mongoTemplate.findById(cart.getId(), Cart.class);
            if (old != null){
                cart.setQuantity(old.getQuantity() + cart.getQuantity());
            }
            mongoTemplate.save(cart);
        }

        @Override
        public void addToCart(List<Cart> carts) {
            carts.stream().forEach(cart -> {
                cart.setId(cart.getUserId() + "-" + cart.getSkuId());
                cart.setCreateTime(LocalDateTime.now());
                Cart old = mongoTemplate.findById(cart.getId(), Cart.class);
                if (old != null){
                    cart.setQuantity(old.getQuantity() + cart.getQuantity());
                }
            });
            // 先删除原有购物车商品，再保存
            mongoTemplate.remove(Query.query(Criteria.where("id").in(carts.stream().map(Cart::getId).toArray())), Cart.class);
            mongoTemplate.insertAll(carts);
        }

        @Override
        public Page<CartDTO> page(CartQueryDTO cartQueryDTO) {
            // 1. 创建条件构造器
            Criteria criteria = new Criteria();
            // 2. 拼接筛选条件
            if(cartQueryDTO.getUserId() != null){
                criteria.and("user_id").is(cartQueryDTO.getUserId());
            }
            if (cartQueryDTO.getSkuName() != null) {
                criteria.and("sku_name").regex(cartQueryDTO.getSkuName());
            }
            if (cartQueryDTO.getMinPrice() != null) {
                criteria.and("price").gt(cartQueryDTO.getMinPrice());
            }
            if (cartQueryDTO.getMaxPrice() != null) {
                criteria.and("price").lt(cartQueryDTO.getMaxPrice());
            }
            // 3. 查询满足条件的总文档数（必与分页参数分离）
            long total = mongoTemplate.count(Query.query(criteria), Cart.class);
            // 4. 执行查询
            // 4.1 创建查询对象
            Query query = Query.query(criteria)
                    .skip((cartQueryDTO.getPageNum() - 1) * cartQueryDTO.getPageSize())
                    .limit(cartQueryDTO.getPageSize())
                    .with(Sort.by(Sort.Direction.DESC, "create_time"));
            // 4.2 执行查询
            List<Cart> carts = mongoTemplate.find(query, Cart.class);
            // 5. 创建分页对象
            Page<CartDTO> pageResult = new Page<>(cartQueryDTO.getPageNum(), cartQueryDTO.getPageSize(), total);
            List<CartDTO> cartDTOS = JsnUtils.toList(carts, CartDTO.class);
            pageResult.setRecords(cartDTOS);
            return pageResult;
        }

        @Override
        public List<CartDTO> list(String userId) {
            Query query = Query.query(Criteria.where("user_id").is(userId));
            List<Cart> carts = mongoTemplate.find(query, Cart.class);
            List<CartDTO> cartDTOS = JsnUtils.toList(carts, CartDTO.class);
            return cartDTOS;
        }

        @Override
        public void removeCart(String id) {
            Query query = Query.query(Criteria.where("id").is(id));
            mongoTemplate.remove(query, Cart.class);
        }

        @Override
        public void removeCart(List<String> ids) {
            Query query = Query.query(Criteria.where("id").in(ids));
            mongoTemplate.remove(query, Cart.class);
        }
    }

（5）接口测试

    @SpringBootTest
    public class CartServiceTest {
        @Autowired
        private ICartService cartService;

        @Test
        public void testAddToCart() {
            Cart cart = new Cart();
            cart.setUserId("1");
            cart.setSkuName("测试商品");
            cart.setPrice(10.0);
            cart.setImage("https://example.com/image.jpg");
            cart.setSkuId("1");
            cart.setQuantity(2);
            cart.setCreateTime(LocalDateTime.now());
            cartService.addToCart(cart);
            // 批量添加
            Cart cart2 = new Cart();
            cart2.setUserId("1");
            cart2.setSkuName("测试商品 2");
            cart2.setPrice(20.0);
            cart2.setImage("https://example.com/image2.jpg");
            cart2.setSkuId("2");
            cart2.setQuantity(1);
            cart2.setCreateTime(LocalDateTime.now());
            Cart cart3 = new Cart();
            cart3.setUserId("1");
            cart3.setSkuName("测试商品 3");
            cart3.setPrice(30.0);
            cart3.setImage("https://example.com/image3.jpg");
            cart3.setSkuId("3");
            cart3.setQuantity(1);
            cart3.setCreateTime(LocalDateTime.now());
            cartService.addToCart(List.of(cart2, cart3));
        }

        @Test
        public void testPage() {
            CartQueryDTO cartQueryDTO = new CartQueryDTO();
            cartQueryDTO.setUserId("1");
            cartQueryDTO.setSkuName("测试");
            cartQueryDTO.setPageNum(1);
            cartQueryDTO.setPageSize(2);
            Page<CartDTO> page = cartService.page(cartQueryDTO);
            System.out.println(page);
        }

        @Test
        public void testRemoveCart() {
            cartService.removeCart("1-1");
            // 批量删除
            cartService.removeCart(List.of("1-2", "1-3"));
        }
    }

4、控制器

    @Tag(name = "购物车接口")
    @RestController
    @RequestMapping("/cart")
    public class CartController {
        @Autowired
        private ICartService cartService;

        @Operation(summary = "添加购物车")
        @PostMapping("/add")
        public void addToCar(@RequestBody Cart cart) {
            cartService.addToCart(cart);
        }

        @Operation(summary = "批量添加购物车")
        @PostMapping("/addBatch")
        public void addToCar(@RequestBody List<Cart> carts) {
            cartService.addToCart(carts);
        }

        @Operation(summary = "获取购物车列表")
        @GetMapping("/page")
        public Page<CartDTO> page(CartQueryDTO cartQueryDTO) {
            return cartService.page(cartQueryDTO);
        }

        @Operation(summary = "获取用户购物车列表")
        @GetMapping("/list/{userId}")
        public List<CartDTO> list(@PathVariable String userId) {
            return cartService.list(userId);
        }

        @Operation(summary = "删除购物车")
        @DeleteMapping("/delete/{id}")
        public void removeCart(@PathVariable String id) {
            cartService.removeCart(id);
        }

        @Operation(summary = "批量删除购物车")
        @DeleteMapping("/deleteBatch")
        public void removeCart(@RequestBody List<String> ids) {
            cartService.removeCart(ids);
        }
    }

5、网关设置

（1）添加网关路由

    - id: mall-cart-service
      uri: lb://mall-cart-service
      predicates:
        - Path=/api/cart/**
      filters:
        - StripPrefix=2

（2）测试（略）

6、前端联调

（1）打开前端产品首页，加入购物车，进入购物车页面。
（2）重复对一个商品加购，只增加数量，不添加购物车项。
（3）在购物车页面完成删除和批量删除。

---

💡 **速记**

**【MongoDB 购物车项目搭建核心】**
1. **创建项目**：`mall-cart-service`，父工程 `mall-services`。
2. **引入依赖**：`spring-boot-starter-data-mongodb`。
3. **配置文件**：`application.yml` 配置 Nacos 和 profiles，`application-dev.yml` 导入 `mongodb.yml` (Group: CART_GROUP)。
4. **MongoDB 配置**：`uri: mongodb://用户名:密码@IP:端口/库名`。
5. **启动类**：必须排除 `DataSourceAutoConfiguration.class`。

**【实体规范与 MongoTemplate】**
1. **实体类**：`@Document(collection = "cart")` 指定集合，`@Id` 标记主键，`@Field` 映射字段名。
2. **MongoTemplate**：核心操作类，封装 CRUD、聚合、索引。
3. **新增**：`save()` 有则覆盖无则新增，`insert()` 重复报错。
4. **查询**：`findById()`、`findOne()`、`find()`、`count()`、`exists()`。
5. **条件构建**：`Criteria.where("key").is(val)`、`.gt()`、`.lt()`、`.regex()`、`.in()`。
6. **分页排序**：`Query.query(criteria).skip().limit().with(Sort.by(...))`。
7. **更新**：`updateFirst()`、`updateMulti()`、`upsert()`，`Update.set()`、`.inc()`。
8. **删除**：`remove()`、`findAndRemove()`。
9. **集合**：`createCollection()`、`dropCollection()`、`aggregate()`。

**【购物车核心业务逻辑】**
1. **主键生成**：`cart.setId(cart.getUserId() + "-" + cart.getSkuId())`。
2. **去重累加**：先 `findById()` 查询，若存在则 `cart.setQuantity(old.getQuantity() + cart.getQuantity())`，然后 `save()`。
3. **批量添加**：先 `remove` 原有的，再 `insertAll` 新的。
4. **分页查询**：先用 `count` 查总数，再用 `find` 配合 `skip/limit/with` 查列表。
5. **用户列表**：`Criteria.where("user_id").is(userId)` 直接 `find`。

**【网关路由配置】**
*   `id`：`mall-cart-service`
*   `uri`：`lb://mall-cart-service`
*   `predicates`：`Path=/api/cart/**`
*   `filters`：`StripPrefix=2`
