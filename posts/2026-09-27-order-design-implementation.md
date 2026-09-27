---
layout: article
title: "订单的设计与实现"
description: "- \"项目搭建：创建 mall-order-service，配置 Nacos 和数据库\"   - \"代码生成：调整主键策略(ASSIGN_ID)，配置自动填充和逻辑删除\"   - \"生成订单需求：生成订单和明细、扣减库存、删除购物车\"   - \"库存扣减：SkuInfoService 添加 decreaseStock，遍历校验库存并批量更新\"   - \""
date: 2026-09-27
category: "云商城"
tags:
  - "云商城"
  - "订单"
permalink: /posts/2026-09-27-order-design-implementation.html
---

1、创建项目

1）创建项目

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype：

- Name: mall-order-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.order
- ArtifactId: mall-order-service
- Version: 1.0.0

2）用代码生成器生成代码

（略）

注意：
（1）修改生成代码的数据库、数据表、项目名和包名
（2）代码生成后，调整各个实体类的主键生成策略（type = IdType.ASSIGN_ID）
（3）配置自动填充字段和逻辑删除字段

3）配置文件

（1）主配置文件 application.yml 内容

    spring:
      application:
        name: mall-order-service
      profiles:
        active: dev
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            namespace: ${spring.profiles.active:public}

（2）开发环境配置文件 application-dev.yml 内容

    # 服务端口（开发端口，避免冲突）
    server:
      port: 9004
    spring:
      config:
        import: #导入多个文件：Data ID?group=Group
          - nacos:mysql.yml?group=ORDER_GROUP
          - nacos:mybatis.yml
          - nacos:log.yml
          - nacos:knife4j.yml
          - nacos:sentinel.yml

（3）在配置中心创建配置文件

| Data ID | Group | 配置格式 | 配置内容 |
| :--- | :--- | :--- | :--- |
| mysql.yml | ORDER_GROUP | yaml | 克隆后，修改数据库地址信息 |

4）启动项目

（1）创建启动程序

    @SpringBootApplication(scanBasePackages = "com.example.mall")
    @MapperScan("com.example.mall.order.mapper")
    public class OrderServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(OrderServiceApplication.class, args);
        }
    }

（2）启动项目

（略）

7.2.3 订单的设计与实现

1、生成订单

1）需求

生成订单完成以下功能：
（1）生成订单数据和订单详情数据
（2）订单商品库存扣减（远程调用）
（3）删除已结算的购物车商品（远程调用）

2）商品库存扣减

（1）创建库存扣减接口

在商品服务 SkuInfoService 接口添加方法：

    /**
     * 库存扣减
     * @param deductMap Map<商品 ID,销售数量>
     */
    void decreaseStock(Map<Long, Integer> deductMap);

接口实现：

    @Override
    public void decreaseStock(Map<Long,Integer> deductMap) {
        // 安全检查
        if(deductMap == null || deductMap.isEmpty()){
            // 建议 5002 错误用枚举表示，方便后续扩展
            throw new BusinessException(5002, "没有有效的商品扣减数据");
        }

        // 提取 key(商品 ID)
        List<Long> skuIds = deductMap.keySet().stream().collect(Collectors.toList());
        // 查询商品库存信息
        List<SkuInfo> skuInfos = baseMapper.selectByIds(skuIds);
        // 提取更新数据
        List<SkuInfo> updateList = new ArrayList<>();

        for (SkuInfo skuInfo : skuInfos) {
            // 判断库存是否充足
            if (skuInfo.getNum() < deductMap.get(skuInfo.getId())) {
                throw new BusinessException(ResultCodeEnum.STOCK_SHORTAGE);
            }
            // 扣减库存
            skuInfo.setNum(skuInfo.getNum() - deductMap.get(skuInfo.getId()));
            // 添加更新数据
            updateList.add(skuInfo);
        }
        // 批量更新
        baseMapper.updateById(updateList);
    }

（2）创建控制器

