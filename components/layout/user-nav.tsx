'use client'

import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Copy, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export function UserNav() {
  const t = useTranslations('auth')
  const { user, isAuthenticated, logout } = useAuthStore()

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="outline" size="sm">
            {t('login')}
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm" variant="outline">{t('register')}</Button>
        </Link>
      </div>
    )
  }

  const copyId = async () => {
    const text = user.id
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast.success('ID已复制')
    } catch {
      toast.error('复制失败')
    }
  }

  const displayName = user.nickname || user.email?.split('@')[0] || '用户'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <span className="font-medium">{displayName}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 shadow-xl" align="end" forceMount>
        {/* 用户名和认证状态 */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{displayName}</span>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded border',
              user.verified 
                ? 'text-green-600 border-green-600 dark:text-green-400 dark:border-green-400' 
                : 'text-orange-500 border-orange-500 dark:text-orange-400 dark:border-orange-400'
            )}>
              {user.verified ? '已验证' : '未验证'}
            </span>
          </div>
          {/* ID */}
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <span>ID: {user.id.substring(0, 20)}...</span>
            <button onClick={copyId} className="hover:text-foreground">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* 用户类型 */}
        <div className="px-3 py-2 flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{user.role === 'admin' ? '管理员' : '普通用户'}</span>
        </div>

        <DropdownMenuSeparator />

        {/* 余额与积分信息 */}
        <div className="px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">可用余额：</span>
            <span className={cn(
              'font-medium',
              (user.balance || 0) < 0 ? 'text-red-500' : ''
            )}>
              ¥{(user.balance || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">积分余额：</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">{user.points || 0}</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* 退出登录 */}
        <DropdownMenuItem onClick={() => logout()} className="text-muted-foreground cursor-pointer justify-center">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
