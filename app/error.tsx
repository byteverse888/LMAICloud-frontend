'use client'

// 路由级错误边界：任何页面渲染期异常（后端返回结构异常、null.toFixed 等）
// 落到这里而不是白屏。error.tsx 必须是客户端组件
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 上报接入点：后续接 Sentry 时在此上报
    console.error('[页面渲染异常]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-8">
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold">页面渲染出现异常</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {error.message || '请稍后重试，若问题持续存在请联系客服'}
      </p>
      <Button onClick={reset}>
        <RefreshCw className="h-4 w-4 mr-2" />
        重试
      </Button>
    </div>
  )
}
