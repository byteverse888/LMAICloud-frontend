'use client'

import { useState } from 'react'
import { Search, Download, Database, FileText, Image, Video, Music, Archive, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const categories = [
  { id: 'all', name: '全部', icon: Database },
  { id: 'dataset', name: '数据集', icon: FileText },
  { id: 'model', name: '模型', icon: Archive },
  { id: 'image', name: '图片', icon: Image },
  { id: 'video', name: '视频', icon: Video },
  { id: 'audio', name: '音频', icon: Music },
]

const publicData = [
  { id: '1', name: 'ImageNet-1K', category: 'dataset', size: '150GB', downloads: 12580, description: 'ImageNet大规模视觉识别挑战赛数据集', tags: ['图像分类', '深度学习'] },
  { id: '2', name: 'COCO 2017', category: 'dataset', size: '25GB', downloads: 8920, description: '目标检测、分割和字幕数据集', tags: ['目标检测', '图像分割'] },
  { id: '3', name: 'Llama-2-7B', category: 'model', size: '13GB', downloads: 45200, description: 'Meta开源大语言模型', tags: ['LLM', 'NLP'] },
  { id: '4', name: 'Stable Diffusion v1.5', category: 'model', size: '4.2GB', downloads: 89500, description: '文本到图像生成模型', tags: ['图像生成', 'Diffusion'] },
  { id: '5', name: 'LAION-5B', category: 'dataset', size: '240TB', downloads: 3200, description: '大规模图文配对数据集', tags: ['多模态', '预训练'] },
  { id: '6', name: 'Common Voice', category: 'audio', size: '80GB', downloads: 5600, description: 'Mozilla开源语音数据集', tags: ['语音识别', 'ASR'] },
]

export default function PublicDataPage() {
  const [category, setCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredData = publicData.filter(item => {
    const matchCategory = category === 'all' || item.category === category
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">公开数据</h1>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索数据集、模型..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <cat.icon className="h-4 w-4" />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 分类标签 */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => {
          const Icon = cat.icon
          return (
            <Button
              key={cat.id}
              variant={category === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {cat.name}
            </Button>
          )
        })}
      </div>

      {/* 数据列表 */}
      <div className="grid gap-4">
        {filteredData.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <Badge variant="secondary">{item.size}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{item.description}</p>
                  <div className="flex items-center gap-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-2">
                    <Download className="inline h-4 w-4 mr-1" />
                    {item.downloads.toLocaleString()} 次下载
                  </div>
                  <Button size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    下载
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>没有找到匹配的数据</p>
        </div>
      )}
    </div>
  )
}
