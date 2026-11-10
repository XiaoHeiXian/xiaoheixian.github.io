---
layout: article
title: "代码评审与 CI/CD 流水线实战"
description: "代码评审：PR 是代码合入主分支前的最后一道关卡，需遵循规则与检查清单。 评论模板：使用【必须修改】、【建议优化】、【仅供参考】前缀明确问题级别。 通过标准：修复所有必改项、CI 流水线全绿、至少一人 Approve。 CI/CD：遵循开发->测试->预发布->生产的阶梯式递进原则。 平台方案：GitHub Actions（零运维）、Gitee Go（国内快）、Jenkins（企业自建）。"
date: 2026-11-11
category: "软件架构"
tags:
  - "开发工具"
  - "Git"
  - "CodeReview"
  - "CICD"
permalink: /posts/2026-11-11-code-review-and-cicd.html
---

# 七、Code Review（代码评审）

PR 发起后，进入 Code Review 环节。这是代码进入主分支前的最后一道人工关卡，也是团队技术沉淀的重要方式。

## 7.1 Reviewer 指派规则

- 每个 PR 至少指定 1 名 Reviewer
- Reviewer 应选择熟悉该模块的团队成员
- 紧急修复（hotfix）可简化流程，但仍需 1 人快速 Review
- Reviewer 应在 4 小时内响应，阻塞不超过 1 个工作日

## 7.2 Code Review 检查清单（Reviewer 用）

Reviewer 在审查时，请逐项检查以下项目：

    - [ ] 逻辑正确性：代码是否实现了需求描述的功能
    - [ ] 边界处理：是否考虑了空值、异常、并发等边界情况
    - [ ] 性能影响：是否有明显的性能问题（如 N+1 查询、大对象创建）
    - [ ] 安全隐患：是否有 SQL 注入、XSS、敏感信息泄露等风险
    - [ ] 可读性：命名是否清晰，注释是否必要，函数是否过长（建议不超过 50 行）
    - [ ] 测试覆盖：新代码是否有对应的单元测试，测试是否通过
    - [ ] 兼容性：是否破坏了现有接口或功能
    - [ ] 提交规范：Commit Message 是否符合 Conventional Commits
    - [ ] 格式规范：代码是否已通过 Spotless 格式化
    - [ ] 文档更新：接口变更是否同步更新了文档

### 测试覆盖检查

    - [ ] 新代码有对应单元测试
    - [ ] Bug 修复有回归测试
    - [ ] 边界条件（null / 空 / 异常）已覆盖
    - [ ] 测试可独立运行，不依赖外部环境
    - [ ] 断言明确，不是“只跑不报错”

当前 PR 测试情况：

    - ❌ 缺少 `decreaseStock` 的边界测试
    - ⚠️ 建议补充并发场景测试

## 7.3 Review 评论模板

评审评论应明确、具体、可执行。推荐使用以下前缀标注严重级别：

    | 前缀 | 含义与用法 |
    |---|---|
    | 【必须修改】 | 存在明显问题，必须修复后才能合并。如：逻辑错误、安全漏洞、测试未通过 |
    | 【建议优化】 | 代码可以工作，但有更好的写法。如：命名不清晰、可简化逻辑、缺少注释 |
    | 【仅供参考】 | 个人偏好或经验分享，不强制修改。如：另一种实现思路、相关技术文章推荐 |

## 7.4 Review 评论示例

    【必须修改】此处存在 SQL 注入风险，请使用参数化查询：
    当前：String sql = "SELECT * FROM user WHERE id = " + userId;
    建议：String sql = "SELECT * FROM user WHERE id = ?";

    【建议优化】函数长度超过 50 行，建议拆分为多个小函数：
    - validateInput()
    - processBusiness()
    - saveResult()

    【仅供参考】这里可以用 Java 8 的 Optional 简化空值判断，参考：
    https://docs.oracle.com/javase/8/docs/api/java/util/Optional.html

## 7.5 Review 通过标准

    - 所有【必须修改】项已修复并重新提交
    - CI 流水线全部通过（编译、测试、SonarQube、Snyk）
    - Reviewer 点击 "Approve" 或 "LGTM" (Looks Good To Me)
    - 无未解决的冲突

## 7.6 Review 沟通规范

- 对事不对人：评论代码，不评论人
- 明确具体：指出具体行号和问题，给出修改建议
- 及时响应：提交者应在收到评论后尽快修复，避免 PR 长期挂起
- 保持友善：使用建设性语言，如"建议..."、"可以考虑..."，避免"这写的什么"

