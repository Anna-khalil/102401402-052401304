/**
 * data.js —— 8 条内置示例数据（demo 标记，仅用于首次打开时展示）
 *
 * 说明：demo 记录的 ownerId 统一为 'o_demo' 且 demo:true，
 *       业务层 canManage 会对 demo 记录一律返回 false，
 *       因此演示数据不可修改状态、不可删除，保证示例数据永远可用。
 */
(function () {
  'use strict';
  var DEMO_OWNER = 'o_demo';

  var seedItems = [
    {
      id: 'p_seed1', type: 'found', title: '黑色保温杯',
      category: '其他', area: '图书馆', location: '图书馆三楼阅览区靠窗座位',
      eventTime: '2026-10-07 08:30',
      description: '黑色膳魔师保温杯，杯身贴有卡通贴纸，杯内无液体。',
      contact: 'QQ：123456789（图书馆管理员）',
      status: 'active', resolvedAt: null, ownerId: DEMO_OWNER, demo: true,
      createdAt: '2026-10-07T01:30:00.000Z'
    },
    {
      id: 'p_seed2', type: 'lost', title: '校园卡',
      category: '证件卡片', area: '食堂', location: '紫荆食堂一楼',
      eventTime: '2026-10-06 12:10',
      description: '校园卡，卡套为透明蓝色，卡面有姓名「王同学」。',
      contact: '微信：wang2026',
      status: 'active', resolvedAt: null, ownerId: DEMO_OWNER, demo: true,
      createdAt: '2026-10-06T05:10:00.000Z'
    },
    {
      id: 'p_seed3', type: 'found', title: '白色 AirPods 耳机',
      category: '电子设备', area: '教学区', location: '文科楼 102 教室讲台上',
      eventTime: '2026-10-05 16:20',
      description: '白色 AirPods 三代，充电盒背面有刻字「LZ」。',
      contact: '手机：13800001111',
      status: 'resolved', resolvedAt: '2026-10-06T10:00:00.000Z', ownerId: DEMO_OWNER, demo: true,
      createdAt: '2026-10-05T08:20:00.000Z'
    },
    {
      id: 'p_seed4', type: 'lost', title: '宿舍钥匙串',
      category: '钥匙', area: '运动场', location: '东区田径场跑道边',
      eventTime: '2026-10-04 18:40',
      description: '三把钥匙加一个蓝色猫咪小挂件。',
      contact: 'QQ：987654321',
      status: 'active', resolvedAt: null, ownerId: DEMO_OWNER, demo: true,
      createdAt: '2026-10-04T10:40:00.000Z'
    },
    {
      id: 'p_seed5', type: 'found', title: '灰色帆布包',
      category: '服饰箱包', area: '宿舍区', location: '27 号楼一楼大厅沙发',
      eventTime: '2026-10-03 20:15',
      description: '灰色帆布单肩包，内有《高等数学》课本和笔记本。',
      contact: '微信：bag2026',
      status: 'active', resolvedAt: null, ownerId: DEMO_OWNER, demo: true,
      createdAt: '2026-10-03T12:15:00.000Z'
    },
    {
      id: 'p_seed6', type: 'lost', title: '蓝色雨伞',
      category: '服饰箱包', area: '图书馆', location: '图书馆门口伞架',
      eventTime: '2026-10-02 17:00',
      description: '深蓝色长柄雨伞，伞柄刻有字母 F。',
      contact: 'QQ：112233445',
      status: 'active', resolvedAt: null, ownerId: DEMO_OWNER, demo: true,
      createdAt: '2026-10-02T09:00:00.000Z'
    },
    {
      id: 'p_seed7', type: 'found', title: '华为充电宝',
      category: '电子设备', area: '教学区', location: '经管楼 305 教室抽屉',
      eventTime: '2026-10-01 10:05',
      description: '黑色 10000mAh 华为充电宝，带一条白色数据线。',
      contact: '手机：13900002222',
      status: 'resolved', resolvedAt: '2026-10-02T03:00:00.000Z', ownerId: DEMO_OWNER, demo: true,
      createdAt: '2026-10-01T02:05:00.000Z'
    },
    {
      id: 'p_seed8', type: 'found', title: '四级词汇书',
      category: '书籍文具', area: '食堂', location: '朝阳食堂二楼收餐处',
      eventTime: '2026-09-30 12:45',
      description: '星火英语四级词汇书，扉页写有「加油」二字。',
      contact: 'QQ：556677889',
      status: 'active', resolvedAt: null, ownerId: DEMO_OWNER, demo: true,
      createdAt: '2026-09-30T04:45:00.000Z'
    }
  ];

  if (typeof module === 'object' && module.exports) {
    module.exports = { items: seedItems };   // 兼容 Node（一般不需要，仅备用）
  } else {
    window.SeedData = { items: seedItems };
  }
})();
