'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface SystemSettings {
  site_name: string
  site_description: string
  contact_email: string
  min_recharge_amount: number
  max_recharge_amount: number
  instance_auto_stop_hours: number
  instance_max_per_user: number
  storage_max_gb_per_user: number
  maintenance_mode: boolean
  registration_enabled: boolean
  notification_email_enabled: boolean
}

interface EmailConfig {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  smtp_from_email: string
  smtp_from_name: string
  smtp_use_tls: boolean
  notification_enabled: boolean
  verification_required: boolean
  is_configured: boolean
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: 'LMAICloud',
    site_description: '',
    contact_email: '',
    min_recharge_amount: 10,
    max_recharge_amount: 100000,
    instance_auto_stop_hours: 24,
    instance_max_per_user: 10,
    storage_max_gb_per_user: 100,
    maintenance_mode: false,
    registration_enabled: true,
    notification_email_enabled: true,
  })

  // 邮件配置
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: 'LMAICloud',
    smtp_use_tls: true,
    notification_enabled: true,
    verification_required: true,
    is_configured: false,
  })
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmail, setTestEmail] = useState('')

  useEffect(() => {
    fetchSettings()
    fetchEmailConfig()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<SystemSettings>('/admin/settings')
      setSettings(data)
    } catch (err) {
      console.error('获取设置失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmailConfig = async () => {
    try {
      setEmailLoading(true)
      const { data } = await api.get<EmailConfig>('/admin/settings/email')
      setEmailConfig(data)
    } catch (err) {
      console.error('获取邮件配置失败:', err)
    } finally {
      setEmailLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      await api.put('/admin/settings', settings)
      toast.success('设置已保存')
    } catch (err) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const saveEmailConfig = async () => {
    try {
      setEmailSaving(true)
      // 构建更新数据，如果密码是占位符则不更新
      const updateData: Partial<EmailConfig> = {
        smtp_host: emailConfig.smtp_host,
        smtp_port: emailConfig.smtp_port,
        smtp_user: emailConfig.smtp_user,
        smtp_from_email: emailConfig.smtp_from_email,
        smtp_from_name: emailConfig.smtp_from_name,
        smtp_use_tls: emailConfig.smtp_use_tls,
        email_verification_required: emailConfig.verification_required,
        notification_email_enabled: emailConfig.notification_enabled,
      } as any
      
      // 只有当密码不是占位符时才更新
      if (emailConfig.smtp_password && emailConfig.smtp_password !== '******') {
        (updateData as any).smtp_password = emailConfig.smtp_password
      }
      
      await api.put('/admin/settings/email', updateData)
      toast.success('邮件配置已保存')
      // 重新获取配置
      await fetchEmailConfig()
    } catch (err) {
      toast.error('保存失败')
    } finally {
      setEmailSaving(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('请输入测试邮箱地址')
      return
    }
    try {
      setTestingEmail(true)
      await api.post('/admin/settings/email/test', { email: testEmail })
      toast.success('测试邮件已发送')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '发送失败')
    } finally {
      setTestingEmail(false)
    }
  }

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateEmailConfig = <K extends keyof EmailConfig>(key: K, value: EmailConfig[K]) => {
    setEmailConfig(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">系统设置</h1>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">基本设置</TabsTrigger>
          <TabsTrigger value="billing">计费设置</TabsTrigger>
          <TabsTrigger value="email">邮件配置</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
        </TabsList>

        {/* 基本设置 */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本设置</CardTitle>
              <CardDescription>配置平台基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>平台名称</Label>
                  <Input 
                    value={settings.site_name} 
                    onChange={(e) => updateSetting('site_name', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>客服邮箱</Label>
                  <Input 
                    value={settings.contact_email} 
                    onChange={(e) => updateSetting('contact_email', e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>平台描述</Label>
                <Input 
                  value={settings.site_description} 
                  onChange={(e) => updateSetting('site_description', e.target.value)} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">维护模式</div>
                  <p className="text-sm text-muted-foreground">开启后用户将无法访问平台</p>
                </div>
                <Switch 
                  checked={settings.maintenance_mode} 
                  onCheckedChange={(v) => updateSetting('maintenance_mode', v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">新用户注册</div>
                  <p className="text-sm text-muted-foreground">关闭后将暂停新用户注册</p>
                </div>
                <Switch 
                  checked={settings.registration_enabled} 
                  onCheckedChange={(v) => updateSetting('registration_enabled', v)} 
                />
              </div>
              <Button onClick={saveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 计费设置 */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">计费设置</CardTitle>
              <CardDescription>配置平台计费规则</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>最低充值金额(元)</Label>
                  <Input 
                    type="number" 
                    value={settings.min_recharge_amount} 
                    onChange={(e) => updateSetting('min_recharge_amount', Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>最高充值金额(元)</Label>
                  <Input 
                    type="number" 
                    value={settings.max_recharge_amount} 
                    onChange={(e) => updateSetting('max_recharge_amount', Number(e.target.value))} 
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>欠费自动停机时间(小时)</Label>
                  <Input 
                    type="number" 
                    value={settings.instance_auto_stop_hours} 
                    onChange={(e) => updateSetting('instance_auto_stop_hours', Number(e.target.value))} 
                  />
                </div>
              </div>
              <Button onClick={saveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 邮件配置 */}
        <TabsContent value="email">
          <div className="space-y-6">
            {/* 邮件状态卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  邮件服务状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {emailConfig.is_configured ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">邮件服务已配置</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium">邮件服务未配置</span>
                      <span className="text-sm text-muted-foreground">- 请完成以下SMTP配置</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SMTP 配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SMTP 服务器配置</CardTitle>
                <CardDescription>配置邮件发送服务器信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {emailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>SMTP 服务器地址</Label>
                        <Input 
                          placeholder="smtp.example.com"
                          value={emailConfig.smtp_host} 
                          onChange={(e) => updateEmailConfig('smtp_host', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP 端口</Label>
                        <Input 
                          type="number"
                          placeholder="587"
                          value={emailConfig.smtp_port} 
                          onChange={(e) => updateEmailConfig('smtp_port', Number(e.target.value))} 
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>SMTP 用户名</Label>
                        <Input 
                          placeholder="your-email@example.com"
                          value={emailConfig.smtp_user} 
                          onChange={(e) => updateEmailConfig('smtp_user', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP 密码</Label>
                        <Input 
                          type="password"
                          placeholder={emailConfig.is_configured ? '••••••••' : '输入密码'}
                          value={emailConfig.smtp_password} 
                          onChange={(e) => updateEmailConfig('smtp_password', e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>发件人邮箱</Label>
                        <Input 
                          placeholder="noreply@example.com"
                          value={emailConfig.smtp_from_email} 
                          onChange={(e) => updateEmailConfig('smtp_from_email', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>发件人名称</Label>
                        <Input 
                          placeholder="LMAICloud"
                          value={emailConfig.smtp_from_name} 
                          onChange={(e) => updateEmailConfig('smtp_from_name', e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">使用 TLS 加密</div>
                        <p className="text-sm text-muted-foreground">启用 STARTTLS 加密连接</p>
                      </div>
                      <Switch 
                        checked={emailConfig.smtp_use_tls} 
                        onCheckedChange={(v) => updateEmailConfig('smtp_use_tls', v)} 
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">注册邮箱验证</div>
                        <p className="text-sm text-muted-foreground">新用户注册时需要验证邮箱</p>
                      </div>
                      <Switch 
                        checked={emailConfig.verification_required} 
                        onCheckedChange={(v) => updateEmailConfig('verification_required', v)} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">邮件通知</div>
                        <p className="text-sm text-muted-foreground">启用系统邮件通知功能</p>
                      </div>
                      <Switch 
                        checked={emailConfig.notification_enabled} 
                        onCheckedChange={(v) => updateEmailConfig('notification_enabled', v)} 
                      />
                    </div>
                    <Button onClick={saveEmailConfig} disabled={emailSaving} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white">
                      {emailSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      保存邮件配置
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 测试邮件 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">测试邮件</CardTitle>
                <CardDescription>发送测试邮件验证配置是否正确</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input 
                    type="email"
                    placeholder="输入接收测试邮件的邮箱"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendTestEmail} 
                    disabled={testingEmail || !emailConfig.is_configured}
                    variant="outline"
                  >
                    {testingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    发送测试邮件
                  </Button>
                </div>
                {!emailConfig.is_configured && (
                  <p className="text-sm text-muted-foreground">
                    请先完成SMTP配置后再发送测试邮件
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">安全设置</CardTitle>
              <CardDescription>配置平台安全策略</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>单用户最大实例数</Label>
                  <Input 
                    type="number" 
                    value={settings.instance_max_per_user} 
                    onChange={(e) => updateSetting('instance_max_per_user', Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>单用户最大存储(GB)</Label>
                  <Input 
                    type="number" 
                    value={settings.storage_max_gb_per_user} 
                    onChange={(e) => updateSetting('storage_max_gb_per_user', Number(e.target.value))} 
                  />
                </div>
              </div>
              <Button onClick={saveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
