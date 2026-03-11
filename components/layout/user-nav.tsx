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

export function UserNav() {
  const t = useTranslations('auth')
  const { user, isAuthenticated, logout } = useAuthStore()

  // 模拟用户数据
  const userData = {
    id: '253e792c-6e26-46c7-9f87-be3949d86ebc',
    nickname: user?.nickname || '炼丹师5325',
    isVerified: false,
    userType: '普通用户',
    balance: -28.44,
    frozenBalance: 0.00,
    coupon: 0.00,
    instances: 0,
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            {t('login')}
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm">{t('register')}</Button>
        </Link>
      </div>
    )
  }

  const copyId = () => {
    navigator.clipboard.writeText(userData.id)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <span className="font-medium">{userData.nickname}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 bg-white text-gray-900 dark:bg-zinc-900 dark:text-gray-100 shadow-xl border" align="end" forceMount>
        {/* 用户名和认证状态 */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{userData.nickname}</span>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded border',
              userData.isVerified 
                ? 'text-green-600 border-green-600 dark:text-green-400 dark:border-green-400' 
                : 'text-orange-500 border-orange-500 dark:text-orange-400 dark:border-orange-400'
            )}>
              {userData.isVerified ? '已实名' : '未实名'}
            </span>
          </div>
          {/* ID */}
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <span>ID: {userData.id.substring(0, 20)}...</span>
            <button onClick={copyId} className="hover:text-foreground">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* 用户类型 */}
        <div className="px-3 py-2 flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {userData.nickname.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{userData.userType}</span>
        </div>

        <DropdownMenuSeparator />

        {/* 余额信息 */}
        <div className="px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">可用余额：</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                'font-medium',
                userData.balance < 0 ? 'text-red-500' : ''
              )}>
                ¥{userData.balance.toFixed(2)}
              </span>
              <Link href="/billing">
                <Button size="sm" variant="outline" className="h-6 text-xs text-orange-500 border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                  去充值
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">冻结余额：</span>
            <span className="font-medium">¥{userData.frozenBalance.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">代金券：</span>
            <span className="font-medium">¥{userData.coupon.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">容器实例：</span>
            <span className="font-medium">{userData.instances}</span>
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
