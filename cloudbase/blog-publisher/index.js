const crypto = require('crypto');

const GITHUB_API = 'https://api.github.com';
const MAX_BODY_LENGTH = 180 * 1024;
const TOKEN_TTL_MS = 20 * 60 * 1000;

function json(statusCode, payload, event) {
  const origin = getAllowedOrigin(event);
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {})
    },
    body: JSON.stringify(payload)
  };
}

function getAllowedOrigin(event) {
  const requestOrigin = getHeader(event, 'origin');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://xiaoheixian.github.io')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return allowedOrigins.includes(requestOrigin) ? requestOrigin : '';
}

function getHeader(event, name) {
  const headers = event.headers || {};
  const wanted = name.toLowerCase();
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === wanted);
  return key ? String(headers[key]) : '';
}

function requestPath(event) {
  const rawPath = event.path || (event.httpContext && event.httpContext.path) || '';
  return rawPath.split('?')[0] || '/';
}

function parseBody(event) {
  let raw = event.body || '{}';
  if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_LENGTH) throw new Error('文章正文超过 180KB 限制。');
  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new Error('请求不是有效的 JSON。');
  }
}

function safeText(value, field, maxLength, required) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw new Error(`${field}不能为空。`);
  if (text.length > maxLength) throw new Error(`${field}不能超过 ${maxLength} 个字符。`);
  return text;
}

function validateArticle(payload) {
  const title = safeText(payload.title, '标题', 80, true);
  const slug = safeText(payload.slug, '英文短标题', 60, true).toLowerCase();
  const description = safeText(payload.description, '摘要', 180, true).replace(/[\r\n]+/g, ' ');
  const category = safeText(payload.category, '分类', 30, true);
  const date = safeText(payload.date, '发布日期', 10, true);
  const content = safeText(payload.content, '正文', MAX_BODY_LENGTH, true);
  const tags = Array.isArray(payload.tags) ? payload.tags.map((tag) => safeText(tag, '标签', 24, true)) : [];

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('英文短标题只能用小写字母、数字和连字符。');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error('发布日期格式应为 YYYY-MM-DD。');
  if (!tags.length || tags.length > 8) throw new Error('请填写 1 到 8 个标签。');
  if (new Set(tags).size !== tags.length) throw new Error('标签不能重复。');
  return { title, slug, description, category, date, content, tags };
}

function yamlString(value) {
  return JSON.stringify(value);
}

function buildMarkdown(article) {
  const tags = article.tags.map((tag) => `  - ${yamlString(tag)}`).join('\n');
  return [
    '---',
    'layout: article',
    `title: ${yamlString(article.title)}`,
    `description: ${yamlString(article.description)}`,
    `date: ${article.date}`,
    `category: ${yamlString(article.category)}`,
    'tags:',
    tags,
    `permalink: /posts/${article.date}-${article.slug}.html`,
    '---',
    '',
    article.content,
    ''
  ].join('\n');
}

function buildIndexEntry(article) {
  return {
    id: `${article.date}-${article.slug}`,
    title: article.title,
    url: `posts/${article.date}-${article.slug}.html`,
    publishedAt: article.date,
    category: article.category,
    tags: article.tags,
    summary: article.description
  };
}

function prependIndexEntry(source, entry) {
  const marker = 'window.BLOG_ARTICLES = [';
  const index = source.indexOf(marker);
  if (index < 0) throw new Error('未识别到文章索引格式。');
  const insertAt = index + marker.length;
  const serialized = JSON.stringify(entry, null, 2).replace(/\n/g, '\n  ');
  return `${source.slice(0, insertAt)}\n  ${serialized},${source.slice(insertAt)}`;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(left || '');
  const rightBuffer = Buffer.from(right || '');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(value) {
  return crypto.createHmac('sha256', process.env.PUBLISH_TOKEN_SECRET).update(value).digest('base64url');
}

function issueToken() {
  const payload = base64Url(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS, nonce: crypto.randomBytes(12).toString('hex') }));
  return `${payload}.${sign(payload)}`;
}

