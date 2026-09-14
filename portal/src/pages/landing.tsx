import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { BrandMark, CopyBtn, NewsletterFooter } from '@/components/ui'
import { readStoredAff } from '@/lib/format'
import { anthropicPython, openaiPython } from '@/lib/setup-config'
import { resolveApiOrigin, useSite } from '@/lib/site'

import {
  CONTROLS,
  FACTS,
  FAQS,
  FEATURES,
  FLOW,
  ICON,
  PREVIEWS,
  PROMISES,
  PROTOCOLS,
  PROVIDERS,
  STEPS,
  TABS,
  TOOLS,
  TRUST,
  USECASES,
  protocolOrigin,
  sampleText,
  type PreviewArt as PreviewArtKind,
  type Protocol,
} from './landing-data'

/* 7×7 finder-free QR-like pattern for the invite preview. Purely decorative. */
const QR_CELLS = [
  '1111111',
  '1000001',
  '1011101',
  '1010101',
  '1011101',
  '1000001',
  '1111111',
]

function PreviewArt({ kind }: { kind: PreviewArtKind }) {
  if (kind === 'overview') {
    return (
      <div className="pv" aria-hidden>
        <div className="pv-stats">
          <span>
            <small>可用余额</small>
            <i className="pv-line accent" style={{ width: 54 }} />
          </span>
          <span>
            <small>今日消费</small>
            <i className="pv-line" style={{ width: 38 }} />
          </span>
          <span>
            <small>分组倍率</small>
            <i className="pv-line" style={{ width: 28 }} />
          </span>
        </div>
        <div className="pv-bars">
          {[28, 46, 38, 62, 54, 78, 44, 66, 100, 58, 72, 48].map((h, i) => (
            <i key={i} className={h === 100 ? 'max' : undefined} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'keys') {
    return (
      <div className="pv pv-rows" aria-hidden>
        {[
          { name: '笔记本', tail: 'a1b2', pct: 72, tone: 'green' },
          { name: '服务器', tail: '9f3c', pct: 35, tone: 'green' },
          { name: 'CI 流水线', tail: 'e7d0', pct: 8, tone: 'orange' },
        ].map((k) => (
          <div key={k.tail} className="pv-key">
            <b>{k.name}</b>
            <span className="mono-pill">sk-••••…{k.tail}</span>
            <span className={`badge-dot ${k.tone}`} />
            <div className="track">
              <div className="track-bar accent" style={{ width: `${k.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'usage') {
    return (
      <div className="pv pv-rows" aria-hidden>
        {[
          { model: 'claude-…', inW: 64, outW: 26, cache: true },
          { model: 'gpt-…', inW: 44, outW: 40, cache: false },
          { model: 'gemini-…', inW: 30, outW: 18, cache: true },
        ].map((r) => (
          <div key={r.model} className="pv-usage">
            <span className="mono-pill">{r.model}</span>
            <span className="pv-tokens">
              <i className="in" style={{ width: r.inW }} />
              <i className="out" style={{ width: r.outW }} />
            </span>
            {r.cache ? <span className="cache">缓存</span> : <span className="pv-spacer" />}
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'wallet') {
    return (
      <div className="pv pv-wallet" aria-hidden>
        <small>可用余额</small>
        <b className="num">$ ••.••</b>
        <div className="pv-redeem">
          <span className="mono">XXXX-XXXX-XXXX</span>
          <em>兑换</em>
        </div>
      </div>
    )
  }
  if (kind === 'invite') {
    return (
      <div className="pv pv-invite" aria-hidden>
        <div className="pv-qr">
          {QR_CELLS.map((row, y) =>
            row.split('').map((cell, x) => <i key={`${x}-${y}`} className={cell === '1' ? 'on' : undefined} />)
          )}
        </div>
        <div className="pv-invite-meta">
          <small>邀请链接</small>
          <span className="mono-pill">…/register?aff=••••</span>
          <small>已邀请 · 列表可查</small>
        </div>
      </div>
    )
  }
  return (
    <div className="pv pv-setup" aria-hidden>
      <div className="pv-tabs">
        <span className="on">Claude Code</span>
        <span>Codex</span>
        <span>SDK</span>
      </div>
      <div className="pv-code">
        <i style={{ width: '38%' }} className="k" />
        <i style={{ width: '70%' }} className="s" />
        <i style={{ width: '56%' }} className="s" />
        <i style={{ width: '24%' }} />
      </div>
    </div>
  )
}

export function LandingPage() {
  const site = useSite()
  const origin = resolveApiOrigin(site.serverAddress)
  const [tab, setTab] = useState<Protocol>('claude')
  const [savedAff] = useState(() => readStoredAff())
  const [sdk, setSdk] = useState<'openai' | 'anthropic'>('openai')
  const active = TABS.find((t) => t.id === tab) ?? TABS[0]
  const sdkText = sdk === 'openai' ? openaiPython(origin, 'sk-xxxxxx') : anthropicPython(origin, 'sk-xxxxxx')
  // Local builds report v0.0.0; only show a real release tag.
  const version = site.version && site.version !== 'v0.0.0' ? site.version : ''

  useEffect(() => {
    document.title = site.name
  }, [site.name])

  return (
    <div className="landing-shell">
      <a className="skip-nav" href="#landing-main">
        跳到正文
      </a>
      <header className="landing-bar">
        <div className="landing-wrap landing-bar-inner">
          <Link className="brand" to="/" style={{ padding: 0 }}>
            <BrandMark size={28} />
          </Link>
          <nav className="landing-nav-links" aria-label="页面导航">
            <a className="landing-nav-hash" href="#capabilities">
              能力
            </a>
            <a className="landing-nav-hash" href="#setup">
              接入
            </a>
            <a className="landing-nav-hash" href="#portal">
              控制台
            </a>
            <a className="landing-nav-hash" href="#billing">
              计费
            </a>
            <a className="landing-nav-hash" href="#faq">
              问答
            </a>
            {site.docsLink ? (
              <a href={site.docsLink} target="_blank" rel="noreferrer">
                文档
              </a>
            ) : null}
            <Link to="/register">注册</Link>
            <Link className="btn btn-primary btn-sm" to="/sign-in">
              登录
            </Link>
          </nav>
        </div>
      </header>

      <main id="landing-main" className="landing-wrap">
        <section className="landing-hero">
          <div className="landing-copy rise">
            <div className="sub-tag">
              <span className="dot-ping" />
              <span>邀请制网关 · 运行中{version ? ` · ${version}` : ''}</span>
            </div>
            <h1>一个 Key，接入 Claude、GPT、Gemini</h1>
            <p className="landing-lead">
              改 Base URL 就能用。官方价 × 分组倍率，兑换码入账。
              <br />
              对话正文不进门户账本。
            </p>
            <div className="btn-group">
              {savedAff ? (
                <Link className="btn btn-primary btn-lg" to="/register">
                  继续注册
                </Link>
              ) : (
                <Link className="btn btn-primary btn-lg" to="/sign-in">
                  开始使用
                </Link>
              )}
              <Link className="btn btn-ghost btn-lg" to={savedAff ? '/sign-in' : '/register'}>
                {savedAff ? '已有账号' : '用邀请链接注册'}
              </Link>
            </div>
            <ul className="landing-trust" aria-label="要点">
              {TRUST.map((item) => (
                <li key={item}>
                  {ICON.check}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-term rise" style={{ ['--i' as string]: 1 }}>
            <div className="landing-term-bar">
              <span className="landing-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="landing-term-title mono">{active.path}</span>
              <CopyBtn text={sampleText(origin, tab)} label="复制" />
            </div>
            <div className="landing-tabs" role="tablist" aria-label="协议示例">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={tab === item.id ? 'active' : undefined}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <pre className="landing-code">{sampleText(origin, tab)}</pre>
            <div className="landing-term-foot">
              <span className="mono-pill">OpenAI 兼容 /v1</span>
              <span className="mono-pill">Anthropic /v1/messages</span>
              <span className="mono-pill">Gemini /v1beta</span>
              <span className="mono-pill">兑换码充值</span>
            </div>
          </div>
        </section>

        <section className="landing-ticker rise" style={{ ['--i' as string]: 2 }} aria-label="常见上游">
          <p className="landing-ticker-label">常见上游 · 具体以登录后渠道为准</p>
          <ul className="landing-ticker-list">
            {PROVIDERS.map((p) => (
              <li key={p.name} style={{ ['--dot' as string]: p.dot }}>
                {p.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-facts">
          {FACTS.map((fact, i) => (
            <article key={fact.label} className="card static landing-fact rise" style={{ ['--i' as string]: i + 3 }}>
              <div className="landing-fact-top">
                <div className="landing-fact-n num">{fact.value}</div>
                <span className="landing-icon">{ICON[fact.icon]}</span>
              </div>
              <h2>{fact.label}</h2>
              <p>{fact.desc}</p>
            </article>
          ))}
        </section>

        <section className="landing-section" id="flow">
          <header className="landing-section-head rise">
            <p className="landing-kicker">请求怎么走</p>
            <h2>你的工具 → 本站 → 官方上游</h2>
            <p>中间只有一层。网关负责鉴权、记账和转发，不改你的请求内容，也不把正文留下来。</p>
          </header>
          <div className="landing-flow">
            {FLOW.map((node, i) => (
              <Fragment key={node.id}>
                {i > 0 ? (
                  <div className="landing-flow-arrow rise" style={{ ['--i' as string]: i * 2 - 1 }} aria-hidden>
                    {ICON.arrowRight}
                    <span>HTTPS</span>
                  </div>
                ) : null}
                <article
                  className={`card static landing-flow-node rise${node.core ? ' core' : ''}`}
                  style={{ ['--i' as string]: i * 2 }}
                >
                  <div className="landing-flow-head">
                    <span className="landing-icon">{ICON[node.icon]}</span>
                    <span className="stat-label">{node.eyebrow}</span>
                  </div>
                  <h3>{node.title}</h3>
                  <ul>
                    {node.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              </Fragment>
            ))}
          </div>
        </section>

        <section className="landing-section" id="setup">
          <header className="landing-section-head rise">
            <p className="landing-kicker">怎么开始</p>
            <h2>三步接到你正在用的工具</h2>
          </header>
          <div className="landing-steps">
            {STEPS.map((step, i) => (
              <article key={step.n} className="landing-step-item rise" style={{ ['--i' as string]: i + 2 }}>
                <div className="landing-step-n num">{step.n}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="protocols">
          <header className="landing-section-head rise">
            <p className="landing-kicker">协议</p>
            <h2>三个入口，不强迫你全部走 OpenAI 转译</h2>
            <p>工具认哪家协议，就贴哪家的地址。下面是本站对外的根地址，复制后按协议补路径。</p>
          </header>
          <div className="landing-protocol-grid">
            {PROTOCOLS.map((item, i) => (
              <article key={item.id} className="card landing-protocol rise" style={{ ['--i' as string]: i }}>
                <div className="stat-label">{item.name}</div>
                <h3 className="landing-card-h">{item.path}</h3>
                <div className="landing-origin">
                  <code>{protocolOrigin(origin, item.id)}</code>
                  <CopyBtn text={protocolOrigin(origin, item.id)} label="复制" />
                </div>
                <ul>
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="capabilities">
          <header className="landing-section-head rise">
            <p className="landing-kicker">能力</p>
            <h2>登录之后就能直接用的能力</h2>
            <p>模型清单以站长配好的渠道为准，首页不编一份假目录。</p>
          </header>
          <div className="landing-feature-grid">
            {FEATURES.map((item, i) => (
              <article key={item.title} className="card landing-feature rise" style={{ ['--i' as string]: i }}>
                <span className="landing-icon">{ICON[item.icon]}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="portal">
          <header className="landing-section-head rise">
            <p className="landing-kicker">控制台</p>
            <h2>登录之后你会看到什么</h2>
            <p>六个页面，各管一件事。下面是每页的样子和用途，点进去会先要你登录。</p>
          </header>
          <div className="landing-preview-grid">
            {PREVIEWS.map((item, i) => (
              <Link key={item.art} className="card landing-preview rise" to={item.to} style={{ ['--i' as string]: i }}>
                <div className="landing-preview-art">
                  <PreviewArt kind={item.art} />
                </div>
                <div className="landing-preview-body">
                  <div className="landing-preview-title">
                    <span className="landing-icon sm">{ICON[item.icon]}</span>
                    <h3>{item.title}</h3>
                    <span className="landing-preview-go">打开 ›</span>
                  </div>
                  <p>{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="landing-section" id="controls">
          <header className="landing-section-head rise">
            <p className="landing-kicker">密钥</p>
            <h2>每把 key 都能单独管</h2>
            <p>密钥不是一串字符而已。给别人、给脚本、给服务器的 key，都能各自设边界。</p>
          </header>
          <ul className="landing-controls">
            {CONTROLS.map((item, i) => (
              <li key={item.title} className="landing-control rise" style={{ ['--i' as string]: i }}>
                <span className="landing-icon">{ICON[item.icon]}</span>
                <div>
                  <b>{item.title}</b>
                  <p>{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-section landing-split-section">
          <article className="landing-split-item rise" id="tools">
            <div className="stat-label">已写好配置</div>
            <h2 className="landing-card-h">在你已有的工具里直接跑</h2>
            <p>登录后打开「接入」，选一把 key，六种工具都能复制现成片段。下面这些是已经对过的。</p>
            <ul className="landing-tool-list">
              {TOOLS.map((tool) => (
                <li key={tool.name}>
                  <strong>{tool.name}</strong>
                  <span>{tool.hint}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="landing-split-item rise" style={{ ['--i' as string]: 1 }}>
            <div className="stat-label">SDK 一行</div>
            <h2 className="landing-card-h">现有代码只改地址和密钥</h2>
            <div className="landing-tabs" role="tablist" aria-label="SDK 示例">
              <button
                type="button"
                role="tab"
                aria-selected={sdk === 'openai'}
                className={sdk === 'openai' ? 'active' : undefined}
                onClick={() => setSdk('openai')}
              >
                OpenAI
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sdk === 'anthropic'}
                className={sdk === 'anthropic' ? 'active' : undefined}
                onClick={() => setSdk('anthropic')}
              >
                Anthropic
              </button>
            </div>
            <pre className="landing-code landing-code-sdk">{sdkText}</pre>
            <div className="landing-term-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <CopyBtn text={sdkText} label="复制这段" />
            </div>
          </article>
        </section>

        <section className="landing-section" id="who">
          <header className="landing-section-head rise">
            <p className="landing-kicker">适合谁</p>
            <h2>一个人用、一队人用、朋友合用</h2>
          </header>
          <div className="landing-usecase-grid">
            {USECASES.map((item, i) => (
              <article key={item.eyebrow} className="card landing-usecase rise" style={{ ['--i' as string]: i }}>
                <div className="landing-usecase-head">
                  <span className="landing-icon">{ICON[item.icon]}</span>
                  <span className="pill blue">{item.eyebrow}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <ul>
                  {item.points.map((point) => (
                    <li key={point}>
                      {ICON.check}
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-billing" id="billing">
          <header className="landing-section-head rise">
            <p className="landing-kicker">计费</p>
            <h2>官方价 × 分组倍率，兑换码入账</h2>
          </header>
          <div className="card static landing-formula rise">
            <div className="landing-formula-term">
              <b>模型官方公开价</b>
              <small>按 token，上游标多少算多少</small>
            </div>
            <span className="landing-formula-op">×</span>
            <div className="landing-formula-term">
              <b>你所在分组的倍率</b>
              <small>登录后在总览「权限分组」里看</small>
            </div>
            <span className="landing-formula-op">=</span>
            <div className="landing-formula-term result">
              <b>本次实际扣费</b>
              <small>逐笔写进用量页</small>
            </div>
          </div>
          <div className="landing-billing-grid">
            <article className="card rise">
              <div className="stat-label">怎么扣</div>
              <h3 className="landing-card-h">按 token，不按次数</h3>
              <p>额度按上游公开价折美元，再乘你所在分组的倍率。门户不卖月套餐，也没有保底消费。</p>
            </article>
            <article className="card rise" style={{ ['--i' as string]: 1 }}>
              <div className="stat-label">怎么充</div>
              <h3 className="landing-card-h">找人要兑换码</h3>
              <p>不接在线支付。转账给站长或邀请人之后领码，到「钱包」粘进去即到账。</p>
            </article>
            <article className="card rise" style={{ ['--i' as string]: 2 }}>
              <div className="stat-label">记什么</div>
              <h3 className="landing-card-h">模型、token、费用</h3>
              <p>用量页能按时间和类型筛。对话正文和模型回复不进这本账。</p>
            </article>
          </div>
        </section>

        <section className="landing-section" id="promise">
          <header className="landing-section-head rise">
            <p className="landing-kicker">底线</p>
            <h2>四条守住的事</h2>
          </header>
          <ul className="landing-promise">
            {PROMISES.map((item, i) => (
              <li key={item.title} className="card static rise" style={{ ['--i' as string]: i }}>
                <span className="landing-icon green">{ICON[item.icon]}</span>
                <div>
                  <b>{item.title}</b>
                  <p>{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-section" id="faq">
          <header className="landing-section-head rise">
            <p className="landing-kicker">问答</p>
            <h2>注册、计费、安全和工具</h2>
          </header>
          <div className="landing-faq">
            {FAQS.map((item) => (
              <details key={item.q} className="landing-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <NewsletterFooter site={site} />
    </div>
  )
}
