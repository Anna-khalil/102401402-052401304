/**
 * core.test.js —— 单元测试（Node 内置 node:test，零第三方依赖）
 *
 * 运行方式（项目根目录）：
 *   node --test
 *   或：npm test
 *
 * 设计方法：白盒为主，覆盖 core.js 全部纯函数与 store.js 存储层，
 *           按正常 / 边界 / 异常三类输入构造用例。
 * 存储测试通过注入 memoryStorage() 替身，不依赖真实浏览器。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../js/core.js');
const Store = require('../js/store.js');

// ==================== 测试数据构造 ====================

function item(o) {
  return Object.assign({
    id: 'p1',
    type: 'lost',
    title: '测试物品',
    category: '其他',
    area: '其他',
    location: '某地',
    eventTime: '2026-10-08 08:00',
    description: '',
    contact: 'QQ：1',
    status: 'active',
    resolvedAt: null,
    ownerId: 'owner-a',
    demo: false,
    createdAt: '2026-10-08T00:00:00.000Z'
  }, o || {});
}

function fixture() {
  return [
    item({ id: 'p1', title: '黑色保温杯', type: 'lost', status: 'active', category: '其他', area: '图书馆', location: '图书馆三楼', createdAt: '2026-10-08T01:00:00.000Z' }),
    item({ id: 'p2', title: '白色 AirPods', type: 'found', status: 'active', category: '电子设备', area: '教学区', ownerId: 'owner-b', createdAt: '2026-10-07T01:00:00.000Z' }),
    item({ id: 'p3', title: '校园卡', type: 'lost', status: 'resolved', category: '证件卡片', area: '食堂', ownerId: 'owner-a', resolvedAt: '2026-10-06T10:00:00.000Z', createdAt: '2026-10-05T01:00:00.000Z' }),
    item({ id: 'p4', title: '蓝色雨伞', type: 'found', status: 'resolved', category: '服饰箱包', area: '图书馆', ownerId: 'owner-b', demo: true, resolvedAt: '2026-10-06T10:00:00.000Z', createdAt: '2026-10-04T01:00:00.000Z' }),
    item({ id: 'p5', title: '宿舍钥匙', type: 'lost', status: 'active', category: '钥匙', area: '运动场', createdAt: '2026-10-06T01:00:00.000Z' })
  ];
}

function memory() { return Store.memoryStorage(); }

const NOW = new Date('2026-10-08T12:00:00.000Z');

// ==================== validatePost 表单校验 ====================

test('validatePost：缺少必填项时逐字段报错', () => {
  const r = Core.validatePost({ type: 'lost', category: '钥匙', area: '图书馆' });
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.title, '缺少 title 报错');
  assert.ok(r.errors.location, '缺少 location 报错');
  assert.ok(r.errors.contact, '缺少 contact 报错');
});

test('validatePost：非法 type / category / area 被拒绝', () => {
  const r = Core.validatePost({ type: 'hack', title: '伞', category: '不存在的类', area: '不存在' });
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.type && r.errors.category && r.errors.area);
});

test('validatePost：物品名称超过 40 字被拒绝', () => {
  const r = Core.validatePost({ type: 'lost', title: 'x'.repeat(41), category: '其他', area: '其他', location: 'A', contact: 'B' });
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.title);
  assert.match(r.errors.title, /40/);
});

test('validatePost：联系方式超过 100 字被拒绝', () => {
  const r = Core.validatePost({ type: 'lost', title: '伞', category: '其他', area: '其他', location: 'A', contact: 'x'.repeat(101) });
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.contact);
});

test('validatePost：详细描述超过 500 字被拒绝', () => {
  const r = Core.validatePost({ type: 'lost', title: '伞', category: '其他', area: '其他', location: 'A', contact: 'B', description: 'x'.repeat(501) });
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.description);
});

test('validatePost：非法日期 2026-02-30 被拒绝（分量回查）', () => {
  const r = Core.validatePost({ type: 'lost', title: '伞', category: '其他', area: '其他', location: 'A', contact: 'B', eventTime: '2026-02-30 12:00' });
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.eventTime);
});

test('validatePost：2026 年非闰年，02-29 被拒绝', () => {
  const r = Core.validatePost({ type: 'lost', title: '伞', category: '其他', area: '其他', location: 'A', contact: 'B', eventTime: '2026-02-29 12:00' });
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.eventTime);
});

test('validatePost：时间格式错误（缺分钟）被拒绝', () => {
  const r = Core.validatePost({ type: 'lost', title: '伞', category: '其他', area: '其他', location: 'A', contact: 'B', eventTime: '2026-10-08 8' });
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.eventTime);
});

test('validatePost：合法输入通过且字段被 trim', () => {
  const r = Core.validatePost({
    type: 'lost', title: '  黑色保温杯  ', category: '其他', area: '图书馆',
    location: '  三楼  ', contact: ' QQ：123 ',
    eventTime: '2026-10-08 08:30', description: '  黑色  '
  });
  assert.strictEqual(r.valid, true);
  assert.deepEqual(r.errors, {});
  assert.strictEqual(r.data.title, '黑色保温杯');
  assert.strictEqual(r.data.location, '三楼');
});

// ==================== searchItems 搜索 ====================

test('searchItems：按名称命中', () => {
  const r = Core.searchItems(fixture(), { keyword: '保温杯' });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, 'p1');
});

test('searchItems：空关键词返回全部', () => {
  assert.strictEqual(Core.searchItems(fixture(), {}).length, 5);
  assert.strictEqual(Core.searchItems(fixture(), { keyword: '   ' }).length, 5);
});

test('searchItems：多关键词空格分隔，要求全部命中（AND）', () => {
  const r = Core.searchItems(fixture(), { keyword: '图书馆 保温杯' });
  assert.strictEqual(r.length, 1);
  const r2 = Core.searchItems(fixture(), { keyword: '雨伞 教学区' });
  assert.strictEqual(r2.length, 0, '不同条目字段不跨条匹配');
});

test('searchItems：全角/半角、大小写归一化后匹配', () => {
  const a = Core.searchItems(fixture(), { keyword: 'ａｉｒ' });
  const b = Core.searchItems(fixture(), { keyword: 'Air' });
  assert.strictEqual(a.length, 1);
  assert.strictEqual(a.length, b.length);
});

test('searchItems：匹配地点与描述字段', () => {
  assert.strictEqual(Core.searchItems(fixture(), { keyword: '三楼' }).length, 1);
  assert.strictEqual(Core.searchItems(fixture(), { keyword: '教学区' }).length, 1);
});

test('searchItems：组合筛选（类型 + 类别 + 状态）', () => {
  const r = Core.searchItems(fixture(), { type: 'lost', category: '其他', status: 'active' });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, 'p1');
});

test('searchItems：筛选无匹配返回空数组', () => {
  assert.deepEqual(Core.searchItems(fixture(), { category: '书籍文具' }), []);
});

test('searchItems：非数组 / null 输入防御返回空数组', () => {
  assert.deepEqual(Core.searchItems(null, {}), []);
  assert.deepEqual(Core.searchItems(undefined, { keyword: 'x' }), []);
  assert.deepEqual(Core.searchItems('not-array', {}), []);
});

// ==================== sortItems 排序 ====================

test('sortItems：未解决在前、已解决置底', () => {
  const r = Core.sortItems(fixture());
  assert.strictEqual(r[0].status, 'active');
  assert.strictEqual(r[1].status, 'active');
  assert.strictEqual(r[2].status, 'active');
  assert.strictEqual(r[3].status, 'resolved');
  assert.strictEqual(r[4].status, 'resolved');
});

test('sortItems：组内按时间倒序（最新在前）', () => {
  const r = Core.sortItems(fixture());
  assert.strictEqual(r[0].id, 'p1', 'active 组最新');
  assert.strictEqual(r[3].id, 'p3', 'resolved 组最新先');
  assert.strictEqual(r[4].id, 'p4');
});

test('sortItems：返回新数组，不修改原数据', () => {
  const f = fixture();
  const before = JSON.stringify(f);
  Core.sortItems(f);
  assert.strictEqual(JSON.stringify(f), before);
});

test('sortItems：空数组 / 非法输入', () => {
  assert.deepEqual(Core.sortItems([]), []);
  assert.deepEqual(Core.sortItems(null), []);
});

// ==================== completePost / revertPost 状态机 ====================

test('completePost：寻物正常标记为已找到，记录 resolvedAt', () => {
  const r = Core.completePost(fixture(), 'p1', 'owner-a', NOW);
  assert.strictEqual(r.ok, true);
  const p = r.posts.find(x => x.id === 'p1');
  assert.strictEqual(p.status, 'resolved');
  assert.strictEqual(p.resolvedAt, NOW.toISOString());
});

test('completePost：非发布者不可修改（双层权限兜底）', () => {
  const r = Core.completePost(fixture(), 'p1', 'someone-else', NOW);
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /发布者/);
});

test('completePost：demo 演示数据不可修改', () => {
  const r = Core.completePost(fixture(), 'p4', 'owner-b', NOW);
  assert.strictEqual(r.ok, false);
});

test('completePost：已完成信息不可重复标记', () => {
  const r = Core.completePost(fixture(), 'p3', 'owner-a', NOW);
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /已经完成/);
});

test('completePost：不存在的 id 拒绝', () => {
  const r = Core.completePost(fixture(), 'p_not_exist', 'owner-a', NOW);
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /不存在/);
});

test('completePost：返回新数组，原数据不被修改', () => {
  const f = fixture();
  Core.completePost(f, 'p1', 'owner-a', NOW);
  assert.strictEqual(f.find(x => x.id === 'p1').status, 'active');
});

test('revertPost：改回进行中并清空 resolvedAt', () => {
  const r = Core.revertPost(fixture(), 'p3', 'owner-a', NOW);
  assert.strictEqual(r.ok, true);
  const p = r.posts.find(x => x.id === 'p3');
  assert.strictEqual(p.status, 'active');
  assert.strictEqual(p.resolvedAt, null);
});

test('revertPost：非发布者拒绝', () => {
  const r = Core.revertPost(fixture(), 'p3', 'owner-b', NOW);
  assert.strictEqual(r.ok, false);
});

test('revertPost：进行中的信息不可改回（已是 active）', () => {
  const r = Core.revertPost(fixture(), 'p1', 'owner-a', NOW);
  assert.strictEqual(r.ok, false);
});

test('canManage：本人且非 demo 为 true，其余为 false', () => {
  const mine = item({ ownerId: 'owner-a', demo: false });
  const demo = item({ ownerId: 'owner-a', demo: true });
  const other = item({ ownerId: 'owner-b', demo: false });
  assert.strictEqual(Core.canManage(mine, 'owner-a'), true);
  assert.strictEqual(Core.canManage(demo, 'owner-a'), false);
  assert.strictEqual(Core.canManage(other, 'owner-a'), false);
  assert.strictEqual(Core.canManage(mine, ''), false);
  assert.strictEqual(Core.canManage(null, 'owner-a'), false);
});

// ==================== findSimilar / similarity / recommend ====================

test('findSimilar：名称互相包含命中（校园卡 与 校园卡蓝色卡套）', () => {
  const list = [
    item({ id: 'a', title: '校园卡', type: 'lost', status: 'active' }),
    item({ id: 'b', title: '校园卡蓝色卡套', type: 'lost', status: 'active' }),
    item({ id: 'c', title: '保温杯', type: 'lost', status: 'active' })
  ];
  const r = Core.findSimilar({ title: '校园卡', type: 'lost' }, list);
  assert.strictEqual(r.length, 2);
});

test('findSimilar：短名称（1 字）不参与查重', () => {
  const list = [item({ id: 'a', title: '伞', type: 'lost', status: 'active' })];
  assert.deepEqual(Core.findSimilar({ title: '伞', type: 'lost' }, list), []);
});

test('findSimilar：已完成信息不参与查重、类型不同不参与', () => {
  const list = [
    item({ id: 'a', title: '校园卡', type: 'lost', status: 'resolved' }),
    item({ id: 'b', title: '校园卡', type: 'found', status: 'active' })
  ];
  assert.deepEqual(Core.findSimilar({ title: '校园卡', type: 'lost' }, list), []);
});

test('similarity：相同=1，互相包含=0.85，无关低分', () => {
  assert.strictEqual(Core.similarity('黑色雨伞', '黑色雨伞'), 1);
  assert.strictEqual(Core.similarity('黑色雨伞', '黑色雨伞（蓝色边）'), 0.85);
  assert.ok(Core.similarity('黑色雨伞', '蓝色雨伞') > Core.similarity('黑色雨伞', '黑色水杯'));
  assert.strictEqual(Core.similarity('', '伞'), 0);
});

test('recommend：推荐相反类型 + 同类别 + 进行中，最多 3 条且附理由', () => {
  const list = [
    item({ id: 'src', title: '黑色雨伞', type: 'lost', category: '服饰箱包', status: 'active' }),
    item({ id: 'r1', title: '蓝色雨伞', type: 'found', category: '服饰箱包', status: 'active' }),
    item({ id: 'r2', title: '黑色雨伞', type: 'found', category: '服饰箱包', status: 'active' }),
    item({ id: 'r3', title: '长柄伞', type: 'found', category: '服饰箱包', status: 'active' }),
    item({ id: 'r4', title: '另一把伞', type: 'found', category: '服饰箱包', status: 'active' }),
    item({ id: 'no1', title: '黑色雨伞', type: 'found', category: '电子设备', status: 'active' }),
    item({ id: 'no2', title: '黑色雨伞', type: 'lost', category: '服饰箱包', status: 'active' }),
    item({ id: 'no3', title: '黑色雨伞', type: 'found', category: '服饰箱包', status: 'resolved' })
  ];
  const r = Core.recommend(list.find(x => x.id === 'src'), list);
  assert.ok(r.length <= 3);
  r.forEach(function (x) {
    assert.strictEqual(x.item.type, 'found');
    assert.strictEqual(x.item.category, '服饰箱包');
    assert.strictEqual(x.item.status, 'active');
    assert.ok(x.reasons.length >= 2);
  });
  assert.ok(r.every(x => !['no1', 'no2', 'no3'].includes(x.item.id)), '排除同类型/异类别/已完成');
});

// ==================== formatTime / calcStats ====================

test('formatTime：刚刚 / 分钟 / 小时 / 昨天 / 天前', () => {
  assert.strictEqual(Core.formatTime('2026-10-08T11:59:30.000Z', NOW), '刚刚');
  assert.strictEqual(Core.formatTime('2026-10-08T11:30:00.000Z', NOW), '30 分钟前');
  assert.strictEqual(Core.formatTime('2026-10-08T09:00:00.000Z', NOW), '3 小时前');
  assert.strictEqual(Core.formatTime('2026-10-07T01:00:00.000Z', NOW), '昨天');
  assert.strictEqual(Core.formatTime('2026-10-03T01:00:00.000Z', NOW), '5 天前');
});

test('formatTime：超过一周显示具体日期，非法时间返回空串', () => {
  assert.strictEqual(Core.formatTime('2026-09-01T00:00:00.000Z', NOW), '2026-09-01');
  assert.strictEqual(Core.formatTime('', NOW), '');
  assert.strictEqual(Core.formatTime('not-a-time', NOW), '');
  assert.strictEqual(Core.formatTime(null, NOW), '');
});

test('calcStats：总数 / 进行中 / 已完成 / 解决率', () => {
  const s = Core.calcStats(fixture());
  assert.strictEqual(s.total, 5);
  assert.strictEqual(s.active, 3);
  assert.strictEqual(s.resolved, 2);
  assert.strictEqual(s.rate, 40);
  assert.strictEqual(Core.calcStats([]).rate, 0);
  assert.strictEqual(Core.calcStats(null).total, 0);
});

// ==================== escapeHtml / normalize / 文案 ====================

test('escapeHtml：转义 HTML 特殊字符（防 XSS）', () => {
  assert.strictEqual(Core.escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  assert.strictEqual(Core.escapeHtml("a'b&c"), 'a&#39;b&amp;c');
  assert.strictEqual(Core.escapeHtml(''), '');
  assert.strictEqual(Core.escapeHtml(null), '');
});

test('normalize：NFKC 归一化 + 去标点 + 小写', () => {
  assert.strictEqual(Core.normalize('Ａｉｒ Pods'), 'airpods');
  assert.strictEqual(Core.normalize('  Hello, 世界! '), 'hello世界');
  assert.strictEqual(Core.normalize(''), '');
});

test('statusText：四态文案正确', () => {
  assert.strictEqual(Core.statusText({ type: 'lost', status: 'active' }), '寻找中');
  assert.strictEqual(Core.statusText({ type: 'lost', status: 'resolved' }), '已找到');
  assert.strictEqual(Core.statusText({ type: 'found', status: 'active' }), '待认领');
  assert.strictEqual(Core.statusText({ type: 'found', status: 'resolved' }), '已归还');
});

// ==================== store.js 存储层 ====================

test('store.load：空存储返回种子数据', () => {
  const m = memory();
  const r = Store.load(fixture(), m);
  assert.strictEqual(r.items.length, 5);
  assert.strictEqual(r.warning, '');
});

test('store.load：损坏 JSON 返回告警 + 种子数据，且不覆盖原数据', () => {
  const m = memory();
  m.setItem(Store.KEY, '{invalid json');
  const r = Store.load(fixture(), m);
  assert.notStrictEqual(r.warning, '');
  assert.strictEqual(r.items.length, 5);
  assert.strictEqual(m.getItem(Store.KEY), '{invalid json', '原数据保留');
});

test('store.load：版本不符返回告警 + 种子数据', () => {
  const m = memory();
  m.setItem(Store.KEY, JSON.stringify({ version: 999, items: fixture() }));
  const r = Store.load(fixture(), m);
  assert.notStrictEqual(r.warning, '');
});

test('store.load：记录格式非法返回告警', () => {
  const m = memory();
  m.setItem(Store.KEY, JSON.stringify({ version: 1, items: [{ bad: true }] }));
  const r = Store.load(fixture(), m);
  assert.notStrictEqual(r.warning, '');
});

test('store.save：合法数据保存成功并可读回', () => {
  const m = memory();
  const res = Store.save(fixture(), m);
  assert.strictEqual(res.ok, true);
  const back = Store.load([], m);
  assert.strictEqual(back.items.length, 5);
  assert.strictEqual(back.warning, '');
});

test('store.save：非法数据拒绝保存', () => {
  const m = memory();
  const res = Store.save([{ bad: true }], m);
  assert.strictEqual(res.ok, false);
  assert.notStrictEqual(res.error, '');
});

test('store.save：容量不足（setItem 抛异常）返回 ok:false 且不误报成功', () => {
  const full = {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => {}
  };
  const res = Store.save(fixture(), full);
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /保存失败/);
});

test('store.getOwnerId：首次生成并持久化，再次读取一致', () => {
  const m = memory();
  const a = Store.getOwnerId(m);
  const b = Store.getOwnerId(m);
  assert.match(a, /^o_/);
  assert.strictEqual(a, b);
  assert.strictEqual(m.getItem(Store.OWNER_KEY), a);
});

test('store.addHistory：去重 + 最多保留 8 条', () => {
  const m = memory();
  Store.addHistory('校园卡', m);
  Store.addHistory('保温杯', m);
  Store.addHistory('校园卡', m);
  let h = Store.getHistory(m);
  assert.strictEqual(h.length, 2);
  assert.strictEqual(h[0], '校园卡');
  for (let i = 0; i < 10; i++) Store.addHistory('词' + i, m);
  h = Store.getHistory(m);
  assert.strictEqual(h.length, 8);
});

test('store.addHistory：空关键词不记录', () => {
  const m = memory();
  Store.addHistory('  ', m);
  assert.strictEqual(Store.getHistory(m).length, 0);
});

test('store.clearHistory：清空搜索历史', () => {
  const m = memory();
  Store.addHistory('校园卡', m);
  Store.clearHistory(m);
  assert.strictEqual(Store.getHistory(m).length, 0);
});

test('store 草稿：保存 / 读取 / 清除', () => {
  const m = memory();
  assert.strictEqual(Store.getDraft(m), null);
  Store.saveDraft({ title: '草稿' }, m);
  assert.deepEqual(Store.getDraft(m), { title: '草稿' });
  Store.clearDraft(m);
  assert.strictEqual(Store.getDraft(m), null);
});

test('store.validItems：拒绝缺失关键字段的记录', () => {
  assert.strictEqual(Store.validItems([item()]), true);
  assert.strictEqual(Store.validItems([{ title: 'x' }]), false);
  assert.strictEqual(Store.validItems([]), true);
  assert.strictEqual(Store.validItems(null), false);
});
