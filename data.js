// ============================================================
//  策划组荣誉系统 · 数据源
//  —— 所有策划 & 荣誉数据在本文件中显式填写，方便直接编辑
// ============================================================

// ========= 品质定义 =========
// 每一种品质对应一个"荣誉值"积分，荣誉值会用于排行榜计算
export const QUALITY = {
  legend:  { name: '传说', color: '#f5c242', border: '#ff4d4d', score: 100 },
  epic:    { name: '史诗', color: '#b266ff', border: '#b266ff', score: 60 },
  rare:    { name: '稀有', color: '#4da6ff', border: '#4da6ff', score: 30 },
  common:  { name: '普通', color: '#9ca3af', border: '#9ca3af', score: 10 }
};

// ========= 荣誉分类 =========
export const CATEGORY = {
  design:      '设计奖',
  popularity:  '人气奖',
  team:        '团队奖',
  achievement: '成就',
  innovation:  '创新奖'
};

// ============================================================
//  ⭐ 所有策划数据 —— 在这里直接修改 / 添加 / 删除
//  字段说明：
//    id           唯一编号
//    name         中文姓名（用于登录匹配）
//    engName      英文名（用于头像 https://r.hrc.woa.com/photo/150/${engName}.png）
//    dept         部门
//    role         职位
//    level        等级（1-20）
//    quote        个性签名
//    honors       荣誉数组，每条荣誉字段：
//                   id       该策划下唯一的荣誉编号
//                   name     荣誉名称
//                   quality  品质：legend / epic / rare / common
//                   category 分类：design / popularity / team / achievement / innovation
//                   icon     图标 class（RemixIcon，如 ri-vip-crown-2-fill）
//                   date     获得日期 YYYY-MM-DD
//                   desc     荣誉描述
//                   reason   获得理由
//    miniBadgeIds 精选展示徽章（主页头部展示）对应的 honors.id 列表，最多 8 个
//
//  可用图标举例：
//    ri-vip-crown-2-fill ri-fire-fill ri-rocket-2-fill ri-award-fill
//    ri-vip-diamond-fill ri-lightbulb-flash-fill ri-team-fill
//    ri-medal-2-fill ri-scales-3-fill ri-user-star-fill ri-tools-fill
//    ri-book-read-fill ri-heart-3-fill ri-flashlight-fill ri-star-fill
//    ri-quill-pen-fill ri-thumb-up-fill ri-magic-fill ri-hand-heart-fill
//    ri-file-list-3-fill ri-moon-fill ri-calendar-check-fill ri-discuss-fill
//    ri-share-forward-fill ri-trophy-fill ri-sword-fill ri-shield-star-fill
// ============================================================

