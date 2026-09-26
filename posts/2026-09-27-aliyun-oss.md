---
layout: article
title: "OSS 对象存储"
description: "- \"定义：阿里云提供的海量、安全、低成本的云存储服务\"   - \"核心对比：本地磁盘/NAS(有限/文件路径/单机故障) vs OSS(无限/HTTP URL/多副本高可用)\"   - \"核心术语1：Endpoint(访问域名)、Bucket(存储空间/顶级文件夹)\"   - \"核心术语2：Object(单个文件)、Object Key(唯一标识符)、"
date: 2026-09-27
category: "微服务架构"
tags:
  - "SpringCloud"
  - "微服务"
  - "OSS"
permalink: /posts/2026-09-27-aliyun-oss.html
---

## OSS 概述
1、OSS 是什么

OSS（Object Storage Service）是阿里云提供的海量、安全、低成本的云存储服务。你可以把它想象成一个无限容量的云盘，但其核心是为应用程序通过 API 访问而设计的。与本地磁盘和 NAS（网络附加存储，文件存储服务器）相比，OSS 在容量、可靠性、并发访问和成本上有本质区别。

| 维度 | 本地磁盘/NAS | OSS 对象存储 |
| :--- | :--- | :--- |
| 容量 | 有限，需扩容 | 理论无限 |
| 访问方式 | 文件路径 | HTTP/HTTPS URL |
| 可靠性 | 单机故障可能丢失数据 | 多副本冗余，高达 99.999999999% |
| 并发访问 | 受限于硬件性能 | 支持高并发，弹性扩展 |
| 成本 | 硬件采购+运维成本 | 按量付费，用多少付多少 |

2、核心术语

（1）Endpoint（接入点）：你访问 OSS 服务的域名，类似于数据库的地址。不同地域的 Endpoint 不同，例如 oss-cn-hangzhou.aliyuncs.com。
（2）Bucket（存储空间）：存储文件的容器，相当于顶级文件夹（如 D 盘）。名称全局唯一，创建时需要指定地域和访问权限。
（3）Object（对象）：存储在 OSS 中的单个文件。它由数据（文件内容）、元数据（文件属性）和 Key（唯一标识）组成。
（4）Object Key：对象的唯一标识符，通常是你在代码中指定的文件路径和名称，如 images/2026/logo.png。
（5）AccessKey（AK）：你的访问凭证，由 AccessKey ID 和 AccessKey Secret 组成，相当于用户名和密码。安全建议：生产环境绝不使用主账号 AK，应使用 RAM 子账号并授予最小权限。

## OSS 实现

1、开通 OSS 服务

步骤 1：开通 OSS 服务
① 进入阿里云（https://www.aliyun.com/），登录控制台
② 搜索对象存储 OSS，立即开通（有按量付费，免费试用两种方式）
③ 开通免费试用或购买服务

步骤 2：创建 Bucket
服务开通后，回到 OSS 控制台，点击 Bucket 列表-创建 Bucket：
- Bucket 名称：oss-mall-micro-2026（全局唯一，不能重名）
- 地域：华北 2（北京）
- 存储类型：标准存储（高频访问图片）
- 读写权限：（创建 Bucket 时默认开启阻止公共访问，因此读写权限默认只能为私有。如果需要其他读写权限类型，可以创建 Bucket 后关闭阻止公共访问并修改）
  - 商品图片、公开素材：公共读
  - 合同、隐私文件：私有
  - 版本控制：关闭
  - 实时日志：测试关闭，生产开启用于审计
点击确定创建。

步骤 3：修改读写权限
出于安全考虑，强烈建议选择私有，但本系统静态页面需要公开。
① 进入 Bucket 列表，点击 Bucket 名称，进入 Bucket 控制台
② 权限控制-阻止公共访问（关闭）
③ 权限控制-读写权限（公共读）

步骤 4：创建 RAM 子账号（核心安全步骤）
禁止使用主账号 AK，主账号拥有全部云产品权限，泄露风险极高。
① 控制台搜索 RAM 访问控制
② 身份管理-用户-创建用户
- 用户名称：oss-mall-micro
- 勾选：控制台密码登录，使用永久 AccessKey 访问
注意：创建完成后复制 AccessKey ID、AccessKey Secret（仅展示一次，丢失只能重建）
③ 给子账号授权：权限管理 - 新增授权
- 授权策略：AliyunOSSFullAccess（仅 OSS 读写权限）

