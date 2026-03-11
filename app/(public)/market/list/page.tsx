'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, HelpCircle, ChevronLeft, ChevronRight, Ticket, RefreshCcw, Loader2, Cpu, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useMarketMachines } from '@/hooks/use-api'

const regions = [
  { id: 'beijing-b', name: '北京B区' },
  { id: 'northwest-b', name: '西北B区' },
  { id: 'chongqing-a', name: '重庆A区' },
  { id: 'neimeng-b', name: '内蒙B区' },
  { id: 'beijing-a', name: '北京A区' },
  { id: 'foshan', name: '佛山区' },
]

const specialZones = [
  { id: 'v100', name: 'V100专区' },
  { id: 'a800', name: 'A800专区' },
  { id: 'moore', name: '摩尔线程专区' },
  { id: 'huawei', name: '华为昇腾专区' },
  { id: 'l20', name: 'L20专区' },
]

const gpuModels = [
  { id: 'all', name: '全部' },
  { id: 'rtx5090', name: 'RTX 5090', available: 1351, total: 2288 },
  { id: 'rtx-pro-6000', name: 'RTX PRO 6000', available: 76, total: 278 },
  { id: 'vgpu-48gb', name: 'vGPU-48GB', available: 58, total: 250 },
  { id: 'vgpu-48gb-425w', name: 'vGPU-48GB-425W', available: 134, total: 170 },
  { id: 'rtx5090d', name: 'RTX 5090 D', available: 5, total: 11 },
  { id: 'rtx4090d', name: 'RTX 4090D', available: 47, total: 192 },
  { id: 'rtx4090', name: 'RTX 4090', available: 368, total: 1320 },
  { id: 'rtx3080ti', name: 'RTX 3080 Ti', available: 13, total: 96 },
  { id: 'cpu', name: 'CPU', available: 0, total: 44 },
  { id: 'a800-80gb', name: 'A800-80GB-NVLink', available: 59, total: 296 },
]

const machines = [
  {
    id: '876机', nodeId: 'qvadxau6nv', region: '北京B区', gpuModel: 'RTX 4090D', gpuMemory: '24 GB',
    gpuAvailable: 1, gpuTotal: 8, cpuCores: 16, cpuModel: 'Xeon(R) Platinum 8352V', memory: 60,
    systemDisk: 30, dataDisk: 50, expandable: 7950, gpuDriver: '580.105.08', cudaVersion: '≤ 13.0',
    pricePerHour: 1.98, memberPrice: 1.88, availableUntil: '2027-01-01', tag: 'cache',
  },
  {
    id: '472机', nodeId: '73df479249', region: '北京B区', gpuModel: 'RTX 5090', gpuMemory: '32 GB',
    gpuAvailable: 1, gpuTotal: 8, cpuCores: 25, cpuModel: 'Xeon(R) Platinum 8470Q', memory: 90,
    systemDisk: 30, dataDisk: 50, expandable: 2205, gpuDriver: '580.76.05', cudaVersion: '≤ 13.0',
    pricePerHour: 3.03, memberPrice: 2.39, availableUntil: '2027-01-01', tag: null,
  },
  {
    id: '286机', nodeId: '3b2b4ba5e7', region: '北京B区', gpuModel: 'RTX 4090', gpuMemory: '24 GB',
    gpuAvailable: 1, gpuTotal: 8, cpuCores: 16, cpuModel: 'Xeon(R) Gold 6430', memory: 120,
    systemDisk: 30, dataDisk: 50, expandable: 107, gpuDriver: '580.76.05', cudaVersion: '≤ 13.0',
    pricePerHour: 2.29, memberPrice: 2.18, availableUntil: '2027-08-01', tag: 'longterm',
  },
  {
    id: '251机', nodeId: '9f9b4d89cc', region: '北京B区', gpuModel: 'RTX 4090', gpuMemory: '24 GB',
    gpuAvailable: 1, gpuTotal: 8, cpuCores: 16, cpuModel: 'Xeon(R) Gold 6430', memory: 120,
    systemDisk: 30, dataDisk: 50, expandable: 20, gpuDriver: '560.35.03', cudaVersion: '≤ 12.6',
    pricePerHour: 2.29, memberPrice: 2.18, availableUntil: '2026-05-01', tag: 'longterm',
  },
]

