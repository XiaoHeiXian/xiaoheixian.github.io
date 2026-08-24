# Xian的笔记

GitHub Pages 上的纯静态博客。文章以 Markdown 文件保存在仓库里，GitHub Pages 使用 Jekyll 统一渲染文章布局；首页、分类、归档和搜索读取本地文章索引，不依赖数据库或后台接口。

## 新增文章

1. 复制 `posts/article-template.md`，改名为 `YYYY-MM-DD-英文短标题.md`。
2. 填写 Markdown 顶部信息和正文。
3. 在 `static/js/article-index.js` 最前面增加文章索引。
4. 用 IDEA 的 Git 面板提交并推送到 `master`。

详细说明见 [发布文章流程.md](发布文章流程.md)。

## 目录

- `posts/`：每篇公开文章的 Markdown 文件。
- `posts/assets/`：文章图片。
- `_layouts/article.html`：GitHub Pages 渲染 Markdown 时使用的统一文章布局。
- `static/js/article-index.js`：标题、日期、分类、标签、摘要和链接的唯一索引。
- `static/js/blog-pages.js`：首页、分类、归档、搜索逻辑。
- `static/css/blog-v2.css`：新版静态页面样式。

不要把 API Key、Token、公司内部数据、客户数据或个人敏感信息提交到仓库。
