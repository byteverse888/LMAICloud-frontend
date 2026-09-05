'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react'
import { useUIStore } from '@/stores/ui-store'

/**
 * 侧边栏拖拽调宽。返回绑定到分割线 handle 的鼠标 / 触摸事件处理器。
 *
 * 拖拽过程中：
 * - 实时把 store.sidebarWidth 更新为「起始宽度 + 水平位移」（store 内部 clamp 到 [MIN, MAX]）；
 * - 置 isResizing=true，供侧边栏禁用宽度过渡动画，保证拖拽跟手；
 * - 锁定 body 的 col-resize 光标并禁止文本选中，避免拖动时误选页面文字。
 * 松手（mouseup / touchend）即解绑全局监听并复原 body 样式。
 */
export function useSidebarResize() {
  // 用 ref 记录拖拽起点，避免闭包读到陈旧值
  const startRef = useRef({ x: 0, width: 0 })

  const cleanup = useCallback(() => {
    useUIStore.getState().setResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const start = useCallback(
    (clientX: number) => {
      startRef.current = { x: clientX, width: useUIStore.getState().sidebarWidth }
      useUIStore.getState().setResizing(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (x: number) => {
        const { x: startX, width } = startRef.current
        useUIStore.getState().setSidebarWidth(width + (x - startX))
      }
      const mouseMove = (e: MouseEvent) => onMove(e.clientX)
      const touchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) onMove(e.touches[0].clientX)
      }
      const end = () => {
        document.removeEventListener('mousemove', mouseMove)
        document.removeEventListener('mouseup', end)
        document.removeEventListener('touchmove', touchMove)
        document.removeEventListener('touchend', end)
        cleanup()
      }

      document.addEventListener('mousemove', mouseMove)
      document.addEventListener('mouseup', end)
      document.addEventListener('touchmove', touchMove)
      document.addEventListener('touchend', end)
    },
    [cleanup]
  )

  // 卸载兜底：复原可能残留的全局样式（监听已在 end 里解绑）
  useEffect(() => cleanup, [cleanup])

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault()
      start(e.clientX)
    },
    [start]
  )

  const handleTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (e.touches.length === 1) start(e.touches[0].clientX)
    },
    [start]
  )

  return { handleMouseDown, handleTouchStart }
}