评审不是挑剔，是共同提升代码质量。保持专业、友善的沟通态度。

### 详细示例：行级评论框（发起评审的空白编辑区）

适用场景：针对某一行/某几行具体代码提出问题（SQL 注入、空指针、缺测试等）。这是 Code Review 最核心、最推荐使用的入口。

填什么：直接贴下面的模板（按问题类型选一个）

- 必须修改 —— SQL 注入（高危）

    ❌【必须修改】存在 SQL 注入风险
    当前写法（字符串拼接）：
    String sql = "SELECT * FROM user WHERE id = " + userId;
    问题：用户输入直接拼进 SQL，存在注入风险。
    建议改为参数化查询：
    String sql = "SELECT * FROM user WHERE id = ?";
    PreparedStatement pstmt = connection.prepareStatement(sql);
    pstmt.setString(1, userId);

    👉 请修改后重新提交并回复此条评论。
    提交方式：编辑区下方下拉选「发起评审」 -> 点击「发起评审」。
    效果：该问题标记为「未解决」，阻塞 PR 合并。

- 必须修改 —— 缺少单元测试

    ❌【必须修改】缺少单元测试
    新增方法 decreaseStock() 没有对应测试。
    请至少补充以下场景：- [ ] 正常扣减- [ ] 库存不足- [ ] 参数为 null- [ ] 并发扣减（可选）
    👉 补充测试后重新提交。
    提交方式：选「发起评审」 -> 点击「发起评审」。

- 建议优化 —— 不阻塞合并

    ⚠️【建议优化】方法过长
    OrderService.createOrder() 超过 80 行，建议拆分为多个私有方法提升可读性。
    不阻塞本次合并，可作为后续优化。
    提交方式：下拉选「评论」 -> 点击「评论」即可（不阻塞）。

### 全局「代码评审」弹窗（评论/通过/评审 弹窗）

适用场景：对整个 PR 给出审查结论（通过 / 不通过 / 需要修改），或汇总多处问题。

- 评审不通过（发现问题，阻塞合并）

    编辑区填：
    ### Code Review 结论：不通过
    | 检查项 | 结论 | 说明 |
    |---|---|---|
    | 逻辑正确性 | ✔️ | |
    | 边界处理 | ❌ | UserService.java:88 缺少空值校验 |
    | 安全隐患 | ❌ | OrderMapper.java:120 SQL 注入风险 |
    | 测试覆盖 | ❌ | decreaseStock 缺少单元测试 |
    | 格式规范 | ✔️ | |

    👉 请按上述行级评审意见修改后重新提交，我会再次复查。
    选项怎么选（关键）：
    单选选「评审」（注意：需先在代码行上标注过，此选项才可用；若置灰，先去图 1 行级框发起一条评审）。
    不要勾选「审查通过」「测试通过」（结论是不通过，不能勾）。
    点击橙色「提交」。

- 评审通过（代码没问题）

    编辑区填：
    ### Code Review 结论：通过
    逻辑、边界、安全、测试、格式均已检查，无阻塞性问题，可以合并。
    选项怎么选：
    单选选「通过」。
    勾选「审查通过」（若你同时负责测试验收，可一并勾选「测试通过」）。
    点击橙色「提交」。

- 仅留沟通意见（不阻塞、不给结论）

    编辑区填：
    整体实现清晰，测试覆盖充分，仅一处命名建议已在上文行级评论中标注，可自行决定是否调整。
    选项怎么选：
    单选选「评论」。
    点击「提交」（或「评论」，视按钮文案）。

# 八、CI/CD 流水线

CI/CD（持续集成/持续交付）是保障代码质量的核心基础设施。以下提供三种平台的落地方案，团队可根据实际情况选择。

在软件开发的常规流程（尤其是 CI/CD）中，绝对不能把代码直接发到生产环境。必须遵循“开发 -> 测试 -> 预发布 -> 生产”的阶梯式递进原则。

## 8.1 方案一：GitHub Actions（推荐，零运维）

GitHub Actions 是 GitHub 原生的 CI/CD 服务，与仓库深度集成，YAML 配置简单，适合没有运维资源的小团队。