function verifyToken(event) {
  const authorization = getHeader(event, 'authorization');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !constantTimeEqual(signature, sign(payload))) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).exp > Date.now();
  } catch (_) {
    return false;
  }
}

function assertRuntimeConfig() {
  const required = ['GITHUB_TOKEN', 'PUBLISH_PASSWORD', 'PUBLISH_TOKEN_SECRET'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`云函数缺少环境变量：${missing.join(', ')}`);
}

async function github(path, options) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const content = await response.text();
  if (!response.ok) {
    const detail = content ? JSON.parse(content).message : response.statusText;
    const error = new Error(`GitHub 操作失败：${detail}`);
    error.statusCode = response.status === 409 || response.status === 422 ? 409 : 502;
    throw error;
  }
  return content ? JSON.parse(content) : null;
}

async function createBlob(owner, repo, content) {
  const blob = await github(`/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, encoding: 'utf-8' })
  });
  return blob.sha;
}

async function publish(article) {
  const owner = process.env.GITHUB_OWNER || 'XiaoHeiXian';
  const repo = process.env.GITHUB_REPO || 'xiaoheixian.github.io';
  const branch = process.env.GITHUB_BRANCH || 'master';
  const ref = await github(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, { method: 'GET' });
  const commit = await github(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, { method: 'GET' });
  const tree = await github(`/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`, { method: 'GET' });
  const articlePath = `posts/${article.date}-${article.slug}.md`;
  const indexPath = 'static/js/article-index.js';
  if (tree.tree.some((item) => item.path === articlePath)) {
    const error = new Error('同名文章已经存在，请修改日期或英文短标题。');
    error.statusCode = 409;
    throw error;
  }
  const indexFile = tree.tree.find((item) => item.path === indexPath);
  if (!indexFile) throw new Error('仓库中找不到文章索引文件。');
  const indexBlob = await github(`/repos/${owner}/${repo}/git/blobs/${indexFile.sha}`, { method: 'GET' });
  const currentIndex = Buffer.from(indexBlob.content, 'base64').toString('utf8');
  const articleBlobSha = await createBlob(owner, repo, buildMarkdown(article));
  const indexBlobSha = await createBlob(owner, repo, prependIndexEntry(currentIndex, buildIndexEntry(article)));
  const nextTree = await github(`/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_tree: commit.tree.sha,
      tree: [
        { path: articlePath, mode: '100644', type: 'blob', sha: articleBlobSha },
        { path: indexPath, mode: '100644', type: 'blob', sha: indexBlobSha }
      ]
    })
  });
  const nextCommit = await github(`/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `docs: publish ${article.title}`, tree: nextTree.sha, parents: [ref.object.sha] })
  });
  await github(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: nextCommit.sha, force: false })
  });
  return { commit: nextCommit.sha, url: `https://${owner.toLowerCase()}.github.io/posts/${article.date}-${article.slug}.html` };
}

exports.main = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const path = requestPath(event);
  if (method === 'OPTIONS') {
    const origin = getAllowedOrigin(event);
    return {
      statusCode: 204,
      headers: {
        ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '600'
      },
      body: ''
    };
  }
  try {
    assertRuntimeConfig();
    if (method === 'POST' && path.endsWith('/auth/login')) {
      const password = safeText(parseBody(event).password, '发布密码', 200, true);
      if (!constantTimeEqual(password, process.env.PUBLISH_PASSWORD)) return json(401, { message: '发布密码不正确。' }, event);
      return json(200, { token: issueToken(), expiresIn: TOKEN_TTL_MS / 1000 }, event);
    }
    if (method === 'POST' && path.endsWith('/articles')) {
      if (!verifyToken(event)) return json(401, { message: '登录已过期，请重新验证。' }, event);
      const result = await publish(validateArticle(parseBody(event)));
      return json(201, result, event);
    }
    return json(404, { message: '接口不存在。' }, event);
  } catch (error) {
    console.error(error);
    return json(error.statusCode || 400, { message: error.message || '发布失败。' }, event);
  }
};
