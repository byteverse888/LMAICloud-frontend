'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useReferralInfo, useReferralRecords } from '@/hooks/use-api'
import { Copy, Share2, Users, Loader2, Gift } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReferralPage() {
  const { info, loading: infoLoading } = useReferralInfo()
  const [page, setPage] = useState(1)
  const { records, loading, total } = useReferralRecords(page, 20)

  const copyInviteLink = async () => {
    if (!info) return
    const link = `${window.location.origin}${info.invite_link}`
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link)
      } else {
        const ta = document.createElement('textarea')
        ta.value = link
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast.success('邀请链接已复制')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">推广中心</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">我的邀请码</p>
                <p className="text-2xl font-bold mt-1 font-mono">{infoLoading ? '...' : info?.invite_code || '-'}</p>
              </div>
              <Share2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已邀请人数</p>
                <p className="text-2xl font-bold mt-1">{info?.invited_count || 0}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">每次邀请奖励</p>
                <p className="text-2xl font-bold mt-1 text-amber-500">{info?.points_per_invite || 50} 积分</p>
              </div>
              <Gift className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">邀请链接</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={info ? `${typeof window !== 'undefined' ? window.location.origin : ''}${info.invite_link}` : ''} className="font-mono text-sm" />
            <Button onClick={copyInviteLink} className="gap-2 shrink-0">
              <Copy className="h-4 w-4" />
              复制链接
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">分享此链接给好友，好友注册后您将获得 50 积分奖励</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">邀请记录</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无邀请记录</p>
          ) : (
            <div>
              <div className="grid grid-cols-3 text-sm font-medium text-muted-foreground border-b pb-2 mb-2">
                <span>用户邮箱</span><span>注册时间</span><span className="text-right">奖励积分</span>
              </div>
              {records.map((r: any, i: number) => (
                <div key={i} className="grid grid-cols-3 text-sm py-2 border-b border-border/50">
                  <span>{r.user_email}</span>
                  <span className="text-muted-foreground">{r.registered_at ? new Date(r.registered_at).toLocaleString('zh-CN') : ''}</span>
                  <span className="text-right text-green-500 font-medium">+{r.reward_points}</span>
                </div>
              ))}
            </div>
          )}
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="text-sm text-muted-foreground leading-8">第 {page} 页</span>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
