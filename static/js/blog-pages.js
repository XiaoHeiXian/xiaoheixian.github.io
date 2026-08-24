(function () {
  'use strict';

  var articles = (window.BLOG_ARTICLES || []).slice().sort(function (left, right) {
    return right.publishedAt.localeCompare(left.publishedAt);
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function formatDate(value) {
    var date = new Date(value + 'T00:00:00');
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replace(/\//g, '.');
  }

  function categoryUrl(category) {
    return 'categories.html?category=' + encodeURIComponent(category);
  }

  function tagList(tags) {
    return tags.map(function (tag) {
      return '<span class="post-tag">' + escapeHtml(tag) + '</span>';
    }).join('');
  }

  function articleCard(article, matchLabel) {
    return [
      '<article class="post-card">',
      '<p class="post-meta"><time datetime="' + escapeHtml(article.publishedAt) + '">' + formatDate(article.publishedAt) + '</time><a href="' + categoryUrl(article.category) + '">' + escapeHtml(article.category) + '</a></p>',
      '<h2><a href="' + escapeHtml(article.url) + '">' + escapeHtml(article.title) + '</a></h2>',
      '<p class="post-summary">' + escapeHtml(article.summary) + '</p>',
      '<div class="post-footer">' + tagList(article.tags) + (matchLabel ? '<span class="match-label">命中：' + escapeHtml(matchLabel) + '</span>' : '') + '</div>',
      '</article>'
    ].join('');
  }

  function renderEmpty(element, title, description) {
    element.innerHTML = '<div class="empty-state"><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(description) + '</p></div>';
  }

  function renderHome() {
    var target = document.getElementById('home-post-list');
    if (!target) return;
    if (!articles.length) return renderEmpty(target, '还没有公开文章', '新增 Markdown 和一条索引后，文章会出现在这里。');
    target.innerHTML = articles.slice(0, 8).map(function (article) { return articleCard(article); }).join('');
  }

  function categoryCounts() {
    return articles.reduce(function (counts, article) {
      counts[article.category] = (counts[article.category] || 0) + 1;
      return counts;
    }, {});
  }

  function renderCategories() {
    var filters = document.getElementById('category-filters');
    var target = document.getElementById('category-post-list');
    if (!filters || !target) return;

    var requested = new URLSearchParams(window.location.search).get('category');
    var counts = categoryCounts();
    var categories = Object.keys(counts).sort(function (left, right) { return left.localeCompare(right, 'zh-CN'); });
    var selected = counts[requested] ? requested : '';
    var filtersHtml = ['<a class="category-filter' + (selected ? '' : ' is-active') + '" href="categories.html">全部 <span>' + articles.length + '</span></a>'];

    categories.forEach(function (category) {
      filtersHtml.push('<a class="category-filter' + (selected === category ? ' is-active' : '') + '" href="' + categoryUrl(category) + '">' + escapeHtml(category) + ' <span>' + counts[category] + '</span></a>');
    });
    filters.innerHTML = filtersHtml.join('');

    var visibleArticles = selected ? articles.filter(function (article) { return article.category === selected; }) : articles;
    document.getElementById('category-heading').textContent = selected || '全部文章';
    target.innerHTML = visibleArticles.length ? visibleArticles.map(function (article) { return articleCard(article); }).join('') : '';
    if (!visibleArticles.length) renderEmpty(target, '这个分类还没有文章', '换一个分类看看，或者先回到全部文章。');
  }

  function renderArchives() {
    var target = document.getElementById('archive-list');
    if (!target) return;
    if (!articles.length) return renderEmpty(target, '还没有文章可以归档', '新文章发布后会自动出现在这里。');
    var groups = articles.reduce(function (result, article) {
      var year = article.publishedAt.slice(0, 4);
      (result[year] = result[year] || []).push(article);
      return result;
    }, {});
    target.innerHTML = Object.keys(groups).sort(function (left, right) { return right.localeCompare(left); }).map(function (year) {
      var rows = groups[year].map(function (article) {
        return '<li class="archive-item"><time datetime="' + escapeHtml(article.publishedAt) + '">' + escapeHtml(article.publishedAt.slice(5).replace('-', ' / ')) + '</time><a href="' + escapeHtml(article.url) + '">' + escapeHtml(article.title) + '</a><a class="archive-category" href="' + categoryUrl(article.category) + '">' + escapeHtml(article.category) + '</a></li>';
      }).join('');
      return '<section class="archive-year"><h2>' + year + '</h2><ol>' + rows + '</ol></section>';
    }).join('');
  }

  function matchesArticle(article, keyword) {
    var query = keyword.toLocaleLowerCase();
    var fields = [
      { name: '标题', value: article.title, weight: 40 },
      { name: '标签', value: article.tags.join(' '), weight: 30 },
      { name: '分类', value: article.category, weight: 20 },
      { name: '摘要', value: article.summary, weight: 10 }
    ];
    var score = 0;
    var labels = [];
    fields.forEach(function (field) {
      if (field.value.toLocaleLowerCase().indexOf(query) !== -1) {
        score += field.weight;
        labels.push(field.name);
      }
    });
    return score ? { article: article, score: score, label: labels.join('、') } : null;
  }

  function renderSearch() {
    var input = document.getElementById('article-search-input');
    var target = document.getElementById('search-results');
    var count = document.getElementById('search-count');
    if (!input || !target || !count) return;
    input.value = new URLSearchParams(window.location.search).get('q') || '';
    var timer;
    function updateResults() {
      var query = input.value.trim();
      if (!query) {
        count.textContent = '最近文章';
        target.innerHTML = articles.map(function (article) { return articleCard(article); }).join('');
        return;
      }
      var results = articles.map(function (article) { return matchesArticle(article, query); }).filter(Boolean).sort(function (left, right) {
        return right.score - left.score || right.article.publishedAt.localeCompare(left.article.publishedAt);
      });
      count.textContent = '找到 ' + results.length + ' 篇与“' + query + '”相关的文章';
      if (!results.length) return renderEmpty(target, '没有匹配的文章', '可以换一个更短的关键词，或从分类页继续浏览。');
      target.innerHTML = results.map(function (result) { return articleCard(result.article, result.label); }).join('');
    }
    input.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(updateResults, 180);
    });
    updateResults();
  }

  function init() {
    renderHome();
    renderCategories();
    renderArchives();
    renderSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
