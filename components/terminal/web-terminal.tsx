'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { Button } from '@/components/ui/button'
import { RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebTerminalProps {
  instanceId: string
  token: string
  instanceName?: string
  onClose?: () => void
  className?: string
  /** 自定义 WebSocket 路径前缀，默认 /ws/terminal */
  wsPath?: string
}

export default function WebTerminal({
  instanceId,
  token,
  instanceName,
  onClose,
  className,
  wsPath = '/ws/terminal',
}: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 安全 fit：检查容器最小尺寸 + 验证 proposeDimensions 结果
   * 防止 Dialog 动画期间、容器折叠时 fit 到 0 行/列导致内容消失
   */
  const safeFit = useCallback(() => {
    const el = terminalRef.current
    const addon = fitAddonRef.current
    const term = termRef.current
    if (!addon || !el || !term) return
    if (el.clientWidth < 100 || el.clientHeight < 50) return
    try {
      const dims = addon.proposeDimensions()
      if (!dims || dims.cols < 2 || dims.rows < 2) return
      addon.fit()
    } catch { /* renderer not ready */ }
  }, [])

  const connect = useCallback(() => {
    if (!terminalRef.current) return

    // 等待容器可见（Dialog 动画完成后才有尺寸）
    if (terminalRef.current.offsetWidth === 0 || terminalRef.current.offsetHeight === 0) {
      const retryTimer = setTimeout(() => connect(), 60)
      ;(terminalRef.current as any).__retryTimer = retryTimer
      return
    }

    // 清理旧连接
    if (wsRef.current) { wsRef.current.close() }
    if (termRef.current) { termRef.current.dispose() }

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

    // 等待 xterm 渲染器初始化完毕再进行终端 I/O
    const startTerminal = () => {
      if (!mountedRef.current) return
      try { fitAddon.proposeDimensions() } catch {
        setTimeout(startTerminal, 30)
        return
      }

      safeFit()
      term.writeln('\x1b[33m正在连接终端...\x1b[0m')

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const wsBase = process.env.NEXT_PUBLIC_WS_URL
        || apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
      const wsUrl = `${wsBase}${wsPath}/${instanceId}?token=${token}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        setError(null)
        term.writeln('\x1b[32m终端已连接\x1b[0m')
        term.writeln('')
        try {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
        } catch { /* ignore */ }
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
          term.write(event.data)
        }
      }

      ws.onclose = (event) => {
        if (!mountedRef.current) return
        setConnected(false)
        term.writeln('')
        term.writeln(`\x1b[33m连接已关闭 (code: ${event.code})\x1b[0m`)
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setError('WebSocket 连接失败')
        term.writeln('\x1b[31m连接错误，请检查网络\x1b[0m')
      }

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }))
        }
      })

      term.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }))
        }
      })
    }

    setTimeout(startTerminal, 30)
  }, [instanceId, token, safeFit, wsPath])

  // 窗口 resize
  useEffect(() => {
    const handleResize = () => safeFit()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [safeFit])

  // 初始化连接
  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (terminalRef.current) clearTimeout((terminalRef.current as any).__retryTimer)
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
      if (termRef.current) { termRef.current.dispose(); termRef.current = null }
    }
  }, [connect])

  // ResizeObserver：检测容器尺寸变化，带防抖
  useEffect(() => {
    const el = terminalRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = setTimeout(() => safeFit(), 150)
    })
    ro.observe(el)
    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      ro.disconnect()
    }
  }, [safeFit])

  return (
    <div
      className={cn(
        'flex flex-col bg-[#1e1e1e] rounded-lg overflow-hidden h-[400px]',
        className
      )}
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] border-b border-[#404040]">
        <div className="flex items-center gap-2">
          {instanceName && (
            <>
              <span className="text-sm text-gray-200 font-medium mr-2 max-w-[200px] truncate" title={instanceName}>
                {instanceName}
              </span>
              <div className="w-px h-4 bg-[#505050]" />
            </>
          )}
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
            onClick={() => connect()}
            title="重新连接"
          >
            <RotateCcw className="h-4 w-4" />
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
      <div ref={terminalRef} className="flex-1 min-h-0 p-2" />
    </div>
  )
}
