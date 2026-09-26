---
layout: article
title: "SPU 静态页面存储与前后端联调"
description: "- \"前后端联调：配置Gateway跨域，配置网关路由，放行API白名单\"   - \"原系统问题：文件生成本地服务器磁盘，集群部署多实例时文件分散，无法共享\"   - \"解决方案：模板渲染至内存字符串，直接转字节流上传OSS，不落地本地磁盘\"   - \"原系统修正：表加html_url字段，实体加属性，分页查询加字段，Service加更新方法\"   -"
date: 2026-09-27
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "OSS"
permalink: /posts/2026-09-27-spu-static-page-oss.html
---

## 前后端联调
1、Gate 跨域请求

配置 Gate 跨域请求（关闭原微服务的跨域请求）：

    ---
    spring:
      cloud:
        gateway:
          globalcors:
            add-to-simple-url-handler-mapping: true #将 CORS 配置应用到应用
            cors-configurations:
              '[/**]':
                allowedOriginPatterns: "*"
                allowed-methods:
                  - GET
                  - POST
                  - PUT
                  - DELETE
                  - OPTIONS
                allowed-headers:
                  - "*" # 允许所有请求头
                exposed-headers:
                  - "*" # 暴露所有响应头
                allow-credentials: true

2、配置网关和放行

1）配置网关

    - id: mall-oss-service
      uri: lb://mall-oss-service
      predicates:
        - Path=/api/aliyun/oss/**
      filters:
        - StripPrefix=2

2）放行 api

    default-filters:
      - Auth=/api/user/login,/api/user/register,/api/product/**,/api/test/**,/api/aliyun/oss/**

3、打开前端页面测试（略）

## SPU 静态页面存储

1、原系统存在的问题

文件生成本地服务器磁盘，集群部署多实例时文件分散，无法共享。

2、解决方案

根据 spuId 查询商品数据，模板渲染至内存字符串，直接转字节流上传 OSS，不落地本地磁盘，内存直接上传 OSS。

1）原系统修正

（1）数据表 sku_info 添加字段：

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| html_url | VARCHAR(512) | 静态页文件存储路径 |

（2）SkuInfo 实体类和 ProductDTO 类添加属性：

    private String htmlUrl;

（3）商品分页业务实现类添加字段筛选：

    public class ProductServiceImpl implements IProductService {
        @Override
        public IPage page(ProductQueryDTO queryDTO) {
            // 2.6 筛选字段
            query.select(
                SkuInfo::getId,
                SkuInfo::getSpuId,
                SkuInfo::getSkuName,
                SkuInfo::getPrice,
                SkuInfo::getSkuDefaultImg,
                SkuInfo::getHtmlUrl);
        }
    }

（4）在 ISkuInfoService 接口添加方法：

    /**
     * 保存 SPU 静态页
     * @param spuId SPUID
     * @param ossUrl OSS 地址
     * @return 封装了商品详情
     */
    void updateBySpuId(Long spuId, String ossUrl);

（5）接口实现：

    public void updateBySpuId(Long spuId, String ossUrl) {
        LambdaUpdateChainWrapper<SkuInfo> updateChainWrapper = new LambdaUpdateChainWrapper(baseMapper);
        updateChainWrapper.eq(SkuInfo::getSpuId, spuId)
                .set(SkuInfo::getHtmlUrl, ossUrl)
                .update();
    }

2）OSS 服务修正

（1）配置自定义域名

浏览器出于安全策略限制，会将通过 OSS 域名访问的 HTML 文件默认为“下载”而不是“在线预览”。绑定自定义域名，为您的 Bucket 绑定一个自定义域名，浏览器会认为这是一个独立的网站访问请求，从而允许直接渲染 HTML 内容，而不是触发下载行为。

这需要在 OSS 控制台中进行配置，并确保您的域名已经完成 ICP 备案（中国大陆地区要求）。配置完成后，您可以使用自定义域名访问 OSS 中的文件。

    oss:
      # 自定义配置：上传路径前缀
      prefix: temp
      # CDN 加速域名，生产环境填写（这里虚拟一个域名，不能直接访问）
      cdn-domain: https://shop.mall.example.com

（2）重载上传文件方法

