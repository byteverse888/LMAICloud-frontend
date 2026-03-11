'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'
import { Button } from '@/components/ui/button'
import { Maximize2, Minimize2, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebTerminalProps {
  instanceId: string
  token: string
  onClose?: () => void
  className?: string
  fullscreen?: boolean
}

export default function WebTerminal({
  instanceId,
  token,
  onClose,
  className,
  fullscreen = false,
}: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  
  const [connected, setConnected] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(fullscreen)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(() => {
    if (!terminalRef.current) return

    // 清理旧连接
    if (wsRef.current) {
      wsRef.current.close()
    }
    if (termRef.current) {
      termRef.current.dispose()
    }

    // 创建终端
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
      scrollback: 10000,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(terminalRef.current)

    termRef.current = term
    fitAddonRef.current = fitAddon

    // 延迟 fit，等待 DOM 渲染完成
    requestAnimationFrame(() => {
      try { fitAddon.fit() } catch {}
    })

    term.writeln('\x1b[33m正在连接终端...\x1b[0m')

    // 建立 WebSocket 连接
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    // 优先用 NEXT_PUBLIC_WS_URL，否则从 API URL 推导
    const wsBase = process.env.NEXT_PUBLIC_WS_URL 
      || apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
    const wsUrl = `${wsBase}/ws/terminal/${instanceId}?token=${token}`
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError(null)
      term.writeln('\x1b[32m终端已连接\x1b[0m')
      term.writeln('')
      
      // 发送初始尺寸
      ws.send(JSON.stringify({
        type: 'resize',
        cols: term.cols,
        rows: term.rows,
      }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'output') {
          term.write(data.data)
        } else if (data.type === 'error') {
          term.writeln(`\x1b[31m错误: ${data.data}\x1b[0m`)
        } else if (data.type === 'info') {
          term.writeln(`\x1b[33m${data.data}\x1b[0m`)
        } else if (data.type === 'connected') {
          term.writeln(`\x1b[32m${data.data}\x1b[0m`)
          term.writeln('')
        }
      } catch {
        // 非 JSON 数据直接输出
        term.write(event.data)
      }
    }

    ws.onclose = (event) => {
      setConnected(false)
      term.writeln('')
      term.writeln(`\x1b[33m连接已关闭 (code: ${event.code})\x1b[0m`)
    }

    ws.onerror = () => {
      setError('WebSocket 连接失败')
      term.writeln('\x1b[31m连接错误，请检查网络\x1b[0m')
    }

    // 终端输入
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    // 终端大小变化
    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    })
  }, [instanceId, token])

  // 窗口大小变化时自适应
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        try { fitAddonRef.current.fit() } catch {}
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 初始化连接
  useEffect(() => {
    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (termRef.current) {
        termRef.current.dispose()
      }
    }
  }, [connect])

  // 全屏切换时重新适应
  useEffect(() => {
    setTimeout(() => {
      if (fitAddonRef.current) {
        try { fitAddonRef.current.fit() } catch {}
      }
    }, 150)
  }, [isFullscreen])

  const handleReconnect = () => {
    connect()
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-[#1e1e1e] rounded-lg overflow-hidden',
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[400px]',
        className
      )}
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] border-b border-[#404040]">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              connected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span className="text-sm text-gray-300">
            {connected ? '已连接' : '未连接'}
          </span>
          {error && <span className="text-sm text-red-400 ml-2">{error}</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-[#404040]"
            onClick={handleReconnect}
            title="重新连接"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-[#404040]"
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-white hover:bg-[#404040]"
              onClick={onClose}
              title="关闭"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 终端区域 */}
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  )
}
