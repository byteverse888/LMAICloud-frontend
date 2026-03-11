'use client'

import { useState } from 'react'
import { Settings, Bell, Moon, Sun, Globe, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const [emailNotify, setEmailNotify] = useState(true)
  const [browserNotify, setBrowserNotify] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统设置</h1>
      </div>

      {/* 通知设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知设置
          </CardTitle>
          <CardDescription>管理您的通知偏好</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>邮件通知</Label>
              <p className="text-sm text-muted-foreground">接收重要的邮件通知</p>
            </div>
            <Switch checked={emailNotify} onCheckedChange={setEmailNotify} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>浏览器通知</Label>
              <p className="text-sm text-muted-foreground">在浏览器中显示通知</p>
            </div>
            <Switch checked={browserNotify} onCheckedChange={setBrowserNotify} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>提示音</Label>
              <p className="text-sm text-muted-foreground">操作时播放提示音</p>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* 显示设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            显示设置
          </CardTitle>
          <CardDescription>自定义界面显示</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>主题</Label>
              <p className="text-sm text-muted-foreground">选择界面主题</p>
            </div>
            <Select defaultValue="system">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="dark">深色</SelectItem>
                <SelectItem value="system">跟随系统</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>语言</Label>
              <p className="text-sm text-muted-foreground">选择界面语言</p>
            </div>
            <Select defaultValue="zh">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">简体中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 其他设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            其他设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>时区</Label>
              <p className="text-sm text-muted-foreground">设置您的时区</p>
            </div>
            <Select defaultValue="asia-shanghai">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asia-shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                <SelectItem value="asia-tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                <SelectItem value="utc">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>数据导出格式</Label>
              <p className="text-sm text-muted-foreground">默认数据导出格式</p>
            </div>
            <Select defaultValue="csv">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>保存设置</Button>
      </div>
    </div>
  )
}