### 8.1.1 完整 CI 配置

    # .github/workflows/ci.yml
    name: CI Pipeline
    on:
      push:
        branches: [main, develop]
      pull_request:
        branches: [main, develop]

    jobs:
      build-and-test:
        runs-on: ubuntu-latest
        steps:
          # 1. 检出代码（带完整历史，SonarQube 需要）
          - name: Checkout code
            uses: actions/checkout@v4
            with:
              fetch-depth: 0

          # 2. 设置 JDK
          - name: Set up JDK 17
            uses: actions/setup-java@v4
            with:
              java-version: '17'
              distribution: 'temurin'
              cache: 'maven'

          # 3. 代码格式查
          - name: Check code format
            run: mvn spotless:check

          # 4. 编译 + 测试 + 生成覆盖率报告
          - name: Build and Test
            run: mvn clean verify

          # 5. SonarQube 扫描
          - name: SonarQube Scan
            run: mvn sonar:sonar
            env:
              SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

          # 6. Snyk 安全扫描
          - name: Snyk Security Scan
            uses: snyk/actions/maven@master
            env:
              SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
            with:
              args: --severity-threshold=high

          # 7. 上传测试报告（可选）
          - name: Upload Test Results
            uses: actions/upload-artifact@v4
            if: always()
            with:
              name: test-results
              path: target/surefire-reports/

### 分支保护配置

在 GitHub 仓库设置分支保护（Settings -> Branches -> Add rule）：

- Require a pull request before merging：必须通过 PR 合并
- Require status checks to pass：必须等待 CI 通过（Spotless、Test、SonarQube、Snyk）
- Require review from 1 person：至少 1 人 Code Review
- Include administrators：管理员也要遵守规则

配置完成后，任何直接 push 到 main 分支的操作都会被拒绝，必须通过 PR + CI 通过 + Review 才能合并。

## 8.2 方案二：Gitee Go（国内团队，访问稳定）

Gitee Go 是 Gitee 平台提供的 CI/CD 服务，适合代码托管在 Gitee 的团队，国内访问速度快，与 Gitee 仓库深度集成。

### 8.2.1 开通 Gitee Go

1. 进入 Gitee 仓库 -> 菜单栏 "流水线" -> "Gitee Go"
2. 点击 "立即体验" 或 "开通"（免费额度足够小团队使用）
3. 选择 Maven 流水线模板，或创建空白流水线

### 8.2.2 完整流水线配置（gitee-ci.yml）

    # .gitee-ci.yml
    stages:
      - build
      - test
      - quality
      - security

    variables:
      MAVEN_OPTS: "-Dmaven.repo.local=$CI_CACHE_DIR/.m2"
      SONAR_TOKEN: $SONAR_TOKEN
      SNYK_TOKEN: $SNYK_TOKEN

    # 阶段一：编译 + 格式检查
    build:
      stage: build
      image: maven:3.9-eclipse-temurin-17
      cache:
        key: ${CI_COMMIT_REF_SLUG}
        paths:
          - .m2/
      script:
        - mvn spotless:check
        - mvn clean compile -DskipTests
      only:
        - merge_requests
        - main
        - develop

    # 阶段二：单元测试
    test:
      stage: test
      image: maven:3.9-eclipse-temurin-17
      cache:
        key: ${CI_COMMIT_REF_SLUG}
        paths:
          - .m2/
      script:
        - mvn test
      artifacts:
        paths:
          - target/surefire-reports/
        reports:
          junit: target/surefire-reports/TEST-*.xml
      only:
        - merge_requests
        - main
        - develop

    # 阶段三：SonarQube 扫描
    quality:
      stage: quality
      image: maven:3.9-eclipse-temurin-17
      cache:
        key: ${CI_COMMIT_REF_SLUG}
        paths:
          - .m2/
      script:
        - mvn verify sonar:sonar
        - -Dsonar.host.url=$SONAR_HOST_URL
        - -Dsonar.token=$SONAR_TOKEN
        - -Dsonar.projectKey=$SONAR_PROJECT_KEY
        - -Dsonar.qualitygate.wait=true
      only:
        - merge_requests
        - main
        - develop

    # 阶段四：Snyk 安全扫描
    security:
      stage: security
      image: node:18
      script:
        - npm install -g snyk
        - snyk test --severity-threshold=high
      only:
        - merge_requests
        - main
        - develop

### 添加主机

在 Gitee Go 中，可以添加 Linux 主机用于执行流水线。根据提示复制 curl 命令到目标主机执行，完成后主机状态会变为“在线”。