在 OSSUtil 工具类重载上传文件方法：

    @Value("${aliyun.oss.cdn-domain}")
    private String cdnDomain;

    public String uploadFile(MultipartFile file, String dir, ObjectMetadata meta) throws IOException {
        // 1. 获取文件后缀
        String originalName = file.getOriginalFilename();
        String suffix = originalName.substring(originalName.lastIndexOf("."));
        // 2. 生成唯一 key：目录/日期/UUID.后缀 防止重名覆盖
        String datePath = DATE_FORMAT.format(new Date());
        String objectKey = prefix + "/" + dir + "/" + datePath + "/" + UUID.randomUUID() + suffix;

        // 3. 文件流上传
        try (InputStream is = file.getInputStream()) {
            PutObjectRequest request = new PutObjectRequest(bucketName, objectKey, is);
            // 设置文件 ContentType
            meta.setContentType(file.getContentType());
            // 设置 inline：内联预览，不强制下载
            meta.setContentDisposition("inline");
            request.setMetadata(meta);
            ossClient.putObject(request);
        } catch (Exception e) {
            throw new BusinessException(6001,"上传失败");
        }

        // 4. 拼接访问地址,返回自定义域名地址（推荐，避免原生 oss 域名强制下载）
        return String.format("https://%s/%s", cdnDomain, objectKey);
    }

（3）创建文件转换适配器

OSS 上传接口（Feign 接口）只认 MultipartFile，但上传的数据（比如 HTML 内容）是内存里的字符串，不是前端上传的真实文件。需要把“内存数据”伪装成“文件”，简单来说，就是做一个“适配器”，字节数据（byte[]）包装成一个“看起来像文件”的对象，传递给调用那个只接受文件（MultipartFile）的接口。

