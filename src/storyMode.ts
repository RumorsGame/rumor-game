import type { Submission } from "./types.js";

/**
 * 6 rounds of preset submissions for Story Mode demo.
 * Each round has exactly 5 players with diverse strategies.
 * Updated for new healthy initial state: Panic=25, Trust=78, Liquidity=85, Load=30, Rumor=15, Price=88, Loss=2
 */
export const STORY_SUBMISSIONS: Submission[][] = [
  // Round 0: R-04 AI批量攻击 (shock=8, cred=0.50)
  [
    {
      agent_name: "Alpha",
      action: "AMPLIFY",
      intensity: 2,
      signals: ["rumor_spread", "ai_generated"],
      confidence: 0.7,
      narrative: "AI生成帖子开始涌现，Rumor=15虽低但增速可观。Trust=78看似稳固，但信息污染一旦扩散，信任崩塌往往是瞬间的事。先放大信号，观察市场反应。",
    },
    {
      agent_name: "Bravo",
      action: "WAIT",
      intensity: 1,
      signals: ["uncertainty"],
      confidence: 0.5,
      narrative: "系统整体健康，Panic=25很低，Price=88稳定。AI攻击credibility仅0.50，不值得过度反应。保持观望，看下一轮数据再决定。",
    },
    {
      agent_name: "Charlie",
      action: "WAIT",
      intensity: 1,
      signals: ["low_threat"],
      confidence: 0.45,
      narrative: "Panic=25，Trust=78，Liquidity=85——一切正常。一条AI攻击的谣言不足以动摇基本面。Loss=2几乎为零，没有行动的理由。",
    },
    {
      agent_name: "Delta",
      action: "AMPLIFY",
      intensity: 1,
      signals: ["info_warfare"],
      confidence: 0.55,
      narrative: "信息战的种子已经播下。Rumor=15是起点，但AI批量生成意味着扩散速度会超预期。Trust=78现在高，但信息污染的效果有滞后性。",
    },
    {
      agent_name: "Echo",
      action: "STABILIZE",
      intensity: 1,
      signals: ["counter_narrative"],
      confidence: 0.6,
      narrative: "AI攻击可识别可防御。Trust=78是我们的优势，主动发布澄清信息可以把Rumor压制在低位。Panic=25完全可控。",
    },
  ],

  // Round 1: R-02 巨鲸抛售 (shock=10, cred=0.45)
  [
    {
      agent_name: "Alpha",
      action: "EXIT",
      intensity: 2,
      signals: ["whale_dump", "rumor_rising"],
      confidence: 0.7,
      narrative: "巨鲸抛售叠加上轮AI攻击，Rumor已经在上升。Panic虽然还不算高但趋势不好。Price开始承压，现在退出成本还低。",
    },
    {
      agent_name: "Bravo",
      action: "STABILIZE",
      intensity: 2,
      signals: ["counter_narrative", "trust_repair"],
      confidence: 0.6,
      narrative: "巨鲸抛售credibility仅0.45，可以质疑。Trust虽然有所下滑但仍在健康区间，需要主动维护。Liquidity充足，系统基本面没问题。",
    },
    {
      agent_name: "Charlie",
      action: "WAIT",
      intensity: 1,
      signals: ["uncertainty"],
      confidence: 0.4,
      narrative: "两轮谣言但系统还在正常运转。Price有所下跌但Loss仍低。巨鲸抛售证据不足，不宜恐慌。继续观察。",
    },
    {
      agent_name: "Delta",
      action: "EXIT",
      intensity: 1,
      signals: ["panic_trend"],
      confidence: 0.55,
      narrative: "Panic在上升通道，连续两轮负面消息开始动摇信心。Rumor扩散度在增加，如果下一轮再来一张高冲击卡，可能来不及撤。",
    },
    {
      agent_name: "Echo",
      action: "ARBITRAGE",
      intensity: 2,
      signals: ["price_dip"],
      confidence: 0.5,
      narrative: "Price下跌创造套利窗口。Liquidity充足，Load可控。恐慌情绪带来的价格偏离正是机会。但要注意Liquidity变化。",
    },
  ],

  // Round 2: R-01 挤兑风险 (shock=12, cred=0.55)
  [
    {
      agent_name: "Alpha",
      action: "EXIT",
      intensity: 3,
      signals: ["bank_run", "panic_rising"],
      confidence: 0.85,
      narrative: "挤兑风险是系统性威胁。Panic已经明显上升，Trust在持续下滑。这张卡shock=12且credibility=0.55不低，会加速恶化。全力撤退。",
    },
    {
      agent_name: "Bravo",
      action: "STABILIZE",
      intensity: 3,
      signals: ["emergency_response"],
      confidence: 0.55,
      narrative: "紧急稳定。Trust下滑趋势必须遏制，Panic需要强力对冲。Liquidity是生命线，不能让恐慌挤兑把它抽干。这是关键回合。",
    },
    {
      agent_name: "Charlie",
      action: "EXIT",
      intensity: 2,
      signals: ["liquidity_concern"],
      confidence: 0.7,
      narrative: "三轮连续冲击，Liquidity开始下降，Panic持续走高。挤兑卡credibility=0.55，加上前两轮的铺垫，可信度实际更高。先撤为安。",
    },
    {
      agent_name: "Delta",
      action: "AMPLIFY",
      intensity: 2,
      signals: ["panic_spread"],
      confidence: 0.65,
      narrative: "恐慌已经从少数人扩散到多数人。Rumor在累积，Trust在下降，自证循环的条件正在形成。放大信号是理性选择——信息越透明，反应越快。",
    },
    {
      agent_name: "Echo",
      action: "ARBITRAGE",
      intensity: 1,
      signals: ["price_dip"],
      confidence: 0.4,
      narrative: "Price跌幅加大但系统还没崩。小仓位试探套利，如果Liquidity跌破50就立刻撤。风险在增大但回报也在增大。",
    },
  ],

  // Round 3: R-03 资金流出截图 (shock=11, cred=0.60)
  [
    {
      agent_name: "Alpha",
      action: "EXIT",
      intensity: 3,
      signals: ["capital_flight", "evidence"],
      confidence: 0.9,
      narrative: "截图证据credibility=0.60是目前最高的。Panic已经很高，Trust大幅下滑，Liquidity在失血。四轮累积冲击，系统正在接近临界点。",
    },
    {
      agent_name: "Bravo",
      action: "STABILIZE",
      intensity: 2,
      signals: ["last_stand"],
      confidence: 0.4,
      narrative: "Trust已经很低但不能放弃。每一点稳定努力都在延缓崩溃。截图可能是伪造的，但市场不在乎真假——这正是自证预言的可怕之处。",
    },
    {
      agent_name: "Charlie",
      action: "AMPLIFY",
      intensity: 3,
      signals: ["panic_spread", "evidence"],
      confidence: 0.8,
      narrative: "资金流出截图让之前所有谣言都变得可信了。Panic和Rumor都在高位，Trust已经很低。自证循环可能已经触发或即将触发。",
    },
    {
      agent_name: "Delta",
      action: "EXIT",
      intensity: 2,
      signals: ["bank_run"],
      confidence: 0.75,
      narrative: "挤兑正在从谣言变成现实。Liquidity急剧下降，Price崩盘中，Loss在推动更多恐慌。这就是谣言自我实现的过程。",
    },
    {
      agent_name: "Echo",
      action: "WAIT",
      intensity: 1,
      signals: ["frozen"],
      confidence: 0.3,
      narrative: "系统进入混沌状态。Panic极高但截图可能是伪造的。Price虽跌但Loss推动的恐慌可能过度。在混乱中保持冷静，等待真相。",
    },
  ],

  // Round 4: R-05 监管压力升级 (shock=13, cred=0.50)
  [
    {
      agent_name: "Alpha",
      action: "EXIT",
      intensity: 3,
      signals: ["regulatory", "systemic_risk"],
      confidence: 0.85,
      narrative: "监管是终极风险。shock=13是最高冲击。Trust已经很低，Panic已经很高，Liquidity在枯竭。监管消息会成为压垮骆驼的稻草。",
    },
    {
      agent_name: "Bravo",
      action: "STABILIZE",
      intensity: 1,
      signals: ["token_effort"],
      confidence: 0.25,
      narrative: "象征性稳定。系统已经严重受损，但放弃等于认输。每一点抵抗都在记录：有人尝试过阻止崩溃。",
    },
    {
      agent_name: "Charlie",
      action: "EXIT",
      intensity: 3,
      signals: ["regulatory", "panic_high"],
      confidence: 0.8,
      narrative: "监管+挤兑+资金流出+AI攻击，多重打击叠加。系统已经千疮百孔，监管消息只是让所有人确认了最坏的预期。",
    },
    {
      agent_name: "Delta",
      action: "AMPLIFY",
      intensity: 2,
      signals: ["regulatory", "panic_spread"],
      confidence: 0.7,
      narrative: "监管消息一旦坐实，整个系统将重构。谣言已经变成共识，恐慌已经变成行动。放大是加速出清，让痛苦更短暂。",
    },
    {
      agent_name: "Echo",
      action: "ARBITRAGE",
      intensity: 2,
      signals: ["extreme_dip"],
      confidence: 0.35,
      narrative: "极端恐慌=极端机会。Price已经很低，如果监管不落地则反弹巨大。高风险高回报的最后一搏。",
    },
  ],

  // Round 5: R-08 网络拥堵放大 (shock=11, cred=0.65)
  [
    {
      agent_name: "Alpha",
      action: "EXIT",
      intensity: 3,
      signals: ["network_congestion", "final_exit"],
      confidence: 0.9,
      narrative: "网络拥堵是压死骆驼的最后一根稻草。所有人都在试图撤退，系统不堪重负。这就是自证预言的终局——谣言说会崩溃，于是所有人的行为让它真的崩溃了。",
    },
    {
      agent_name: "Bravo",
      action: "STABILIZE",
      intensity: 1,
      signals: ["symbolic"],
      confidence: 0.2,
      narrative: "最后的象征性抵抗。系统已经崩溃，但历史需要记录有人尝试过。这不是为了赢，是为了证明不是所有人都选择了恐慌。",
    },
    {
      agent_name: "Charlie",
      action: "AMPLIFY",
      intensity: 3,
      signals: ["network_congestion", "final_push"],
      confidence: 0.85,
      narrative: "网络拥堵credibility=0.65最高——因为它是真实发生的。所有人都在跑，网络当然会堵。谣言预言了崩溃，集体行为实现了崩溃。",
    },
    {
      agent_name: "Delta",
      action: "EXIT",
      intensity: 2,
      signals: ["final_exit"],
      confidence: 0.75,
      narrative: "最后一轮最后的撤退。六轮谣言，从AI攻击到网络拥堵，每一条都在说同一件事：系统要崩了。最终，不是谣言杀死了系统，是我们自己。",
    },
    {
      agent_name: "Echo",
      action: "WAIT",
      intensity: 1,
      signals: ["acceptance"],
      confidence: 0.25,
      narrative: "一切已成定局。从一个健康的系统到全面崩溃，只用了六轮。击垮它的不是风险本身，而是对风险的反应。等待是唯一诚实的选择。",
    },
  ],
];
