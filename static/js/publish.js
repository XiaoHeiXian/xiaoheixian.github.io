(function () {
  'use strict';

  var config = window.BLOG_PUBLISH_CONFIG || {};
  var apiBaseUrl = String(config.apiBaseUrl || '').replace(/\/+$/, '');
  var sessionKey = 'xian-blog-publish-token';
  var draftKey = 'xian-blog-publish-draft';
  var isLocalPreview = window.location.protocol === 'file:'
    || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      && new URLSearchParams(window.location.search).get('preview') === '1');
  var articles = Array.isArray(window.BLOG_ARTICLES) ? window.BLOG_ARTICLES : [];
  var loginPanel = document.getElementById('publish-login');
  var editorPanel = document.getElementById('publish-editor');
  var notice = document.getElementById('publish-notice');
  var articleForm = document.getElementById('publish-article-form');
  var createModeButton = document.getElementById('publish-mode-create');
  var editModeButton = document.getElementById('publish-mode-edit');
  var picker = document.getElementById('publish-picker');
  var articleSelect = document.getElementById('publish-article-select');
  var loadArticleButton = document.getElementById('publish-load-article');
  var editingHint = document.getElementById('publish-editing');
  var submitButton = document.getElementById('publish-submit');
  var deleteButton = document.getElementById('publish-delete');
  var assetFilesInput = document.getElementById('asset-files');
  var assetUploadButton = document.getElementById('asset-upload');
  var assetKeywordInput = document.getElementById('asset-keyword');
  var assetSearchButton = document.getElementById('asset-search');
  var assetNotice = document.getElementById('asset-notice');
  var assetList = document.getElementById('asset-list');
  var mode = 'create';
  var activeArticle = null;
  var assetTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

  function setNotice(message, type) {
    notice.textContent = message || '';
    notice.className = 'publish-notice' + (type ? ' is-' + type : '');
  }

  function request(path, options) {
    if (!apiBaseUrl) return Promise.reject(new Error('尚未配置发布接口地址。'));
    return fetch(apiBaseUrl + path, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok) throw new Error(payload.message || '请求失败。');
        return payload;
      });
    });
  }

  function authorizedRequest(path, payload) {
    if (isLocalPreview) {
      if (path === '/articles/load') {
        return Promise.resolve({
          content: '## 本地预览\\n\\n这里仅用于检查编辑器布局，不会读取或修改线上文章。',
          articleVersion: 'preview',
          indexVersion: 'preview'
        });
      }
      if (path === '/assets') {
        return Promise.resolve({
          assets: [{
            path: 'posts/assets/2026-09-03-preview-architecture.png',
            name: '2026-09-03-preview-architecture.png',
            size: 184320,
            version: 'preview',
            url: 'https://xiaoheixian.github.io/posts/assets/2026-09-03-preview-architecture.png'
          }]
        });
      }
      return Promise.reject(new Error('本地预览模式不允许提交文章修改。'));
    }
    var token = window.sessionStorage.getItem(sessionKey);
    return request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(payload || {})
    });
  }

  function showEditor() {
    loginPanel.hidden = true;
    editorPanel.hidden = false;
    setNotice('');
  }

  function resetForm() {
    articleForm.reset();
    articleForm.elements.date.value = new Date().toISOString().slice(0, 10);
  }

  function setIdentityLocked(locked) {
    articleForm.elements.slug.disabled = locked;
    articleForm.elements.date.disabled = locked;
  }

  function articlePathInfo(article) {
    var match = /^posts\/(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.html$/.exec(String(article && article.url || ''));
    return match ? { date: match[1], slug: match[2] } : null;
  }

  function editableEntries() {
    var urlCounts = articles.reduce(function (counts, article) {
      var url = String(article && article.url || '');
      counts[url] = (counts[url] || 0) + 1;
      return counts;
    }, {});
    return articles.map(function (article, index) {
      return { article: article, index: index, pathInfo: articlePathInfo(article) };
    }).filter(function (item) {
      return item.pathInfo && item.article && typeof item.article.title === 'string' && urlCounts[item.article.url] === 1;
    });
  }

  function rebuildPicker() {
    articleSelect.textContent = '';
    var entries = editableEntries();
    if (!entries.length) {
      var emptyOption = document.createElement('option');
      emptyOption.textContent = '没有可修改的已发布文章';
      emptyOption.value = '';
      articleSelect.appendChild(emptyOption);
      articleSelect.disabled = true;
      loadArticleButton.disabled = true;
      return;
    }
    entries.forEach(function (item) {
      var option = document.createElement('option');
      option.value = String(item.index);
      option.textContent = (item.article.publishedAt || item.pathInfo.date) + ' | ' + item.article.title;
      articleSelect.appendChild(option);
    });
    articleSelect.disabled = false;
    loadArticleButton.disabled = false;
  }

  function setMode(nextMode) {
    mode = nextMode;
    var editing = mode === 'edit';
    createModeButton.classList.toggle('is-active', !editing);
    editModeButton.classList.toggle('is-active', editing);
    picker.hidden = !editing;
    if (!editing) {
      activeArticle = null;
      editingHint.hidden = true;
      deleteButton.hidden = true;
      submitButton.dataset.label = '发布文章';
      submitButton.textContent = submitButton.dataset.label;
      setIdentityLocked(false);
      resetForm();
      return;
    }
    rebuildPicker();
    activeArticle = null;
    editingHint.hidden = true;
    deleteButton.hidden = true;
    submitButton.dataset.label = '保存修改';
    submitButton.textContent = submitButton.dataset.label;
    setIdentityLocked(true);
    setNotice('选择一篇文章后载入，日期和英文短标题会保持不变。');
  }

  function loadDraft() {
    try {
      var draft = JSON.parse(window.localStorage.getItem(draftKey) || '{}');
      Object.keys(draft).forEach(function (name) {
        var field = articleForm.elements[name];
        if (field && typeof draft[name] === 'string') field.value = draft[name];
      });
    } catch (_) {
      window.localStorage.removeItem(draftKey);
    }
  }

  function saveDraft() {
    var draft = {};
    ['title', 'slug', 'description', 'category', 'tags', 'date', 'content'].forEach(function (name) {
      draft[name] = articleForm.elements[name].value;
    });
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
    setNotice('草稿已保存在这台设备。', 'success');
  }

  function setSubmitting(button, submitting) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = submitting;
    button.textContent = submitting ? '正在提交…' : button.dataset.label;
  }

  function setAssetNotice(message, type) {
    assetNotice.textContent = message || '';
    assetNotice.className = 'asset-notice' + (type ? ' is-' + type : '');
  }

  function formatFileSize(size) {
    var bytes = Number(size) || 0;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      var copied = document.execCommand('copy');
      helper.remove();
      if (copied) resolve();
      else reject(new Error('浏览器不允许复制，请手动复制链接。'));
    });
  }

  function renderAssets(assets) {
    assetList.textContent = '';
    if (!assets.length) {
      setAssetNotice('没有找到文件。');
      return;
    }
    assets.forEach(function (asset) {
      var row = document.createElement('li');
      var link = document.createElement('a');
      link.href = asset.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.title = asset.name;
      link.textContent = asset.name;
      var size = document.createElement('small');
      size.textContent = formatFileSize(asset.size);
      var copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.textContent = '复制链接';
      copyButton.addEventListener('click', function () {
        copyText(asset.url).then(function () {
          setAssetNotice('已复制链接，可按需粘贴到 Markdown 正文。', 'success');
        }).catch(function (error) {
          setAssetNotice(error.message, 'error');
        });
      });
      var deleteAssetButton = document.createElement('button');
      deleteAssetButton.type = 'button';
      deleteAssetButton.className = 'asset-delete';
      deleteAssetButton.textContent = '删除';
      deleteAssetButton.addEventListener('click', function () {
        if (!window.confirm('确定删除“' + asset.name + '”吗？已粘贴到文章中的链接会失效。')) return;
        setSubmitting(deleteAssetButton, true);
        authorizedRequest('/assets/delete', { path: asset.path, version: asset.version }).then(function () {
          setAssetNotice('文件已删除，并已提交到 GitHub Pages 构建队列。', 'success');
          searchAssets();
        }).catch(function (error) {
          handleSessionExpiry(error);
          setAssetNotice(error.message, 'error');
        }).finally(function () {
          setSubmitting(deleteAssetButton, false);
        });
      });
      row.appendChild(link);
      row.appendChild(size);
      row.appendChild(copyButton);
      row.appendChild(deleteAssetButton);
      assetList.appendChild(row);
    });
    setAssetNotice('找到 ' + assets.length + ' 个文件。');
  }

  function searchAssets() {
    setSubmitting(assetSearchButton, true);
    setAssetNotice('正在搜索文件…');
    authorizedRequest('/assets', { keyword: assetKeywordInput.value }).then(function (result) {
      renderAssets(Array.isArray(result.assets) ? result.assets : []);
    }).catch(function (error) {
      handleSessionExpiry(error);
      setAssetNotice(error.message, 'error');
    }).finally(function () {
      setSubmitting(assetSearchButton, false);
    });
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('读取文件失败：' + file.name)); };
      reader.onload = function () {
        var dataUrl = String(reader.result || '');
        var marker = dataUrl.indexOf(',');
        if (marker < 0) {
          reject(new Error('读取文件失败：' + file.name));
          return;
        }
        resolve(dataUrl.slice(marker + 1));
      };
      reader.readAsDataURL(file);
    });
  }

  function assetMimeType(file) {
    if (assetTypes.includes(file.type)) return file.type;
    var extension = String(file.name || '').toLowerCase().split('.').pop();
    return {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      pdf: 'application/pdf'
    }[extension] || '';
  }

  function uploadSelectedAssets() {
    var files = Array.prototype.slice.call(assetFilesInput.files || []);
    if (!files.length) {
      setAssetNotice('请先选择文件。', 'error');
      return;
    }
    var invalidFile = files.find(function (file) {
      return file.size > 4 * 1024 * 1024 || !assetMimeType(file);
    });
    if (invalidFile) {
      setAssetNotice('仅支持不超过 4MB 的 PNG、JPG、WebP 图片或 PDF：' + invalidFile.name, 'error');
      return;
    }
    setSubmitting(assetUploadButton, true);
    var uploaded = 0;
    files.reduce(function (chain, file) {
      return chain.then(function () {
        setAssetNotice('正在上传 ' + (uploaded + 1) + '/' + files.length + '：' + file.name);
        return readFileAsBase64(file).then(function (contentBase64) {
          return authorizedRequest('/assets/upload', {
            fileName: file.name,
            mimeType: assetMimeType(file),
            contentBase64: contentBase64
          });
        }).then(function () { uploaded += 1; });
      });
    }, Promise.resolve()).then(function () {
      assetFilesInput.value = '';
      setAssetNotice('已上传 ' + uploaded + ' 个文件，并已提交到 GitHub Pages 构建队列。', 'success');
      searchAssets();
    }).catch(function (error) {
      handleSessionExpiry(error);
      setAssetNotice('已上传 ' + uploaded + ' 个文件。' + error.message, 'error');
    }).finally(function () {
      setSubmitting(assetUploadButton, false);
    });
  }

  function articlePayload() {
    return {
      title: articleForm.elements.title.value,
      slug: articleForm.elements.slug.value,
      description: articleForm.elements.description.value,
      category: articleForm.elements.category.value,
      tags: articleForm.elements.tags.value.split(/[,，]/).map(function (tag) { return tag.trim(); }).filter(Boolean),
      date: articleForm.elements.date.value,
      content: articleForm.elements.content.value
    };
  }

  function targetFor(active) {
    return {
      position: active.index,
      id: active.article.id,
      url: active.article.url
    };
  }

  function applyActiveArticle(active, result) {
    var article = active.article;
    var path = articlePathInfo(article);
    articleForm.elements.title.value = article.title || '';
    articleForm.elements.slug.value = path.slug;
    articleForm.elements.description.value = article.summary || '';
    articleForm.elements.category.value = article.category || '';
    articleForm.elements.tags.value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
    articleForm.elements.date.value = path.date;
    articleForm.elements.content.value = result.content || '';
    activeArticle = {
      article: article,
      index: active.index,
      articleVersion: result.articleVersion,
      indexVersion: result.indexVersion
    };
    editingHint.textContent = '正在修改：' + article.title + '。日期和英文短标题已锁定。';
    editingHint.hidden = false;
    deleteButton.hidden = false;
  }

  function loadSelectedArticle() {
    var index = Number(articleSelect.value);
    var article = articles[index];
    if (!Number.isInteger(index) || !article || !articlePathInfo(article)) {
      setNotice('请选择一篇可修改的文章。', 'error');
      return;
    }
    setSubmitting(loadArticleButton, true);
    setNotice('');
    authorizedRequest('/articles/load', { target: { position: index, id: article.id, url: article.url } }).then(function (result) {
      applyActiveArticle({ article: article, index: index }, result);
      setNotice('文章已载入，可以修改后保存。');
    }).catch(function (error) {
      setNotice(error.message, 'error');
    }).finally(function () {
      setSubmitting(loadArticleButton, false);
    });
  }

  function updateLocalIndex(article) {
    activeArticle.article.title = article.title;
    activeArticle.article.summary = article.description;
    activeArticle.article.category = article.category;
    activeArticle.article.tags = article.tags;
  }

  function handleSessionExpiry(error) {
    if (/登录已过期/.test(error.message)) {
      window.sessionStorage.removeItem(sessionKey);
      loginPanel.hidden = false;
      editorPanel.hidden = true;
    }
  }

  document.getElementById('publish-login-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var loginForm = event.currentTarget;
    var button = loginForm.querySelector('button[type="submit"]');
    var password = loginForm.elements.password.value;
    setSubmitting(button, true);
    setNotice('');
    request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    }).then(function (result) {
      window.sessionStorage.setItem(sessionKey, result.token);
      loginForm.reset();
      showEditor();
      setMode('create');
      loadDraft();
    }).catch(function (error) {
      setNotice(error.message, 'error');
    }).finally(function () {
      setSubmitting(button, false);
    });
  });

  createModeButton.addEventListener('click', function () { setMode('create'); });
  editModeButton.addEventListener('click', function () { setMode('edit'); });
  loadArticleButton.addEventListener('click', loadSelectedArticle);
  assetSearchButton.addEventListener('click', searchAssets);
  assetUploadButton.addEventListener('click', uploadSelectedAssets);
  assetKeywordInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchAssets();
    }
  });

  articleForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var article = articlePayload();
    var updating = mode === 'edit';
    if (updating && !activeArticle) {
      setNotice('请先载入一篇文章。', 'error');
      return;
    }
    setSubmitting(submitButton, true);
    setNotice('');
    var requestBody = updating ? {
      article: article,
      target: targetFor(activeArticle),
      articleVersion: activeArticle.articleVersion,
      indexVersion: activeArticle.indexVersion
    } : article;
    authorizedRequest(updating ? '/articles/update' : '/articles', requestBody).then(function (result) {
      window.localStorage.removeItem(draftKey);
      if (updating) {
        updateLocalIndex(article);
        activeArticle.articleVersion = result.articleVersion;
        activeArticle.indexVersion = result.indexVersion;
        editingHint.textContent = '正在修改：' + article.title + '。日期和英文短标题已锁定。';
        setNotice('修改已提交到 GitHub Pages 构建队列。文章页：' + result.url, 'success');
        return;
      }
      articles.unshift({
        id: article.date + '-' + article.slug,
        title: article.title,
        url: 'posts/' + article.date + '-' + article.slug + '.html',
        publishedAt: article.date,
        category: article.category,
        tags: article.tags,
        summary: article.description
      });
      resetForm();
      setNotice('已提交到 GitHub Pages 构建队列。文章页：' + result.url, 'success');
    }).catch(function (error) {
      handleSessionExpiry(error);
      setNotice(error.message, 'error');
    }).finally(function () {
      setSubmitting(submitButton, false);
    });
  });

  deleteButton.addEventListener('click', function () {
    if (!activeArticle) return;
    if (!window.confirm('确定删除《' + activeArticle.article.title + '》吗？Git 历史可以恢复，但网页会在下一次构建后下线。')) return;
    setSubmitting(deleteButton, true);
    setNotice('');
    authorizedRequest('/articles/delete', {
      target: targetFor(activeArticle),
      articleVersion: activeArticle.articleVersion,
      indexVersion: activeArticle.indexVersion
    }).then(function () {
      articles.splice(activeArticle.index, 1);
      activeArticle = null;
      rebuildPicker();
      editingHint.hidden = true;
      deleteButton.hidden = true;
      resetForm();
      setNotice('文章已删除，并已提交到 GitHub Pages 构建队列。', 'success');
    }).catch(function (error) {
      handleSessionExpiry(error);
      setNotice(error.message, 'error');
    }).finally(function () {
      setSubmitting(deleteButton, false);
    });
  });

  document.getElementById('save-draft').addEventListener('click', saveDraft);
  document.getElementById('publish-logout').addEventListener('click', function () {
    window.sessionStorage.removeItem(sessionKey);
    loginPanel.hidden = false;
    editorPanel.hidden = true;
    setNotice('已退出发布页面。');
  });

  resetForm();
  loadDraft();
  if (window.sessionStorage.getItem(sessionKey) || isLocalPreview) {
    showEditor();
    setMode('create');
    loadDraft();
    if (isLocalPreview) setNotice('本地预览模式：可以查看页面，但不会提交任何改动。');
  }
}());
