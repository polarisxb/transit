import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { CopyBtn, Notice, PageHead, QrImage, Spinner } from '@/components/ui'
import { getAffCode, getSelf, transferAffQuota } from '@/lib/api'
import { formatQuota } from '@/lib/format'
import { inviteBlurb } from '@/lib/setup-config'
import { useSite } from '@/lib/site'

export function InvitePage() {
  const site = useSite()
  const qc = useQueryClient()
  const self = useQuery({ queryKey: ['self'], queryFn: getSelf })
  const affQ = useQuery({ queryKey: ['aff'], queryFn: getAffCode })
  const aff = affQ.data || self.data?.aff_code || ''
  const portalOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const link = aff ? `${portalOrigin}/register?aff=${encodeURIComponent(aff)}` : ''
  const blurb = aff ? inviteBlurb(portalOrigin, aff) : ''

  const transfer = useMutation({
    mutationFn: (quota: number) => transferAffQuota(quota),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || '转入没成功。可能是后台还没确认支付合规条款。')
        return
      }
      toast.success('奖励已转入余额')
      qc.invalidateQueries({ queryKey: ['self'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '转入没成功'),
  })

  const count = self.data?.aff_count ?? 0
  const pending = self.data?.aff_quota ?? 0
  const history = self.data?.aff_history_quota ?? 0

  return (
    <div>
      <PageHead
        tag="邀请制 · 链接点开就能注册"
        title="邀请"
        desc="把下面这条链接发给信得过的朋友。对方点开直接填账号，不用再来问你要验证码。"
      />

      <div className="card rise" style={{ ['--i' as string]: 1 }}>
        <div className="card-top" style={{ marginBottom: 14 }}>
          <div>
            <div className="card-title">邀请链接</div>
            <div className="card-desc">
              邀请码 <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>{aff || '…'}</span>
              {' · '}长期有效，微信里直接发就行
            </div>
          </div>
        </div>
        {affQ.isLoading && !aff ? (
          <Spinner />
        ) : (
          <div className="invite-share">
            <QrImage value={link} />
            <div className="invite-share-main">
              <div className="copy-field">
                <span>{link || '正在生成邀请链接…'}</span>
                <CopyBtn text={link} label="复制链接" />
              </div>
              <div className="stat-sub">当面扫右边二维码也可以。谁邀请的谁负责，后台用户列表能对上关系。</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="card rise" style={{ ['--i' as string]: 2 }}>
          <div className="stat-label">已邀请</div>
          <div className="stat-num">{count}</div>
          <div className="stat-sub">
            {count ? `累计奖励 ${formatQuota(history, site.quotaPerUnit)}` : '还没有人通过你的链接注册'}
          </div>
          {pending > 0 && (
            <div className="stat-sub" style={{ marginTop: 10 }}>
              待领奖励{' '}
              <b style={{ color: 'var(--ink)' }} className="mono">
                {formatQuota(pending, site.quotaPerUnit)}
              </b>
              {' · '}
              <button
                type="button"
                className="linkish"
                style={{ color: 'var(--accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                onClick={() => transfer.mutate(pending)}
                disabled={transfer.isPending}
              >
                转入余额
              </button>
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <Notice>上游没有被邀请人名单。要对人，请站长在后台用户列表里看邀请关系。</Notice>
          </div>
        </div>

        <div className="card rise" style={{ ['--i' as string]: 3 }}>
          <div className="card-top" style={{ marginBottom: 12 }}>
            <div>
              <div className="card-title">发给朋友的话</div>
              <div className="card-desc">复制整段，连链接一起发出去</div>
            </div>
            <CopyBtn text={blurb} label="复制这段话" />
          </div>
          <pre className="code-view" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.7 }}>
            {blurb || '先等邀请链接生成。'}
          </pre>
        </div>
      </div>
    </div>
  )
}
