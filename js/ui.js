/* ============================================================
   ui.js —— 渲染层（阶段 A：空壳占位，具体渲染函数见后续提交）
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UI = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // TODO 阶段 C：renderHome(items, state)
  function renderHome() {}

  // TODO 阶段 C：renderDetail(item, ownerId)
  function renderDetail() {}

  // TODO 阶段 C：renderMyPosts(items, ownerId)
  function renderMyPosts() {}

  // TODO 阶段 C：toast(msg, type)
  function toast(msg) {
    console.log('[toast]', msg);
  }

  return {
    renderHome: renderHome,
    renderDetail: renderDetail,
    renderMyPosts: renderMyPosts,
    toast: toast
  };
});
