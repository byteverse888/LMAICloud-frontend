'use client'

import { useEffect, useState } from 'react'
import { Power, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import type { Instance, InstanceStartOptions } from '@/hooks/use-api'

interface StartOptionsDialogProps {
  /** 非 null 即打开弹窗，同时作为回填默认值的数据源 */
  instance: Instance | null
  onClose: () => void
  /**
   * 执行确认。由调用方发请求，因为列表页与详情页的接口签名不同
   * （列表页需传 id，详情页 hook 已绑定 id）。抛错则弹窗保持打开供用户改小规格重试。
   */
  onConfirm: (opts: InstanceStartOptions) => Promise<void>
  /** start=确认即开机（默认）；adjust=仅保存规格不开机，下次开机生效 */
  mode?: 'start' | 'adjust'
}

/**
 * 开机选项 / 调整规格弹窗 —— 两种模式共用一份表单。
 *
 * 实例的 nodeName 硬绑创建时的节点、数据盘是该节点本地目录，换节点等于丢数据，
 * 所以资源不够时唯一的出路是降低规格：无卡模式（不要 GPU）或调小 CPU/内存。
 * 购买规格不变，它是计价基准；这里选的是「运行态规格」。
 * adjust 模式用于关机态预先改规格（无卡↔带卡、CPU/内存），下次开机生效；
 * 无卡创建的实例没有 GPU 选项，天然无法切成带卡（后端同样拦截）。
 */
export function StartOptionsDialog({ instance, onClose, onConfirm, mode = 'start' }: StartOptionsDialogProps) {
  const isAdjust = mode === 'adjust'
  const [noGpu, setNoGpu] = useState(false)
  const [cpu, setCpu] = useState('')
  const [mem, setMem] = useState('')
  const [starting, setStarting] = useState(false)

  // 打开时按上次运行态回填：上次是无卡模式就保持勾选，用户主动取消勾选才恢复带卡
  useEffect(() => {
    if (!instance) return
    setNoGpu(instance.gpu_count > 0 && instance.runtime_gpu_count === 0)
    setCpu(String(instance.runtime_cpu_cores ?? instance.cpu_cores))
    setMem(String(instance.runtime_memory ?? instance.memory))
  }, [instance])

  const hasGpu = (instance?.gpu_count ?? 0) > 0
  // 包月/包年周期费用已预付，改规格会破坏已付金额与实际用量的对应关系，故禁止改 CPU/内存
  const isPeriod = ['monthly', 'yearly'].includes(instance?.billing_type || '')

  const handleConfirm = async () => {
    if (!instance) return
    const opts: InstanceStartOptions = {}
    // GPU 实例必须显式传 no_gpu：传 false 才是「恢复带卡」，不传等于沿用上次运行态
    if (hasGpu) opts.no_gpu = noGpu
    if (!isPeriod) {
      const c = parseInt(cpu, 10)
      const m = parseInt(mem, 10)
      if (!c || c < 1 || c > 64) { toast.error('CPU 核数需在 1 ~ 64 之间'); return }
      if (!m || m < 1 || m > 256) { toast.error('内存需在 1 ~ 256 GB 之间'); return }
      opts.cpu_cores = c
      opts.memory_gb = m
    }
    try {
      setStarting(true)
      await onConfirm(opts)
      if (isAdjust) {
        toast.success('规格已调整，将在下次开机时生效')
      } else {
        toast.success(opts.no_gpu ? '实例正以无卡模式启动中（不分配 GPU）' : '实例启动中')
      }
      onClose()
    } catch {
      // 不弹通用文案：失败的真实原因（如「所需 GPU 已被其他实例占用，可用无卡模式启动」）
      // 已由 lib/api.ts 统一 toast 后端 detail，这里再弹一条只会盖掉有用信息
    } finally {
      setStarting(false)
    }
  }

  return (
    <Dialog open={!!instance} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[470px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Power className="h-5 w-5 text-emerald-600" /> {isAdjust ? '调整规格' : '开机'} - {instance?.name}
          </DialogTitle>
          <DialogDescription>
            {isAdjust
              ? '调整 CPU / 内存或切换有卡 / 无卡模式，保存后不开机，下次开机按新规格生效并计费。'
              : '直接确认即按上次运行规格开机。若提示资源不足（原节点已被其他实例占满），可在下方降低本次开机的规格。实例始终在原节点开机，数据盘内容不会变动。'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {hasGpu && (
            <label className="flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
              <Checkbox checked={noGpu} onCheckedChange={(v) => setNoGpu(v === true)} className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium">{isAdjust ? '切换为无卡模式（下次开机不分配 GPU）' : '无卡模式启动（本次不分配 GPU）'}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {isAdjust
                    ? `无卡期间仅按 CPU / 内存计费；取消勾选即恢复 ${instance?.gpu_model} × ${instance?.gpu_count}（含 GPU 费用）。`
                    : <>GPU 已被其他实例占用时，用它进入容器取回数据、整理文件。本次不收 GPU 费用
                  {isPeriod ? '（包月/包年费用已预付，不影响已付金额）' : '，仅按 CPU / 内存计费'}；
                  下次开机取消勾选即恢复 {instance?.gpu_model} × {instance?.gpu_count}。</>}
                </span>
              </span>
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start-opt-cpu" className="mb-1.5 block text-xs">CPU（核）</Label>
              <Input id="start-opt-cpu" type="number" min={1} max={64} value={cpu}
                onChange={e => setCpu(e.target.value)} disabled={isPeriod} />
            </div>
            <div>
              <Label htmlFor="start-opt-mem" className="mb-1.5 block text-xs">内存（GB）</Label>
              <Input id="start-opt-mem" type="number" min={1} max={256} value={mem}
                onChange={e => setMem(e.target.value)} disabled={isPeriod} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {isPeriod
              ? '包月/包年实例的 CPU / 内存在周期内不可调整（费用已预付），如需改配请到期后重新创建。'
              : `购买规格 ${instance?.cpu_cores}核 / ${instance?.memory}GB。${isAdjust ? '保存后按新规格计费（下次开机生效），可随时再改回。' : '调整后按新规格计费，下次开机可再改回。'}`}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={starting}>取消</Button>
          <Button onClick={handleConfirm} disabled={starting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {starting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isAdjust ? '保存规格' : '确认开机'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
