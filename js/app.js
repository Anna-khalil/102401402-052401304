/**
 * app.js —— 应用入口：状态管理、hash 路由、事件绑定、视图渲染
 *
 * 职责：持有全局 state，把 UI 生成的 HTML 塞进对应视图容器，
 *       统一处理点击委托（data-action / data-filter / data-history）、
 *       发布流程（校验 → 相似提醒 → 保存）、状态闭环（标记/改回/删除）、
 *       搜索历史与发布草稿。
 */
(function () {
  'use strict';
  var Core = window.Core;
  var Store = window.Store;
  var UI = window.UI;

  var state = {
    view: 'home',
    items: [],
    ownerId: '',
    filters: { keyword: '', type: '', category: '', area: '', status: '' },
    selectedId: null
  };

  // ==================== 数据操作（先保存、后更新） ====================

  function commit(nextItems) {
    var res = Store.save(nextItems);
    if (res.ok) {
      state.items = nextItems;
      return true;
    }
    UI.toast(res.error, 'error');
    return false;
  }

  function findItem(id) {
    var i;
    for (i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  // ==================== 路由 ====================

  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    if (parts[0] === 'detail' && parts[1]) return { view: 'detail', id: parts[1] };
    if (parts[0] === 'publish') return { view: 'publish' };
    if (parts[0] === 'myposts') return { view: 'myposts' };
    return { view: 'home' };
  }

  function showView(view, id) {
    state.view = view;
    state.selectedId = id || null;
    var target = view === 'home' ? '#/home'
      : view === 'detail' ? '#/detail/' + (id || '')
      : '#/' + view;
    if ((location.hash || '') !== target) {
      try { history.replaceState(null, '', target); }
      catch (e) { location.hash = target; }
    }
    renderAll();
  }

  function renderAll() {
    var el = document.getElementById('view-' + state.view);
    var views = document.querySelectorAll('.view');
    Array.prototype.forEach.call(views, function (v) { v.style.display = 'none'; });
    if (el) el.style.display = 'block';

    var tabs = document.querySelectorAll('.tabbar-item');
    Array.prototype.forEach.call(tabs, function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === state.view);
    });

    var titles = { home: '校园失物招领', detail: '信息详情', publish: '发布信息', myposts: '我的发布' };
    document.getElementById('page-title').textContent = titles[state.view] || '校园失物招领';

    if (state.view === 'home') renderHome();
    else if (state.view === 'detail') renderDetail(state.selectedId);
    else if (state.view === 'myposts') renderMyposts();
  }

  // ==================== 首页渲染 ====================

  function chipHtml(key, options) {
    return options.map(function (o) {
      return '<button class="chip' + (state.filters[key] === o.v ? ' active' : '') +
        '" data-filter="' + key + '" data-value="' + escAttr(o.v) + '">' + UI.esc(o.label) + '</button>';
    }).join('');
  }

  function escAttr(s) {
    return Core.escapeHtml(s == null ? '' : s);
  }

  function renderHome() {
    var stats = Core.calcStats(state.items);
    document.getElementById('stats-bar').innerHTML = UI.statsHtml(stats);

    // 类型 Tab
    var typeTabs = [
      { v: '', t: '全部' }, { v: 'lost', t: '寻物' }, { v: 'found', t: '招领' }
    ];
    document.getElementById('type-tabs').innerHTML = typeTabs.map(function (x) {
      return '<button class="tab' + (state.filters.type === x.v ? ' active' : '') +
        '" data-filter="type" data-value="' + x.v + '">' + x.t + '</button>';
    }).join('');

    // 筛选 chips
    var cats = [{ v: '', label: '全部类别' }].concat(Core.CATEGORIES.map(function (c) { return { v: c, label: c }; }));
    var areas = [{ v: '', label: '全部区域' }].concat(Core.AREAS.map(function (a) { return { v: a, label: a }; }));
    var statuses = [
      { v: '', label: '全部状态' },
      { v: 'active', label: '进行中' },
      { v: 'resolved', label: '已完成' }
    ];
    var filterHtml =
      '<div class="chip-row"><span class="chip-label">类别</span>' + chipHtml('category', cats) + '</div>' +
      '<div class="chip-row"><span class="chip-label">区域</span>' + chipHtml('area', areas) + '</div>' +
      '<div class="chip-row"><span class="chip-label">状态</span>' + chipHtml('status', statuses) + '</div>';
    document.getElementById('filter-bar').innerHTML = filterHtml;

    // 结果计数 + 重置
    var filtered = Core.searchItems(state.items, {
      keyword: state.filters.keyword,
      type: state.filters.type,
      category: state.filters.category,
      area: state.filters.area,
      status: state.filters.status
    });
    var sorted = Core.sortItems(filtered);
    var hasFilter = state.filters.keyword || state.filters.type || state.filters.category ||
                    state.filters.area || state.filters.status;
    document.getElementById('result-count').textContent = sorted.length ? '共 ' + sorted.length + ' 条信息' : '';
    document.getElementById('reset-btn').style.display = hasFilter ? 'inline-block' : 'none';

    // 卡片列表
    var box = document.getElementById('card-list');
    if (!sorted.length) {
      box.innerHTML = UI.emptyHtml(
        state.filters.keyword ? '没有找到与「' + state.filters.keyword + '」相关的信息' : '暂时没有相关信息',
        '<button class="btn btn-primary" data-action="go-publish">去发布一条</button>'
      );
    } else {
      box.innerHTML = sorted.map(function (it) { return UI.cardHtml(it, state.ownerId); }).join('');
    }
  }

  // ==================== 搜索历史 ====================

  function renderSearchTools() {
    var hist = Store.getHistory();
    var box = document.getElementById('search-tools');
    if (!hist.length) { box.innerHTML = ''; return; }
    box.innerHTML =
      '<span class="chip-label">搜索历史</span>' +
      hist.map(function (s) {
        return '<button class="chip" data-history="' + escAttr(s) + '">' + UI.esc(s) + '</button>';
      }).join('') +
      '<button class="link-btn" data-action="clear-history">清空</button>';
  }

  // ==================== 详情 / 我的发布 ====================

  function renderDetail(id) {
    var box = document.getElementById('view-detail');
    var item = findItem(id);
    if (!item) {
      box.innerHTML = UI.emptyHtml('信息不存在或已被删除', '<button class="btn" data-action="go-home">返回首页</button>');
      return;
    }
    var related = Core.recommend(item, state.items);
    box.innerHTML = UI.detailHtml(item, state.ownerId, related);
  }

  function renderMyposts() {
    var mine = state.items.filter(function (it) { return it.ownerId === state.ownerId; });
    var sorted = Core.sortItems(mine);
    var box = document.getElementById('myposts-list');
    if (!sorted.length) {
      box.innerHTML = UI.emptyHtml('你还没有发布过信息', '<button class="btn btn-primary" data-action="go-publish">去发布一条</button>');
    } else {
      box.innerHTML = sorted.map(function (it) { return UI.mypostCardHtml(it); }).join('');
    }
  }

  // ==================== 发布表单 ====================

  function readForm(form) {
    return {
      type: (form.querySelector('[name=type]:checked') || {}).value || 'lost',
      title: form.querySelector('[name=title]').value,
      category: form.querySelector('[name=category]').value,
      area: form.querySelector('[name=area]').value,
      location: form.querySelector('[name=location]').value,
      eventTime: form.querySelector('[name=eventTime]').value.replace('T', ' '),
      description: form.querySelector('[name=description]').value,
      contact: form.querySelector('[name=contact]').value
    };
  }

  function writeForm(form, data) {
    var radio = form.querySelector('[name=type][value="' + data.type + '"]');
    if (radio) radio.checked = true;
    syncTypeSwitch(form);
    form.querySelector('[name=title]').value = data.title || '';
    form.querySelector('[name=category]').value = data.category || '';
    form.querySelector('[name=area]').value = data.area || '';
    form.querySelector('[name=location]').value = data.location || '';
    form.querySelector('[name=eventTime]').value = data.eventTime ? data.eventTime.replace(' ', 'T') : '';
    form.querySelector('[name=description]').value = data.description || '';
    form.querySelector('[name=contact]').value = data.contact || '';
  }

  function clearForm(form) {
    var data = {
      type: 'lost', title: '', category: '', area: '',
      location: '', eventTime: '', description: '', contact: ''
    };
    writeForm(form, data);
    var errs = form.querySelectorAll('.field-error');
    Array.prototype.forEach.call(errs, function (p) { p.textContent = ''; });
    var inputs = form.querySelectorAll('.form-input');
    Array.prototype.forEach.call(inputs, function (i) { i.classList.remove('invalid'); });
  }

  function saveDraftFromForm() {
    Store.saveDraft(readForm(document.getElementById('publish-form')));
  }

  function restoreDraft() {
    var draft = Store.getDraft();
    if (!draft) return;
    writeForm(document.getElementById('publish-form'), draft);
  }

  function syncTypeSwitch(form) {
    var opts = form.querySelectorAll('.type-option');
    Array.prototype.forEach.call(opts, function (o) {
      o.classList.toggle('active', o.querySelector('input').checked);
    });
  }

  function showFieldErrors(errors) {
    Object.keys(errors).forEach(function (k) {
      var p = document.querySelector('[data-err="' + k + '"]');
      if (p) p.textContent = errors[k];
      var input = document.querySelector('[name="' + k + '"]');
      if (input) input.classList.add('invalid');
    });
  }

  function clearFieldError(name) {
    var p = document.querySelector('[data-err="' + name + '"]');
    if (p) p.textContent = '';
    var input = document.querySelector('[name="' + name + '"]');
    if (input) input.classList.remove('invalid');
  }

  function onPublishSubmit(e) {
    e.preventDefault();
    var form = document.getElementById('publish-form');
    var raw = readForm(form);
    var res = Core.validatePost(raw);
    if (!res.valid) {
      showFieldErrors(res.errors);
      UI.toast('请检查表单中标红的字段', 'error');
      return;
    }
    var similar = Core.findSimilar({ title: res.data.title, type: res.data.type }, state.items);
    if (similar.length) {
      UI.confirmDialog({
        title: '发现相似信息',
        message: '已有 ' + similar.length + ' 条相似信息，先去看看也许能直接找到对方：',
        okText: '仍然发布',
        cancelText: '先去看看',
        list: similar
      }, function (choice) {
        if (choice === 'ok') doPublish(res.data);
        else if (choice !== 'cancel') showView('detail', choice);
      });
    } else {
      doPublish(res.data);
    }
  }

  function doPublish(data) {
    var item = {
      id: Core.genId(),
      type: data.type,
      title: data.title,
      category: data.category,
      area: data.area,
      location: data.location,
      eventTime: data.eventTime,
      description: data.description,
      contact: data.contact,
      status: 'active',
      resolvedAt: null,
      ownerId: state.ownerId,
      demo: false,
      createdAt: new Date().toISOString()
    };
    var next = [item].concat(state.items);
    if (commit(next)) {
      Store.clearDraft();
      clearForm(document.getElementById('publish-form'));
      UI.toast('发布成功，已置顶显示', 'success');
      showView('home');
    }
  }

  // ==================== 点击委托 ====================

  function handleFilter(t) {
    var key = t.getAttribute('data-filter');
    var value = t.getAttribute('data-value') || '';
    if (state.filters[key] === value) return;
    state.filters[key] = value;
    if (key === 'keyword') {
      var si = document.getElementById('search-input');
      if (si && si.value !== value) si.value = value;
      Store.addHistory(value);
    }
    renderHome();
  }

  function handleHistory(t) {
    var kw = t.getAttribute('data-history') || '';
    var si = document.getElementById('search-input');
    if (si) si.value = kw;
    state.filters.keyword = kw;
    Store.addHistory(kw);
    renderHome();
  }

  function handleAction(t) {
    var action = t.getAttribute('data-action');
    var id = t.getAttribute('data-id');

    if (action === 'go-home') { showView('home'); return; }
    if (action === 'go-publish') { showView('publish'); return; }
    if (action === 'go-back') { showView('home'); return; }
    if (action === 'detail') { showView('detail', id); return; }

    if (action === 'contact') {
      var it = findItem(id);
      if (it) UI.contactDialog(it);
      return;
    }

    if (action === 'copy') {
      UI.copyText(t.getAttribute('data-text') || '', function (ok) {
        UI.toast(ok ? '联系方式已复制' : '自动复制受限，请选中文字后按 Ctrl+C', ok ? 'success' : 'warn');
      });
      return;
    }

    if (action === 'complete') {
      var cit = findItem(id);
      if (!cit) return;
      var doneLabel = Core.statusText({ type: cit.type, status: 'resolved' });
      UI.confirmDialog({
        title: '标记完成',
        message: '确认将该信息标记为「' + doneLabel + '」吗？标记后其他用户将不再重复询问。',
        okText: '确认标记',
        cancelText: '取消'
      }, function (choice) {
        if (choice !== 'ok') return;
        var res = Core.completePost(state.items, id, state.ownerId);
        if (res.ok) {
          if (commit(res.posts)) {
            UI.toast('已标记为' + doneLabel, 'success');
            renderAll();
          }
        } else {
          UI.toast(res.error, 'error');
        }
      });
      return;
    }

    if (action === 'revert') {
      var rit = findItem(id);
      if (!rit) return;
      UI.confirmDialog({
        title: '改回进行中',
        message: '确认将该信息改回「进行中」状态吗？',
        okText: '确认改回',
        cancelText: '取消'
      }, function (choice) {
        if (choice !== 'ok') return;
        var res = Core.revertPost(state.items, id, state.ownerId);
        if (res.ok) {
          if (commit(res.posts)) {
            UI.toast('已改回进行中', 'success');
            renderAll();
          }
        } else {
          UI.toast(res.error, 'error');
        }
      });
      return;
    }

    if (action === 'delete') {
      var dit = findItem(id);
      if (!dit) return;
      if (!Core.canManage(dit, state.ownerId)) { UI.toast('只有发布者可以删除', 'error'); return; }
      UI.confirmDialog({
        title: '删除信息',
        message: '删除后不可恢复，确定删除「' + dit.title + '」吗？',
        okText: '删除',
        cancelText: '取消',
        danger: true
      }, function (choice) {
        if (choice !== 'ok') return;
        var next = state.items.filter(function (x) { return x.id !== id; });
        if (commit(next)) {
          UI.toast('已删除', 'success');
          renderAll();
        }
      });
      return;
    }

    if (action === 'reset-filters') {
      state.filters = { keyword: '', type: '', category: '', area: '', status: '' };
      var si = document.getElementById('search-input');
      if (si) si.value = '';
      renderHome();
      return;
    }

    if (action === 'clear-search') {
      state.filters.keyword = '';
      var si2 = document.getElementById('search-input');
      if (si2) si2.value = '';
      renderHome();
      return;
    }

    if (action === 'clear-history') {
      Store.clearHistory();
      renderSearchTools();
      return;
    }
  }

  // ==================== 事件绑定 ====================

  function bindEvents() {
    // 底部导航
    var tabItems = document.querySelectorAll('.tabbar-item');
    Array.prototype.forEach.call(tabItems, function (b) {
      b.addEventListener('click', function () { showView(b.getAttribute('data-view')); });
    });

    // 全局点击委托
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-action], [data-filter], [data-history]') : null;
      if (!t) return;
      if (t.getAttribute('data-action')) handleAction(t);
      else if (t.getAttribute('data-filter')) handleFilter(t);
      else if (t.getAttribute('data-history')) handleHistory(t);
    });

    // 搜索
    var si = document.getElementById('search-input');
    si.addEventListener('input', function () {
      state.filters.keyword = si.value.trim();
      renderHome();
    });
    si.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && si.value.trim()) {
        Store.addHistory(si.value.trim());
        renderSearchTools();
      }
    });
    si.addEventListener('focus', renderSearchTools);

    // 发布表单
    var form = document.getElementById('publish-form');
    form.addEventListener('submit', onPublishSubmit);
    form.addEventListener('input', function (e) {
      clearFieldError(e.target.name);
      if (e.target.name === 'type') syncTypeSwitch(form);
      saveDraftFromForm();
    });
    form.addEventListener('change', function (e) {
      clearFieldError(e.target.name);
      saveDraftFromForm();
    });

    // hash 路由（浏览器前进/后退）
    window.addEventListener('hashchange', function () {
      var r = parseHash();
      if (r.view === 'detail') showView('detail', r.id);
      else showView(r.view);
    });
  }

  // ==================== 启动 ====================

  function init() {
    var seed = window.SeedData ? window.SeedData.items : [];
    var loaded = Store.load(seed);
    state.items = loaded.items;
    state.ownerId = Store.getOwnerId();
    if (loaded.warning) UI.toast(loaded.warning, 'warn');
    bindEvents();
    restoreDraft();
    var r = parseHash();
    if (r.view === 'detail') showView('detail', r.id);
    else showView(r.view);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