在控制 SkuInfoController 添加方法：

    @Tag(name = "商品信息接口")
    @RestController
    @RequestMapping("/skuInfo")
    public class SkuInfoController {
        @Autowired
        private ISkuInfoService skuInfoService;

        @Operation(summary = "扣减库存")
        @PutMapping("/deductStock")
        public Result deductStock(@RequestBody Map<Long, Integer> deductMap) {
            skuInfoService.decreaseStock(deductMap);
            return Result.success();
        }
    }

（3）创建 OpenFeign 接口

在 mall-api 的 product 包创建 OpenFeign 接口：

    @FeignClient(name = "mall-product-service", contextId = "skuInfo-feign")
    public interface SkuInfoFeignClient {
        @PutMapping("/skuInfo/deductStock")
        Result deductStock(@RequestBody Map<Long, Integer> deductMap);
    }

3）删除购物车

（1）创建 OpenFeign 接口

在 mall-api 的 cart 包创建 OpenFeign 接口：

    @FeignClient(
        contextId = "cart-feign",
        name = "mall-cart-service"
    )
    public interface CartFeignClient {
        @DeleteMapping("/cart/deleteBatch")
        Result removeCart(@RequestBody List<String> ids);
    }

4）生成订单

在 mall-api 的 order.dto 包下创建 DTO 类，用于封装前端传递过来的订单数据。

（1）订单明细入参 DTO

    @Schema(description = "订单明细")
    @Data
    public class OrderItemsCreateDTO implements Serializable {
        private static final long serialVersionUID = 1L;
        @Schema(description = "订单 id")
        private String orderId;
        @Schema(description = "销售价格")
        private Double price;
        @Schema(description = "购买数量")
        private Integer quantity;
        @Schema(description = "商品 SKU_ID")
        private Long skuId;
        @Schema(description = "商品名称")
        private String skuName;
        @Schema(description = "图片地址")
        private String image;
    }

（2）订单入参 DTO

    @Schema(description = "生成订单数据")
    @Data
    public class OrderCreateDTO implements Serializable {
        private static final long serialVersionUID = 1L;
        @Schema(description = "用户帐号")
        private Long userId;
        @Schema(description = "订单类型：0->正常订单；1->秒杀订单")
        private Integer orderType;
        @Schema(description = "收货人地址编号")
        private String addressId;
        @Schema(description = "订单明细集合")
        List<OrderItemsCreateDTO> orderItemsList;
        @Schema(description = "购物车 Id 集合")
        private List<String> cartIds;
    }

（3）创建 IOrderService 接口：

    public interface IOrderService {
        /**
         * 生成订单
         * @param orderCreateDTO
         * @throws Exception
         */
        void create(OrderCreateDTO orderCreateDTO) throws Exception;
    }

接口实现：

    @Service
    public class OrderServiceImpl implements IOrderService {
        @Autowired
        private IOrderInfoService orderInfoService;
        @Autowired
        private IOrderItemsService orderItemsService;
        @Autowired
        private SkuInfoFeignClient skuInfoFeignClient;
        @Autowired
        private CartFeignClient cartFeignClient;

        @Override
        public void create(OrderCreateDTO orderCreateDTO) throws Exception {
            // 1. 分离数据
            // 1.1 订单数据
            OrderInfo orderInfo = JsonUtils.toObj(orderCreateDTO, OrderInfo.class);
            // 1.2 订单明细数据
            List<OrderItems> orderItemsList = JsonUtils.toList(orderCreateDTO.getOrderItemsList(), OrderItems.class);
            // 1.3 购物车 ID 集合
            List<String> cartIds = JsonUtils.toList(orderCreateDTO.getCartIds(), String.class);

            // 2. 保存订单
            // 2.1 生成订单编号（订单和订单明细编号一致）,基于雪花算法的分布式唯一 ID
            String orderId = IdWorker.getIdStr();
            // 2.2 保存订单明细
            // 2.2.1 计算金额和合计金额
            double totalAmount = 0.0;
            for (OrderItems item : orderItemsList) {
                // 计算金额
                double amount = item.getPrice() * item.getQuantity();
                item.setAmount(amount); // 设置金额
                item.setOrderId(orderId); // 设置订单编号
                // 计算合计金额
                totalAmount += amount;
            }
            // 2.2.2 保存订单明细
            orderItemsService.saveBatch(orderItemsList);

            // 2.3 保存订单
            orderInfo.setOrderId(orderId); // 设置订单编号
            orderInfo.setTotalAmount(totalAmount); // 设置总金额
            orderInfoService.save(orderInfo);

            // 3. 库存扣减
            // 3.1 获取库存扣减数据
            Map<Long, Integer> deductMap = orderItemsList.stream().collect(
                    Collectors.toMap(OrderItems::getSkuId, OrderItems::getQuantity)
            );
            // 3.2 批量扣减库存
            Result stockResult = skuInfoFeignClient.deductStock(deductMap);
            if (!stockResult.getCode().equals(ResultCodeEnum.SUCCESS.getCode())) {
                throw new BusinessException(stockResult.getCode(), stockResult.getMsg());
            }

            // 4. 删除购物车
            Result cartResult = cartFeignClient.removeCart(cartIds);
            if (!cartResult.getCode().equals(ResultCodeEnum.SUCCESS.getCode())) {
                throw new BusinessException(cartResult.getCode(), cartResult.getMsg());
            }
        }
    }

