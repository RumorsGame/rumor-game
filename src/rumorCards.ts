import type { RumorCard } from "./types.js";

export const RUMOR_CARDS: RumorCard[] = [
  {
    id: "R-01",
    title: "挤兑风险",
    rumor_text: `凌晨时分，多个社群同时传出消息：核心平台储备金严重不足，可能重演历史上最严重的交易所崩盘事件。社交媒体上有用户发帖称"差点发生银行挤兑"，并将凌晨短暂的提款延迟截图作为"铁证"广泛传播。部分KOL开始呼吁"先提再说"，恐慌情绪从加密圈蔓延到传统金融论坛。尽管平台随后发布储备证明显示资产超额覆盖，但"截图已经传开了"——真相的传播速度永远追不上恐惧。`,
    shock: 12,
    credibility: 0.55,
    focus: ["liquidity", "trust"],
  },
  {
    id: "R-02",
    title: "巨鲸抛售",
    rumor_text: `链上监控账号突然发出警报：平台关联钱包在过去6小时内转出超过1.2万枚BTC至多个未知地址。消息迅速被解读为"内部人员正在抛售"，有分析师在直播中称"这是上次闪崩的翻版，平台要为市场崩盘负责"。社交媒体上开始流传一张据称是内部交易记录的截图，显示连续三天的大额卖单。平台创始人随后怒怼称这是"富有想象力的FUD"和AI生成的假截图，但链上那笔真实的转账记录仍然悬在每个人心头。`,
    shock: 10,
    credibility: 0.45,
    focus: ["panic", "rumor"],
  },
  {
    id: "R-03",
    title: "资金流出截图",
    rumor_text: `一组精心制作的数据截图在加密社群中病毒式传播：声称过去一周平台净流出超过80亿美元，用户提币潮导致热钱包余额降至历史低位。更有人晒出一封据称来自平台的"法律威胁信"，暗示平台正在试图封口。虽然第三方数据平台显示资金流向基本稳定，但这些截图已经被转发了上万次。有人评论说："就算是假的，这么多人信了，它就变成真的了。"——这正是自证预言的开始。`,
    shock: 11,
    credibility: 0.60,
    focus: ["trust", "liquidity"],
  },
  {
    id: "R-04",
    title: "AI批量攻击",
    rumor_text: `安全研究员发现，过去48小时内社交平台上出现了超过2000个新注册账号，集中发布针对平台的负面内容，文风高度相似，疑似由大语言模型批量生成。这些帖子精准覆盖了"储备不足""内部腐败""监管调查"等关键词，形成了一场有组织的信息战。平台联合创始人发文称这是"有组织、AI辅助的抹黑行动"，导致市场恐慌指数跌至冰点。讽刺的是，当人们开始讨论"AI制造的FUD"时，这个话题本身又成了新一轮恐慌的燃料。`,
    shock: 8,
    credibility: 0.50,
    focus: ["rumor", "trust"],
  },
  {
    id: "R-05",
    title: "监管压力升级",
    rumor_text: `匿名消息源向多家财经媒体透露：某主要经济体的金融监管机构正在准备对平台发起正式调查，涉及反洗钱合规和用户资金隔离问题。消息传出后，平台代币一小时内下跌4.7%。虽然平台官方声明称"未收到任何正式通知"，但市场注意到其法务团队近期密集招聘，招聘网站上出现了十几个新的合规岗位。一位前监管官员在采访中说了一句意味深长的话："没有调查的时候，不需要否认调查。"这句话被截图传播了十万次。`,
    shock: 13,
    credibility: 0.50,
    focus: ["trust", "panic"],
  },
  {
    id: "R-06",
    title: "核心人物动向异常",
    rumor_text: `平台创始人已经连续72小时没有在社交媒体上发言——这在他平均每天发帖5条的习惯中极为罕见。与此同时，有人在某国际机场拍到一张模糊的照片，声称是其本人携带多个行李箱。照片真假难辨，但"创始人跑路"的标签已经登上了多个地区的热搜。内部员工匿名爆料称"公司气氛很紧张，高管们在开闭门会议"。36小时后创始人终于发帖："度假回来了，FUD还在？"但沉默期间造成的信任裂痕已经难以完全修复。`,
    shock: 9,
    credibility: 0.40,
    focus: ["rumor", "panic"],
  },
  {
    id: "R-07",
    title: "SAFU资金变动",
    rumor_text: `链上数据显示，平台安全资产基金在过去24小时内进行了大规模资产结构调整：将约40%的BTC持仓转换为稳定币，同时向三个新地址转入了大额资金。乐观者解读为"正常的资产再平衡和加仓操作"，悲观者则认为这是"准备应对大规模提款的紧急措施"。平台随后宣布安全基金继续加仓BTC作为信心背书，但一个细节被敏锐的观察者捕捉到：加仓的数量远小于之前转出的数量。这个差额去了哪里？没有人给出答案。`,
    shock: 7,
    credibility: 0.35,
    focus: ["trust"],
  },
  {
    id: "R-08",
    title: "网络拥堵放大",
    rumor_text: `下午时分，平台API响应时间突然从平均200ms飙升至2.5秒，部分用户报告提款请求卡在"处理中"状态超过30分钟。一位拥有大量粉丝的交易员录屏发帖："提不出来了，大家自己看着办。"视频在一小时内播放量突破百万。实际上这只是一次常规的系统维护导致的短暂拥堵，但在当前的恐慌氛围下，每一个技术故障都被解读为"崩盘前兆"。当平台恢复正常时，已经有数千人完成了恐慌性提款——而这些提款本身又加剧了系统负载，形成了一个完美的恶性循环。`,
    shock: 11,
    credibility: 0.65,
    focus: ["load", "panic"],
  },
];

// Story Mode: R-04 → R-02 → R-01 → R-03 → R-05 → R-08
export const STORY_ORDER: string[] = ["R-04", "R-02", "R-01", "R-03", "R-05", "R-08"];

const cardMap = new Map(RUMOR_CARDS.map((c) => [c.id, c]));

export function getCardById(id: string): RumorCard {
  const card = cardMap.get(id);
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}

export function drawCard(mode: "story" | "chaos", roundIndex: number, seed?: number): RumorCard {
  if (mode === "story") {
    if (roundIndex < 0 || roundIndex >= STORY_ORDER.length) {
      throw new Error(`Story mode only has ${STORY_ORDER.length} rounds`);
    }
    return getCardById(STORY_ORDER[roundIndex]);
  }
  // chaos: simple seeded random
  const idx = seed !== undefined
    ? Math.abs(seed + roundIndex * 7) % RUMOR_CARDS.length
    : Math.floor(Math.random() * RUMOR_CARDS.length);
  return RUMOR_CARDS[idx];
}
