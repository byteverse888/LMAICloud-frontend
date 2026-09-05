'use client'

import { useEffect } from 'react'
import { useUIStore, SIDEBAR_WIDTH_DEFAULT } from '@/stores/ui-store'

/**
 * 小屏（宽度 < 1440px，约 14 英寸及以下笔记本）首次进入时，把侧边栏默认宽度收窄，
 * 给右侧内容区留出更多空间，缓解宽表格导致的横向滚动条。
 *
 * 只在用户「尚未自定义宽度」（仍是默认值）时生效；一旦手动拖拽过就不再干预，尊重用户选择。
 */
const SMALL_SCREEN_BREAKPOINT = 1440
const SMALL_SCREEN_WIDTH = 200

export function useSidebarResponsive() {
  useEffect(() => {
    const state = useUIStore.getState()
    if (
      window.innerWidth < SMALL_SCREEN_BREAKPOINT &&
      state.sidebarWidth === SIDEBAR_WIDTH_DEFAULT
    ) {
      state.setSidebarWidth(SMALL_SCREEN_WIDTH)
    }
  }, [])
}
