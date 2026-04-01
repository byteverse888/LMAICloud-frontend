'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuditLog } from '@/hooks/use-api'
import { History, Search, Loader2 } from 'lucide-react'

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const { logs, loading, total } = useAuditLog(page, 20, searchKeyword || undefined)

  const actionLabels: Record<string, string> = {
    create: '创建', delete: '删除', update: '更新', start: '启动', stop: '停止', restart: '重启', login: '登录', recharge: '充值',
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
              <div className="grid grid-cols-5 text-sm font-medium text-muted-foreground border-b pb-2 mb-2">
                <span>时间</span><span>操作</span><span>资源类型</span><span>资源名称</span><span>IP地址</span>
              </div>
              {logs.map((l: any) => (
                <div key={l.id} className="grid grid-cols-5 text-sm py-2 border-b border-border/50">
                  <span className="text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleString('zh-CN') : ''}</span>
                  <span>{actionLabels[l.action] || l.action}</span>
                  <span>{resourceLabels[l.resource_type] || l.resource_type}</span>
                  <span className="truncate">{l.resource_name || '-'}</span>
                  <span className="text-muted-foreground">{l.ip_address || '-'}</span>
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