（4）接口测试

    @SpringBootTest
    public class OrderServiceTest {
        @Autowired
        private IOrderService orderService;

        @Test
        public void testCreate() throws Exception {
            // 订单
            OrderCreateDTO orderCreateDTO = new OrderCreateDTO();
            orderCreateDTO.setUserId(116L);
            orderCreateDTO.setRecipients("张三");
            orderCreateDTO.setRecipientsMobile("13888888888");
            orderCreateDTO.setRecipientsAddress("广东省深圳市南山区");
            orderCreateDTO.setOrderType(0);

            // 订单详情
            List<OrderItemsCreateDTO> orderItemsList = new ArrayList<>();
            OrderItemsCreateDTO orderItem1 = new OrderItemsCreateDTO();
            orderItem1.setPrice(100.0);
            orderItem1.setQuantity(1);
            orderItem1.setSkuId(1L);
            orderItem1.setSkuName("商品 1");
            orderItem1.setImage("https://example.com/image1.jpg");
            orderItemsList.add(orderItem1);

            OrderItemsCreateDTO orderItem2 = new OrderItemsCreateDTO();
            orderItem2.setPrice(200.0);
            orderItem2.setQuantity(2);
            orderItem2.setSkuId(2L);
            orderItem2.setSkuName("商品 2");
            orderItem2.setImage("https://example.com/image2.jpg");
            orderItemsList.add(orderItem2);
            orderCreateDTO.setOrderItemsList(orderItemsList);

            // 购物车 ID 集合(确保购物车 Id 存在)
            List<String> cartIds = List.of("116-4", "116-13");
            orderCreateDTO.setCartIds(cartIds);

            orderService.create(orderCreateDTO);
        }
    }

（5）创建控制器

    @Tag(name = "订单服务")
    @RestController
    @RequestMapping("/order")
    public class OrderController {
        @Autowired
        private IOrderService orderService;

        @Operation(summary = "创建订单")
        @PostMapping("/create")
        public Result create(@RequestBody OrderCreateDTO orderCreateDTO) throws Exception {
            orderService.create(orderCreateDTO);
            return Result.success();
        }
    }

2、查询订单

1）需求

（1）查询用户的不同状态的订单，需要显示订单编号、下单时间、订单金额
（2）每个订单展开订单明细，包含商品图片、销售价格、数量
（3）分页显示订单

注意：查询时需要创建数据库索引，防止非法 SQL

2）创建出口 DTO

在 mall-api 的 order.dto 包下创建 DTO 类，用于封装传递到前端的订单数据。

（1）订单明细 DTO

    @Schema(description = "订单明细")
    @Data
    public class OrderItemsDTO implements Serializable {
        private static final long serialVersionUID = 1L;
        @Schema(description = "销售价格")
        private Double price;
        @Schema(description = "购买数量")
        private Integer quantity;
        @Schema(description = "商品名称")
        private String skuName;
        @Schema(description = "图片地址")
        private String image;
    }