步骤 4：Bucket 配套后台配置（生产必配）
① 跨域设置（前端直传必须配置）
进入 Bucket 列表，点击 Bucket 名称，进入 Bucket 控制台
权限管理 - 跨域设置 - 创建规则
- 允许来源：*（测试），生产填写前端域名 https://xxx.com
- 允许 Method：GET、POST、PUT、DELETE
- 允许 Header：*
- 暴露 Header：Etag x-oss-request-id
- 缓存最大时间：3600
② 生命周期规则（自动清理垃圾文件）
数据管理 - 生命周期 - 创建规则
- 匹配前缀：temp/（临时上传文件夹）
- 30 天后自动删除，节省存储费用。

步骤 5：隐藏密钥
创建本地环境变量
① 变量名：OSS_ACCESS_KEY，值：自己创建的 RAM AccessKey ID
② 变量名：OSS_SECRET_KEY，值：自己创建的 RAM AccessKey Secret

2、创建服务

1）创建项目

右键 mall-service 模块 -> New -> Module -> 左侧选 Maven Archetype：
- Name: mall-oss-service
- Location: 默认即可（在父工程下）
- Parent: mall-services
- Archetype: maven-archetype-quickstart
- GroupId: com.example.mall.oss
- ArtifactId: mall-oss-service
- Version: 1.0.0

2）配置依赖

直接使用阿里云官方的 OSS Java SDK：

    <dependency>
        <groupId>com.aliyun.oss</groupId>
        <artifactId>aliyun-sdk-oss</artifactId>
        <version>3.17.4</version>
    </dependency>

3）全局配置文件

建议在 Nacos 中配置（不能使用环境变量）

    server:
      port: 9009
    spring:
      application:
        name: mall-oss-service
      # 文件上传大小限制
      servlet:
        multipart:
          max-file-size: 10MB
          max-request-size: 50MB
      cloud:
        nacos:
          server-addr: 192.168.100.101:8848
          config:
            import-check:
              enabled: false
    ---
    aliyun:
      cloud:
        access-key-id: ${OSS_ACCESS_KEY}
        access-key-secret: ${OSS_SECRET_KEY}
        # 当前 Bucket 地域节点
        endpoint: oss-cn-beijing.aliyuncs.com
        # 项目使用的存储空间
        bucket-name: oss-mall-micro-2026
      oss:
        # 自定义配置：上传路径前缀
        prefix: temp

4）创建启动类

    @SpringBootApplication(scanBasePackages = "com.example.mall", exclude = {DataSourceAutoConfiguration.class})
    public class OssServiceApplication {
        public static void main(String[] args) {
            SpringApplication.run(OssServiceApplication.class, args);
        }
    }

3、实践

1）配置 OSS 客户端

依赖是原生 SDK，没有自动装配 starter，必须手动写配置类生成 OSS Bean，在代码里初始化 OSSClient。在 config 包下创建配置类：

    @Configuration
    public class OssConfig {
        @Value("${aliyun.cloud.endpoint}")
        private String endpoint;
        @Value("${aliyun.cloud.access-key-id}")
        private String accessKeyId;
        @Value("${aliyun.cloud.access-key-secret}")
        private String accessKeySecret;

        /** 注入 OSS 客户端 Bean，销毁时关闭连接 */
        @Bean(destroyMethod = "shutdown")
        public OSS ossClient() {
            return new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);
        }
    }

2）OSS 工具类完整封装

在 util 包下创建工具类：
包含：单文件上传、删除文件、文件下载、私有文件临时签名 URL。

    @Component
    public class OssUtil {
        @Autowired
        private OSS ossClient;
        @Value("${aliyun.cloud.bucket-name}")
        private String bucketName;
        @Value("${aliyun.cloud.endpoint}")
        private String endpoint;
        @Value("${aliyun.oss.prefix}")
        private String prefix;

        private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy/MM/dd");

        /**
         * 通用文件上传
         * @param file 前端上传文件
         * @param dir 存储目录
         * @return 文件访问 URL
         */
        public String uploadFile(MultipartFile file, String dir) throws Exception {
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
                ObjectMetadata meta = new ObjectMetadata();
                meta.setContentType(file.getContentType());
                // 设置 inline：内联预览，不强制下载
                meta.setContentDisposition("inline");
                request.setMetadata(meta);
                ossClient.putObject(request);
            } catch (Exception e) {
                throw new BusinessException(6001,"上传失败");
            }

            // 4. 拼接访问地址
            return String.format("https://%s.%s/%s", bucketName, endpoint, objectKey);
        }

        /**
         * 根据文件 key 删除 OSS 文件
         */
        public void deleteFile(String objectKey) {
            ossClient.deleteObject(bucketName, objectKey);
        }

        /**
         * 下载文件流
         */
        public InputStream downloadFileStream(String objectKey) {
            OSSObject ossObject = ossClient.getObject(bucketName, objectKey);
            return ossObject.getObjectContent();
        }

        /**
         * 私有文件生成临时签名 URL（30 分钟有效期）
         * @param objectKey 文件路径
         * @param expireMin 过期分钟
         */
        public String getPresignedUrl(String objectKey, long expireMin) {
            Date expireTime = new Date(System.currentTimeMillis() + expireMin * 60 * 1000);
            URL url = ossClient.generatePresignedUrl(bucketName, objectKey, expireTime);
            return url.toString();
        }
    }

