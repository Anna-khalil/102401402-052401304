/**
 * core.js —— 核心纯业务逻辑（不碰 DOM、不碰存储，可被 Node 单元测试）
 *
 * 包含：常量 / 文本归一化 / 表单校验 / 搜索 / 排序 / 状态机 / 权限 /
 *       相似度 / 相似线索推荐 / 时间格式化 / 统计 / HTML 转义
 *
 * UMD 双导出：浏览器挂 window.Core，Node 用 require('../js/core.js')
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();          // Node 环境
  } else {
    root.Core = factory();               // 浏览器环境
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ==================== 常量 ====================
  var CATEGORIES = ['电子设备', '证件卡片', '钥匙', '服饰箱包', '书籍文具', '其他'];
  var AREAS = ['教学区', '图书馆', '食堂', '宿舍区', '运动场', '其他'];
  var TYPES = ['lost', 'found'];
  var STATUSES = ['active', 'resolved'];

  // 状态文案：lost=寻物，found=招领；active=进行中，resolved=已解决
  var STATUS_TEXT = {
    lost:  { active: '寻找中', resolved: '已找到' },
    found: { active: '待认领', resolved: '已归还' }
  };
  var TYPE_TEXT = { lost: '寻物', found: '招领' };

  // ==================== 文本工具 ====================

  /** NFKC 归一化 + 小写 + 去标点空白 + trim（用于搜索、相似度） */
  function normalize(s) {
    var str = String(s == null ? '' : s);
    if (str.normalize) {
      try { str = str.normalize('NFKC'); } catch (e) { /* 忽略 */ }
    }
    return str.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').trim();
  }

  /** HTML 转义：所有用户输入在插入 DOM 前必须调用 */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 连续双字集合（中文相似度用） */
  function bigrams(s) {
    var r = [], i;
    for (i = 0; i < s.length - 1; i++) r.push(s.slice(i, i + 2));
    return r;
  }

  /** 名称相似度：0~1。相同=1，互相包含=0.85，否则 bigram 交并比 */
  function similarity(a, b) {
    var x = normalize(a), y = normalize(b);
    if (!x || !y) return 0;
    if (x === y) return 1;
    if (Math.min(x.length, y.length) >= 2 && (x.indexOf(y) !== -1 || y.indexOf(x) !== -1)) return 0.85;
    var xp = bigrams(x), yp = bigrams(y);
    if (!xp.length || !yp.length) return 0;
    var shared = 0, i;
    for (i = 0; i < xp.length; i++) {
      if (yp.indexOf(xp[i]) !== -1) shared++;
    }
    return shared / (xp.length + yp.length - shared);
  }

  // ==================== 表单校验 ====================

  /** 输入统一化：全部字段 trim 为字符串 */
  function normalizeInput(input) {
    input = input || {};
    return {
      type: String(input.type || '').trim(),
      title: String(input.title || '').trim(),
      category: String(input.category || '').trim(),
      area: String(input.area || '').trim(),
      location: String(input.location || '').trim(),
      eventTime: String(input.eventTime || '').trim(),
      description: String(input.description || '').trim(),
      contact: String(input.contact || '').trim()
    };
  }

  /**
   * 时间格式严格校验（分量回查，拒绝日期溢出）
   * 格式：'YYYY-MM-DD HH:mm'；如 2026-02-30、2026-02-29（非闰年）均返回 false
   */
  function validLocalTime(v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) return false;
    var p = v.split(/[- :]/).map(Number);
    var y = p[0], m = p[1], d = p[2], h = p[3], mi = p[4];
    if (m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23 || mi < 0 || mi > 59) return false;
    var dt = new Date(y, m - 1, d, h, mi);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d &&
           dt.getHours() === h && dt.getMinutes() === mi;
  }

  /**
   * 统一校验入口（发布/编辑共用）
   * 返回 { data, errors, valid }：data 为干净数据，errors 为字段名→提示文案
   */
  function validatePost(input) {
    var data = normalizeInput(input);
    var errors = {};
    if (TYPES.indexOf(data.type) === -1) errors.type = '请选择寻物或招领。';
    if (CATEGORIES.indexOf(data.category) === -1) errors.category = '请选择有效的物品类别。';
    if (AREAS.indexOf(data.area) === -1) errors.area = '请选择有效的区域。';

    [
      ['title', '物品名称', 40],
      ['location', '具体地点', 80],
      ['contact', '联系方式', 100]
    ].forEach(function (f) {
      if (!data[f[0]]) errors[f[0]] = '请填写' + f[1] + '。';
      else if (data[f[0]].length > f[2]) errors[f[0]] = f[1] + '不能超过' + f[2] + '字。';
    });

    if (data.description.length > 500) errors.description = '详细描述不能超过500字。';
    if (data.eventTime && !validLocalTime(data.eventTime)) errors.eventTime = '请填写有效的日期与时间。';

    return { data: data, errors: errors, valid: Object.keys(errors).length === 0 };
  }

  // ==================== 搜索 / 排序 ====================

  /**
   * 组合搜索：多关键词（空格分隔，全部命中 AND）+ 类型/类别/区域/状态筛选
   * 关键词对 名称/描述/地点/区域/类别 做包含匹配（归一化后）
   */
  function searchItems(items, opts) {
    items = Array.isArray(items) ? items : [];
    opts = opts || {};
    // 先按原始关键词以空白分词，再逐词归一化（normalize 会去除空白，顺序不能反）
    var rawKw = String(opts.keyword || '').trim();
    var tokens = rawKw ? rawKw.split(/\s+/).map(normalize).filter(Boolean) : [];
    return items.filter(function (it) {
      if (opts.type && it.type !== opts.type) return false;
      if (opts.category && it.category !== opts.category) return false;
      if (opts.area && it.area !== opts.area) return false;
      if (opts.status && it.status !== opts.status) return false;
      if (tokens.length) {
        var hay = normalize([it.title, it.description, it.location, it.area, it.category].join(' '));
        if (!tokens.every(function (t) { return hay.indexOf(t) !== -1; })) return false;
      }
      return true;
    });
  }

  /** 排序：未解决在前、组内按时间倒序（resolved 用 resolvedAt，active 用 createdAt）；返回新数组 */
  function sortItems(list) {
    list = Array.isArray(list) ? list : [];
    return list.slice().sort(function (a, b) {
      var ra = a.status === 'resolved' ? 1 : 0;
      var rb = b.status === 'resolved' ? 1 : 0;
      if (ra !== rb) return ra - rb;
      var ta = ra ? (a.resolvedAt || '') : (a.createdAt || '');
      var tb = rb ? (b.resolvedAt || '') : (b.createdAt || '');
      return ta < tb ? 1 : (ta > tb ? -1 : 0);
    });
  }

  // ==================== 状态机与权限 ====================

  /** 状态文案：lost→寻找中/已找到，found→待认领/已归还 */
  function statusText(item) {
    if (!item || !item.type) return '';
    var t = STATUS_TEXT[item.type] || STATUS_TEXT.lost;
    return item.status === 'resolved' ? t.resolved : t.active;
  }

  function typeText(type) {
    return TYPE_TEXT[type] || '';
  }

  /** 谁能管理：发布者本人 && 非演示数据（界面隐藏按钮 + 业务函数二次校验） */
  function canManage(post, ownerId) {
    return Boolean(post && !post.demo && ownerId && post.ownerId === ownerId);
  }

  /** 标记为已找到/已归还（active -> resolved），记录 resolvedAt；返回新数组 */
  function completePost(posts, id, ownerId, now) {
    posts = Array.isArray(posts) ? posts : [];
    now = now || new Date();
    var post = null, i;
    for (i = 0; i < posts.length; i++) { if (posts[i].id === id) { post = posts[i]; break; } }
    if (!post) return { ok: false, error: '这条信息不存在。' };
    if (!canManage(post, ownerId)) return { ok: false, error: '只有发布者可以更新状态。' };
    if (post.status === 'resolved') return { ok: false, error: '这条信息已经完成，无需重复操作。' };
    return {
      ok: true,
      posts: posts.map(function (p) {
        return p.id === id ? Object.assign({}, p, { status: 'resolved', resolvedAt: now.toISOString() }) : p;
      })
    };
  }

  /** 改回进行中（resolved -> active），清空 resolvedAt；返回新数组 */
  function revertPost(posts, id, ownerId, now) {
    posts = Array.isArray(posts) ? posts : [];
    now = now || new Date();
    var post = null, i;
    for (i = 0; i < posts.length; i++) { if (posts[i].id === id) { post = posts[i]; break; } }
    if (!post) return { ok: false, error: '这条信息不存在。' };
    if (!canManage(post, ownerId)) return { ok: false, error: '只有发布者可以更新状态。' };
    if (post.status !== 'resolved') return { ok: false, error: '这条信息正在进行中。' };
    return {
      ok: true,
      posts: posts.map(function (p) {
        return p.id === id ? Object.assign({}, p, { status: 'active', resolvedAt: null }) : p;
      })
    };
  }

  // ==================== 相似信息 ====================

  /**
   * 发布前防重复提醒：同类型 + 进行中 + 名称互相包含（≥2 字）
   * 校园卡 与 校园卡（蓝色贴纸）互相命中
   */
  function findSimilar(form, items) {
    items = Array.isArray(items) ? items : [];
    var name = String((form && form.title) || '').trim();
    if (name.length < 2) return [];
    var type = form && form.type;
    return items.filter(function (it) {
      if (it.type !== type || it.status !== 'active') return false;
      var other = String(it.title || '').trim();
      return other.length >= 2 && (other.indexOf(name) !== -1 || name.indexOf(other) !== -1);
    });
  }

  /**
   * 详情页相似线索推荐：相反类型 + 同类别 + 进行中 + 名称相似（≥0.25）
   * 返回 [{ item, score, reasons[] }]，按得分排序取前 3，附可核对的中文理由
   */
  function recommend(source, items) {
    items = Array.isArray(items) ? items : [];
    if (!source) return [];
    var opposite = source.type === 'lost' ? 'found' : 'lost';
    var results = [];
    items.forEach(function (it) {
      if (it.id === source.id || it.type !== opposite ||
          it.status !== 'active' || it.category !== source.category) return;
      var name = similarity(source.title, it.title);
      if (name < 0.25) return;
      var reasons = [name === 1 ? '物品名称相同' : '物品名称相似', '类别相同'];
      results.push({ item: it, score: Math.round(name * 60) + 15, reasons: reasons });
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 3);
  }

  // ==================== 时间 / 统计 ====================

  /** 相对时间：刚刚 / N 分钟前 / N 小时前 / 昨天 / N 天前 / 具体日期；now 可注入便于测试 */
  function formatTime(iso, now) {
    if (!iso) return '';
    var t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    var n = (now || new Date()).getTime();
    var diff = n - t;
    var MIN = 60000, HOUR = 3600000, DAY = 86400000;
    if (diff < MIN) return '刚刚';
    if (diff < HOUR) return Math.floor(diff / MIN) + ' 分钟前';
    if (diff < DAY) return Math.floor(diff / HOUR) + ' 小时前';
    if (diff < 2 * DAY) return '昨天';
    if (diff < 7 * DAY) return Math.floor(diff / DAY) + ' 天前';
    var d = new Date(t);
    var mo = String(d.getMonth() + 1); if (mo.length < 2) mo = '0' + mo;
    var da = String(d.getDate()); if (da.length < 2) da = '0' + da;
    return d.getFullYear() + '-' + mo + '-' + da;
  }

  /** 统计：全部 / 进行中 / 已完成 / 解决率（%） */
  function calcStats(items) {
    items = Array.isArray(items) ? items : [];
    var total = items.length;
    var resolved = 0, i;
    for (i = 0; i < total; i++) { if (items[i].status === 'resolved') resolved++; }
    return {
      total: total,
      active: total - resolved,
      resolved: resolved,
      rate: total ? Math.round(resolved / total * 100) : 0
    };
  }

  // ==================== ID 生成 ====================

  function genId() {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  function genOwnerId() {
    return 'o_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ==================== 导出 ====================
  return {
    CATEGORIES: CATEGORIES,
    AREAS: AREAS,
    TYPES: TYPES,
    STATUSES: STATUSES,
    STATUS_TEXT: STATUS_TEXT,
    TYPE_TEXT: TYPE_TEXT,
    normalize: normalize,
    escapeHtml: escapeHtml,
    similarity: similarity,
    normalizeInput: normalizeInput,
    validLocalTime: validLocalTime,
    validatePost: validatePost,
    searchItems: searchItems,
    sortItems: sortItems,
    statusText: statusText,
    typeText: typeText,
    canManage: canManage,
    completePost: completePost,
    revertPost: revertPost,
    findSimilar: findSimilar,
    recommend: recommend,
    formatTime: formatTime,
    calcStats: calcStats,
    genId: genId,
    genOwnerId: genOwnerId
  };
});
