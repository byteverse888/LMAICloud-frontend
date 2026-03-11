'use client'

import { Monitor, MapPin, Clock, Chrome, Smartphone, Laptop } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const accessLogs = [
  { id: '1', time: '2024-02-13 14:30:25', ip: '116.232.xxx.xxx', location: '上海市', device: 'Chrome 121 / Windows', type: 'web', status: '成功' },
  { id: '2', time: '2024-02-13 09:15:00', ip: '116.232.xxx.xxx', location: '上海市', device: 'Chrome 121 / Windows', type: 'web', status: '成功' },
  { id: '3', time: '2024-02-12 20:30:00', ip: '223.104.xxx.xxx', location: '北京市', device: 'Safari / iOS 17', type: 'mobile', status: '成功' },
  { id: '4', time: '2024-02-12 15:00:00', ip: '183.192.xxx.xxx', location: '广州市', device: 'Chrome 120 / macOS', type: 'web', status: '失败' },
  { id: '5', time: '2024-02-11 10:20:00', ip: '116.232.xxx.xxx', location: '上海市', device: 'VS Code / Windows', type: 'api', status: '成功' },
]

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />
    case 'api':
      return <Laptop className="h-4 w-4" />
    default:
      return <Chrome className="h-4 w-4" />
  }
}

export default function AccessLogPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">访问记录</h1>
        <Select defaultValue="30">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">近7天</SelectItem>
            <SelectItem value="30">近30天</SelectItem>
            <SelectItem value="90">近90天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 当前设备 */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Monitor className="h-8 w-8 text-primary" />
            <div>
              <div className="font-medium">当前设备</div>
              <div className="text-sm text-muted-foreground">Chrome 121 / Windows · 上海市 · 116.232.xxx.xxx</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 访问记录表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>IP地址</TableHead>
                <TableHead>地区</TableHead>
                <TableHead>设备/浏览器</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {log.time}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{log.ip}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {log.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DeviceIcon type={log.type} />
                      {log.device}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === '成功' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
