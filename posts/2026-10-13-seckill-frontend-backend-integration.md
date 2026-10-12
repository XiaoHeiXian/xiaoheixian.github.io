---
layout: article
title: "秒杀前后端联调与页面静态化"
description: "- \"网关路由：配置 mall-seckill-service 路由与 StripPrefix 过滤器。\"   - \"放行接口：将秒杀接口加入网关放行名单。\"   - \"页面静态化：使用 Thymeleaf 生成静态 HTML 详情页，减轻数据库压力。\"   - \"动态数据：获取活动商品数据，动态生成上下文并写入文件。\"   - \"前端测试：验证秒杀列表"
date: 2026-10-13
category: "云商城"
tags:
  - "秒杀 前后端联调 Thymeleaf 页面静态化"
permalink: /posts/2026-10-13-seckill-frontend-backend-integration.html
---

### 1、配置网关路由

1）配置网关路由

在网关服务中新增秒杀服务的路由配置，将请求转发到 mall-seckill-service 并去除前缀。

    - id: mall-seckill-service
      uri: lb://mall-seckill-service
      predicates:
        - Path=/api/seckill/**
      filters:
        - StripPrefix=2

2）放行接口

（略）

### 2、前端页面

1）秒杀商品详情页静态化

页面效果如下图：

    shop秒杀 | 每日特价 | 大牌闪购 | 节日活动
    （商品图片） Redmi 10X 4G Helio G85游戏芯 4800万超清四摄 5020mAh大电量 小孔全面屏 128GB大存储 8GB+128GB 冰雾白 游戏智能手机 小米 红米
    推荐选择下方[移动优惠购],手机套餐首充立得,不用换号,每月还有话费返
    价格 ￥1039 原价:￥1299
    促销 加价购
    支持 以旧换新,闲置手机回收 4G套餐超值抢 礼品购
    配送至 您还未登录,请登录
    距离结束:0小时 47分 20秒 【立即抢购】

秒杀商品一个活动有多个商品，下面以活动为单位，批量生成静态详情页。

（1）导入 thymeleaf.yml 配置文件

克隆 SECKILL_GROUP 组数据集 thymeleaf.yml 并导入文件。

（2）复制模板

将模板 seckillitem-template.html 复制到 resources/templates 目录下。

（3）生成详情页（可以修改成 OSS 存储）

创建接口：

    public interface IPageService {
        List<String> generateProductTemplate(Integer activityId) throws Exception;
    }

接口实现：

    @Service
    public class PageServiceImpl implements IPageService {
        @Value("${file.path}")
        private String path;

        @Autowired
        private ISeckillGoodsService seckillGoodsService;

        @Autowired
        private TemplateEngine templateEngine;

        @Override
        public List<String> generateProductTemplate(Integer activityId) throws Exception {
            // 1 创建 Thymeleaf 模板的上下文对象
            Context context = new Context();

            // 2 设置模板数据
            // 2.1 获取活动商品详情数据
            List<SeckillGoodsDTO> list = seckillGoodsService.listByActivityId(activityId);

            // 2.2 添加数据
            // 存储生成的静态页面的URL
            List<String> urls = new ArrayList<>();
            for(SeckillGoodsDTO data : list) {
                context.setVariable("product", data);

                // 3 指定静态页面保存路径和名称（以activityId-skuId命名命名）
                String fileName = activityId + "-" + data.getSkuId() + ".html";
                File file = new File(path, fileName);
                PrintWriter printWriter = new PrintWriter(file, "UTF-8");

                // 4 静态页面生成
                templateEngine.process("seckill-item-template", context, printWriter);
                urls.add(path + "/" + fileName);
            }
            return urls;
        }
    }

控制器：

    @RestController
    @RequestMapping("/page")
    public class PageController {
        @Autowired
        private IPageService pageService;

        @GetMapping("/generate/{activityId}")
        public Result<List<String>> generateProductTemplate(@PathVariable Integer activityId) throws Exception {
            List<String> urls = pageService.generateProductTemplate(activityId);
            return Result.success(urls);
        }
    }

（4）生成静态详情页

查看保存静态页面目录，生成了多个页面（略）。

（2）页面测试（seckill.html）

    shop秒杀 | 每日特价 | 大牌闪购 | 节日活动

    08:00:00 正在抢购中 | 18:00:00即将开始 | 10:00:00即将开始 | 11:00:00即将开始
    距离结束:1小时 11分 51秒

    （商品列表：华为 P40、小米 10 等图片）

    ￥4799 原价:￥6999
    小米10 至尊纪念版 双模5G 骁龙865 120HZ高刷新率 120倍长焦镜头 120...
    已有5435人评价
    【抢购】 【收藏】

    ￥6399 原价:￥7999
    小米10 至尊纪念版 双模5G 骁龙865 120HZ高刷新率 120倍长焦镜头 120...
    已有5435人评价
    【抢购】 【收藏】

    点击抢购进入详情页：

    shop秒杀 | 每日特价 | 大牌闪购 | 节日活动

    （商品图片） 小米10 至尊纪念版 双模5G 骁龙865 120HZ高刷新率 120倍长焦镜头 120W快充 12GB+256GB 陶瓷黑 游戏手机
    推荐选择下方[移动优惠购],手机套餐首充立得,不用换号,每月还有话费返
    价格 ￥6399 原价:￥7999
    促销 加价购
    支持 以旧换新,闲置手机回收 4G套餐超值抢 礼品购
    配送至 您还未登录,请登录
    距离结束:1小时 11分 9秒 【立即抢购】

### 3、流程图文字推演

#### 秒杀详情页静态化生成流程

请求 /page/generate/{activityId} --> 调用 IPageService.generateProductTemplate --> 获取商品列表 listByActivityId --> 创建 Thymeleaf Context 上下文对象 --> 遍历商品列表 --> 设置上下文变量 product --> 指定静态页面保存路径与文件名（activityId-skuId.html） --> 创建 PrintWriter --> 调用 templateEngine.process 渲染模板并写入文件 --> 将文件路径添加到 urls 列表 --> 返回 urls 列表

#### 前端秒杀访问流程

用户访问秒杀列表页 --> 展示正在抢购与即将开始的活动 --> 点击商品图片或“抢购”按钮 --> 跳转到对应商品的静态 HTML 详情页 --> 展示商品详情、价格、倒计时与“立即抢购”按钮 --> 用户点击“立即抢购” --> 进入秒杀下单流程

## 💡 **速记**

【核心考点】

网关路由配置需正确匹配 Path 并设置 StripPrefix，保证请求能转发到后端秒杀服务。

页面静态化是指将动态生成的商品详情页提前渲染成静态 HTML 文件存在服务器，用户访问时直接返回静态文件，不需要访问后端服务和数据库。

Thymeleaf 结合 Context 上下文对象，可以批量渲染模板并写入本地文件，生成静态页面。

【高频逻辑链】

网关配置：Path=/api/seckill/** -> StripPrefix=2 -> 转发至 mall-seckill-service。

静态化生成：获取活动商品列表 -> 创建 Context -> 设置变量 -> 创建文件 -> 渲染模板 -> 写入文件 -> 返回 URL 列表。

前端访问：秒杀列表页 -> 点击商品 -> 跳转静态 HTML 详情页 -> 立即抢购。

【关键避坑】

静态化页面生成后，如果商品信息更新，需要重新生成静态页或通过其他机制触发更新，否则会出现数据不一致问题。

模板文件路径需正确配置（resources/templates），且需要导入 Thymeleaf 相关配置和依赖。