export const people = [
  // ========== 策划 1 ==========
  {
    id: 1,
    name: '张嘉予',
    engName: 'jaryjyzhang',
    dept: '天美工作室 · 王者荣耀',
    role: '高级策划',
    level: 12,
    quote: '让每一次英雄登场都成为玩家的高光时刻。',
    honors: [
      { id: 1, name: 'S32赛季最佳设计奖', quality: 'legend', category: 'design', icon: 'ri-vip-crown-2-fill',
        date: '2024-12-20',
        desc: 'S32赛季中由全体玩家投票选出的最佳英雄设计奖，获奖作品《云中君·归墟之律》引发全网二创热潮。',
        reason: '主导设计英雄"云中君"新皮肤，上线首周销量破千万。' },
      { id: 2, name: '玩家人气设计师', quality: 'legend', category: 'popularity', icon: 'ri-fire-fill',
        date: '2024-11-05',
        desc: '在年度玩家评选中荣获最高人气设计师称号，获得超过 230 万张玩家投票。',
        reason: '官方社区点赞数第一，B站设计解析视频播放量破 5000 万。' },
      { id: 3, name: '创新玩法大奖', quality: 'epic', category: 'innovation', icon: 'ri-lightbulb-flash-fill',
        date: '2024-09-12',
        desc: '凭借"无限乱斗·觉醒之战"模式获得部门年度创新大奖，打破传统MOBA模式桎梏。',
        reason: '带来了 40% 的 DAU 增长与 1.7 倍的玩家活跃时长。' },
      { id: 4, name: '团队协作之星', quality: 'epic', category: 'team', icon: 'ri-team-fill',
        date: '2024-08-01',
        desc: '跨部门协作评选中获得团队最佳协作奖，推动"艾琳"英雄重做项目落地。',
        reason: '串联策划、美术、程序、音效四部门，按时上线零事故。' },
      { id: 5, name: '史诗级版本功臣', quality: 'epic', category: 'achievement', icon: 'ri-medal-2-fill',
        date: '2024-06-15',
        desc: 'S31赛季版本核心设计者之一，主导全新装备系统改版。',
        reason: '版本口碑逆转，玩家满意度提升 28%。' },
      { id: 6, name: '金牌讲师', quality: 'rare', category: 'achievement', icon: 'ri-book-read-fill',
        date: '2024-05-20',
        desc: '部门内部分享会金牌讲师，单场次最高在线观看 600+ 人。',
        reason: '《MOBA数值调优方法论》被收录为新人必修课。' },
      { id: 7, name: '玩家之友', quality: 'rare', category: 'popularity', icon: 'ri-heart-3-fill',
        date: '2024-04-10',
        desc: '连续三个月在玩家反馈社区 Top10 点赞策划榜单中上榜。',
        reason: '亲自回复玩家反馈超过 2000 条。' },
      { id: 8, name: '快速响应勋章', quality: 'rare', category: 'achievement', icon: 'ri-flashlight-fill',
        date: '2024-03-22',
        desc: '线上紧急问题响应速度最快奖，平均响应时间 < 8 分钟。',
        reason: '版本紧急修复协同处理 30+ 次。' },
      { id: 9, name: '爆款制造机', quality: 'legend', category: 'design', icon: 'ri-rocket-2-fill',
        date: '2023-07-07',
        desc: '所设计的内容连续 3 次登上热搜 TOP 3。',
        reason: '《虞姬-幻境歌姬》皮肤引爆全网。' },
      { id: 10, name: '年度MVP', quality: 'legend', category: 'achievement', icon: 'ri-award-fill',
        date: '2023-01-01',
        desc: '2022年度王者荣耀项目组最具价值策划。',
        reason: '综合贡献排名第一。' }
    ],
    miniBadgeIds: [1, 2, 9, 10, 3, 4, 5, 6]
  },

  // ========== 策划 2 ==========
  {
    id: 2,
    name: '赵宇涵',
    engName: 'aaronzzhao',
    dept: '天美L1 · 战斗组',
    role: '主策划',
    level: 14,
    quote: '玩法，是游戏的灵魂。',
    honors: [
      { id: 1, name: '创新玩法大奖', quality: 'legend', category: 'innovation', icon: 'ri-lightbulb-flash-fill',
        date: '2024-10-01',
        desc: '主导全新 PVE 大型玩法"长安幻夜"，上线首周覆盖玩家破 5000 万。',
        reason: '突破 MOBA 边界，开辟新品类。' },
      { id: 2, name: '版本核心设计师', quality: 'epic', category: 'design', icon: 'ri-medal-2-fill',
        date: '2024-07-18',
        desc: 'S31/S32 连续两个赛季玩法核心设计者。',
        reason: '连续两季度版本口碑 A+。' },
      { id: 3, name: '技术攻坚专家', quality: 'epic', category: 'innovation', icon: 'ri-tools-fill',
        date: '2024-04-11',
        desc: '攻克匹配算法难题，平均匹配时间缩短 60%。',
        reason: '独立设计 MMR 多维权重方案。' },
      { id: 4, name: '玩家之友', quality: 'rare', category: 'popularity', icon: 'ri-heart-3-fill',
        date: '2024-02-02',
        desc: '玩家反馈社区 Top1 点赞策划。',
        reason: '亲自回复反馈 3000+ 条。' },
      { id: 5, name: '金牌讲师', quality: 'rare', category: 'achievement', icon: 'ri-book-read-fill',
        date: '2023-11-05',
        desc: '部门内训最受欢迎讲师。',
        reason: '《玩法设计十讲》累计观看万人次。' },
      { id: 6, name: '全勤达人', quality: 'common', category: 'achievement', icon: 'ri-calendar-check-fill',
        date: '2023-12-30',
        desc: '全年出勤率 100%。',
        reason: '从未迟到早退。' }
    ],
    miniBadgeIds: [1, 2, 3, 4, 5, 6]
  },

  // ========== 策划 3 ==========
  {
    id: 3,
    name: '墨染',
    engName: '',
    dept: '天美J3 · 皮肤组',
    role: '高级策划',
    level: 13,
    quote: '皮肤不仅是外观，更是故事的延伸。',
    honors: [
      { id: 1, name: '最佳皮肤设计奖', quality: 'legend', category: 'design', icon: 'ri-vip-crown-2-fill',
        date: '2024-11-11',
        desc: '"貂蝉·绝代佳人"皮肤获年度最佳设计奖。',
        reason: '销量突破 2000 万，玩家口碑第一。' },
      { id: 2, name: '爆款制造机', quality: 'legend', category: 'design', icon: 'ri-rocket-2-fill',
        date: '2024-06-18',
        desc: '连续三款皮肤登顶热销榜。',
        reason: '审美与市场兼顾。' },
      { id: 3, name: '新英雄之父', quality: 'epic', category: 'design', icon: 'ri-user-star-fill',
        date: '2024-03-08',
        desc: '主导"海诺"英雄视觉与剧情设计。',
        reason: '玩家好评率 98%。' },
      { id: 4, name: '好评如潮', quality: 'rare', category: 'popularity', icon: 'ri-thumb-up-fill',
        date: '2024-01-19',
        desc: '上线皮肤应用商店好评率 99.4%。',
        reason: '精准把握玩家情绪。' },
      { id: 5, name: '文档之王', quality: 'rare', category: 'design', icon: 'ri-quill-pen-fill',
        date: '2023-09-12',
        desc: '年度最佳设计文档奖。',
        reason: '结构清晰，引用率最高。' }
    ],
    miniBadgeIds: [1, 2, 3, 4, 5]
  },

  // ========== 策划 4 ==========
  {
    id: 4,
    name: '云深',
    engName: '',
    dept: '天美J3 · 数值组',
    role: '资深策划',
    level: 11,
    quote: '数值的艺术，在于恰到好处的平衡。',
    honors: [
      { id: 1, name: '平衡大师', quality: 'legend', category: 'design', icon: 'ri-scales-3-fill',
        date: '2024-09-05',
        desc: '版本平衡性评选年度第一，玩家与官方双料认可。',
        reason: '操刀 S31 全英雄数值调优。' },
      { id: 2, name: '史诗级版本功臣', quality: 'epic', category: 'achievement', icon: 'ri-medal-2-fill',
        date: '2024-05-22',
        desc: 'S31 装备系统改版核心设计者。',
        reason: '玩家满意度提升 28%。' },
      { id: 3, name: '金牌讲师', quality: 'rare', category: 'achievement', icon: 'ri-book-read-fill',
        date: '2024-02-14',
        desc: '《MOBA 数值调优方法论》主讲人。',
        reason: '新人必修课。' },
      { id: 4, name: '需求评审达人', quality: 'common', category: 'achievement', icon: 'ri-file-list-3-fill',
        date: '2023-12-01',
        desc: '年度需求评审量 Top1。',
        reason: '高质量文档输出 160+ 份。' }
    ],
    miniBadgeIds: [1, 2, 3, 4]
  },

  // ========== 策划 5 ==========
  {
    id: 5,
    name: '星野',
    engName: '',
    dept: '天美J3 · 英雄组',
    role: '高级策划',
    level: 12,
    quote: '好的英雄设计，会让玩家魂牵梦萦。',
    honors: [
      { id: 1, name: '新英雄之父', quality: 'legend', category: 'design', icon: 'ri-user-star-fill',
        date: '2024-10-28',
        desc: '主导全新英雄"归墟"设计，登场首周使用率 35%。',
        reason: '机制创新且易上手难精通。' },
      { id: 2, name: '玩家人气设计师', quality: 'epic', category: 'popularity', icon: 'ri-fire-fill',
        date: '2024-06-01',
        desc: '年度人气设计师 Top3。',
        reason: '百万玩家好评。' },
      { id: 3, name: '团队协作之星', quality: 'epic', category: 'team', icon: 'ri-team-fill',
        date: '2024-03-15',
        desc: '跨组协作项目最佳奖。',
        reason: '推动英雄项目零事故上线。' },
      { id: 4, name: '灵感喷泉', quality: 'rare', category: 'innovation', icon: 'ri-magic-fill',
        date: '2023-10-09',
        desc: '全年创意提案采纳率超 60%。',
        reason: '脑洞大开且可落地。' }
    ],
    miniBadgeIds: [1, 2, 3, 4]
  },

  // ========== 策划 6 ==========
  {
    id: 6,
    name: '北辰',
    engName: '',
    dept: '天美J3 · 战令组',
    role: '策划',
    level: 9,
    quote: '用热爱编织王者的世界。',
    honors: [
      { id: 1, name: '爆款战令设计', quality: 'epic', category: 'design', icon: 'ri-vip-diamond-fill',
        date: '2024-08-16',
        desc: 'S32 战令系统改版主设计，付费率提升 18%。',
        reason: '奖励梯度设计精准。' },
      { id: 2, name: '好评如潮', quality: 'rare', category: 'popularity', icon: 'ri-thumb-up-fill',
        date: '2024-04-22',
        desc: '应用商店好评率 99.0%。',
        reason: '持续迭代优化。' },
      { id: 3, name: '季度新星', quality: 'rare', category: 'achievement', icon: 'ri-star-fill',
        date: '2023-07-01',
        desc: '入职首年 Q2 最佳新人。',
        reason: '独立负责战令 Pass 方案。' },
      { id: 4, name: '全勤达人', quality: 'common', category: 'achievement', icon: 'ri-calendar-check-fill',
        date: '2023-12-30',
        desc: '年度全勤奖。',
        reason: '稳定可靠。' }
    ],
    miniBadgeIds: [1, 2, 3, 4]
  },

  // ========== 策划 7 ==========
  {
    id: 7,
    name: '南宫',
    engName: '',
    dept: '天美J3 · 赛事组',
    role: '主策划',
    level: 15,
    quote: '让每一场电竞比赛都成为一场传奇。',
    honors: [
      { id: 1, name: 'KPL赛事最佳策划', quality: 'legend', category: 'achievement', icon: 'ri-trophy-fill',
        date: '2024-12-01',
        desc: 'KPL 年度总决赛策划团队核心成员，带动观看人次破 5 亿。',
        reason: '赛制创新，观感提升。' },
      { id: 2, name: '传奇大师', quality: 'legend', category: 'achievement', icon: 'ri-vip-diamond-fill',
        date: '2024-07-20',
        desc: '累计贡献值突破万点，获传奇策划大师称号。',
        reason: '十年如一日投入赛事设计。' },
      { id: 3, name: '团队协作之星', quality: 'epic', category: 'team', icon: 'ri-team-fill',
        date: '2024-04-09',
        desc: '赛事落地跨多部门协作最佳奖。',
        reason: '统筹 8 个部门按时落地。' },
      { id: 4, name: '协作达人', quality: 'rare', category: 'team', icon: 'ri-hand-heart-fill',
        date: '2023-11-22',
        desc: '跨部门协作评价最高奖。',
        reason: '配合默契。' },
      { id: 5, name: '分享小能手', quality: 'common', category: 'team', icon: 'ri-share-forward-fill',
        date: '2023-08-08',
        desc: '组内技术分享 Top3。',
        reason: '乐于分享经验。' }
    ],
    miniBadgeIds: [1, 2, 3, 4, 5]
  },

  // ========== 策划 8 ==========
  {
    id: 8,
    name: '若水',
    engName: '',
    dept: '天美J3 · 英雄组',
    role: '策划',
    level: 8,
    quote: '从玩家中来，到玩家中去。',
    honors: [
      { id: 1, name: '季度新星', quality: 'epic', category: 'achievement', icon: 'ri-star-fill',
        date: '2024-10-10',
        desc: '2024 Q3 最佳新人策划。',
        reason: '独立负责辅助英雄机制优化。' },
      { id: 2, name: '玩家之友', quality: 'rare', category: 'popularity', icon: 'ri-heart-3-fill',
        date: '2024-06-12',
        desc: '玩家社区活跃点赞策划。',
        reason: '回复反馈 1200+ 条。' },
      { id: 3, name: '夜猫子', quality: 'common', category: 'achievement', icon: 'ri-moon-fill',
        date: '2024-02-01',
        desc: '年度加班时长 Top10。',
        reason: '对项目充满热情。' }
    ],
    miniBadgeIds: [1, 2, 3]
  },

  // ========== 策划 9 ==========
  {
    id: 9,
    name: '凌霄',
    engName: '',
    dept: '天美J3 · 玩法组',
    role: '资深策划',
    level: 10,
    quote: '匠心如初，百折不挠。',
    honors: [
      { id: 1, name: '创新玩法大奖', quality: 'epic', category: 'innovation', icon: 'ri-lightbulb-flash-fill',
        date: '2024-09-30',
        desc: '新玩法"巅峰对决"核心设计师。',
        reason: '玩家活跃时长提升 45%。' },
      { id: 2, name: '快速响应勋章', quality: 'rare', category: 'achievement', icon: 'ri-flashlight-fill',
        date: '2024-05-05',
        desc: '线上紧急问题响应速度最快奖。',
        reason: '平均响应 < 8 分钟。' },
      { id: 3, name: '会议达人', quality: 'common', category: 'team', icon: 'ri-discuss-fill',
        date: '2023-10-18',
        desc: '年度需求评审会议最多。',
        reason: '专业敬业。' }
    ],
    miniBadgeIds: [1, 2, 3]
  },

  // ========== 策划 10 ==========
  {
    id: 10,
    name: '玖月',
    engName: '',
    dept: '天美J3 · 皮肤组',
    role: '高级策划',
    level: 11,
    quote: '设计的终点，是玩家的笑容。',
    honors: [
      { id: 1, name: '爆款制造机', quality: 'legend', category: 'design', icon: 'ri-rocket-2-fill',
        date: '2024-11-20',
        desc: '双十一皮肤连续登顶热销榜。',
        reason: '营收再创新高。' },
      { id: 2, name: '好评如潮', quality: 'rare', category: 'popularity', icon: 'ri-thumb-up-fill',
        date: '2024-06-06',
        desc: '新皮肤好评率 99.5%。',
        reason: '精准把握玩家审美。' },
      { id: 3, name: '灵感喷泉', quality: 'rare', category: 'innovation', icon: 'ri-magic-fill',
        date: '2024-02-22',
        desc: '创意提案被多次采纳。',
        reason: '脑洞与实用并重。' },
      { id: 4, name: '文档之王', quality: 'rare', category: 'design', icon: 'ri-quill-pen-fill',
        date: '2023-12-12',
        desc: '年度最佳设计文档奖。',
        reason: '逻辑严密，范例级别。' }
    ],
    miniBadgeIds: [1, 2, 3, 4]
  },

  // ========== 策划 11 ==========
  {
    id: 11,
    name: '白鹿',
    engName: '',
    dept: '天美J3 · 数值组',
    role: '策划',
    level: 7,
    quote: '一次次迭代，只为更好的体验。',
    honors: [
      { id: 1, name: '平衡大师', quality: 'epic', category: 'design', icon: 'ri-scales-3-fill',
        date: '2024-08-08',
        desc: 'S32 英雄平衡性调优核心成员。',
        reason: '玩家投诉率下降 35%。' },
      { id: 2, name: '季度新星', quality: 'rare', category: 'achievement', icon: 'ri-star-fill',
        date: '2024-04-01',
        desc: 'Q1 最佳新人。',
        reason: '独立负责野怪数值方案。' },
      { id: 3, name: '全勤达人', quality: 'common', category: 'achievement', icon: 'ri-calendar-check-fill',
        date: '2023-12-28',
        desc: '全年出勤率 100%。',
        reason: '自律稳定。' }
    ],
    miniBadgeIds: [1, 2, 3]
  },

  // ========== 策划 12 ==========
  {
    id: 12,
    name: '江离',
    engName: '',
    dept: '天美J3 · 赛事组',
    role: '高级策划',
    level: 12,
    quote: '把玩家想成自己，用心做每一个细节。',
    honors: [
      { id: 1, name: '团队协作之星', quality: 'epic', category: 'team', icon: 'ri-team-fill',
        date: '2024-11-01',
        desc: 'KPL 春季赛执行团队最佳协作奖。',
        reason: '零事故完成全部赛事。' },
      { id: 2, name: '协作达人', quality: 'rare', category: 'team', icon: 'ri-hand-heart-fill',
        date: '2024-05-30',
        desc: '跨部门协作评价第一。',
        reason: '配合默契、沟通高效。' },
      { id: 3, name: '分享小能手', quality: 'common', category: 'team', icon: 'ri-share-forward-fill',
        date: '2023-09-09',
        desc: '组内分享达人。',
        reason: '乐于分享赛事经验。' }
    ],
    miniBadgeIds: [1, 2, 3]
  }
];

