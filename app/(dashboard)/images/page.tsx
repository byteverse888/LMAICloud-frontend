'use client'

import { useState } from 'react'
import { Store, Layers, Rocket, Image as ImageIcon, Loader2, Search, HardDrive, User, Cpu, Box } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useImages } from '@/hooks/use-api'

export default function ImagesPage() {
  const [activeTab, setActiveTab] = useState('market')
  const [searchQuery, setSearchQuery] = useState('')
  const { images, loading, refresh } = useImages()

  // 扩展镜像数据
  const displayImages = images.map(img => ({
    ...img,
    displayName: img.name,
    version: img.tag,
    sizeDisplay: img.size_gb > 0 ? `${img.size_gb}G` : '-',
    author: 'LMAICloud',
    priceTag: '免费',
    aigcType: img.type === 'base' ? '基础镜像' : img.type === 'app' ? '应用镜像' : 'AI框架',
    supportModels: img.name,
  }))

  const filteredImages = displayImages.filter(img => 
    img.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (img.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getPriceTagStyle = (tag: string) => {
    switch (tag) {
      case '限时免费':
        return 'bg-orange-500 text-white'
      case '免费':
        return 'bg-emerald-500 text-white'
      case 'VIP':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
      default:
        return 'bg-primary text-white'
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1 rounded-full">
            <TabsTrigger 
              value="market" 
              className="gap-2 px-4 py-1.5 rounded-full text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <Store className="h-4 w-4" />
              镜像市场
            </TabsTrigger>
            <TabsTrigger 
              value="my" 
              className="gap-2 px-4 py-1.5 rounded-full text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <Layers className="h-4 w-4" />
              我的镜像
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索镜像..."
                className="pl-9 w-[240px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 镜像市场 */}
        <TabsContent value="market" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map((image) => (
              <Card key={image.id} className="card-clean overflow-hidden">
                {/* 顶部图标 */}
                <div className="pt-6 pb-4 flex justify-center">
                  <div className="w-14 h-14 rounded-xl bg-primary/8 flex items-center justify-center">
                    <ImageIcon className="h-7 w-7 text-primary" />
                  </div>
                </div>
                
                {/* 标题和价格标签 */}
                <div className="px-4 pb-3 flex items-center justify-center gap-2">
                  <h3 className="text-base font-semibold">{image.displayName}</h3>
                  <Badge className={`${getPriceTagStyle(image.priceTag)} text-xs px-2 py-0.5`}>
                    {image.priceTag}
                  </Badge>
                </div>
                
                {/* 版本选择 */}
                <div className="px-4 pb-3">
                  <Select defaultValue={image.version}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={image.version}>{image.version}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* 描述 */}
                <div className="px-4 pb-3">
                  <p className="text-muted-foreground text-sm">{image.description || `支持${image.displayName}等功能`}</p>
                </div>
                
                {/* 信息列表 */}
                <CardContent className="space-y-2.5 text-sm px-4 pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      镜像大小
                    </span>
                    <span className="font-medium">{image.sizeDisplay}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      作者
                    </span>
                    <span className="font-medium">{image.author}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      分类
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {image.aigcType}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Box className="h-4 w-4" />
                      支持模型
                    </span>
                    <Badge variant="outline" className="text-xs max-w-[120px] truncate">
                      {image.supportModels}
                    </Badge>
                  </div>
                </CardContent>
                
                {/* 底部按钮 */}
                <CardFooter className="px-4 py-4 border-t border-border/50">
                  <Button className="w-full">
                    <Rocket className="h-4 w-4 mr-2" />
                    部署应用
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {filteredImages.length === 0 && !loading && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">暂无镜像数据</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 我的镜像 - 列表形式 */}
        <TabsContent value="my" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>镜像名称</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* 暂无数据 */}
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      暂无已拉取的镜像
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
