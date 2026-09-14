
import { Link } from 'react-router'

import { PORTAL_NAME, type Site } from '@/lib/site'

export const NEW_API_REPO = 'https://github.com/QuantumNous/new-api'

interface NewsletterFooterProps {
  site?: Partial<Site>
  className?: string
}

export function NewsletterFooter({ site, className }: NewsletterFooterProps) {


  const name = site?.name || PORTAL_NAME
  const docsLink = site?.docsLink || ''
  const version = site?.version || ''

  return (
    <footer className={`footer-band ${className || ''}`.trim()}>
      <div className="footer-band-inner">
        {/* 1. CTA 区块 */}
        <section className="footer-cta">
          <h2 className="footer-cta-title">准备好接入了吗？</h2>
          <p className="footer-cta-desc">
            拿到邀请链接就能注册。登录后建密钥、复制配置，贴进你正在用的工具。
          </p>
          <div className="btn-group" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary btn-lg" to="/sign-in">
              进入控制台
            </Link>
            <Link className="btn btn-ghost btn-lg" to="/register">
              获取邀请链接
            </Link>
          </div>
        </section>

        {/* 2. 发丝分隔线 */}
        <div className="footer-band-divider" />

        {/* 3. 紧凑真实功能导航 */}
        <div className="footer-band-nav">
          <div className="footer-band-col">
            <h4>网关功能</h4>
            <ul>
              <li>
                <Link to="/setup">客户端接入配置</Link>
              </li>
              <li>
                <Link to="/usage">用量与消耗记录</Link>
              </li>
              <li>
                <Link to="/wallet">余额与额度说明</Link>
              </li>
              <li>
                <Link to="/keys">API 密钥管理</Link>
              </li>
            </ul>
          </div>

          <div className="footer-band-col">
            <h4>协议规范</h4>
            <ul>
              <li>
                <a href="#protocols">OpenAI /v1 兼容</a>
              </li>
              <li>
                <a href="#protocols">Anthropic Messages</a>
              </li>
              <li>
                <a href="#protocols">Gemini Content API</a>
              </li>
              <li>
                <a href="#capabilities">SSE 流式原样转发</a>
              </li>
            </ul>
          </div>

          <div className="footer-band-col">
            <h4>平台与开源</h4>
            <ul>
              {docsLink ? (
                <li>
                  <a href={docsLink} target="_blank" rel="noreferrer">
                    官方文档
                  </a>
                </li>
              ) : null}
              <li>
                <a href="#faq">常见问题</a>
              </li>
              <li>
                <a href="#billing">计费说明</a>
              </li>
              <li>
                <Link to="/register">邀请制注册</Link>
              </li>
              <li>
                <Link to="/sign-in">控制台登录</Link>
              </li>
              <li>
                <a href={NEW_API_REPO} target="_blank" rel="noreferrer">
                  基于 New API 开源核心
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 4. 底部发丝分隔线 */}
        <div className="footer-band-divider" />

        {/* 5. 底部版权与关于 */}
        <div className="footer-band-bottom">
          <span>
            © {new Date().getFullYear()} {name} · 基于{' '}
            <a href={NEW_API_REPO} target="_blank" rel="noreferrer">
              New API
            </a>{' '}
            二次开发
            {version ? ` · ${version}` : ''}
          </span>

          <div className="footer-band-links">
            <a
              href={NEW_API_REPO}
              target="_blank"
              rel="noreferrer"
              className="footer-band-github"
              aria-label="GitHub Repository"
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
