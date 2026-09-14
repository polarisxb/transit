import type { ReactNode } from 'react'

export type Protocol = 'claude' | 'openai' | 'gemini'

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Line icons in the same 24px stroke style as the app sidebar. Color comes from the parent. */
export const ICON = {
  check: (
    <Svg>
      <polyline points="20 6 9 17 4 12" />
    </Svg>
  ),
  layers: (
    <Svg>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </Svg>
  ),
  key: (
    <Svg>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.85 12.15 8.9-8.9M15 8l2.5 2.5" />
    </Svg>
  ),
  ratio: (
    <Svg>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </Svg>
  ),
  eyeOff: (
    <Svg>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </Svg>
  ),
  terminal: (
    <Svg>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </Svg>
  ),
  server: (
    <Svg>
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </Svg>
  ),
  route: (
    <Svg>
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="m4 4 5 5" />
    </Svg>
  ),
  arrowRight: (
    <Svg>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </Svg>
  ),
  gauge: (
    <Svg>
      <path d="M3 14a9 9 0 1 1 18 0" />
      <path d="m12 14 3.5-5" />
      <circle cx="12" cy="14" r="1.5" />
    </Svg>
  ),
  list: (
    <Svg>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </Svg>
  ),
  globe: (
    <Svg>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
    </Svg>
  ),
  clock: (
    <Svg>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  ),
  power: (
    <Svg>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </Svg>
  ),
  laptop: (
    <Svg>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 20h20" />
    </Svg>
  ),
  user: (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  ),
  users: (
    <Svg>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M21 20a6 6 0 0 0-4-5.6" />
    </Svg>
  ),
  heart: (
    <Svg>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </Svg>
  ),
  zap: (
    <Svg>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  ),
  link: (
    <Svg>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Svg>
  ),
  chart: (
    <Svg>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </Svg>
  ),
  wallet: (
    <Svg>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </Svg>
  ),
  invite: (
    <Svg>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0M18 8v6M15 11h6" />
    </Svg>
  ),
  code: (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </Svg>
  ),
  grid: (
    <Svg>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </Svg>
  ),
  lock: (
    <Svg>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  ),
  receipt: (
    <Svg>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </Svg>
  ),
  ban: (
    <Svg>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </Svg>
  ),
  ticket: (
    <Svg>
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7Z" />
      <path d="M13 5v14" />
    </Svg>
  ),
  shield: (
    <Svg>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </Svg>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICON

export const TABS: { id: Protocol; label: string; path: string }[] = [
  { id: 'claude', label: 'Claude', path: 'POST /v1/messages' },
  { id: 'openai', label: 'OpenAI', path: 'POST /v1/chat/completions' },
  { id: 'gemini', label: 'Gemini', path: 'POST /v1beta/models/{model}:generateContent' },
]

export const TRUST = ['邀请制', '按 token 计费', 'SSE 原样转发', '正文不落盘']

export const PROVIDERS: { name: string; dot: string }[] = [
  { name: 'OpenAI', dot: '#10a37f' },
  { name: 'Claude', dot: '#d97757' },
  { name: 'Gemini', dot: '#4285f4' },
  { name: 'DeepSeek', dot: '#4d6bfe' },
  { name: 'Qwen', dot: '#615ced' },
  { name: 'Grok', dot: '#1d1d1f' },
  { name: 'Moonshot', dot: '#16191f' },
  { name: 'Llama', dot: '#0866ff' },
  { name: 'Mistral', dot: '#ff7000' },
  { name: 'MiniMax', dot: '#e8434b' },
]

export const FACTS: { value: string; label: string; desc: string; icon: IconName }[] = [
  { value: '3', label: '原生协议', desc: 'OpenAI、Anthropic、Gemini 各走各的入口，不强迫转译', icon: 'layers' },
  { value: '1', label: '把密钥', desc: '各工具共用一份余额，按环境拆成多把 key', icon: 'key' },
  { value: '×', label: '分组倍率', desc: '官方公开价乘以你所在分组，没有隐藏项', icon: 'ratio' },
  { value: '0', label: '落盘正文', desc: '账本只记模型、token 和费用，不存对话', icon: 'eyeOff' },
]

export const FLOW: { id: string; eyebrow: string; title: string; points: string[]; icon: IconName; core?: boolean }[] = [
  {
    id: 'client',
    eyebrow: '你这边',
    title: '你正在用的工具',
    points: ['Claude Code、Codex CLI', 'Cherry Studio、Cline、Cursor', 'OpenAI / Anthropic SDK'],
    icon: 'terminal',
  },
  {
    id: 'gateway',
    eyebrow: '本站',
    title: '网关做四件事',
    points: ['校验密钥、分组和额度上限', '按官方价 × 倍率记一笔账', '把请求原协议转给上游渠道', 'SSE 事件流原样往下推'],
    icon: 'route',
    core: true,
  },
  {
    id: 'upstream',
    eyebrow: '上游',
    title: '官方 API 渠道',
    points: ['Anthropic、OpenAI、Google 官方', '或 AWS / Vertex / Azure 云渠道', '不接订阅号池和逆向接口'],
    icon: 'server',
  },
]

export const STEPS = [
  { n: '01', title: '打开邀请链接', desc: '朋友从「邀请」页把链接发给你，点开就能注册，没有链接注册页会直接挡住。' },
  { n: '02', title: '建一把密钥', desc: '一台环境一把 key。用超了或泄露了，只停这一把，别的工具不受影响。' },
  { n: '03', title: '把地址贴进工具', desc: 'Claude Code / Codex / Cherry Studio 只换 Base URL 和密钥，协议不用自己拼。' },
]

export const PROTOCOLS: { id: Protocol; name: string; path: string; points: string[] }[] = [
  {
    id: 'claude',
    name: 'Anthropic 原生',
    path: '/v1/messages',
    points: ['Claude Code 直连，不经 OpenAI 转译', 'extended thinking、tool use 按上游原样走', 'Base URL 填站点根地址'],
  },
  {
    id: 'openai',
    name: 'OpenAI 兼容',
    path: '/v1/chat/completions',
    points: ['现有 OpenAI SDK 只改 base_url', 'Codex CLI、Cline、Cursor 都能贴', '也走 /v1/responses'],
  },
  {
    id: 'gemini',
    name: 'Gemini 原生',
    path: '/v1beta/generateContent',
    points: ['generateContent 入口保留', '多模态请求按上游格式转发', '同一把 Key，换模型名即可'],
  },
]

export const FEATURES: { title: string; desc: string; icon: IconName }[] = [
  {
    title: '一套地址，三个协议',
    desc: '客户端只换 Base URL 和密钥。登录后到「接入」页，六种工具能直接复制配置。',
    icon: 'link',
  },
  {
    title: '密钥按环境拆开',
    desc: '笔记本、服务器、CI 各发一把。停用、额度用尽、泄露都只影响这一把。',
    icon: 'key',
  },
  {
    title: '用量按模型和 Key 可查',
    desc: '控制台看消耗、token 和费用。门户账本不写对话正文，也不写响应正文。',
    icon: 'chart',
  },
  {
    title: '官方价 × 分组倍率',
    desc: '额度按上游公开价折美元。门户不卖套餐、不接在线支付，入账只用兑换码。',
    icon: 'ratio',
  },
  {
    title: 'SSE 原样转发',
    desc: '流式输出按上游事件往下推，不在门户里重包一层假流。长任务靠上游和渠道。',
    icon: 'zap',
  },
  {
    title: '邀请制，不对外开放注册',
    desc: '没有站内朋友的邀请链接，注册页过不去。适合小范围团队和熟人共用。',
    icon: 'ticket',
  },
]

export type PreviewArt = 'overview' | 'keys' | 'usage' | 'wallet' | 'invite' | 'setup'

export const PREVIEWS: { to: string; art: PreviewArt; title: string; desc: string; icon: IconName }[] = [
  {
    to: '/',
    art: 'overview',
    title: '总览',
    desc: '余额、今日消费、累计消耗和分组倍率放在一屏；14 天走势和模型占比一眼看完。',
    icon: 'grid',
  },
  {
    to: '/keys',
    art: 'keys',
    title: '密钥',
    desc: '一台环境一把。每把都能设额度上限、模型限制和过期时间，随时停用。',
    icon: 'key',
  },
  {
    to: '/usage',
    art: 'usage',
    title: '用量',
    desc: '逐笔记录按时间和类型筛，标出缓存命中；只有模型、token 和费用。',
    icon: 'chart',
  },
  {
    to: '/wallet',
    art: 'wallet',
    title: '钱包',
    desc: '余额、最近消耗节奏和兑换记录。拿到兑换码粘进去即到账。',
    icon: 'wallet',
  },
  {
    to: '/invite',
    art: 'invite',
    title: '邀请',
    desc: '你的邀请链接和二维码，已邀请的人在列表里；附一段可直接转发的介绍。',
    icon: 'invite',
  },
  {
    to: '/setup',
    art: 'setup',
    title: '接入',
    desc: '选一把 key，六种工具的配置片段已经填好地址，复制就能用；顺手做连通性验证。',
    icon: 'code',
  },
]

export const CONTROLS: { title: string; desc: string; icon: IconName }[] = [
  { title: '额度上限', desc: '给跑脚本或挂机的 key 设一个封顶，烧到就停，不动整体余额。', icon: 'gauge' },
  { title: '模型限制', desc: '只放行指定模型。给别人用的 key 不会误碰贵模型。', icon: 'list' },
  { title: 'IP 白名单', desc: '固定 IP 的服务器可以锁死来源，支持 CIDR 写法。', icon: 'globe' },
  { title: '过期时间', desc: '临时借用的 key 设个到期日，到点自动失效。', icon: 'clock' },
  { title: '随时停用', desc: '泄露就停或删，重建一把成本为零，其他 key 不受影响。', icon: 'power' },
  { title: '一台一把', desc: '按设备拆开发，用量能对到具体机器，出问题单独处理。', icon: 'laptop' },
]

export const USECASES: { eyebrow: string; title: string; desc: string; points: string[]; icon: IconName }[] = [
  {
    eyebrow: '个人开发者',
    title: '一把 key 跑遍常用工具',
    desc: 'Claude Code 写代码、Codex 跑任务、Cherry Studio 聊天，全部指向同一个地址。',
    points: ['三种协议同一份余额', '按 token 扣，没有月费', '用量按模型拆开看'],
    icon: 'user',
  },
  {
    eyebrow: '小团队',
    title: '成员各拿密钥，账目共享',
    desc: '每人一把或每台机器一把，谁用了多少一目了然；停用某一把不影响其他人。',
    points: ['额度上限防脚本失控', '模型限制控成本', 'CI 与本地分开发 key'],
    icon: 'users',
  },
  {
    eyebrow: '朋友合用',
    title: '邀请进来，兑换码结算',
    desc: '你把邀请链接发出去，对方注册、充值、接入全程自助；转账领码，账目清楚。',
    points: ['邀请制，不对外开放', '兑换码到账有记录', '对话正文不进账本'],
    icon: 'heart',
  },
]

export const TOOLS = [
  { name: 'Claude Code', hint: 'ANTHROPIC_BASE_URL + AUTH_TOKEN' },
  { name: 'Codex CLI', hint: 'base_url 指向 /v1' },
  { name: 'Cherry Studio', hint: '自定义供应商，粘站点地址' },
  { name: 'Cline / Cursor', hint: 'OpenAI 兼容端点' },
  { name: 'OpenAI SDK', hint: '改 base_url 和 api_key' },
  { name: 'Anthropic SDK', hint: '改 base_url 和 api_key' },
]

export const PROMISES: { title: string; desc: string; icon: IconName }[] = [
  { title: '只走官方上游', desc: '官方 API Key 或云厂商渠道，不接订阅号池、不接逆向。', icon: 'shield' },
  { title: '不留存对话', desc: '账本只有模型、token 和费用；密钥在库里加密存放。', icon: 'lock' },
  { title: '邀请制小范围', desc: '不公开推广，不挂导航站。谁邀请的谁负责。', icon: 'ticket' },
  { title: '账目说得清', desc: '扣费公式公开，充值走兑换码留痕，用量逐笔可查。', icon: 'receipt' },
]

export const FAQS = [
  {
    q: '这是什么？',
    a: '一层站在你的工具和上游模型之间的网关。一个站点地址、一把 Key，按 OpenAI、Anthropic 或 Gemini 的原协议转发请求，并按 token 扣额度。',
  },
  {
    q: '怎么注册？',
    a: '本站是邀请制。让已经在站里的人打开「邀请」页，把带 aff 的链接发给你。没有链接，注册页会提示「本站仅限邀请注册」。',
  },
  {
    q: '怎么计费？',
    a: '按实际上游消耗的 token 扣额度。公式是「模型官方公开价 × 你所在分组的倍率」。没有月费、没有最低消费。具体单价登录后到「模型」页看，首页不编一份价目表。',
  },
  {
    q: '怎么充值？',
    a: '门户不接支付宝、微信或银行卡。余额不够时找邀请你的人或站长要兑换码，到「钱包」粘进去即到账。',
  },
  {
    q: '能用哪些模型？',
    a: '以站长在后台配好的渠道为准。登录后在「接入」页可以拉一份当前可用的模型清单，也可以直接请求 /v1/models。首页不预先列一份可能过期的目录。',
  },
  {
    q: '支持哪些工具？',
    a: '登录后「接入」页已经写好 Claude Code、Codex CLI、Cherry Studio、Cline / Cursor，以及 OpenAI / Anthropic SDK。只要客户端允许自定义 Base URL，一般都能用。',
  },
  {
    q: 'Key 泄露了怎么办？',
    a: '到「密钥」页把这一把停用或删掉，再新建一把换上。其他密钥和余额都不受影响。给脚本用的 key 建议一开始就设额度上限和模型限制。',
  },
  {
    q: '对话内容会存下来吗？',
    a: '门户账本只记模型名、token 和费用，不落盘 Prompt 和响应正文。密钥在库里加密存放。传输走站点自己的 HTTPS。',
  },
  {
    q: '和官方 API 是什么关系？',
    a: '请求会转到站长配好的上游渠道。模型能不能用、稳不稳，取决于后台渠道，不取决于这张宣传页。新模型也不会在首页先报一份清单。',
  },
]

export function sampleText(origin: string, tab: Protocol): string {
  if (tab === 'claude') {
    return [
      `curl ${origin}/v1/messages \\`,
      '  -H "x-api-key: sk-xxxxxx" \\',
      '  -H "anthropic-version: 2023-06-01" \\',
      "  -d '{",
      '    "model": "your-model",',
      '    "max_tokens": 1024,',
      '    "messages": [{"role":"user","content":"..."}]',
      "  }'",
    ].join('\n')
  }
  if (tab === 'gemini') {
    return [
      `curl ${origin}/v1beta/models/your-model:generateContent \\`,
      '  -H "Authorization: Bearer sk-xxxxxx" \\',
      "  -d '{",
      '    "contents": [{"parts":[{"text":"..."}]}]',
      "  }'",
    ].join('\n')
  }
  return [
    `curl ${origin}/v1/chat/completions \\`,
    '  -H "Authorization: Bearer sk-xxxxxx" \\',
    "  -d '{",
    '    "model": "your-model",',
    '    "messages": [{"role":"user","content":"..."}]',
    "  }'",
  ].join('\n')
}

export function protocolOrigin(origin: string, id: Protocol): string {
  if (id === 'openai') return `${origin}/v1`
  return origin
}
