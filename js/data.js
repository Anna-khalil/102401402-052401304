/* ============================================================
   data.js —— 内置示例数据（阶段 A：2 条占位，后续补全到 8 条）
   demo:true 的数据不可修改状态、不可删除
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SEED_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return [
    {
      id: 'p_seed1',
      type: 'found',
      title: '黑色保温杯',
      category: '其他',
      area: '图书馆',
      location: '图书馆三楼阅览区靠窗座位',
      lostTime: '2026-10-07 08:30',
      description: '黑色膳魔师保温杯，杯身贴有卡通贴纸，杯内无液体。',
      contact: 'QQ：123456789（图书馆管理员）',
      status: 'active',
      createdAt: '2026-10-07T09:10:00',
      resolvedAt: '',
      ownerId: 'o_demo',
      demo: true
    },
    {
      id: 'p_seed2',
      type: 'lost',
      title: '校园卡',
      category: '证件卡片',
      area: '食堂',
      location: '紫荆食堂一楼',
      lostTime: '2026-10-06 12:20',
      description: '卡套是蓝色的，内有本人校园卡一张。',
      contact: '微信：xxx_2026',
      status: 'active',
      createdAt: '2026-10-06T13:00:00',
      resolvedAt: '',
      ownerId: 'o_demo',
      demo: true
    }
  ];
});
