'use client'

import { useState } from 'react'
import { Search, Download, Database, FileText, Image, Video, Music, Archive, Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePublicDatasets } from '@/hooks/use-api'

const categories = [
  { id: 'all', name: '全部', icon: Database },
  { id: 'dataset', name: '数据集', icon: FileText },
  { id: 'model', name: '模型', icon: Archive },
  { id: 'image', name: '图片', icon: Image },
  { id: 'video', name: '视频', icon: Video },
  { id: 'audio', name: '音频', icon: Music },
]

export default function PublicDataPage() {
  const [category, setCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const { datasets, loading, total } = usePublicDatasets(currentPage, pageSize, category, searchQuery)
  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = () => {
    setSearchQuery(searchInput)
    setCurrentPage(1)
  }

  const handleCategoryChange = (cat: string) => {
    setCategory(cat)
    setCurrentPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">公开数据</h1>
        <span className="text-sm text-muted-foreground">共 {total} 个资源</span>
      </div>

      {/* 搜索 */}
      <Card className="card-clean">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索数据集、模型..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch}>搜索</Button>
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
              onClick={() => handleCategoryChange(cat.id)}
              className="gap-2 rounded-full"
            >
              <Icon className="h-4 w-4" />
              {cat.name}
            </Button>
          )
        })}
      </div>

      {/* 数据列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {datasets.map((item: any) => (
            <Card key={item.id} className="card-clean">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      {item.size && <Badge variant="secondary">{item.size}</Badge>}
                      <Badge variant="outline" className="text-xs capitalize">{item.category}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">{item.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(item.tags || []).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                      {item.source && (
                        <Badge variant="secondary" className="text-xs">{item.source}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-sm text-muted-foreground mb-2">
                      <Download className="inline h-4 w-4 mr-1" />
                      {formatDownloads(item.downloads)} 次下载
                    </div>
                    {item.source_url ? (
                      <Button size="sm" asChild>
                        <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          查看详情
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" disabled>
                        <Download className="h-4 w-4 mr-2" />
                        下载
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && datasets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>没有找到匹配的数据</p>
        </div>
      )}

      {/* 分页 - 仅超过一页时显示 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