（2）订单 DTO

    @Schema(description = "订单数据")
    @Data
    public class OrderDTO implements Serializable {
        private static final long serialVersionUID = 1L;
        @Schema(description = "订单编号")
        private Long orderId;
        @Schema(description = "下单时间")
        private LocalDateTime createTime;
        @Schema(description = "总金额")
        private Double totalAmount;
        @Schema(description = "订单明细")
        private List<OrderItemsDTO> orderItemsList;
    }

3）创建查询 DTO，封装订单查询参数：

    @Schema(description = "订单查询参数")
    @Data
    public class OrderQueryDTO implements Serializable {
        private static final long serialVersionUID = 1L;
        @Schema(description = "用户编号")
        private Long userId;
        @Schema(description = "订单状态")
        private Integer status;
        @Schema(description = "当前页")
        private Integer pageNum;
        @Schema(description = "每页数量")
        private Integer pageSize;
    }

4）创建业务接口

（1）获取订单明细

在 IOrderItemsService 添加接口方法：

    public interface IOrderItemsService extends IService<OrderItems> {
        /**
         * 获取订单明细
         * @param orderId
         */
        List<OrderItemsDTO> listByOrderId(Long orderId);
    }

接口实现：

    @Override
    public List<OrderItemsDTO> listByOrderId(Long orderId) {
        // 创建条件构造器
        LambdaQueryChainWrapper<OrderItems> queryChainWrapper = new LambdaQueryChainWrapper<>(this.baseMapper);
        List<OrderItems> list = queryChainWrapper.eq(OrderItems::getOrderId, orderId)
                .select(OrderItems::getSkuName, OrderItems::getImage, OrderItems::getPrice, OrderItems::getQuantity)
                .list();
        // 转换 DTO
        return JsonUtils.toList(list, OrderItemsDTO.class);
    }

（2）获取订单信息

在 IOrderInfoService 添加接口方法：

    public interface IOrderInfoService extends IService<OrderInfo> {
        /**
         * 按条件分页查询订单
         * @param query
         */
        Page<OrderDTO> page(OrderQueryDTO query);
    }

接口实现：

    @Override
    public Page<OrderDTO> page(OrderQueryDTO query) {
        // 1. 创建查询条件构造器
        LambdaQueryChainWrapper<OrderInfo> wrapper = new LambdaQueryChainWrapper<>(this.baseMapper);
        // 2. 拼接
        // 2.1 按用户编号查询
        if(query.getUserId() != null){
            wrapper.eq(OrderInfo::getUserId, query.getUserId());
        }
        // 2.2 按订单状态查询
        if(query.getStatus() != null){
            wrapper.eq(OrderInfo::getStatus, query.getStatus());
        }
        // 2.3 创建分页
        Page page = new Page<>();
        if(query.getPageNum() != null && query.getPageSize() != null){
            page.setCurrent(query.getPageNum());
            page.setSize(query.getPageSize());
        }
        // 2.4 添加排序
        wrapper.orderByDesc(OrderInfo::getCreateTime);
        // 2.5 筛选字段
        wrapper.select(OrderInfo::getOrderId, OrderInfo::getCreateTime, OrderInfo::getTotalAmount);
        // 3. 查询
        Page pageResult = wrapper.page(page);
        // 4. 转换
        List<OrderDTO> orderDTOList = JsonUtils.toList(pageResult.getRecords(), OrderDTO.class);
        pageResult.setRecords(orderDTOList);
        return pageResult;
    }

（3）封装订单数据

在 IOrderService 添加接口方法：

    /**
     * 分页查询订单
     * @param query
     * @return
     */
    Page<OrderDTO> page(OrderQueryDTO query);

接口实现：

    @Override
    public Page<OrderDTO> page(OrderQueryDTO query) {
        // 获取订单集合
        Page<OrderDTO> result = orderInfoService.page(query);
        List<OrderDTO> orderList = result.getRecords();
        // 封装订单中订单明细
        List<OrderDTO> records = orderList.stream().map(order -> {
            // 获取订单明细
            List<OrderItemsDTO> orderItems = orderItemsService.listByOrderId(order.getOrderId());
            order.setOrderItemsList(orderItems);
            return order;
        }).collect(Collectors.toList());
        // 封装数据
        result.setRecords(records);
        return result;
    }

