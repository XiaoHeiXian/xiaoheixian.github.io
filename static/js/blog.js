/**
 * Shared navigation for the static blog.
 * Authentication and message submission intentionally stay outside GitHub Pages.
 */
layui.define(['jquery'], function (exports) {
  var $ = layui.jquery;

  function rootPath() {
    return window.location.pathname.indexOf('/posts/') !== -1 ? '../' : '';
  }

  function currentPage() {
    var path = window.location.pathname.split('/').pop();
    return path || 'index.html';
  }

  function navigationItem(item, current, root) {
    var active = item.href === current ? ' layui-this' : '';
    return '<li class="layui-nav-item' + active + '"><a href="' + root + item.href + '">' + item.label + '</a></li>';
  }

  $(function () {
    var root = rootPath();
    var current = currentPage();
    var items = [
      { href: 'index.html', label: '首页' },
      { href: 'archives.html', label: '归档' },
      { href: 'categories.html', label: '分类' },
      // { href: 'message.html', label: '留言' },
      { href: 'about.html', label: '关于' }
    ];
    var desktop = [];
    var mobile = [];

    $.each(items, function (_, item) {
      desktop.push(navigationItem(item, current, root));
      mobile.push('<li><a href="' + root + item.href + '">' + item.label + '</a></li>');
    });

    desktop.push('<li class="layui-nav-item"><a class="site-search-button" href="' + root + 'search.html" aria-label="搜索文章" title="搜索文章"><i class="layui-icon layui-icon-search"></i></a></li>');
    mobile.push('<li><a href="' + root + 'search.html">搜索</a></li>');

    $('.blog-nav .layui-nav').first().html(desktop.join(''));
    $('#pop-nav').html(mobile.join(''));
    $('#mobile-nav').attr('aria-label', '展开导航').off('click.blogNav').on('click.blogNav', function (event) {
      event.preventDefault();
      $('#pop-nav').toggle();
    });
  });

  exports('blog', {});
});
