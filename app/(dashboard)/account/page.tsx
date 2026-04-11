'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Bell,
  Copy,
  Check,
  CheckCircle,
  AlertTriangle,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useCurrentUser } from '@/hooks/use-api'
import api from '@/lib/api'

export default function AccountPage() {
  const t = useTranslations('account')
  const [copied, setCopied] = useState(false)
  
  const { user, loading, refresh } = useCurrentUser()

  // 修改昵称状态
  const [showNicknameDialog, setShowNicknameDialog] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)

  // 绑定手机号状态
  const [showPhoneDialog, setShowPhoneDialog] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)

  // 修改密码状态
  const [showPwdDialog, setShowPwdDialog] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  const handleChangePassword = async () => {
    if (!oldPassword) {
      toast.error('请输入当前密码'); return
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('新密码至少8个字符'); return
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致'); return
    }
    setSavingPwd(true)
    try {
      await api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword })
      toast.success('密码修改成功')
      setShowPwdDialog(false)
      setOldPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '密码修改失败')
    } finally { setSavingPwd(false) }
  }

  const handleChangeNickname = async () => {
    if (!newNickname.trim()) {
      toast.error('请输入昵称'); return
    }
    setSavingNickname(true)
    try {
      await api.patch('/users/me', { nickname: newNickname.trim() })
      toast.success('昵称修改成功')
      setShowNicknameDialog(false)
      setNewNickname('')
      refresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '昵称修改失败')
    } finally { setSavingNickname(false) }
  }

  const handleBindPhone = async () => {
    const phone = newPhone.trim()
    if (!phone) {
      toast.error('请输入手机号'); return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('请输入正确的手机号'); return
    }
    setSavingPhone(true)
    try {
      await api.patch('/users/me', { phone })
      toast.success(user?.phone ? '手机号修改成功' : '手机号绑定成功')
      setShowPhoneDialog(false)
      setNewPhone('')
      refresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '操作失败')
    } finally { setSavingPhone(false) }
  }

  const formatDateTime = (dt: string) => {
    if (!dt) return '--'
    const d = new Date(dt)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const maskEmail = (email: string) => {
    if (!email) return '--'
    const atIdx = email.indexOf('@')
    if (atIdx <= 2) return email[0] + '***' + email.slice(atIdx)
    return email[0] + '***' + email.slice(atIdx - 1)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">账号设置</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !user ? (
        <div className="text-center py-12 text-muted-foreground">加载失败</div>
      ) : (
        <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-full">
          <TabsTrigger value="profile" className="rounded-full px-4">基本信息</TabsTrigger>
          <TabsTrigger value="security" className="rounded-full px-4">安全设置</TabsTrigger>
          <TabsTrigger value="notification" className="rounded-full px-4">通知设置</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="profile">
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="text-lg">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 用户ID */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">用户ID</Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm">{user.id}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(user.id)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 昵称 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">昵称</Label>
                  <div className="font-medium">{user.nickname || '--'}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setNewNickname(user.nickname || ''); setShowNicknameDialog(true) }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  修改
                </Button>
              </div>

              <Separator />

              {/* 邮箱 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">邮箱</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.email}</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">已绑定</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm">修改</Button>
              </div>

              <Separator />

              {/* 手机 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">手机号</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone || '未绑定'}</span>
                    {user.phone && <Badge variant="outline" className="text-green-600 border-green-600">已绑定</Badge>}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setNewPhone(user.phone || ''); setShowPhoneDialog(true) }}>{user.phone ? '修改' : '绑定'}</Button>
              </div>

              {/* 注册时间 */}
              <div className="space-y-1">
                <Label className="text-muted-foreground">注册时间</Label>
                <div className="text-sm">{formatDateTime(user.created_at)}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security">
          <div className="space-y-6">
            {/* 安全等级 */}
            <Card className="bg-gradient-to-r from-green-500/10 to-green-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Shield className="h-7 w-7 text-green-500" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">账户安全等级：{user.email ? '中' : '低'}</div>
                    <div className="text-sm text-muted-foreground">建议开启多项安全保护措施</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 安全项目 */}
            <Card className="card-clean">
              <CardContent className="p-0">
                {/* 登录密码 */}
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">登录密码</div>
                      <div className="text-sm text-muted-foreground">用于账号登录，建议定期更换</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      已设置
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setShowPwdDialog(true)}>修改密码</Button>
                  </div>
                </div>

                <Separator />

                {/* 两步验证 */}
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">两步验证</div>
                      <div className="text-sm text-muted-foreground">开启后登录时需要输入验证码</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">开启</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 通知设置 */}
        <TabsContent value="notification">
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="text-lg">通知设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'balance', title: '余额预警', desc: '当余额低于阈值时发送通知' },
                { key: 'expiry', title: '到期提醒', desc: '实例即将到期时发送通知' },
                { key: 'release', title: '释放提醒', desc: '实例即将被释放时发送通知' },
                { key: 'promotion', title: '优惠活动', desc: '接收平台优惠活动通知' },
                { key: 'system', title: '系统通知', desc: '接收平台公告和系统消息' },
              ].map((item, index) => (
                <div key={item.key}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{item.title}</div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked className="rounded" />
                        站内信
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked className="rounded" />
                        邮件
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        短信
                      </label>
                    </div>
                  </div>
                  {index < 4 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {/* 修改昵称对话框 */}
      <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>修改昵称</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>昵称</Label>
              <Input
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="请输入新昵称"
                maxLength={20}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNicknameDialog(false)}>取消</Button>
            <Button onClick={handleChangeNickname} disabled={savingNickname || !newNickname.trim()}>
              {savingNickname && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 绑定手机号对话框 */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{user?.phone ? '修改手机号' : '绑定手机号'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>手机号</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="请输入手机号"
                maxLength={11}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneDialog(false)}>取消</Button>
            <Button onClick={handleBindPhone} disabled={savingPhone || !newPhone.trim()}>
              {savingPhone && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改密码对话框 */}
      <Dialog open={showPwdDialog} onOpenChange={setShowPwdDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>当前密码</Label>
              <div className="relative">
                <Input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入当前密码"
                />
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowOld(!showOld)}>
                  {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>新密码</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少8个字符"
                />
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>确认新密码</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPwdDialog(false)}>取消</Button>
            <Button onClick={handleChangePassword} disabled={savingPwd || !oldPassword || !newPassword}>
              {savingPwd && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