// ============================================================
//  自动计算：荣誉值 / 排行榜 / 登录用户 / 个人化存储
//  （以下为工具函数，一般无需修改）
// ============================================================

// 计算某人的荣誉值
function calcScore(honors) {
  return honors.reduce((s, h) => s + (QUALITY[h.quality]?.score || 0), 0);
}

// 给每个策划补上 score（如未显式填写）
people.forEach(p => {
  if (typeof p.score !== 'number') p.score = calcScore(p.honors);
});

// 根据 id 查找策划
export function getPersonById(id) {
  return people.find(p => p.id === Number(id));
}

// ========= 排行榜（基于真实荣誉自动生成） =========
// 三种维度：年榜 / 半年榜 / 总榜
// 取所有策划荣誉中的最晚日期作为"当前时间"基准，避免硬编码年份
const ALL_DATES = people.flatMap(p => p.honors.map(h => h.date)).sort();
const NOW_DATE = ALL_DATES.length ? new Date(ALL_DATES[ALL_DATES.length - 1]) : new Date();
const NOW_YEAR = NOW_DATE.getFullYear();

function buildRank(filterFn) {
  return people
    .map(p => {
      const filtered = p.honors.filter(filterFn);
      return {
        id: p.id,
        name: p.name,
        dept: p.dept,
        role: p.role,
        honors: filtered.length,
        score: calcScore(filtered)
      };
    })
    .filter(x => x.honors > 0)
    .sort((a, b) => b.score - a.score || b.honors - a.honors)
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

export const rankData = {
  year: buildRank(h => Number(h.date.slice(0, 4)) === NOW_YEAR),
  half: buildRank(h => {
    const diff = (NOW_DATE - new Date(h.date)) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 183;
  }),
  total: buildRank(() => true)
};

// ========= 登录用户 =========
export const currentUser = {
  engName: '',
  chnName: '',
  dept: '',
  role: '',
  personId: null,
  isLoggedIn: false
};

// 拉取登录信息并匹配策划
export async function loadCurrentUser() {
  try {
    const res = await fetch('/ts:auth/tauth/info.ashx', { credentials: 'include' });
    if (!res.ok) throw new Error('login failed');
    const info = await res.json();
    currentUser.engName = info.EngName || '';
    currentUser.chnName = info.ChnName || '';
    currentUser.dept = info.DeptNameString || '';
    currentUser.role = info.PositionName || '';
    currentUser.isLoggedIn = !!(info.EngName || info.ChnName);

    // 1. 先根据中文名匹配
    let matched = people.find(p => p.name === currentUser.chnName);
    // 2. 再根据英文名匹配
    if (!matched && currentUser.engName) {
      matched = people.find(p => p.engName === currentUser.engName);
    }
    // 3. 没匹配到且已登录，创建一个"新人"档案
    if (!matched && currentUser.isLoggedIn) {
      const newId = (people[people.length - 1]?.id || 0) + 1;
      matched = {
        id: newId,
        name: currentUser.chnName || currentUser.engName,
        engName: currentUser.engName,
        dept: currentUser.dept || '王者荣耀 · 策划组',
        role: currentUser.role || '策划',
        level: 1,
        quote: '刚加入策划组，未来可期！',
        honors: [],
        score: 0,
        miniBadgeIds: [],
        isNewcomer: true
      };
      people.push(matched);
    } else if (matched) {
      if (currentUser.engName && !matched.engName) {
        matched.engName = currentUser.engName;
      }
    }
    if (matched) currentUser.personId = matched.id;
    return currentUser;
  } catch (e) {
    currentUser.isLoggedIn = false;
    return currentUser;
  }
}

// 判断某个策划是不是当前登录用户
export function isSelf(personId) {
  return currentUser.isLoggedIn && currentUser.personId === Number(personId);
}

// ============================================================
//  个人化配置（后端持久化 + localStorage 兜底缓存）
//  —— 所有签名/展示徽章通过后端 API /api/profile 共享给所有用户
// ============================================================
const STORAGE_KEY = 'wz_honor_profile_cache_v3';

function readCache() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function writeCache(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch {}
}
// profileKey：优先使用 engName，否则退化为中文姓名，保证每位策划有稳定 key
export function profileKey(person) {
  return person.engName || person.name;
}

// 应用一个 profile 数据到 person 对象
// 语义：后端一旦存在该记录，就以后端为"真源"完全覆盖本地默认值；
//      这样其他用户清空签名或改动徽章时，所有人都能同步看到。
function applyProfileToPerson(person, profile) {
  if (!profile) return;
  // 后端记录的 engName 与 person 不匹配时不应用
  const key = profileKey(person);
  if (profile.engName && profile.engName !== key) return;

  // 使用"是否显式带有该字段"来判断是否覆盖；后端 /api/profile 必然返回这两个字段
  if (Object.prototype.hasOwnProperty.call(profile, 'quote')) {
    person.quote = typeof profile.quote === 'string' ? profile.quote : '';
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'miniBadgeIds')) {
    const own = new Set(person.honors.map(h => h.id));
    const raw = Array.isArray(profile.miniBadgeIds) ? profile.miniBadgeIds : [];
    // 保留有效 id；若后端明确返回空数组，代表用户就是想清空 —— 应当清空
    person.miniBadgeIds = raw.filter(id => own.has(id));
  }
}