5）创建控制器

在 OrderController 添加方法：

    @Operation(summary = "分页查询订单")
    @GetMapping("/page")
    public Result<Page<OrderDTO>> page(OrderQueryDTO query) {
        return Result.success(orderService.page(query));
    }

3、前后端联调

1）网关配置

    - id: mall-order-service
      uri: lb://mall-order-service
      predicates:
        - Path=/api/order/**
      filters:
        - StripPrefix=2

2）前端联调（按操作流程排序）

（1）添加购物车（略）

（2）打开购物车页面：
进入购物车页面，勾选需要购买的商品（如：小米10 至尊纪念版，数量 1），点击“去结算”。

（3）点击结算，进入结算页面：
在结算页面“填写并核对订单信息”：
- 收件人信息：选择默认地址（如：何五，广东省广州市花都区澳门大街123号）。
- 支付方式：选择“支付宝”。
- 送货清单：确认商品清单（包含商品图片、名称、单价、数量、是否有货）。
- 确认无误后，点击“提交订单”。

（4）提交订单，进入订单列表页面：
页面跳转到订单列表，显示刚刚生成的订单：
- 订单编号、下单时间、总金额。
- 订单内商品明细（商品图片、名称、单价、数量）。
- 支持分页查看（如共4页，可翻页）。
- 同时回到购物车页面，已结算的购物车商品已删除，订单完成。

---

💡 **速记**

**【项目搭建核心】**
*   创建 `mall-order-service` 模块。
*   Nacos 配置：`application.yml` 指定服务名和 profiles，`application-dev.yml` 导入 `mysql.yml`、`mybatis.yml`、`log.yml`、`knife4j.yml`、`sentinel.yml`。
*   启动类：`@MapperScan("com.example.mall.order.mapper")`。

**【生成订单核心逻辑（高频考点）】**
1. **前置准备**：在 `SkuInfoService` 添加 `decreaseStock(Map)` 方法，在 `SkuInfoFeignClient` 暴露接口。
2. **Feign 客户端**：创建 `SkuInfoFeignClient` (扣减库存) 和 `CartFeignClient` (删除购物车)。
3. **DTO 定义**：`OrderCreateDTO` (用户、地址、订单类型、明细列表、购物车ID列表)。
4. **业务实现 (`OrderServiceImpl.create`)**：
   *   分离数据：`OrderInfo`、`OrderItems`、`cartIds`。
   *   生成订单编号：`IdWorker.getIdStr()` (雪花算法)。
   *   计算总金额：遍历明细，`amount = price * quantity`，累加得到 `totalAmount`。
   *   保存明细：`orderItemsService.saveBatch()`。
   *   保存订单：`orderInfoService.save()`。
   *   远程扣减库存：调用 `skuInfoFeignClient.deductStock(deductMap)`。
   *   远程删除购物车：调用 `cartFeignClient.removeCart(cartIds)`。

**【查询订单核心逻辑】**
*   **接口分层**：`IOrderItemsService.listByOrderId` 查明细，`IOrderInfoService.page` 查主单分页。
*   **主单分页**：`LambdaQueryChainWrapper` 组装条件 (用户ID、状态)，`page()` 分页，`orderByDesc` 按时间倒序，`select` 裁剪字段。
*   **数据组装**：在 `OrderServiceImpl.page` 中，先查出主单列表，然后使用 `stream().map()` 遍历，为每个订单调用 `listByOrderId` 填充明细列表，最后替换 `pageResult` 的 `records`。

**【前后端联调】**
*   网关配置：`/api/order/**` 转发到 `mall-order-service`，`StripPrefix=2`。
*   前端流程（按顺序）：
    1. 购物车页面：选中商品，点击“去结算”。
    2. 结算页面：确认收件人信息、支付方式、送货清单，点击“提交订单”。
    3. 订单列表页面：展示订单编号、时间、总金额、商品明细，支持分页。此时购物车已结算商品被删除，订单完成。
