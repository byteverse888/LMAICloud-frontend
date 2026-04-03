'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Share2, Users, Coins, Loader2, RefreshCw, Search, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAdminReferralStats, useAdminReferralRecords } from '@/hooks/use-api'

export default function AdminReferralPage() {
  const { stats, loading: statsLoading, refresh: refreshStats } = useAdminReferralStats()
  const [page, setPage] = useState(1)
  const [emailFilter, setEmailFilter] = useState('')
  const { records, loading, total, refresh } = useAdminReferralRecords(page, 20, emailFilter || undefined)

  const totalPages = Math.ceil(total / 20)

  const statCards = [
    {
      title: '邀请总人数',
      value: stats?.total_invited ?? 0,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: '参与推广用户',
      value: stats?.total_referrers ?? 0,
      icon: Share2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: '总奖励积分',
      value: stats?.total_reward_points ?? 0,
      icon: Coins,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ]

  const handleRefresh = () => {
    refreshStats()
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Share2 className="h-6 w-6 text-primary" />
          推广管理
        </h1>
        <Button variant="outline" onClick={handleRefresh} disabled={loading || statsLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${(loading || statsLoading) ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="text-3xl font-bold mt-1">
                      {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : item.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 搜索筛选 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索邀请人邮箱..."
            className="pl-9"
            value={emailFilter}
            onChange={(e) => { setEmailFilter(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {/* 记录列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邀请人</TableHead>
                <TableHead>被邀请人</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>奖励积分</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    暂无推广记录
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r: any, idx: number) => (
                  <TableRow key={r.id || idx}>
                    <TableCell className="text-sm">{r.referrer_email || '--'}</TableCell>
                    <TableCell className="text-sm">{r.invited_user_email || '--'}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {r.invited_at ? new Date(r.invited_at).toLocaleString('zh-CN') : '--'}
                    </TableCell>
                    <TableCell>
                      {r.verified ? (
                        <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />已激活</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />未激活</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={r.verified ? 'text-amber-500 font-medium' : 'text-muted-foreground'}>
                        {r.verified ? `+${r.reward_points ?? 0}` : '待激活'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 py-4 border-t">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="text-sm text-muted-foreground leading-8">第 {page} / {totalPages} 页</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
