'use client'

import { useState } from 'react'
import { Shield, Lock, Mail, CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useCurrentUser } from '@/hooks/use-api'
import api from '@/lib/api'
import toast from 'react-hot-toast'

function maskEmail(email: string) {
  if (!email) return '--'
  const atIdx = email.indexOf('@')
  if (atIdx <= 2) return email[0] + '***' + email.slice(atIdx)
  return email[0] + '***' + email.slice(atIdx - 1)
}

export default function SecurityPage() {
  const { user, loading } = useCurrentUser()
  const [showPwdDialog, setShowPwdDialog] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('新密码至少8个字符'); return
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致'); return
    }
    setSaving(true)
    try {
      await api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword })
      toast.success('密码修改成功')
      setShowPwdDialog(false)
      setOldPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '密码修改失败')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">安全设置</h1>
      </div>

      {/* 安全等级 */}
      <Card className="bg-gradient-to-r from-green-500/10 to-green-500/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <div className="text-lg font-semibold">账户安全等级：{user?.email ? '中' : '低'}</div>
              <div className="text-sm text-muted-foreground">建议开启多项安全保护措施</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 安全项目 */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">登录密码</div>
                  <div className="text-sm text-muted-foreground">用于账号登录，建议定期更换</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  已设置
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setShowPwdDialog(true)}>修改密码</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">邮箱绑定</div>
                  <div className="text-sm text-muted-foreground">
                    {user?.email ? `已绑定：${maskEmail(user.email)}` : '未绑定邮箱'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {user?.email ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    已绑定
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    未绑定
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <Button onClick={handleChangePassword} disabled={saving || !oldPassword || !newPassword}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