在 util 包下创建工具类：

    public class ByteMultipartFile implements MultipartFile {
        private final byte[] content;
        private final String name;
        private final String originalFilename;
        private final String contentType;

        public ByteMultipartFile(String name, String originalFilename, String contentType, byte[] content) {
            this.name = name;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.content = content;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getOriginalFilename() {
            return originalFilename;
        }

        @Override
        public String getContentType() {
            return contentType;
        }

        @Override
        public boolean isEmpty() {
            return content == null || content.length == 0;
        }

        @Override
        public long getSize() {
            return content.length;
        }

        @Override
        public byte[] getBytes() throws IOException {
            return content;
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return new ByteArrayInputStream(content);
        }

        @Override
        public void transferTo(File dest) throws IOException, IllegalStateException {
            try (FileOutputStream fos = new FileOutputStream(dest)) {
                fos.write(content);
            }
        }
    }

（3）创建字节上传文件控制器：

在 OssController 添加方法：

    @PostMapping("/uploadByte")
    public Result<String> uploadByte(
            @RequestBody byte[] fileBytes,
            @RequestParam String fileName,
            @RequestParam String contentType,
            @RequestParam(defaultValue = "file") String dir
    ) throws Exception {
        MultipartFile file = new ByteMultipartFile(fileName, fileName, contentType, fileBytes);
        // 关键：构建元数据
        ObjectMetadata meta = new ObjectMetadata();
        // 传入前端/Feign 传的 contentType，html 固定 text/html
        meta.setContentType(file.getContentType());
        // 设置 inline：内联预览，不强制下载
        meta.setContentType("text/html;charset=UTF-8");
        meta.setContentDisposition("inline");
        String url = ossUtil.uploadFile(file, dir, meta);
        return Result.success(url);
    }

3）完成生成静态页

（1）创建 Feign 接口

在 mall-api 的 oss 包下创建接口：

    @FeignClient(name = "mall-oss-service",contextId = "oss-feign")
    public interface OssFeignClient {
        @PostMapping("/oss/uploadByte")
        Result<String> uploadByte(
                @RequestBody byte[] fileBytes,
                @RequestParam("fileName") String fileName,
                @RequestParam("contentType") String contentType,
                @RequestParam("dir") String dir
        );
    }

（3）接口实现：

    @Service
    public class PageServiceImpl implements IPageService {
        @Autowired
        private IProductService productService;
        @Autowired
        private ISkuInfoService skuInfoService;
        @Autowired
        private OssFeignClient ossFeignClient;
        @Autowired
        private TemplateEngine templateEngine;

        @Override
        public String generateProductTemplate(Long spuId) throws Exception {
            Map<String,Object> model = new HashMap<>();
            // 1 创建 Thymeleaf 模版的上下文对象
            Context context = new Context();
            // 2 设置模板数据
            // 2.1 获取商品详情数据
            ProductDetailDTO data = productService.getBySpuId(spuId);
            // 2.2 添加数据
            model.put("productDetail",data);
            context.setVariables(model);

            // 3 静态页面生成
            // 3.1 模板渲染至内存字符串，不落地本地文件
            String htmlContent = templateEngine.process("item-template", context);
            String fileName = spuId + ".html";
            // 3.2 创建字节
            byte[] htmlBytes = htmlContent.getBytes(StandardCharsets.UTF_8);

            // 4. Feign 上传 OSS
            Result<String> result = ossFeignClient.uploadByte(htmlBytes, fileName, "text/html", "product/html");
            if (!result.getCode().equals(ResultCodeEnum.SUCCESS.getCode())) {
                throw new BusinessException(result.getCode(), result.getMsg());
            }
            String ossUrl = (String)result.getData();
            // 5. 将静态页面地址保存至数据表
            skuInfoService.updateBySpuId(spuId,ossUrl);
            return ossUrl;
        }
    }

（4）控制器

修改控制器 PageController 代码：

    @RestController
    @RequestMapping("/page")
    public class PageController {
        @Autowired
        private IPageService pageService;

        @GetMapping("/generate/{spuId}")
        public String generateProductTemplate(@PathVariable Long spuId) throws Exception {
            String url = pageService.generateProductTemplate(spuId);
            return url;
        }
    }

---

💡 **速记**

**【前后端联调配置】**
1. **跨域配置**：在 Gateway 的 `globalcors` 中配置 `allowedOriginPatterns: "*"`、`allowed-methods`、`allowed-headers`、`allow-credentials: true`。
2. **网关路由**：添加路由 `mall-oss-service`，`Path=/api/aliyun/oss/**`，`StripPrefix=2`。
3. **放行 API**：在 `default-filters` 的 `Auth` 白名单中加入 `/api/aliyun/oss/**`。

**【SPU 静态页存储核心方案】**
*   **原问题**：文件落地本地磁盘，集群部署多实例时文件分散，无法共享。
*   **解决方案**：基于 SpuId 查询商品数据 -> 模板渲染至内存字符串 -> 直接转字节流上传 OSS -> 不落地本地磁盘。

**【原系统修正四步走】**
1. 表 `sku_info` 加字段 `html_url`。
2. 实体类 `SkuInfo` 和 `ProductDTO` 加 `htmlUrl` 属性。
3. 分页查询 `query.select` 加上 `SkuInfo::getHtmlUrl`。
4. `ISkuInfoService` 加 `updateBySpuId` 方法，实现类用 `LambdaUpdateChainWrapper` 更新。

**【OSS 服务修正三大核心】**
1. **配置自定义 CDN 域名**：解决浏览器访问 OSS 默认域名时强制下载 HTML 的问题，需 ICP 备案。
2. **重载上传方法**：新增 `uploadFile(file, dir, meta)` 方法，接收 `ObjectMetadata`，返回 CDN 域名拼接的 URL。
3. **创建 `ByteMultipartFile` 适配器**：将内存中的 `byte[]` 包装成 `MultipartFile`，解决 Feign 接口只认 MultipartFile 的问题。

**【静态页生成核心流程】**
1. **OssController** 新增 `/uploadByte` 接口：接收 `byte[]`、`fileName`、`contentType`，构建 `ObjectMetadata` (设为 `text/html`, `inline`)，调用 `ossUtil.uploadFile` 上传。
2. **创建 `OssFeignClient`**：定义 `uploadByte` 远程调用接口。
3. **PageServiceImpl** 核心逻辑：注入 `ProductService`、`SkuInfoService`、`OssFeignClient`、`TemplateEngine` -> 查询商品详情 -> 模板渲染至内存字符串 -> 转字节 -> Feign 上传 OSS -> 保存 URL 到数据库。
4. **PageController** 提供 `/page/generate/{spuId}` 接口触发。