3）控制器

    @RestController
    @RequestMapping("/oss")
    public class OssController {
        @Autowired
        private OssUtil ossUtil;

        /**
         * 文件上传接口
         */
        @PostMapping("/upload")
        public String upload(
                @RequestParam MultipartFile file,
                @RequestParam(defaultValue = "file") String dir
        ) throws Exception {
            return ossUtil.uploadFile(file, dir);
        }

        /**
         * 下载文件
         */
        @GetMapping("/download")
        public void download(@RequestParam String objectKey, HttpServletResponse response) throws IOException {
            // 提取文件名
            String fileName = objectKey.substring(objectKey.lastIndexOf("/") + 1);
            // 设置响应头
            response.setHeader("Content-Disposition", "attachment; filename=" +
                    URLEncoder.encode(fileName, "UTF-8") + "");
            response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
            // 从 OSS 获取文件流，直接写到响应输出流
            try (InputStream inputStream = ossUtil.downloadFileStream(objectKey);
                 OutputStream outputStream = response.getOutputStream()) {
                // 使用 commons-io 或手工拷贝
                IOUtils.copy(inputStream, outputStream);
                outputStream.flush();
            }
        }

        /**
         * 删除文件
         */
        @DeleteMapping("/delete")
        public String delete(@RequestParam String objectKey) {
            ossUtil.deleteFile(objectKey);
            return "文件删除成功";
        }

        /**
         * 获取私有文件临时访问链接（30 分钟）
         */
        @GetMapping("/signUrl")
        public String signUrl(@RequestParam String objectKey) {
            String url = ossUtil.getPresignedUrl(objectKey, 30);
            return url;
        }
    }

4）测试（略）

---

💡 **速记**

**【什么是 OSS？】**
阿里云提供的海量、安全、低成本的云存储服务（Object Storage Service）。核心是为应用程序通过 API 访问而设计，可以理解为无限容量的云盘。
**与本地磁盘/NAS对比**：无限容量 vs 有限；HTTP URL vs 文件路径；多副本冗余（99.999999999%） vs 单机故障；高并发弹性扩展 vs 受限于硬件；按量付费 vs 硬件采购+运维。

**【核心术语】**
*   **Endpoint**：访问域名（如 oss-cn-beijing.aliyuncs.com）。
*   **Bucket**：存储空间（顶级文件夹），名称全局唯一。
*   **Object**：单个文件，由数据、元数据、Key组成。
*   **Object Key**：唯一标识符（如 images/2026/logo.png）。
*   **AccessKey (AK)**：访问凭证（AK ID + AK Secret），生产环境必须使用 RAM 子账号并授予最小权限。

**【OSS 开通与配置六步走】**
1.  开通 OSS 服务。
2.  创建 Bucket（名称全局唯一、标准存储）。
3.  修改读写权限（关闭阻止公共访问，设置为公共读）。
4.  创建 RAM 子账号（核心安全步骤，生成 AK/SK，授予 AliyunOSSFullAccess 权限）。
5.  Bucket 后台配置（跨域设置用于前端直传，生命周期规则用于自动清理 temp/ 文件）。
6.  隐藏密钥（配置本地环境变量 OSS_ACCESS_KEY 和 OSS_SECRET_KEY）。

**【Spring Boot 服务集成核心】**
1.  **依赖**：`aliyun-sdk-oss` 3.17.4。
2.  **Nacos 配置**：`endpoint`、`bucket-name`、`access-key-id`、`access-key-secret`、`prefix`。
3.  **OssConfig**：通过 `@Value` 注入配置，创建 `OSS` Bean，加 `@Bean(destroyMethod = "shutdown")`。
4.  **OssUtil 核心方法**：
    *   `uploadFile`：生成唯一 Object Key (prefix/dir/date/UUID.suffix)，使用 `PutObjectRequest` 上传。
    *   `deleteFile`：`ossClient.deleteObject`。
    *   `downloadFileStream`：`ossClient.getObject` 获取流。
    *   `getPresignedUrl`：生成临时签名 URL，用于私有文件访问。
5.  **OssController 接口**：`/upload` (上传)、`/download` (下载流)、`/delete` (删除)、`/signUrl` (生成临时链接)。
