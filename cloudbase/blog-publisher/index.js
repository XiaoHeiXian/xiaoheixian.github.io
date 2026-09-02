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
  if (required && !text) throw new Error(field + '不能为空。');
  if (text.length > maxLength) throw new Error(field + '不能超过 ' + maxLength + ' 个字符。');
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z'))) throw new Error('发布日期格式应为 YYYY-MM-DD。');
  if (!tags.length || tags.length > 8) throw new Error('请填写 1 到 8 个标签。');
  if (new Set(tags).size !== tags.length) throw new Error('标签不能重复。');
  return { title, slug, description, category, date, content, tags };
}

function yamlString(value) {
  return JSON.stringify(value);
}

function buildMarkdown(article) {
  const tags = article.tags.map((tag) => '  - ' + yamlString(tag)).join('\n');
  return [
    '---',
    'layout: article',
    'title: ' + yamlString(article.title),
    'description: ' + yamlString(article.description),
    'date: ' + article.date,
    'category: ' + yamlString(article.category),
    'tags:',
    tags,
    'permalink: /posts/' + article.date + '-' + article.slug + '.html',
    '---',
    '',
    article.content,
    ''
  ].join('\n');
}

function buildIndexEntry(article) {
  return {
    id: article.date + '-' + article.slug,
    title: article.title,
    url: 'posts/' + article.date + '-' + article.slug + '.html',
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
  return source.slice(0, insertAt) + '\n  ' + serialized + ',' + source.slice(insertAt);
}

function createConflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

function skipQuoted(source, start) {
  const quote = source[start];
  let cursor = start + 1;
  while (cursor < source.length) {
    if (source[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (source[cursor] === quote) return cursor + 1;
    cursor += 1;
  }
  throw new Error('文章索引包含未闭合的字符串。');
}

function skipComment(source, start) {
  if (source[start + 1] === '/') {
    const lineEnd = source.indexOf('\n', start + 2);
    return lineEnd < 0 ? source.length : lineEnd + 1;
  }
  const blockEnd = source.indexOf('*/', start + 2);
  if (blockEnd < 0) throw new Error('文章索引包含未闭合的注释。');
  return blockEnd + 2;
}

function skipArrayTrivia(source, start) {
  let cursor = start;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor]) || source[cursor] === ',') {
      cursor += 1;
      continue;
    }
    if (source[cursor] === '/' && (source[cursor + 1] === '/' || source[cursor + 1] === '*')) {
      cursor = skipComment(source, cursor);
      continue;
    }
    return cursor;
  }
  return cursor;
}

function skipIndexSpaceAndComments(source, start) {
  let cursor = start;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) {
      cursor += 1;
      continue;
    }
    if (source[cursor] === '/' && (source[cursor + 1] === '/' || source[cursor + 1] === '*')) {
      cursor = skipComment(source, cursor);
      continue;
    }
    return cursor;
  }
  return cursor;
}

function findObjectEnd(source, start) {
  let depth = 0;
  let cursor = start;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === '\'' || character === '"' || character === String.fromCharCode(96)) {
      cursor = skipQuoted(source, cursor);
      continue;
    }
    if (character === '/' && (source[cursor + 1] === '/' || source[cursor + 1] === '*')) {
      cursor = skipComment(source, cursor);
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return cursor + 1;
    }
    cursor += 1;
  }
  throw new Error('文章索引包含未闭合的对象。');
}

function scanIndexObjects(source) {
  const marker = 'window.BLOG_ARTICLES = [';
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error('未识别到文章索引格式。');
  const objects = [];
  let cursor = markerIndex + marker.length;
  while (cursor < source.length) {
    cursor = skipArrayTrivia(source, cursor);
    if (source[cursor] === ']') return objects;
    if (source[cursor] !== '{') throw new Error('文章索引包含不支持的条目格式。');
    const end = findObjectEnd(source, cursor);
    objects.push({ start: cursor, end, raw: source.slice(cursor, end) });
    cursor = end;
  }
  throw new Error('文章索引数组未闭合。');
}

