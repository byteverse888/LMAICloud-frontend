'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePoints, usePointRecords, useDailyCheckin } from '@/hooks/use-api'
import { Star, Gift, Loader2, CalendarCheck, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PointsPage() {
  const { points, loading: pointsLoading, refresh: refreshPoints } = usePoints()
  const [page, setPage] = useState(1)
  const { records, loading, total, refresh: refreshRecords } = usePointRecords(page, 20)
  const { checkin, loading: checkinLoading, checkedInToday } = useDailyCheckin()

  const handleCheckin = async () => {
    try {
      const result = await checkin()
      toast.success(result.message || '签到成功')
      refreshPoints()
      refreshRecords()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '签到失败')
    }
  }

  const typeLabels: Record<string, string> = {
    recharge_reward: '充值奖励',
    daily_login: '每日签到',
    invite_reward: '邀请奖励',
    consume: '积分消费',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">我的积分</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">积分余额</p>
                <p className="text-3xl font-bold mt-1 text-amber-500">{pointsLoading ? '...' : points}</p>
              </div>
              <Star className="h-10 w-10 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">每日签到</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {checkedInToday ? '今日已签到，明天再来吧' : '签到可获得 2 积分'}
                </p>
              </div>
              <Button
                onClick={handleCheckin}
                disabled={checkedInToday || checkinLoading}
                variant={checkedInToday ? 'outline' : 'default'}
                className="gap-2"
              >
                {checkinLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : checkedInToday ? (
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <CalendarCheck className="h-4 w-4" />
                )}
                {checkedInToday ? '已签到' : '立即签到'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4" />
            积分明细
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无积分记录</p>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-4 text-sm font-medium text-muted-foreground border-b pb-2 mb-2">
                <span>时间</span><span>类型</span><span>说明</span><span className="text-right">积分</span>
              </div>
              {records.map((r: any) => (
                <div key={r.id} className="grid grid-cols-4 text-sm py-2 border-b border-border/50">
                  <span className="text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : ''}</span>
                  <span>{typeLabels[r.type] || r.type}</span>
                  <span className="truncate">{r.description}</span>
                  <span className={`text-right font-medium ${r.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {r.points > 0 ? '+' : ''}{r.points}
                  </span>
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
