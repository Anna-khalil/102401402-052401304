/**
 * ui.js —— 渲染层（生成 HTML + Toast + 弹窗 + 一键复制）
 *
 * 职责：只负责「生成 HTML 字符串」与「轻量交互反馈」；
 *       所有事件绑定与状态编排在 app.js 中完成。
 * 安全性：所有用户输入渲染前经 Core.escapeHtml 转义（防 XSS）。
 * 仅浏览器使用，挂 window.UI。
 */
(function () {
  'use strict';
  var Core = window.Core;

  function esc(s) { return Core.escapeHtml(s); }

  // ==================== Toast ====================

  function toast(msg, type) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) root.removeChild(t); }, 300);
    }, 2200);
  }

  // ==================== 弹窗 ====================

  function openModal(html) {
    var root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = html;
    root.style.display = 'flex';
  }

  function closeModal() {
    var root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = '';
    root.style.display = 'none';
  }

  /**
   * 通用确认弹窗
   * opts: { title, message, okText, cancelText, danger, list }
   *   list: [{ id, title, location, status }] 可点击项（用于相似信息提醒）
   * onChoose(choice): 'ok' | 'cancel' | itemId
   */
  function confirmDialog(opts, onChoose) {
    opts = opts || {};
    var listHtml = '';
    if (opts.list && opts.list.length) {
      listHtml = '<div class="modal-list">' + opts.list.map(function (it) {
        var st = Core.statusText(it);
        return '<button class="modal-list-item" data-modal-item="' + esc(it.id) + '">' +
          '<span class="badge badge-' + (it.status === 'resolved' ? 'gray' : 'green') + '">' + esc(st) + '</span>' +
          '<span class="modal-list-title">' + esc(it.title) + '</span>' +
          '<span class="modal-list-meta">' + esc(it.location) + '</span>' +
          '</button>';
      }).join('') + '</div>';
    }
    var cancelBtn = (opts.cancelText === null || opts.cancelText === undefined)
      ? ''
      : '<button class="btn" data-modal-cancel>' + esc(opts.cancelText || '取消') + '</button>';
    openModal(
      '<div class="modal-mask" data-modal-close></div>' +
      '<div class="modal">' +
        '<div class="modal-title">' + esc(opts.title || '提示') + '</div>' +
        '<div class="modal-body">' + esc(opts.message || '') + '</div>' +
        listHtml +
        '<div class="modal-actions">' + cancelBtn +
          '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-modal-ok>' + esc(opts.okText || '确定') + '</button>' +
        '</div>' +
      '</div>'
    );
    var mask = document.querySelector('#modal-root [data-modal-close]');
    var cancel = document.querySelector('#modal-root [data-modal-cancel]');
    var ok = document.querySelector('#modal-root [data-modal-ok]');
    if (mask) mask.addEventListener('click', function () { closeModal(); onChoose('cancel'); });
    if (cancel) cancel.addEventListener('click', function () { closeModal(); onChoose('cancel'); });
    if (ok) ok.addEventListener('click', function () { closeModal(); onChoose('ok'); });
    var items = document.querySelectorAll('#modal-root [data-modal-item]');
    Array.prototype.forEach.call(items, function (b) {
      b.addEventListener('click', function () { closeModal(); onChoose(b.getAttribute('data-modal-item')); });
    });
  }

  /** 联系发布者弹窗（含一键复制） */
  function contactDialog(item) {
    openModal(
      '<div class="modal-mask" data-modal-close></div>' +
      '<div class="modal">' +
        '<div class="modal-title">📞 联系发布者</div>' +
        '<div class="modal-body contact-body">' +
          '<div class="contact-line">' + esc(item.contact) + '</div>' +
          '<button class="btn btn-primary btn-block" data-copy>' + esc(item.contact) + ' 复制</button>' +
          '<p class="contact-tip">复制后前往微信 / QQ / 电话联系对方</p>' +
        '</div>' +
        '<div class="modal-actions"><button class="btn" data-modal-cancel>关闭</button></div>' +
      '</div>'
    );
    var mask = document.querySelector('#modal-root [data-modal-close]');
    var cancel = document.querySelector('#modal-root [data-modal-cancel]');
    var copyBtn = document.querySelector('#modal-root [data-copy]');
    if (mask) mask.addEventListener('click', closeModal);
    if (cancel) cancel.addEventListener('click', closeModal);
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyText(item.contact, function (ok) {
          toast(ok ? '联系方式已复制' : '自动复制受限，请选中文字后按 Ctrl+C', ok ? 'success' : 'warn');
        });
      });
    }
  }

  // ==================== 一键复制（带降级） ====================

  function copyText(text, done) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { fallback(); }
      );
    } else {
      fallback();
    }
  }

  // ==================== HTML 生成 ====================

  /** 统计条 */
  function statsHtml(stats) {
    return '<div class="stat"><b>' + stats.total + '</b><span>全部</span></div>' +
      '<div class="stat stat-active"><b>' + stats.active + '</b><span>进行中</span></div>' +
      '<div class="stat stat-resolved"><b>' + stats.resolved + '</b><span>已完成</span></div>' +
      '<div class="stat stat-rate"><b>' + stats.rate + '%</b><span>解决率</span></div>';
  }

  /** 首页信息卡片 */
  function cardHtml(item, myOwnerId) {
    var st = Core.statusText(item);
    var isMine = Core.canManage(item, myOwnerId);
    return '<div class="card' + (item.status === 'resolved' ? ' card-done' : '') + '" data-action="detail" data-id="' + esc(item.id) + '">' +
      '<div class="card-head">' +
        '<span class="tag tag-' + esc(item.type) + '">' + esc(Core.typeText(item.type)) + '</span>' +
        '<span class="badge badge-' + (item.status === 'resolved' ? 'gray' : 'green') + '">' + esc(st) + '</span>' +
        '<span class="card-time">' + esc(Core.formatTime(item.createdAt)) + '</span>' +
      '</div>' +
      '<div class="card-title">' + esc(item.title) + '</div>' +
      '<div class="card-meta">' + esc(item.category) + ' · ' + esc(item.area) + ' · ' + esc(item.location) + '</div>' +
      '<div class="card-foot">' +
        (isMine ? '<span class="mine-tag">我的发布</span>' : '') +
        '<span class="contact-btn" data-action="contact" data-id="' + esc(item.id) + '">📞 联系</span>' +
      '</div>' +
    '</div>';
  }

  /** 我的发布卡片（含状态操作按钮） */
  function mypostCardHtml(item) {
    var st = Core.statusText(item);
    var doneLabel = Core.statusText({ type: item.type, status: 'resolved' });
    return '<div class="card card-mypost">' +
      '<div class="card-head">' +
        '<span class="tag tag-' + esc(item.type) + '">' + esc(Core.typeText(item.type)) + '</span>' +
        '<span class="badge badge-' + (item.status === 'resolved' ? 'gray' : 'green') + '">' + esc(st) + '</span>' +
        '<span class="card-time">' + esc(Core.formatTime(item.createdAt)) + '</span>' +
      '</div>' +
      '<div class="card-title" data-action="detail" data-id="' + esc(item.id) + '">' + esc(item.title) + '</div>' +
      '<div class="card-meta">' + esc(item.location) + '</div>' +
      '<div class="card-ops">' +
        (item.status === 'active'
          ? '<button class="btn btn-sm btn-primary" data-action="complete" data-id="' + esc(item.id) + '">标记为' + esc(doneLabel) + '</button>'
          : '<button class="btn btn-sm" data-action="revert" data-id="' + esc(item.id) + '">改回进行中</button>') +
        '<button class="btn btn-sm btn-danger" data-action="delete" data-id="' + esc(item.id) + '">删除</button>' +
      '</div>' +
    '</div>';
  }

  /** 详情页 */
  function detailHtml(item, myOwnerId, related) {
    var st = Core.statusText(item);
    var can = Core.canManage(item, myOwnerId);

    var relatedHtml = '';
    if (related && related.length) {
      relatedHtml = '<div class="detail-block"><div class="block-title">💡 可能帮到你</div>' +
        related.map(function (r) {
          return '<button class="related-item" data-action="detail" data-id="' + esc(r.item.id) + '">' +
            '<div class="related-title">' + esc(r.item.title) +
              ' <span class="tag tag-' + esc(r.item.type) + '">' + esc(Core.typeText(r.item.type)) + '</span></div>' +
            '<div class="related-reasons">' + r.reasons.map(function (x) {
              return '<span class="reason-chip">' + esc(x) + '</span>';
            }).join('') + '</div>' +
            '<div class="related-meta">' + esc(r.item.location) + ' · ' + esc(Core.formatTime(r.item.createdAt)) + '</div>' +
          '</button>';
        }).join('') + '</div>';
    }

    var timeline = '<div class="detail-block"><div class="block-title">时间线</div>' +
      '<div class="timeline-item"><span class="tl-dot"></span>发布于 ' + esc(Core.formatTime(item.createdAt)) + '</div>' +
      (item.status === 'resolved'
        ? '<div class="timeline-item"><span class="tl-dot tl-done"></span>已于 ' + esc(Core.formatTime(item.resolvedAt)) + ' 标记为「' + esc(st) + '」</div>'
        : '') +
      '</div>';

    var ops = '';
    if (can) {
      ops = '<div class="detail-ops">' +
        (item.status === 'active'
          ? '<button class="btn btn-primary" data-action="complete" data-id="' + esc(item.id) + '">✅ 标记为' + esc(Core.statusText({ type: item.type, status: 'resolved' })) + '</button>'
          : '<button class="btn" data-action="revert" data-id="' + esc(item.id) + '">↩️ 改回进行中</button>') +
        '<button class="btn btn-danger" data-action="delete" data-id="' + esc(item.id) + '">删除</button>' +
      '</div>';
    }

    return '<div class="detail">' +
      '<button class="btn btn-back" data-action="go-back">← 返回</button>' +
      '<div class="detail-card">' +
        '<div class="card-head">' +
          '<span class="tag tag-' + esc(item.type) + '">' + esc(Core.typeText(item.type)) + '</span>' +
          '<span class="badge badge-' + (item.status === 'resolved' ? 'gray' : 'green') + '">' + esc(st) + '</span>' +
        '</div>' +
        '<h2 class="detail-title">' + esc(item.title) + '</h2>' +
        '<table class="detail-table">' +
          '<tr><td class="dt-label">物品类别</td><td>' + esc(item.category) + '</td></tr>' +
          '<tr><td class="dt-label">所在区域</td><td>' + esc(item.area) + '</td></tr>' +
          '<tr><td class="dt-label">具体地点</td><td>' + esc(item.location) + '</td></tr>' +
          '<tr><td class="dt-label">丢失/拾取时间</td><td>' + esc(item.eventTime) + '</td></tr>' +
          '<tr><td class="dt-label">详细描述</td><td class="dt-desc">' + (esc(item.description) || '<span class="muted">未填写</span>') + '</td></tr>' +
        '</table>' +
        '<div class="contact-box">' +
          '<div class="contact-label">联系方式（' + esc(Core.typeText(item.type)) + '发布者）</div>' +
          '<div class="contact-value">' + esc(item.contact) + '</div>' +
          '<button class="btn btn-primary" data-action="contact" data-id="' + esc(item.id) + '">📞 联系发布者</button>' +
        '</div>' +
        ops + timeline +
      '</div>' +
      relatedHtml +
    '</div>';
  }

  /** 空状态 */
  function emptyHtml(msg, extra) {
    return '<div class="empty">' +
      '<div class="empty-icon">🔍</div>' +
      '<div class="empty-text">' + esc(msg) + '</div>' +
      (extra ? '<div class="empty-extra">' + extra + '</div>' : '') +
    '</div>';
  }

  // ==================== 导出 ====================
  window.UI = {
    esc: esc,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirmDialog: confirmDialog,
    contactDialog: contactDialog,
    copyText: copyText,
    statsHtml: statsHtml,
    cardHtml: cardHtml,
    mypostCardHtml: mypostCardHtml,
    detailHtml: detailHtml,
    emptyHtml: emptyHtml
  };
})();
