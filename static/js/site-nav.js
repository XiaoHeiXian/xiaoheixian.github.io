(function () {
  'use strict';

  function rootPath() {
    return window.location.pathname.indexOf('/posts/') !== -1 ? '../' : '';
  }

  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function renderNavigation() {
    var root = rootPath();
    var current = currentPage();
    var items = [
      { href: 'index.html', label: '首页' },
      { href: 'archives.html', label: '归档' },
      { href: 'categories.html', label: '分类' },
      { href: 'about.html', label: '关于' }
    ];
    var desktop = document.querySelector('.blog-nav .layui-nav');
    var mobile = document.getElementById('pop-nav');
    var toggle = document.getElementById('mobile-nav');

    if (!desktop || !mobile || !toggle) {
      return;
    }

    desktop.innerHTML = items.map(function (item) {
      var active = item.href === current ? ' layui-this' : '';
      return '<li class="layui-nav-item' + active + '"><a href="' + root + item.href + '">' + item.label + '</a></li>';
    }).join('') + '<li class="layui-nav-item"><a class="site-search-button" href="' + root + 'search.html" aria-label="搜索文章" title="搜索文章"><i class="layui-icon layui-icon-search"></i></a></li>';

    mobile.innerHTML = items.map(function (item) {
      return '<li><a href="' + root + item.href + '">' + item.label + '</a></li>';
    }).join('') + '<li><a href="' + root + 'search.html">搜索</a></li>';

    toggle.setAttribute('aria-label', '展开导航');
    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      mobile.style.display = mobile.style.display === 'block' ? 'none' : 'block';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNavigation);
  } else {
    renderNavigation();
  }
})();
