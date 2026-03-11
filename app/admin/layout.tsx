'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Server,
  HardDrive,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Loader2,
  Image,
  MessageSquare,
  ExternalLink,
  Moon,
  Sun,
  ShieldX,
  ChevronDown,
  KeyRound,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/stores/auth-store'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const adminNavItems = [
  { href: '/admin', label: '仪表盘', icon: LayoutDashboard },
  { href: '/admin/clusters', label: '集群管理', icon: Server },
  { href: '/admin/nodes', label: '节点管理', icon: HardDrive },
  { href: '/admin/images', label: '镜像管理', icon: Image },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/orders', label: '订单管理', icon: ShoppingCart },
  { href: '/admin/tickets', label: '工单管理', icon: MessageSquare },
  { href: '/admin/reports', label: '数据报表', icon: BarChart3 },
  { href: '/admin/settings', label: '系统设置', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, isAuthenticated, logout, checkAuth } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [countdown, setCountdown] = useState(3)
  
  // 修改密码对话框状态
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // 未登录跳转登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?redirect=' + encodeURIComponent(pathname))
    }
  }, [isLoading, isAuthenticated, router, pathname])

  // 非管理员倒计时跳转
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && user.role !== 'admin') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
        return () => clearTimeout(timer)
      } else {
        // 清除登录状态并跳转
        localStorage.removeItem('auth-storage')
        window.location.href = '/login?redirect=/admin'
      }
    }
  }, [isLoading, isAuthenticated, user, countdown])

  const handleLogout = () => {
    logout('/login?redirect=/admin')
  }

  const handleChangePassword = async () => {
    if (!newPassword || !oldPassword) {
      toast.error('请填写完整信息')
      return
    }
    if (newPassword === oldPassword) {
      toast.error('新密码不能与旧密码相同')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致')
      return
    }
    if (newPassword.length < 6) {
      toast.error('新密码长度至少6位')
      return
    }
    
    try {
      setChangingPassword(true)
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      })
      toast.success('密码修改成功')
      setPasswordDialogOpen(false)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || '修改失败')
    } finally {
      setChangingPassword(false)
    }
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 未登录
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 非管理员 - 显示错误页面
  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-6 p-8">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldX className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">无管理员权限</h1>
            <p className="text-muted-foreground">
              当前账号 <span className="font-medium text-foreground">{user.email}</span> 不是管理员
            </p>
          </div>
          <div className="text-lg font-medium text-red-500">
            {countdown} 秒后跳转到登录页面...
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem('auth-storage')
              window.location.href = '/login?redirect=/admin'
            }}
          >
            立即重新登录
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* 侧边栏 */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
            <Server className="h-6 w-6 text-primary" />
            管理后台
          </Link>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        {/* 顶部栏 */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
          <div></div>
          <div className="flex items-center gap-3">
            {/* 主题切换 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* 用户下拉菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {user.nickname || user.email}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    系统设置
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)} className="cursor-pointer">
                  <KeyRound className="h-4 w-4 mr-2" />
                  修改密码
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* 修改密码对话框 */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              请输入当前密码和新密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">当前密码</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入当前密码"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white">
              {changingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