// 先用本地缓存启动一下（离线/网络慢时也能立刻显示之前拉到过的数据）
function applyCacheToAll() {
  const cache = readCache();
  people.forEach(p => {
    const key = profileKey(p);
    applyProfileToPerson(p, cache[key]);
  });
}
applyCacheToAll();

// 从后端拉取全部 profile 并覆盖到内存数据 + 更新缓存
// 语义：后端中存在的 engName 即视为"真源"，内存 person 以后端数据为准；
// 后端未出现的 engName 保留 data.js 中默认值不变。
export async function loadAllProfiles() {
  async function fetchList() {
    // 优先走 /hof/profiles，失败再退 /api/profiles
    for (const url of ['/hof/profiles', '/api/profiles']) {
      try {
        const res = await fetch(url + `?_t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) continue;
        const txt = await res.text();
        if (!txt || /^\s*</.test(txt)) continue; // HTML 代表被网关改写
        try {
          const arr = JSON.parse(txt);
          if (Array.isArray(arr)) return arr;
        } catch (_) {}
      } catch (_) {}
    }
    return null;
  }

  try {
    const list = await fetchList();
    if (!Array.isArray(list)) throw new Error('fetch profiles failed');
    const cache = {};
    const map = {};
    list.forEach(item => {
      if (!item || !item.engName) return;
      map[item.engName] = item;
      cache[item.engName] = {
        quote: item.quote || '',
        miniBadgeIds: Array.isArray(item.miniBadgeIds) ? item.miniBadgeIds : []
      };
    });
    // 仅对后端存在记录的人进行覆盖
    people.forEach(p => {
      const key = profileKey(p);
      if (map[key]) applyProfileToPerson(p, map[key]);
    });
    writeCache(cache);
    return map;
  } catch (e) {
    // 网络异常不阻塞页面，使用缓存即可
    console.warn('loadAllProfiles failed, fallback to cache:', e);
    return {};
  }
}

// 单独刷新某一位策划的 profile（他人改动后可主动调用）
// 只有后端确实存在记录（至少 quote 或 miniBadgeIds 被用户设置过）才覆盖本地默认值
export async function refreshProfile(person) {
  try {
    const key = profileKey(person);
    if (!key) return;
    // 优先 /hof/*，回退 /api/*
    let item = null;
    for (const base of ['/hof/profile/', '/api/profile/']) {
      try {
        const res = await fetch(
          `${base}${encodeURIComponent(key)}?_t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (!res.ok) continue;
        const txt = await res.text();
        if (!txt || /^\s*</.test(txt)) continue;
        try {
          const j = JSON.parse(txt);
          if (j && j.engName) { item = j; break; }
        } catch (_) {}
      } catch (_) {}
    }
    if (!item) return;
    // 判定后端是否"真正存在记录"：
    // - quote 非空字符串  或
    // - miniBadgeIds 是数组且长度 > 0
    const hasRecord =
      (typeof item.quote === 'string' && item.quote.length > 0) ||
      (Array.isArray(item.miniBadgeIds) && item.miniBadgeIds.length > 0);
    if (!hasRecord) return;
    applyProfileToPerson(person, item);
    // 更新缓存
    const cache = readCache();
    cache[key] = {
      quote: item.quote || '',
      miniBadgeIds: Array.isArray(item.miniBadgeIds) ? item.miniBadgeIds : []
    };
    writeCache(cache);
  } catch (e) {
    // 忽略
  }
}

async function postProfile(person, payload) {
  const key = profileKey(person);
  if (!key) throw new Error('缺少唯一标识（engName 或 name）');

  // 尝试从响应体解析 JSON，失败返回 null（不抛错）
  async function tryJson(res) {
    try {
      const text = await res.text();
      if (!text) return null;
      // 如果是网关返回的 HTML，直接视为无效
      if (/^\s*</.test(text)) return null;
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  // 失败时从响应中提炼友好错误文本
  async function buildErr(res) {
    let msg = '保存失败';
    try {
      const text = await res.text();
      if (/<html/i.test(text)) {
        const m = text.match(/<title>([^<]+)<\/title>/i);
        msg = `保存失败（${res.status}${m ? ' - ' + m[1].trim() : ''}）`;
      } else {
        msg = '保存失败：' + (text || res.status);
      }
    } catch (_) {}
    const err = new Error(msg);
    err.status = res.status;
    return err;
  }

  // 1) 优先用 GET /hof/save（非 /api 前缀，绕开网关对 /api/* 的拦截）
  //    失败再回退到 GET /api/save
  const params = new URLSearchParams();
  params.set('engName', key);
  if (person.name) params.set('chnName', person.name);
  if (payload && payload.quote !== undefined && payload.quote !== null) {
    params.set('quote', payload.quote);
  }
  if (payload && Array.isArray(payload.miniBadgeIds)) {
    params.set('miniBadgeIds', payload.miniBadgeIds.join(','));
  }
  params.set('_t', Date.now().toString());

  let saved = false;
  let data = null;

  // 依次尝试若干保存端点，任一 2xx 即认为发起成功
  const saveUrls = [
    '/hof/save?' + params.toString(),
    '/api/save?' + params.toString(),
  ];
  let lastErr = null;
  for (const url of saveUrls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) {
        saved = true;
        data = await tryJson(res);
        break;
      } else {
        lastErr = await buildErr(res);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  // 如果 GET 都没成功，再尝试 POST /api/profile 兜底
  if (!saved) {
    try {
      const body = JSON.stringify({ engName: key, chnName: person.name, ...payload });
      let res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body
      });
      if (res.status === 404) {
        res = await fetch(`/api/profile/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body
        });
      }
      if (res.ok) {
        saved = true;
        data = await tryJson(res);
      } else {
        lastErr = await buildErr(res);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  if (!saved) {
    throw lastErr || new Error('保存失败：无法连接服务器');
  }

  // 统一的"拉取最新记录"工具：依次尝试多种方式，任一成功即可
  // 优先使用 /hof/* 新路径（绕开网关对 /api/* 的改写）
  async function fetchLatest() {
    const urls = [
      `/hof/profile/${encodeURIComponent(key)}?_t=${Date.now()}`,
      `/api/profile/${encodeURIComponent(key)}?_t=${Date.now()}`,
    ];
    for (const u of urls) {
      try {
        const r = await fetch(u, {
          method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store'
        });
        if (r.ok) {
          const j = await tryJson(r);
          if (j && j.engName) return j;
        }
      } catch (_) {}
    }
    // 兜底：从列表里找
    const listUrls = [
      `/hof/profiles?_t=${Date.now()}`,
      `/api/profiles?_t=${Date.now()}`,
    ];
    for (const u of listUrls) {
      try {
        const r = await fetch(u, {
          method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store'
        });
        if (r.ok) {
          const list = await tryJson(r);
          if (Array.isArray(list)) {
            const hit = list.find(it => it && it.engName === key);
            if (hit) return hit;
          }
        }
      } catch (_) {}
    }
    return null;
  }

  // 校验落库：拉取最新记录，比对 payload
  let verified = await fetchLatest();

  if (verified) {
    let mismatch = false;
    if (payload && payload.quote !== undefined && payload.quote !== null) {
      if ((verified.quote || '') !== (payload.quote || '')) mismatch = true;
    }
    if (!mismatch && payload && Array.isArray(payload.miniBadgeIds)) {
      const want = payload.miniBadgeIds.map(String).sort().join(',');
      const got = (Array.isArray(verified.miniBadgeIds) ? verified.miniBadgeIds : [])
        .map(String).sort().join(',');
      if (want !== got) mismatch = true;
    }
    if (mismatch) {
      // 数据库里确有这条记录但内容不匹配：说明保存请求没真的落库
      throw new Error('保存失败：服务器未生效，请稍后重试');
    }
    data = verified;
  } else if (saved) {
    // 保存请求本身 200 了，但两种 GET 都拿不到数据 —— 很可能是整个 /api/* 都被网关改写
    // 这种情况我们选择"乐观信任"：用 payload 构造本地数据，让用户先看到修改效果
    // 但同时写入 localStorage 作为缓存，避免刷新后回退
    data = {
      engName: key,
      chnName: person.name || '',
      quote: (payload && payload.quote !== undefined && payload.quote !== null)
        ? payload.quote
        : (person.quote || ''),
      miniBadgeIds: (payload && Array.isArray(payload.miniBadgeIds))
        ? payload.miniBadgeIds.slice()
        : (Array.isArray(person.miniBadgeIds) ? person.miniBadgeIds.slice() : [])
    };
  } else {
    // 既没 saved 成功，也拉不到数据：确认失败
    throw new Error('保存失败：无法从服务器确认结果，请稍后刷新重试');
  }

  // 写缓存
  const cache = readCache();
  cache[key] = {
    quote: data.quote || '',
    miniBadgeIds: Array.isArray(data.miniBadgeIds) ? data.miniBadgeIds : []
  };
  writeCache(cache);
  return data;
}

// 保存签名（后端 + 内存）
export async function saveQuote(person, quote) {
  await postProfile(person, { quote });
  person.quote = quote;
}

// 保存展示徽章（后端 + 内存）
export async function saveMiniBadges(person, badgeIds) {
  const arr = (badgeIds || []).slice();
  await postProfile(person, { miniBadgeIds: arr });
  person.miniBadgeIds = arr;
}