function readObjectProperty(raw, property) {
  const expression = new RegExp('(?:\\b' + property + '\\b|[\\x27\"]' + property + '[\\x27\"])\\s*:\\s*([\\x27\"])([^\\r\\n]*?)\\1');
  const match = expression.exec(raw);
  return match ? match[2].replace(/\\(['"\\])/g, '$1') : '';
}

function articlePathFromUrl(url) {
  const match = /^posts\/(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.html$/.exec(url);
  if (!match) throw new Error('文章链接不是系统可维护的文章路径。');
  return {
    date: match[1],
    slug: match[2],
    markdownPath: 'posts/' + match[1] + '-' + match[2] + '.md'
  };
}

function validateTarget(value) {
  const target = value || {};
  if (!Number.isInteger(target.position) || target.position < 0) throw new Error('文章定位信息无效。');
  const id = safeText(target.id, '文章标识', 120, true);
  const url = safeText(target.url, '文章链接', 180, true);
  return { position: target.position, id, url, ...articlePathFromUrl(url) };
}

function locateTarget(indexSource, target) {
  const objects = scanIndexObjects(indexSource);
  const object = objects[target.position];
  if (!object) throw createConflict('文章索引已变化，请刷新页面后重新载入文章。');
  if (readObjectProperty(object.raw, 'id') !== target.id || readObjectProperty(object.raw, 'url') !== target.url) {
    throw createConflict('文章索引已变化，请刷新页面后重新载入文章。');
  }
  return { objects, object };
}

function locateUniqueTarget(indexSource, target) {
  const located = locateTarget(indexSource, target);
  const urlMatches = located.objects.filter((item) => readObjectProperty(item.raw, 'url') === target.url);
  if (urlMatches.length !== 1) throw new Error('这篇文章的链接在索引中重复，无法安全修改或删除，请先在 IDEA 中修正索引。');
  return located;
}

function indexIndent(source, start) {
  const lineStart = source.lastIndexOf('\n', start) + 1;
  const candidate = source.slice(lineStart, start);
  return /^[\t ]*$/.test(candidate) ? candidate : '  ';
}

function serializeIndexEntry(entry, indent) {
  return JSON.stringify(entry, null, 2).replace(/\n/g, '\n' + indent);
}

function replaceIndexEntry(source, target, entry) {
  const located = locateTarget(source, target);
  const replacement = serializeIndexEntry(entry, indexIndent(source, located.object.start));
  return source.slice(0, located.object.start) + replacement + source.slice(located.object.end);
}

function removeIndexEntry(source, target) {
  const located = locateTarget(source, target);
  const objects = located.objects;
  const object = located.object;
  let start = object.start;
  let end = object.end;
  const cursor = skipIndexSpaceAndComments(source, end);

  if (source[cursor] === ',') {
    end = cursor + 1;
  } else if (target.position > 0) {
    const previous = objects[target.position - 1];
    const comma = source.indexOf(',', previous.end);
    if (comma < 0 || comma >= object.start) throw new Error('文章索引分隔符异常，无法删除。');
    start = comma;
  }
  return source.slice(0, start) + source.slice(end);
}

function remainingIndexHasUrl(source, url) {
  return scanIndexObjects(source).some((item) => readObjectProperty(item.raw, 'url') === url);
}

function stripFrontMatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
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
  return payload + '.' + sign(payload);
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
  if (missing.length) throw new Error('云函数缺少环境变量：' + missing.join(', '));
}

async function github(path, options) {
  const response = await fetch(GITHUB_API + path, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const content = await response.text();
  if (!response.ok) {
    let detail = response.statusText;
    try {
      detail = content ? JSON.parse(content).message || response.statusText : response.statusText;
    } catch (_) {
      detail = content || response.statusText;
    }
    const error = new Error('GitHub 操作失败：' + detail);
    error.statusCode = response.status === 409 || response.status === 422 ? 409 : 502;
    throw error;
  }
  return content ? JSON.parse(content) : null;
}

function repositoryConfig() {
  return {
    owner: process.env.GITHUB_OWNER || 'XiaoHeiXian',
    repo: process.env.GITHUB_REPO || 'xiaoheixian.github.io',
    branch: process.env.GITHUB_BRANCH || 'master'
  };
}

async function loadRepository() {
  const config = repositoryConfig();
  const ref = await github('/repos/' + config.owner + '/' + config.repo + '/git/ref/heads/' + encodeURIComponent(config.branch), { method: 'GET' });
  const commit = await github('/repos/' + config.owner + '/' + config.repo + '/git/commits/' + ref.object.sha, { method: 'GET' });
  const tree = await github('/repos/' + config.owner + '/' + config.repo + '/git/trees/' + commit.tree.sha + '?recursive=1', { method: 'GET' });
  return { ...config, ref, commit, tree };
}

function findTreeFile(state, path) {
  return state.tree.tree.find((item) => item.path === path);
}

async function readBlobText(state, file) {
  const blob = await github('/repos/' + state.owner + '/' + state.repo + '/git/blobs/' + file.sha, { method: 'GET' });
  return Buffer.from(blob.content, 'base64').toString('utf8');
}

async function createBlob(state, content) {
  const blob = await github('/repos/' + state.owner + '/' + state.repo + '/git/blobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, encoding: 'utf-8' })
  });
  return blob.sha;
}

async function commitTree(state, tree, message) {
  const nextTree = await github('/repos/' + state.owner + '/' + state.repo + '/git/trees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: state.commit.tree.sha, tree })
  });
  const nextCommit = await github('/repos/' + state.owner + '/' + state.repo + '/git/commits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, tree: nextTree.sha, parents: [state.ref.object.sha] })
  });
  await github('/repos/' + state.owner + '/' + state.repo + '/git/refs/heads/' + encodeURIComponent(state.branch), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: nextCommit.sha, force: false })
  });
  return nextCommit.sha;
}

