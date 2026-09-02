(function () {
  'use strict';

  var config = window.BLOG_PUBLISH_CONFIG || {};
  var apiBaseUrl = String(config.apiBaseUrl || '').replace(/\/+$/, '');
  var sessionKey = 'xian-blog-publish-token';
  var draftKey = 'xian-blog-publish-draft';
  var loginPanel = document.getElementById('publish-login');
  var editorPanel = document.getElementById('publish-editor');
  var notice = document.getElementById('publish-notice');
  var articleForm = document.getElementById('publish-article-form');

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

  function showEditor() {
    loginPanel.hidden = true;
    editorPanel.hidden = false;
    setNotice('');
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
    button.disabled = submitting;
    button.textContent = submitting ? '正在发布…' : button.dataset.label;
  }

  document.getElementById('publish-login-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var button = event.currentTarget.querySelector('button[type="submit"]');
    var password = event.currentTarget.elements.password.value;
    setSubmitting(button, true);
    setNotice('');
    request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    }).then(function (result) {
      window.sessionStorage.setItem(sessionKey, result.token);
      event.currentTarget.reset();
      showEditor();
    }).catch(function (error) {
      setNotice(error.message, 'error');
    }).finally(function () {
      setSubmitting(button, false);
    });
  });

  articleForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var button = event.submitter;
    var token = window.sessionStorage.getItem(sessionKey);
    var tags = articleForm.elements.tags.value.split(/[,，]/).map(function (tag) { return tag.trim(); }).filter(Boolean);
    var payload = {
      title: articleForm.elements.title.value,
      slug: articleForm.elements.slug.value,
      description: articleForm.elements.description.value,
      category: articleForm.elements.category.value,
      tags: tags,
      date: articleForm.elements.date.value,
      content: articleForm.elements.content.value
    };
    setSubmitting(button, true);
    setNotice('');
    request('/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(payload)
    }).then(function (result) {
      window.localStorage.removeItem(draftKey);
      articleForm.reset();
      articleForm.elements.date.value = new Date().toISOString().slice(0, 10);
      setNotice('已提交到 GitHub Pages 构建队列。文章页：' + result.url, 'success');
    }).catch(function (error) {
      if (/登录已过期/.test(error.message)) {
        window.sessionStorage.removeItem(sessionKey);
        loginPanel.hidden = false;
        editorPanel.hidden = true;
      }
      setNotice(error.message, 'error');
    }).finally(function () {
      setSubmitting(button, false);
    });
  });

  document.getElementById('save-draft').addEventListener('click', saveDraft);
  document.getElementById('publish-logout').addEventListener('click', function () {
    window.sessionStorage.removeItem(sessionKey);
    loginPanel.hidden = false;
    editorPanel.hidden = true;
    setNotice('已退出发布页面。');
  });

  articleForm.elements.date.value = new Date().toISOString().slice(0, 10);
  loadDraft();
  if (window.sessionStorage.getItem(sessionKey)) showEditor();
}());
