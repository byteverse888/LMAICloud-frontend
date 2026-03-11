'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Pause, Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogStreamProps {
  instanceId: string
  token: string
  className?: string
  autoScroll?: boolean
}

export default function LogStream({
  instanceId,
  token,
  className,
  autoScroll = true,
}: LogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  
  const [logs, setLogs] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    setLogs([])
    setError(null)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    // 优先用 NEXT_PUBLIC_WS_URL，否则从 API URL 推导
    const wsBase = process.env.NEXT_PUBLIC_WS_URL 
      || apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
    const wsUrl = `${wsBase}/ws/logs/${instanceId}?token=${token}&follow=true`
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError(null)
    }

    ws.onmessage = (event) => {
      if (paused) return
      
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'log') {
          setLogs(prev => [...prev.slice(-500), data.data]) // 保留最后500行
        } else if (data.type === 'error') {
          setError(data.data)
        } else if (data.type === 'connected') {
          setLogs(prev => [...prev, `[系统] ${data.data}`])
        }
      } catch {
        setLogs(prev => [...prev.slice(-500), event.data])
      }
    }

    ws.onclose = () => {
      setConnected(false)
    }

    ws.onerror = () => {
      setError('日志流连接失败')
    }
  }, [instanceId, token, paused])

  useEffect(() => {
    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && !paused && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll, paused])

  const togglePause = () => {
    setPaused(!paused)
  }

  const handleReconnect = () => {
    setPaused(false)
    connect()
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              connected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span className="text-sm text-muted-foreground">
            {connected ? (paused ? '已暂停' : '实时日志') : '未连接'}
          </span>
          {error && <span className="text-sm text-destructive ml-2">{error}</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePause}
            title={paused ? '继续' : '暂停'}
          >
            {paused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReconnect}
            title="重新连接"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            title="清空"
          >
            清空
          </Button>
        </div>
      </div>

      {/* 日志区域 */}
      <div
        ref={containerRef}
        className="bg-black text-green-400 p-4 rounded-b-lg font-mono text-sm h-96 overflow-auto"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 flex items-center gap-2">
            {connected ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                等待日志...
              </>
            ) : (
              '暂无日志'
            )}
          </div>
        ) : (
          logs.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