function pageUrl(state, target) {
  return 'https://' + state.owner.toLowerCase() + '.github.io/' + target.url;
}

function assertVersion(actual, expected, label) {
  const version = safeText(expected, label + '版本', 100, true);
  if (actual !== version) throw createConflict(label + '已被修改，请重新载入文章后再试。');
}

function buildUpdatedIndexEntry(target, article) {
  return {
    id: target.id,
    title: article.title,
    url: target.url,
    publishedAt: target.date,
    category: article.category,
    tags: article.tags,
    summary: article.description
  };
}

async function publish(article) {
  const state = await loadRepository();
  const articlePath = 'posts/' + article.date + '-' + article.slug + '.md';
  const indexPath = 'static/js/article-index.js';
  if (findTreeFile(state, articlePath)) throw createConflict('同名文章已经存在，请修改日期或英文短标题。');
  const indexFile = findTreeFile(state, indexPath);
  if (!indexFile) throw new Error('仓库中找不到文章索引文件。');
  const currentIndex = await readBlobText(state, indexFile);
  const articleBlobSha = await createBlob(state, buildMarkdown(article));
  const indexBlobSha = await createBlob(state, prependIndexEntry(currentIndex, buildIndexEntry(article)));
  const commit = await commitTree(state, [
    { path: articlePath, mode: '100644', type: 'blob', sha: articleBlobSha },
    { path: indexPath, mode: '100644', type: 'blob', sha: indexBlobSha }
  ], 'docs: publish ' + article.title);
  return { commit, url: pageUrl(state, { url: 'posts/' + article.date + '-' + article.slug + '.html' }) };
}

async function loadArticle(payload) {
  const target = validateTarget(payload.target);
  const state = await loadRepository();
  const indexFile = findTreeFile(state, 'static/js/article-index.js');
  if (!indexFile) throw new Error('仓库中找不到文章索引文件。');
  const indexSource = await readBlobText(state, indexFile);
  locateUniqueTarget(indexSource, target);
  const articleFile = findTreeFile(state, target.markdownPath);
  if (!articleFile) throw new Error('仓库中找不到对应的 Markdown 文件。');
  const markdown = await readBlobText(state, articleFile);
  return {
    content: stripFrontMatter(markdown),
    articleVersion: articleFile.sha,
    indexVersion: indexFile.sha
  };
}

