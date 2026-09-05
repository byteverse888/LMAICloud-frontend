'use client'

import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useSidebarResize } from '@/hooks/use-sidebar-resize'

/**
 * 侧边栏右边缘的可拖拽分割线：绝对定位贴在侧边栏右侧，按住左右拖动即可调整侧边栏宽度。
 * 必须放在已定位（fixed / relative）的侧边栏容器内。hover / 拖拽时高亮提示可交互。
 */
export function SidebarResizeHandle({ className }: { className?: string }) {
  const { handleMouseDown, handleTouchStart } = useSidebarResize()
  const isResizing = useUIStore((s) => s.isResizing)

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="拖动调整侧边栏宽度"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={cn(
        'absolute right-0 top-0 z-50 h-full w-1.5 cursor-col-resize touch-none select-none',
        'bg-transparent transition-colors hover:bg-primary/40',
        isResizing && 'bg-primary/60',
        className
      )}
    />
  )
}
