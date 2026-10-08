/**
 * store.js —— 数据持久化层（localStorage 封装）
 *
 * 设计要点：
 * 1. 键名带项目命名空间 lf_102401402_*，避免 file:// 下所有页面共享同一 origin 造成串扰；
 * 2. 数据带 { version, items } 包装，读取时做版本与格式校验，损坏数据不覆盖、只告警；
 * 3. localStorage 不可用（隐私模式等）时自动降级为内存存储，功能任何环境可用；
 * 4. 所有写操作返回 { ok, error }，调用方只有 ok:true 才更新界面（杜绝假成功）。
 *
 * UMD 双导出：浏览器挂 window.Store，Node 用 require('../js/store.js')（可注入 memoryStorage 测试）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();          // Node 环境
  } else {
    root.Store = factory();              // 浏览器环境
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEY = 'lf_102401402_items';
  var OWNER_KEY = 'lf_102401402_ownerid';
  var HISTORY_KEY = 'lf_102401402_searchhistory';
  var DRAFT_KEY = 'lf_102401402_draft';
  var VERSION = 1;

  /** 内存存储替身（localStorage 不可用时降级用，也供单元测试注入） */
  function memoryStorage() {
    var mem = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; }
    };
  }

  /** 获取可用存储：先探测 localStorage 可写性，异常则降级内存 */
  function safeStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        var probe = '__lf_probe__';
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        return localStorage;
      }
    } catch (e) { /* 隐私模式等场景，降级 */ }
    return memoryStorage();
  }

  // ==================== 数据格式校验 ====================

  function validItem(it) {
    return it && typeof it === 'object' &&
      typeof it.id === 'string' && it.id.length > 0 &&
      typeof it.title === 'string' &&
      (it.type === 'lost' || it.type === 'found') &&
      (it.status === 'active' || it.status === 'resolved');
  }

  function validItems(items) {
    return Array.isArray(items) && items.every(validItem);
  }

  function copyItems(items) {
    return JSON.parse(JSON.stringify(items || []));
  }

  // ==================== 读取 / 保存 ====================

  /**
   * 读取全部记录
   * 返回 { items, warning }：warning 非空表示本地数据损坏，已回退到种子数据（原数据未被覆盖）
   */
  function load(seed, storage) {
    storage = storage || safeStorage();
    try {
      var raw = storage.getItem(KEY);
      if (raw === null) return { items: copyItems(seed || []), warning: '' };
      var saved = JSON.parse(raw);
      if (!saved || saved.version !== VERSION || !validItems(saved.items)) throw new Error('invalid data');
      return { items: copyItems(saved.items), warning: '' };
    } catch (e) {
      return {
        items: copyItems(seed || []),
        warning: '本地数据读取失败（可能已损坏），已展示初始示例信息；原数据未被覆盖。'
      };
    }
  }

  /** 保存全部记录；返回 { ok, error }，只有 ok:true 才应更新界面 */
  function save(items, storage) {
    storage = storage || safeStorage();
    if (!validItems(items)) return { ok: false, error: '信息数据格式有误，未保存。' };
    try {
      storage.setItem(KEY, JSON.stringify({ version: VERSION, items: items }));
      return { ok: true, error: '' };
    } catch (e) {
      return { ok: false, error: '保存失败：存储空间不足或浏览器禁止本地保存，原记录未被覆盖。' };
    }
  }

  // ==================== 发布者标识 ====================

  /** 读取或生成本机发布者标识（无登录纯前端的权限边界） */
  function getOwnerId(storage) {
    storage = storage || safeStorage();
    var id = storage.getItem(OWNER_KEY);
    if (id) return id;
    var fresh = 'o_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try { storage.setItem(OWNER_KEY, fresh); } catch (e) { /* 忽略 */ }
    return fresh;
  }

  // ==================== 搜索历史（≤8 条） ====================

  function getHistory(storage) {
    storage = storage || safeStorage();
    try {
      var arr = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (s) { return typeof s === 'string' && s.trim(); });
    } catch (e) { return []; }
  }

  function addHistory(keyword, storage) {
    storage = storage || safeStorage();
    var kw = String(keyword || '').trim();
    if (!kw) return getHistory(storage);
    var list = getHistory(storage).filter(function (s) { return s !== kw; });
    list.unshift(kw);
    if (list.length > 8) list = list.slice(0, 8);
    try { storage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* 忽略 */ }
    return list;
  }

  function clearHistory(storage) {
    storage = storage || safeStorage();
    try { storage.removeItem(HISTORY_KEY); } catch (e) { /* 忽略 */ }
  }

  // ==================== 发布草稿 ====================

  function getDraft(storage) {
    storage = storage || safeStorage();
    try {
      var v = JSON.parse(storage.getItem(DRAFT_KEY) || 'null');
      return v && typeof v === 'object' ? v : null;
    } catch (e) { return null; }
  }

  function saveDraft(data, storage) {
    storage = storage || safeStorage();
    try { storage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) { /* 忽略 */ }
  }

  function clearDraft(storage) {
    storage = storage || safeStorage();
    try { storage.removeItem(DRAFT_KEY); } catch (e) { /* 忽略 */ }
  }

  // ==================== 导出 ====================
  return {
    KEY: KEY, OWNER_KEY: OWNER_KEY, HISTORY_KEY: HISTORY_KEY, DRAFT_KEY: DRAFT_KEY, VERSION: VERSION,
    memoryStorage: memoryStorage,
    safeStorage: safeStorage,
    validItem: validItem,
    validItems: validItems,
    load: load,
    save: save,
    getOwnerId: getOwnerId,
    getHistory: getHistory,
    addHistory: addHistory,
    clearHistory: clearHistory,
    getDraft: getDraft,
    saveDraft: saveDraft,
    clearDraft: clearDraft
  };
});