export default function MarketListPage() {
  const router = useRouter()
  const [billingType, setBillingType] = useState('hourly')
  const [selectedRegion, setSelectedRegion] = useState('beijing-b')
  const [selectedGpuModels, setSelectedGpuModels] = useState<string[]>([])
  const [gpuCount, setGpuCount] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')
  
  const { machines: apiMachines, loading, refresh } = useMarketMachines()
  
  // 合并API数据和本地数据
  const displayMachines = apiMachines.length > 0 ? apiMachines : machines
  const totalItems = displayMachines.length > 0 ? 626 : 0
  const totalPages = Math.ceil(totalItems / parseInt(pageSize))

  const toggleGpuModel = (modelId: string) => {
    if (modelId === 'all') {
      setSelectedGpuModels([])
      return
    }
    setSelectedGpuModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    )
  }

  const handleRent = (machine: typeof machines[0]) => {
    const params = new URLSearchParams({
      nodeId: machine.nodeId,
      machineId: machine.id,
      gpuModel: machine.gpuModel,
      gpuCount: gpuCount.toString(),
      billingType,
    })
    router.push(`/instances/create/config?${params.toString()}`)
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
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {regions.map((region) => (
                  <Button
                    key={region.id}
                    variant={selectedRegion === region.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRegion(region.id)}
                    className={cn(
                      "h-8 px-4 transition-all",
                      selectedRegion === region.id 
                        ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md' 
                        : 'hover:bg-primary/5'
                    )}
                  >
                    {region.name}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {specialZones.map((zone) => (
                  <Button key={zone.id} variant="outline" size="sm" className="h-8 px-4">
                    {zone.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* GPU型号 */}
          <div className="flex items-start">
            <span className="text-muted-foreground w-20 shrink-0 pt-0.5">GPU型号：</span>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {gpuModels.map((model) => (
                <label key={model.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <div
                    className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                      (model.id === 'all' && selectedGpuModels.length === 0) || selectedGpuModels.includes(model.id)
                        ? 'bg-primary border-primary' : 'border-border dark:border-muted'
                    )}
                    onClick={() => toggleGpuModel(model.id)}
                  >
                    {((model.id === 'all' && selectedGpuModels.length === 0) || selectedGpuModels.includes(model.id)) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span>
                    {model.name}
                    {model.available !== undefined && (
                      <span className="text-muted-foreground"> ({model.available}/{model.total})</span>
                    )}
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
                  onClick={() => setGpuCount(count)}
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
        ) : displayMachines.map((machine) => (
          <Card key={machine.id} className="border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group overflow-hidden">
            <CardContent className="p-5 relative">
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
              
              {/* 顶部信息行 */}
              <div className="flex items-center justify-between mb-3 relative">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{machine.region} / {machine.id}</span>
                  <span className="bg-muted px-2 py-0.5 rounded text-xs">{machine.nodeId}</span>
                  <span>可租用至：{machine.availableUntil}</span>
                </div>
                {machine.tag === 'cache' && (
                  <div className="flex items-center gap-1 text-orange-500 text-xs bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded">
                    <Zap className="h-3.5 w-3.5" />
                    <span>缓存优化</span>
                  </div>
                )}
                {machine.tag === 'longterm' && (
                  <div className="flex items-center gap-1 text-emerald-500 text-xs bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">
                    <RefreshCcw className="h-3.5 w-3.5" />
                    <span>长租特惠</span>
                  </div>
                )}
              </div>

              {/* GPU信息行 */}
              <div className="flex items-baseline gap-12 mb-4 relative">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <span className="text-xl font-semibold">{machine.gpuModel} / {machine.gpuMemory}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  空闲/总量 <span className="text-2xl font-bold text-primary">{machine.gpuAvailable}</span>
                  <span className="text-muted-foreground"> / {machine.gpuTotal}</span>
                </div>
              </div>

              {/* 配置详情 */}
              <div className="flex items-start relative">
                <div className="flex-1 grid grid-cols-3 gap-x-8 text-sm">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-muted-foreground mb-1.5 font-medium">每GPU分配</div>
                    <div>CPU: {machine.cpuCores} 核，{machine.cpuModel}</div>
                    <div>内存: {machine.memory} GB</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-muted-foreground mb-1.5 font-medium">硬盘</div>
                    <div>系统盘: {machine.systemDisk} GB</div>
                    <div>数据盘: {machine.dataDisk} GB，可扩容 {machine.expandable} GB</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-muted-foreground mb-1.5 font-medium">其它</div>
                    <div>GPU驱动: {machine.gpuDriver}</div>
                    <div className="flex items-center gap-1">
                      CUDA版本: {machine.cudaVersion}
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>

                {/* 价格区 */}
                <div className="w-40 text-right">
                  <div>
                    <span className="text-orange-500 text-3xl font-bold">¥{machine.pricePerHour}</span>
                    <span className="text-muted-foreground text-sm">/时</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    会员最低享9.5折 ¥{machine.memberPrice}/时
                  </div>
                  <Button 
                    className="mt-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl transition-all" 
                    size="sm" 
                    onClick={() => handleRent(machine)}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    {machine.gpuAvailable}卡可租
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-center gap-4 py-4">
        <span className="text-sm text-muted-foreground">共 {totalItems} 条</span>
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
          {[1, 2, 3, 4, 5, 6].map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <span className="px-2">...</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(totalPages)}
          >
            {totalPages}
          </Button>
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
        <Select value={pageSize} onValueChange={setPageSize}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10条/页</SelectItem>
            <SelectItem value="20">20条/页</SelectItem>
            <SelectItem value="50">50条/页</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm">
          <span>前往</span>
          <input
            type="number"
            className="w-12 h-8 px-2 border rounded text-center"
            min={1}
            max={totalPages}
            defaultValue={1}
          />
          <span>页</span>
        </div>
      </div>

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
