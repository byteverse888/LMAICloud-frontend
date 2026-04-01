'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotifications, useUnreadCount, markAsRead, markAllRead } from '@/hooks/use-api'
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { notifications, loading, total, refresh } = useNotifications(page, 20, unreadOnly)
  const { count: unreadCount, refresh: refreshCount } = useUnreadCount()

  const handleMarkRead = async (id: string) => {
    try { await markAsRead(id); refresh(); refreshCount() }
    catch { toast.error('操作失败') }
  }

  const handleMarkAllRead = async () => {
    try { await markAllRead(); refresh(); refreshCount(); toast.success('已全部标记已读') }
    catch { toast.error('操作失败') }
  }

  const typeColors: Record<string, string> = {
    system: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    billing: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    instance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    points: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">消息通知</h1>
        <div className="flex gap-2">
          <Button variant={unreadOnly ? 'default' : 'outline'} size="sm" onClick={() => { setUnreadOnly(!unreadOnly); setPage(1) }}>
            {unreadOnly ? '查看全部' : `未读 (${unreadCount})`}
          </Button>
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-1">
            <CheckCheck className="h-4 w-4" />
            全部已读
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">暂无通知</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n: any) => (
                <div key={n.id} className={`p-4 rounded-lg border ${n.is_read ? 'bg-background' : 'bg-primary/5 border-primary/20'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[n.type] || typeColors.system}`}>
                          {n.type === 'billing' ? '计费' : n.type === 'instance' ? '实例' : n.type === 'points' ? '积分' : '系统'}
                        </span>
                        {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <h3 className="font-medium text-sm">{n.title}</h3>
                      {n.content && <p className="text-sm text-muted-foreground mt-1">{n.content}</p>}
                      <p className="text-xs text-muted-foreground mt-2">{n.created_at ? new Date(n.created_at).toLocaleString('zh-CN') : ''}</p>
                    </div>
                    {!n.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)} className="shrink-0">
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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