### 8.2.3 分支保护配置（Gitee）

进入仓库 -> 设置 -> 仓库设置 -> 保护分支设置

- 添加保护规则：分支名 main，勾选 "禁止强制推送"、"开启 PR 审查"
- 勾选 "要求合并前的审查"，设置最少审查人数为 1
- 勾选 "要求状态检查通过"，选择 Gitee Go 流水线

Gitee Go 的免费额度包括每月 1000 分钟的构建时间，足够 5-10 人团队使用。

## 8.3 方案三：GitLab + Jenkins（企业级，自建可控）

GitLab + Jenkins 是传统企业常用的组合，适合对数据安全要求高、需要深度定制流水线的团队。虽然配置比云原生方案复杂，但可控性最强。

### 8.3.1 架构说明

    GitLab（代码仓库 + MR 管理）
    ↓ Webhook 触发
    Jenkins（CI 服务器，执行构建/测试/扫描）
    ↓ 扫描结果上报
    SonarQube（代码质量平台）
    ↓ 漏洞报告
    Snyk（依赖安全扫描）
    ↓ 构建结果回写
    GitLab MR（显示流水线状态，控制合并）

### 8.3.2 Jenkins 环境准备

Jenkins 需要安装以下插件：

- Git Plugin：拉取 GitLab 代码
- GitLab Plugin：接收 GitLab Webhook，回写构建状态
- Maven Integration Plugin：执行 Maven 构建
- SonarQube Scanner Plugin：SonarQube 扫描
- JaCoCo Plugin：显示测试覆盖率
- Pipeline Plugin：使用 Jenkinsfile
- Blue Ocean（可选）：更友好的流水线可视化界面

### 8.3.3 Jenkinsfile 完整配置

    // Jenkinsfile（放在项目根目录）
    pipeline {
        agent any
        tools {
            maven 'Maven-3.9'  // Jenkins 中配置的 Maven 名称
            jdk 'JDK-17'       // Jenkins 中配置的 JDK 名称
        }
        environment {
            SONAR_HOST_URL = 'http://your-sonarqube:9000'
            SONAR_TOKEN = credentials('sonar-token')  // Jenkins 凭据 ID
            SNYK_TOKEN = credentials('snyk-token')    // Jenkins 凭据 ID
        }
        stages {
            stage('Checkout') {
                // 代码检出
            }
            // 其他 stages 省略...
        }
    }

## 九、流程图文字推演

### PR 评审与 CI/CD 流水线闭环

开发者在本地完成代码并自测 --> 提交代码并推送到 Feature 分支 --> 发起 Pull Request（填写规范模板）

触发 CI/CD 流水线自动执行：
    --> 代码检出
    --> Spotless 格式校验（失败则中断）
    --> Maven 编译与单元测试（失败则中断）
    --> SonarQube 质量扫描（检查代码异味与覆盖率）
    --> Snyk 依赖漏洞扫描
    --> 流水线全绿通过

人工 Code Review：
    --> Reviewer 检查逻辑、边界、安全等清单
    --> 若发现严重问题，标记“必须修改”，打回重新提交
    --> 若通过，点击 Approve/LGTM

合并代码 --> 触发 CD 部署流水线 --> 部署至测试环境 --> 预发布环境 --> 生产环境

## 💡 **速记**

【核心考点】

Code Review 是代码合入主干前的最后一道防线，需遵循检查清单，并使用规范的评论模板（【必须修改】、【建议优化】、【仅供参考】）。

CI/CD 流水线将代码格式化、编译测试、质量扫描（SonarQube）和安全扫描（Snyk）自动化，配合分支保护机制（禁止直接 Push 主干），彻底保障代码质量。

主流落地方案：GitHub Actions（零运维、配置简单）、Gitee Go（国内访问快、与码云深度集成）、GitLab + Jenkins（企业级自建、高度定制）。

【高频逻辑链】

本地开发与自测 --> 提交 PR --> CI 触发（格式校验 -> 编译测试 -> 质量扫描 -> 安全扫描） --> Code Review（修复必改项 -> Approve） --> 合并主干 --> 自动化部署。

【关键避坑】

CI 流水线检查失败（变红）时，必须修复问题并重新提交，严禁绕过流水线强行合并代码。

在 Review 过程中，评论应“对事不对人”，使用建设性语言，明确指出问题所在行号，并给出具体的修改建议。
