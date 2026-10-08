/* ============================================================
   app.js —— 应用入口（阶段 A：hash 路由占位 + 初始化）
   发布/搜索/状态闭环/事件委托 见后续提交
   ============================================================ */
(function () {
  var TITLES = {
    '#/home': '首页',
    '#/publish': '发布信息',
    '#/myposts': '我的发布',
    '#/detail': '信息详情'
  };

  function showView(hash) {
    var route = (hash || '#/home').split('?')[0];
    document.querySelectorAll('.view').forEach(function (v) { v.style.display = 'none'; });
    var viewMap = {
      '#/home': 'view-home',
      '#/publish': 'view-publish',
      '#/myposts': 'view-myposts',
      '#/detail': 'view-detail'
    };
    var id = viewMap[route] || 'view-home';
    document.getElementById(id).style.display = 'block';

    document.getElementById('page-title').textContent = TITLES[route] || '首页';
    document.querySelectorAll('.tabbar-item').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-route') === route);
    });
  }

  function route() {
    showView(location.hash || '#/home');
  }

  // 初始化：加载数据（阶段 A 只确保 store 能跑通，不渲染列表）
  document.addEventListener('DOMContentLoaded', function () {
    try {
      Store.loadItems();
      Store.getOwnerId();
    } catch (e) {
      console.warn('store init failed:', e);
    }
    window.addEventListener('hashchange', route);
    route();
  });
})();
