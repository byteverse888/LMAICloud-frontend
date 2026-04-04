'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuditLog } from '@/hooks/use-api'
import { History, Search, Loader2, Monitor } from 'lucide-react'

function parseDevice(ua: string) {
  if (!ua) return ''
  let browser = '未知'
  let os = '未知'
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  return `${browser} / ${os}`
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const { logs, loading, total } = useAuditLog(page, 20, searchKeyword || undefined)

  const actionLabels: Record<string, string> = {
    create: '创建', delete: '删除', update: '更新', start: '启动', stop: '停止', restart: '重启', login: '登录', login_failed: '登录失败', logout: '登出', register: '注册', recharge: '充值',
  }
  const resourceLabels: Record<string, string> = {
    instance: '实例', openclaw: 'OpenClaw', storage: '存储', image: '镜像', account: '账号', billing: '计费',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">操作日志</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              操作记录
            </CardTitle>
            <div className="flex gap-2">
              <Input placeholder="搜索资源名称..." value={keyword} onChange={e => setKeyword(e.target.value)} className="w-48" onKeyDown={e => { if (e.key === 'Enter') { setSearchKeyword(keyword); setPage(1) } }} />
              <Button variant="outline" size="icon" onClick={() => { setSearchKeyword(keyword); setPage(1) }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无操作记录</p>
          ) : (
            <div>
              <div className="grid grid-cols-6 text-sm font-medium text-muted-foreground border-b pb-2 mb-2">
                <span>时间</span><span>操作</span><span>资源类型</span><span>资源名称</span><span>IP地址</span><span>详情</span>
              </div>
              {logs.map((l: any) => {
                const isAuth = ['login', 'logout', 'register'].includes(l.action)
                return (
                <div key={l.id} className="grid grid-cols-6 text-sm py-2 border-b border-border/50 items-center">
                  <span className="text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleString('zh-CN') : ''}</span>
                  <span>
                    {l.action === 'login' ? (
                      <span className="text-blue-600 dark:text-blue-400">{actionLabels[l.action]}</span>
                    ) : l.action === 'login_failed' ? (
                      <span className="text-red-600 dark:text-red-400">{actionLabels[l.action]}</span>
                    ) : l.action === 'logout' ? (
                      <span className="text-muted-foreground">{actionLabels[l.action]}</span>
                    ) : (
                      <span>{actionLabels[l.action] || l.action}</span>
                    )}
                  </span>
                  <span>{resourceLabels[l.resource_type] || l.resource_type}</span>
                  <span className="truncate">{l.resource_name || '-'}</span>
                  <span className="text-muted-foreground font-mono text-xs">{l.ip_address || '-'}</span>
                  <span className="text-muted-foreground text-xs truncate">
                    {isAuth && l.detail ? (
                      <span className="flex items-center gap-1"><Monitor className="h-3 w-3 shrink-0" />{parseDevice(l.detail)}</span>
                    ) : (
                      l.detail || '-'
                    )}
                  </span>
                </div>
                )
              })}
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
