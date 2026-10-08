/* ============================================================
   store.js —— localStorage 读写封装（阶段 A：基础版）
   命名空间键：lf_102401402_*
   损坏 JSON 防御 / 容量不足降级 等加固见后续提交
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Store = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  var KEY_ITEMS = 'lf_102401402_items';
  var KEY_OWNER = 'lf_102401402_ownerid';

  function loadItems() {
    try {
      var raw = localStorage.getItem(KEY_ITEMS);
      if (!raw) {
        // 首次启动：写入种子数据
        var seeds = (typeof SEED_DATA !== 'undefined') ? SEED_DATA : [];
        localStorage.setItem(KEY_ITEMS, JSON.stringify(seeds));
        return seeds.slice();
      }
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveItems(items) {
    try {
      localStorage.setItem(KEY_ITEMS, JSON.stringify(items || []));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getOwnerId() {
    var id = localStorage.getItem(KEY_OWNER);
    if (!id) {
      id = 'o_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(KEY_OWNER, id);
    }
    return id;
  }

  return {
    loadItems: loadItems,
    saveItems: saveItems,
    getOwnerId: getOwnerId
  };
});
