/* ============================================================
   core.js —— 核心纯业务逻辑（UMD 双导出：浏览器 / Node 测试）
   阶段 A：函数签名占位，具体实现见后续提交
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // 归一化：NFKC + 小写 + 去标点（多关键词搜索 / 相似度共用）
  function normalize(s) {
    return String(s == null ? '' : s)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\s\u3000\p{P}]+/gu, '');
  }

  // 发布前统一校验（TODO 阶段 B 实现：必填/长度/时间合法）
  function validatePost(post) {
    return { ok: false, error: 'TODO: 阶段 B 实现' };
  }

  // 组合筛选 + 多关键词 AND 搜索（TODO 阶段 B 实现）
  function searchItems(items, opts) {
    return (items || []).slice();
  }

  // 未解决在前，组内时间倒序（TODO 阶段 B 实现）
  function sortItems(list) {
    return (list || []).slice();
  }

  // 权限判断：是否本人 && 非 demo 数据（TODO 阶段 B 实现）
  function canManage(item, ownerId) {
    return false;
  }

  // 状态机：active -> resolved（TODO 阶段 B 实现，含二次校验）
  function completePost(post, ownerId) {
    return { ok: false, error: 'TODO: 阶段 B 实现' };
  }

  // 状态机：resolved -> active（TODO 阶段 B 实现）
  function revertPost(post, ownerId) {
    return { ok: false, error: 'TODO: 阶段 B 实现' };
  }

  // 相似线索：连续双字集合 Jaccard（TODO 阶段 B 实现）
  function similarity(a, b) {
    return 0;
  }

  // 详情页相似信息推荐（TODO 阶段 B 实现）
  function recommendRelated(items, target, ownerId) {
    return [];
  }

  // 统计条（TODO 阶段 B 实现）
  function calcStats(items) {
    return { total: 0, active: 0, resolved: 0, rate: '0%' };
  }

  // HTML 转义（防 XSS）
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  return {
    normalize: normalize,
    validatePost: validatePost,
    searchItems: searchItems,
    sortItems: sortItems,
    canManage: canManage,
    completePost: completePost,
    revertPost: revertPost,
    similarity: similarity,
    recommendRelated: recommendRelated,
    calcStats: calcStats,
    escapeHtml: escapeHtml
  };
});