async function updateArticle(payload) {
  const target = validateTarget(payload.target);
  const article = validateArticle(payload.article || {});
  if (article.date !== target.date || article.slug !== target.slug) {
    throw new Error('修改文章时不能变更发布日期或英文短标题。');
  }
  const state = await loadRepository();
  const indexPath = 'static/js/article-index.js';
  const indexFile = findTreeFile(state, indexPath);
  const articleFile = findTreeFile(state, target.markdownPath);
  if (!indexFile || !articleFile) throw createConflict('文章已不存在或已被移动，请刷新页面后重试。');
  assertVersion(indexFile.sha, payload.indexVersion, '文章索引');
  assertVersion(articleFile.sha, payload.articleVersion, '文章');
  const indexSource = await readBlobText(state, indexFile);
  locateUniqueTarget(indexSource, target);
  const nextIndex = replaceIndexEntry(indexSource, target, buildUpdatedIndexEntry(target, article));
  const articleBlobSha = await createBlob(state, buildMarkdown(article));
  const indexBlobSha = await createBlob(state, nextIndex);
  const commit = await commitTree(state, [
    { path: target.markdownPath, mode: '100644', type: 'blob', sha: articleBlobSha },
    { path: indexPath, mode: '100644', type: 'blob', sha: indexBlobSha }
  ], 'docs: update ' + article.title);
  return {
    commit,
    url: pageUrl(state, target),
    articleVersion: articleBlobSha,
    indexVersion: indexBlobSha
  };
}

async function deleteArticle(payload) {
  const target = validateTarget(payload.target);
  const state = await loadRepository();
  const indexPath = 'static/js/article-index.js';
  const indexFile = findTreeFile(state, indexPath);
  const articleFile = findTreeFile(state, target.markdownPath);
  if (!indexFile || !articleFile) throw createConflict('文章已不存在或已被移动，请刷新页面后重试。');
  assertVersion(indexFile.sha, payload.indexVersion, '文章索引');
  assertVersion(articleFile.sha, payload.articleVersion, '文章');
  const indexSource = await readBlobText(state, indexFile);
  locateUniqueTarget(indexSource, target);
  const nextIndex = removeIndexEntry(indexSource, target);
  const indexBlobSha = await createBlob(state, nextIndex);
  const changes = [{ path: indexPath, mode: '100644', type: 'blob', sha: indexBlobSha }];
  if (!remainingIndexHasUrl(nextIndex, target.url)) {
    changes.push({ path: target.markdownPath, mode: '100644', type: 'blob', sha: null });
  }
  const commit = await commitTree(state, changes, 'docs: delete ' + target.id);
  return { commit };
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
    if (method === 'POST' && path.endsWith('/articles/load')) {
      if (!verifyToken(event)) return json(401, { message: '登录已过期，请重新验证。' }, event);
      return json(200, await loadArticle(parseBody(event)), event);
    }
    if (method === 'POST' && path.endsWith('/articles/update')) {
      if (!verifyToken(event)) return json(401, { message: '登录已过期，请重新验证。' }, event);
      return json(200, await updateArticle(parseBody(event)), event);
    }
    if (method === 'POST' && path.endsWith('/articles/delete')) {
      if (!verifyToken(event)) return json(401, { message: '登录已过期，请重新验证。' }, event);
      return json(200, await deleteArticle(parseBody(event)), event);
    }
    if (method === 'POST' && path.endsWith('/articles')) {
      if (!verifyToken(event)) return json(401, { message: '登录已过期，请重新验证。' }, event);
      return json(201, await publish(validateArticle(parseBody(event))), event);
    }
    return json(404, { message: '接口不存在。' }, event);
  } catch (error) {
    console.error(error);
    return json(error.statusCode || 400, { message: error.message || '发布失败。' }, event);
  }
};
