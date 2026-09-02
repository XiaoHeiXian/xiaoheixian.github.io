# CloudBase 文章发布功能部署

## 方案与边界

博客仍由 GitHub Pages 承载，文章仍是仓库里的 Markdown。CloudBase 只运行一个普通云函数，并通过 HTTP 访问服务暴露接口：验证发布密码后，使用保存在函数环境变量中的 GitHub Fine-grained Token，将文章 Markdown 和 `static/js/article-index.js` 原子提交到 `master`。

不使用 CloudBase MySQL：分类、归档、搜索继续读取静态索引；CloudBase 免费环境到期后，只会失去网页发布入口，已发布文章和博客访问不会受影响。

## 1. 创建 GitHub Token

在 GitHub 的 Fine-grained personal access token 页面创建 Token：

- Repository access：仅选择 `XiaoHeiXian/xiaoheixian.github.io`。
- Repository permissions：`Contents` 设为 `Read and write`。
- 不授予 Actions、Administration、Workflows 等额外权限。

Token 只填写在 CloudBase 云函数环境变量中，绝不放入仓库或 `publish-config.js`。

## 2. 部署云函数与 HTTP 访问服务

安装并登录 CloudBase CLI：

```powershell
npm install -g @cloudbase/cli
tcb login
```

进入函数目录并部署。将 `<你的环境ID>` 替换为 CloudBase 控制台中的环境 ID：

```powershell
cd E:\xs\jh\job\pay\interview-labs\xiaoheixian.github.io\cloudbase\blog-publisher
tcb fn deploy blog-publisher-api -e <你的环境ID>
tcb service create -p /blog-publisher-api -f blog-publisher-api -e <你的环境ID>
```

也可以在 CloudBase 控制台创建普通 Node.js 云函数，运行时选 Node.js 18 或更高版本，再在「HTTP 访问服务」中将路径绑定到该函数。这个实现不使用 HTTP Web Server，因此不需要 `scf_bootstrap` 和 `9000` 端口。

为函数配置 HTTP 网关路径，例如 `/blog-publisher`。函数的最终地址形如：

```text
https://<环境相关域名>/blog-publisher-api
```

HTTP 访问服务可被普通 `fetch` 调用。[CloudBase HTTP 访问服务文档](https://docs.cloudbase.net/service/access-cloud-function) [CloudBase CLI 文档](https://cloud.tencent.com/document/product/876/41539)

## 3. 配置云函数环境变量

在 CloudBase 控制台的函数配置中设置以下变量：

| 变量 | 值 |
|---|---|
| `GITHUB_TOKEN` | 第 1 步创建的 Fine-grained Token |
| `PUBLISH_PASSWORD` | 自己使用的高强度发布密码 |
| `PUBLISH_TOKEN_SECRET` | 至少 32 位随机字符串，用于签发 20 分钟有效的登录令牌 |
| `ALLOWED_ORIGINS` | `https://xiaoheixian.github.io` |
| `GITHUB_OWNER` | `XiaoHeiXian` |
| `GITHUB_REPO` | `xiaoheixian.github.io` |
| `GITHUB_BRANCH` | `master` |

建议在 CloudBase 控制台给该函数配置按 IP 的限频，例如每分钟 10 次。发布函数不访问 CloudBase 数据库，因此不需要 `CLOUDBASE_APIKEY`。

## 4. 连接发布页面

编辑 `static/js/publish-config.js`，仅填入公开的函数地址：

```js
window.BLOG_PUBLISH_CONFIG = {
  apiBaseUrl: 'https://<环境相关域名>/blog-publisher-api'
};
```

这里没有密码和 Token，可以提交到 GitHub：

```powershell
git add static/js/publish-config.js
git commit -m "chore: configure blog publisher endpoint"
git push origin master
```

GitHub Pages 更新后，直接访问：

```text
https://xiaoheixian.github.io/publish.html
```

发布一篇测试文章，检查 GitHub 是否出现一个 `docs: publish ...` commit，以及文章是否进入首页、归档、分类和搜索。

发布页也提供“修改或删除”模式。首次选择文章时，函数会返回 Markdown 和当前文件版本；保存或删除时会再次校验版本，若这期间 GitHub 上已有新提交，会提示重新载入，避免覆盖他人的改动。

本次升级后需要重新部署函数：

    cd E:\xs\jh\job\pay\interview-labs\xiaoheixian.github.io\cloudbase\blog-publisher
    tcb fn deploy blog-publisher-api -e <你的环境ID>

## 安全与回退

- 发布页没有加入导航且带 `noindex`，但它不是安全边界；安全边界是 HTTPS、函数 CORS 白名单、发布密码和短期令牌。
- `PUBLISH_PASSWORD`、`PUBLISH_TOKEN_SECRET`、`GITHUB_TOKEN` 泄露或怀疑泄露时，立即在 CloudBase 更新前两项并在 GitHub 撤销 Token。
- 内容写错时，直接在 GitHub 对对应的 `docs: publish ...`、`docs: update ...` 或 `docs: delete ...` commit 执行 Revert；Markdown 和索引在同一个 commit 中，会一起恢复。
- 不使用 CloudBase MySQL，避免免费环境过期后出现文章数据迁移问题。
