'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, HelpCircle, ChevronLeft, ChevronRight, Ticket, RefreshCcw, Loader2, Cpu, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useMarketProducts } from '@/hooks/use-api'

/** 从 specs JSON 字符串安全解析 */
function parseSpecs(specs: any): Record<string, any> {
  if (!specs) return {}
  if (typeof specs === 'object') return specs
  try { return JSON.parse(specs) } catch { return {} }
}

export default function MarketListPage() {
  const router = useRouter()
  const [billingType, setBillingType] = useState('hourly')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedGpuModel, setSelectedGpuModel] = useState('')
  const [gpuCount, setGpuCount] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState('20')

  // 从数据库获取市场产品（管理员维护的数据）
  const { products, loading, total: rawTotal, refresh } = useMarketProducts({ category: 'compute' })

  // 将产品数据展开为渲染用数据
  const allItems = useMemo(() => products.map((p: any) => {
    const s = parseSpecs(p.specs)
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      region: s.region || '默认区域',
      gpu_model: s.gpu_model || '--',
      gpu_memory: s.gpu_memory || '--',
      gpu_available: s.gpu_available ?? 0,
      gpu_total: s.gpu_total ?? 0,
      cpu_cores: s.cpu_cores ?? 0,
      cpu_model: s.cpu_model || '--',
      memory: s.memory ?? 0,
      disk: s.disk ?? 50,
      gpu_driver: s.gpu_driver || '--',
      cuda_version: s.cuda_version || '--',
      hourly_price: p.price ?? 0,
      member_price: s.member_price ?? (p.price ? +(p.price * 0.95).toFixed(2) : 0),
      available_until: s.available_until || '长期可用',
      node_type: s.node_type || 'center',
      node_id: s.node_id || p.name,
      tag: s.tag || null,
    }
  }), [products])

  // 动态提取筛选选项：区域
  const regions = useMemo(() => {
    const set = new Set<string>()
    allItems.forEach(item => { if (item.region) set.add(item.region) })
    return Array.from(set).map(r => ({ id: r, name: r }))
  }, [allItems])

  // 动态提取筛选选项：GPU型号
  const gpuModels = useMemo(() => {
    const stats: Record<string, { available: number; total: number }> = {}
    allItems.forEach(item => {
      if (item.gpu_model && item.gpu_model !== '--') {
        if (!stats[item.gpu_model]) stats[item.gpu_model] = { available: 0, total: 0 }
        stats[item.gpu_model].available += item.gpu_available
        stats[item.gpu_model].total += item.gpu_total
      }
    })
    return Object.entries(stats).map(([name, s]) => ({ id: name, name, available: s.available, total: s.total }))
  }, [allItems])

  // 客户端过滤
  const filtered = useMemo(() => {
    let list = allItems
    if (selectedRegion) list = list.filter(m => m.region === selectedRegion)
    if (selectedGpuModel) list = list.filter(m => m.gpu_model === selectedGpuModel)
    if (gpuCount > 1) list = list.filter(m => m.gpu_available >= gpuCount)
    return list
  }, [allItems, selectedRegion, selectedGpuModel, gpuCount])

  // 客户端分页
  const total = filtered.length
  const pageSizeNum = parseInt(pageSize)
  const totalPages = Math.max(1, Math.ceil(total / pageSizeNum))
  const machines = useMemo(() => {
    const start = (currentPage - 1) * pageSizeNum
    return filtered.slice(start, start + pageSizeNum)
  }, [filtered, currentPage, pageSizeNum])

  // 动态生成页码按钮
  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }, [currentPage, totalPages])

  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId === selectedRegion ? '' : regionId)
    setCurrentPage(1)
  }

  const handleGpuModelChange = (modelId: string) => {
    if (modelId === 'all') {
      setSelectedGpuModel('')
    } else {
      setSelectedGpuModel(modelId === selectedGpuModel ? '' : modelId)
    }
    setCurrentPage(1)
  }

  const handleGpuCountChange = (count: number) => {
    setGpuCount(count)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (val: string) => {
    setPageSize(val)
    setCurrentPage(1)
  }

  const handleRent = (machine: any) => {
    const params = new URLSearchParams({
      nodeId: machine.node_id || machine.id,
      machineId: machine.id,
      gpuModel: machine.gpu_model,
      gpuCount: gpuCount.toString(),
      billingType,
    })
    router.push(`/instances/create?${params.toString()}`)
  }

  const billingTypes = [
    { id: 'hourly', label: '按量计费' },
    { id: 'daily', label: '包日' },
    { id: 'weekly', label: '包周' },
    { id: 'monthly', label: '包月' },
  ]

  return (
    <div className="space-y-4">
      {/* 警告提示 */}
      <div className="flex items-center gap-2 text-orange-500 text-sm py-2 bg-orange-50 dark:bg-orange-950/30 px-4 rounded-lg border border-orange-200 dark:border-orange-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        严禁使用WebUI等算法生成违禁图片、严禁挖矿，一经发现立即封号！
      </div>

      {/* 筛选区域 */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/20">
        <CardContent className="p-6 space-y-4">
          {/* 计费方式 */}
          <div className="flex items-center">
            <span className="text-muted-foreground w-20 shrink-0 font-medium">计费方式：</span>
            <div className="flex gap-2">
              {billingTypes.map((type) => (
                <Button
                  key={type.id}
                  variant={billingType === type.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBillingType(type.id)}
                  className={cn(
                    "h-8 px-4 transition-all",
                    billingType === type.id 
                      ? 'bg-gradient-to-r from-primary to-blue-600 text-primary-foreground shadow-md' 
                      : 'bg-background hover:bg-primary/5'
                  )}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 选择地区 */}
          <div className="flex items-start">
            <span className="text-muted-foreground w-20 shrink-0 pt-1 font-medium">选择地区：</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedRegion ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectedRegion(''); setCurrentPage(1) }}
                className={cn(
                  "h-8 px-4 transition-all",
                  !selectedRegion
                    ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md'
                    : 'hover:bg-primary/5'
                )}
              >
                全部
              </Button>
              {regions.map((region) => (
                <Button
                  key={region.id}
                  variant={selectedRegion === region.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRegionChange(region.name)}
                  className={cn(
                    "h-8 px-4 transition-all",
                    selectedRegion === region.name
                      ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md'
                      : 'hover:bg-primary/5'
                  )}
                >
                  {region.name}
                </Button>
              ))}
            </div>
          </div>

          {/* GPU型号 */}
          <div className="flex items-start">
            <span className="text-muted-foreground w-20 shrink-0 pt-0.5">GPU型号：</span>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
                <Checkbox
                  checked={!selectedGpuModel}
                  onCheckedChange={() => handleGpuModelChange('all')}
                />
                <span>全部</span>
              </label>
              {gpuModels.map((model) => (
                <label key={model.id} className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
                  <Checkbox
                    checked={selectedGpuModel === model.name}
                    onCheckedChange={() => handleGpuModelChange(model.name)}
                  />
                  <span>
                    {model.name}
                    <span className="text-muted-foreground"> ({model.available}/{model.total})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* GPU数量 */}
          <div className="flex items-center">
            <span className="text-muted-foreground w-20 shrink-0 font-medium">GPU数量：</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((count) => (
                <Button
                  key={count}
                  variant={gpuCount === count ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "w-9 h-8 transition-all",
                    gpuCount === count 
                      ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md' 
                      : 'hover:bg-primary/5'
                  )}
                  onClick={() => handleGpuCountChange(count)}
                >
                  {count}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="ml-4" onClick={refresh} disabled={loading}>
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 机器卡片列表 */}
      <div className="space-y-4">
        {loading ? (
          <Card className="border shadow-sm">
            <CardContent className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-4">加载中...</p>
            </CardContent>
          </Card>
        ) : machines.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-16 text-center">
              <Cpu className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">暂无可用机器，请调整筛选条件</p>
            </CardContent>
          </Card>
        ) : machines.map((machine: any) => (
          <Card key={machine.id} className="border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group overflow-hidden">
            <CardContent className="p-5 relative">
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
              
              {/* 顶部信息行 */}
              <div className="flex items-center justify-between mb-3 relative">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{machine.region} / {machine.name}</span>
                  <span className="bg-muted px-2 py-0.5 rounded text-xs">{machine.node_id}</span>
                  <span>可租用至：{machine.available_until || '长期可用'}</span>
                </div>
                {machine.node_type === 'edge' && (
                  <div className="flex items-center gap-1 text-blue-500 text-xs bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded">
                    <Zap className="h-3.5 w-3.5" />
                    <span>边缘节点</span>
                  </div>
                )}
              </div>

              {/* GPU信息行 */}
              <div className="flex items-baseline gap-12 mb-4 relative">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <span className="text-xl font-semibold">{machine.gpu_model} / {machine.gpu_memory}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  空闲/总量 <span className="text-2xl font-bold text-primary">{machine.gpu_available}</span>
                  <span className="text-muted-foreground"> / {machine.gpu_total}</span>
                </div>
              </div>

              {/* 配置详情 */}
              <div className="flex items-start relative">
                <div className="flex-1 grid grid-cols-3 gap-x-8 text-sm">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-muted-foreground mb-1.5 font-medium">每GPU分配</div>
                    <div>CPU: {machine.cpu_cores} 核，{machine.cpu_model}</div>
                    <div>内存: {machine.memory} GB</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-muted-foreground mb-1.5 font-medium">硬盘</div>
                    <div>系统盘: 30 GB</div>
                    <div>数据盘: {machine.disk || 50} GB</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-muted-foreground mb-1.5 font-medium">其它</div>
                    <div>GPU驱动: {machine.gpu_driver || '--'}</div>
                    <div className="flex items-center gap-1">
                      CUDA版本: {machine.cuda_version || '--'}
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>

                {/* 价格区 */}
                <div className="w-40 text-right">
                  <div>
                    <span className="text-orange-500 text-3xl font-bold">¥{machine.hourly_price}</span>
                    <span className="text-muted-foreground text-sm">/时</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    会员最低享9.5折 ¥{machine.member_price}/时
                  </div>
                  <Button 
                    className="mt-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl transition-all" 
                    size="sm" 
                    onClick={() => handleRent(machine)}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    {machine.gpu_available}卡可租
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 分页 - 超过 pageSize 条才显示 */}
      {total > pageSizeNum && (
        <div className="flex items-center justify-center gap-4 py-4">
          <span className="text-sm text-muted-foreground">共 {total} 条</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageNumbers.map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2">…</span>
              ) : (
                <Button
                  key={p}
                  variant={currentPage === p ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select value={pageSize} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20条/页</SelectItem>
              <SelectItem value="50">50条/页</SelectItem>
              <SelectItem value="100">100条/页</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 右侧悬浮优惠券 */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
        <Button variant="destructive" className="flex flex-col h-auto py-3 px-2 text-xs bg-orange-500 hover:bg-orange-600">
          <Ticket className="h-4 w-4 mb-1" />
          <span>领</span><span>优</span><span>惠</span><span>券</span>
        </Button>
      </div>
    </div>
  )
}
