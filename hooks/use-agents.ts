import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'

// ====== 类型定义 ======

// 智能体能力开关（来自镜像 config.capabilities，缺省语义见后端）
export interface AgentCapabilities {
  model_keys?: boolean
  channels?: boolean
  skills?: boolean
  monitor?: boolean
}

// 镜像声明式 config（category='agent' 的预置镜像）
export interface AgentImageConfig {
  agent_type?: string
  command?: string[]
  data_mount_path?: string
  port?: number
  dashboard?: { enabled?: boolean; port?: number; auth?: string }
  probe?: { type?: string; port?: number; health_path?: string; ready_path?: string }
  shm_size_gb?: number
  model_key_env?: string
  // 通道类型 → { config 字段名: 环境变量名 }，键集合即前端可选通道类型
  channel_env_template?: Record<string, Record<string, string>>
  capabilities?: AgentCapabilities
  weixin_setup_command?: string[]
}

export interface AgentInstance {
  id: string
  name: string
  status: 'creating' | 'running' | 'stopped' | 'error' | 'releasing' | 'released' | 'expired'
  agent_type?: string
  image_id?: string
  image_name?: string
  image_icon?: string
  namespace: string
  node_name?: string
  node_type: 'center' | 'edge'
  cpu_cores: number
  memory_gb: number
  disk_gb: number
  data_mount_path?: string
  image_url?: string
  port: number
  deployment_name?: string
  service_name?: string
  internal_ip?: string
  gateway_token?: string
  dashboard_auth?: string  // JSON 字符串 {"username","password"}
  billing_type?: 'hourly' | 'monthly' | 'yearly'
  hourly_price?: number
  expired_at?: string
  started_at?: string
  created_at: string
  updated_at?: string
  // K8s 运行时信息（仅详情端点 GET /agents/instances/{id} 富化返回）
  pod_node_name?: string
  deployment_info?: {
    name?: string
    replicas?: number
    ready_replicas?: number
    available_replicas?: number
    updated_replicas?: number
    images?: string[]
    created_at?: string
  } | null
  pod_info?: Array<{
    name?: string
    status?: string
    ip?: string
    node_name?: string
    restart_count?: number
    is_terminating?: boolean
  }>
  // 管理端接口富化字段（GET /admin/agents/instances 列表与详情）
  user_id?: string
  user_email?: string
  pod_status?: string | null
  pod_ip?: string | null
  pod_node?: string | null
  host_ip?: string
  restart_count?: number
}

export interface ModelKey {
  id: string
  instance_id: string
  provider: string
  alias?: string
  api_key_masked?: string
  api_key?: string
  base_url?: string
  model_name?: string
  is_active: boolean
  last_check_at?: string
  check_status?: string
  balance?: number
  tokens_used?: number
  created_at: string
}

export interface Channel {
  id: string
  instance_id: string
  type: string
  name?: string
  config?: string
  is_active: boolean
  online_status?: string
  last_check_at?: string
  created_at: string
}

export interface AgentSkill {
  id: string
  instance_id: string
  name: string
  description?: string
  status: 'installed' | 'installing' | 'uninstalling' | 'error'
  version?: string
  installed_at?: string
  created_at: string
}

export interface MonitorStatus {
  instance_id: string
  status: string
  internal_ip?: string
  port?: number
  gateway_version?: string
  uptime?: number
  session_count?: number
  model_keys_total?: number
  model_keys_ok?: number
  channels_total?: number
  channels_online?: number
  skills_installed?: number
  health: boolean
  ready: boolean
  // K8s 资源监控
  cpu_usage_millicores?: number | null
  memory_usage_bytes?: number | null
  cpu_cores?: number | null
  memory_gb?: number | null
}

// 预置智能体镜像（config 已解析）
export interface AgentImage {
  id: string
  name: string
  tag: string
  category: string
  description?: string
  icon?: string
  image_url?: string
  size_gb?: number
  config: AgentImageConfig
}

// 微信扫码会话状态
export interface WeixinQrcodeStatus {
  status: 'none' | 'pending' | 'scanned' | 'confirmed' | 'expired' | 'failed'
  message: string
  qrcode_url: string
  account_id?: string
  channel_id?: string | null
}

interface ListResponse<T> { list: T[]; total: number }

// ====== 预置智能体镜像（category=agent，config 声明差异参数）======

export function useAgentImages() {
  const [images, setImages] = useState<AgentImage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get<ListResponse<any>>('/images', { category: 'agent', size: '100' })
      const list = (data.list || []).map((img: any): AgentImage => {
        let cfg: AgentImageConfig = {}
        if (img.config) {
          try { cfg = typeof img.config === 'string' ? JSON.parse(img.config) : img.config } catch { cfg = {} }
        }
        return {
          id: img.id,
          name: img.name,
          tag: img.tag,
          category: img.category,
          description: img.description,
          icon: img.icon,
          image_url: img.image_url,
          size_gb: img.size_gb,
          config: cfg,
        }
      })
      setImages(list)
    } catch {
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchImages() }, [fetchImages])

  return { images, loading, refresh: fetchImages }
}

// ====== 实例列表 ======

export function useAgentInstances() {
  const [instances, setInstances] = useState<AgentInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchInstances = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const { data } = await api.get<ListResponse<AgentInstance>>('/agents/instances')
      setInstances(data.list || [])
      setTotal(data.total || 0)
    } catch {
      if (!silent) setInstances([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const silentRefresh = useCallback(() => fetchInstances(true), [fetchInstances])
  useEffect(() => { fetchInstances() }, [fetchInstances])

  const createInstance = async (body: {
    name: string
    image_id: string
    node_type?: string
    cpu_cores?: number
    memory_gb?: number
    disk_gb?: number
    image_url?: string
    port?: number
    node_name?: string
    billing_type?: string
    duration_months?: number
    model_keys?: Array<{ provider: string; alias?: string; api_key: string; base_url?: string; model_name?: string }>
    channels?: Array<{ type: string; name?: string; config?: string }>
    skills?: Array<{ name: string; description?: string; version?: string }>
  }) => {
    const { data } = await api.post<AgentInstance>('/agents/instances', body)
    await fetchInstances(true)
    return data
  }

  const startInstance = async (id: string) => {
    await api.post(`/agents/instances/${id}/start`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'creating' as const } : i))
  }

  const stopInstance = async (id: string) => {
    await api.post(`/agents/instances/${id}/stop`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' as const } : i))
  }

  const deleteInstance = async (id: string) => {
    await api.delete(`/agents/instances/${id}`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'releasing' as const } : i))
  }

  const forceDeleteInstance = async (id: string) => {
    await api.post(`/agents/instances/${id}/force`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'released' as const } : i))
  }

  return { instances, loading, total, refresh: fetchInstances, silentRefresh, createInstance, startInstance, stopInstance, deleteInstance, forceDeleteInstance }
}

// ====== 实例详情 ======

export function useAgentInstance(instanceId: string) {
  const [instance, setInstance] = useState<AgentInstance | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInstance = useCallback(async (silent = false) => {
    if (!instanceId) return
    try {
      if (!silent) setLoading(true)
      const { data } = await api.get<AgentInstance>(`/agents/instances/${instanceId}`)
      setInstance(data)
    } catch {
      setInstance(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [instanceId])

  useEffect(() => { fetchInstance() }, [fetchInstance])

  const silentRefresh = useCallback(() => fetchInstance(true), [fetchInstance])

  const startInstance = async () => {
    await api.post(`/agents/instances/${instanceId}/start`)
    setInstance(prev => prev ? { ...prev, status: 'creating' } : null)
  }
  const stopInstance = async () => {
    await api.post(`/agents/instances/${instanceId}/stop`)
    setInstance(prev => prev ? { ...prev, status: 'stopped' } : null)
  }
  const restartInstance = async () => {
    await api.post(`/agents/instances/${instanceId}/restart`)
  }
  const renameInstance = async (name: string) => {
    await api.patch(`/agents/instances/${instanceId}/rename`, { name })
    setInstance(prev => prev ? { ...prev, name } : null)
  }
  const deleteInstance = async () => {
    await api.delete(`/agents/instances/${instanceId}`)
    setInstance(prev => prev ? { ...prev, status: 'releasing' } : null)
  }
  const updateSpec = async (body: { cpu_cores?: number; memory_gb?: number; disk_gb?: number }) => {
    const { data } = await api.patch<AgentInstance>(`/agents/instances/${instanceId}/spec`, body)
    setInstance(data)
    return data
  }

  return { instance, loading, refresh: fetchInstance, silentRefresh, startInstance, stopInstance, restartInstance, renameInstance, deleteInstance, updateSpec }
}

// ====== 大模型密钥 ======

export function useAgentModelKeys(instanceId: string) {
  const [keys, setKeys] = useState<ModelKey[]>([])
  const [loading, setLoading] = useState(true)

  const fetchKeys = useCallback(async () => {
    if (!instanceId) return
    try {
      setLoading(true)
      const { data } = await api.get<ModelKey[]>(`/agents/instances/${instanceId}/model-keys`)
      setKeys(Array.isArray(data) ? data : [])
    } catch {
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const addKey = async (body: { provider: string; alias?: string; api_key: string; base_url?: string; model_name?: string }) => {
    await api.post(`/agents/instances/${instanceId}/model-keys`, body)
    await fetchKeys()
  }
  const updateKey = async (keyId: string, body: { alias?: string; api_key?: string; base_url?: string; model_name?: string; is_active?: boolean }) => {
    await api.put(`/agents/instances/${instanceId}/model-keys/${keyId}`, body)
    await fetchKeys()
  }
  const deleteKey = async (keyId: string) => {
    await api.delete(`/agents/instances/${instanceId}/model-keys/${keyId}`)
    await fetchKeys()
  }

  return { keys, loading, refresh: fetchKeys, addKey, updateKey, deleteKey }
}

// ====== 通道配置 ======

export function useAgentChannels(instanceId: string) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!instanceId) return
    try {
      setLoading(true)
      const { data } = await api.get<Channel[]>(`/agents/instances/${instanceId}/channels`)
      setChannels(Array.isArray(data) ? data : [])
    } catch {
      setChannels([])
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  const addChannel = async (body: { type: string; name?: string; config?: string }) => {
    await api.post(`/agents/instances/${instanceId}/channels`, body)
    await fetchChannels()
  }
  const updateChannel = async (channelId: string, body: { name?: string; config?: string; is_active?: boolean }) => {
    await api.put(`/agents/instances/${instanceId}/channels/${channelId}`, body)
    await fetchChannels()
  }
  const deleteChannel = async (channelId: string) => {
    await api.delete(`/agents/instances/${instanceId}/channels/${channelId}`)
    await fetchChannels()
  }

  return { channels, loading, refresh: fetchChannels, addChannel, updateChannel, deleteChannel }
}

// ====== 微信扫码连接（平台代理：后端 exec 运行向导，前端渲染二维码 + 轮询状态）======

export function useWeixinQrcode(instanceId: string) {
  const [session, setSession] = useState<WeixinQrcodeStatus | null>(null)
  const [starting, setStarting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const fetchStatus = useCallback(async (): Promise<WeixinQrcodeStatus | null> => {
    if (!instanceId) return null
    try {
      const { data } = await api.get<WeixinQrcodeStatus>(`/agents/instances/${instanceId}/channels/weixin/qrcode/status`)
      setSession(data)
      return data
    } catch {
      return null
    }
  }, [instanceId])

  const startPolling = useCallback(() => {
    stopPolling()
    fetchStatus()
    timerRef.current = setInterval(async () => {
      const d = await fetchStatus()
      if (d && ['confirmed', 'expired', 'failed', 'none'].includes(d.status)) stopPolling()
    }, 2500)
  }, [fetchStatus, stopPolling])

  const start = useCallback(async () => {
    if (!instanceId) return
    setStarting(true)
    try {
      await api.post(`/agents/instances/${instanceId}/channels/weixin/qrcode`)
      startPolling()
    } finally {
      setStarting(false)
    }
  }, [instanceId, startPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  return { session, starting, start, refresh: fetchStatus, startPolling, stopPolling }
}

// ====== Skills ======

export function useAgentSkills(instanceId: string) {
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSkills = useCallback(async () => {
    if (!instanceId) return
    try {
      setLoading(true)
      const { data } = await api.get<AgentSkill[]>(`/agents/instances/${instanceId}/skills`)
      setSkills(Array.isArray(data) ? data : [])
    } catch {
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  const installSkill = async (body: { name: string; description?: string; version?: string }) => {
    await api.post(`/agents/instances/${instanceId}/skills`, body)
    await fetchSkills()
  }
  const updateSkill = async (skillId: string, body: { version?: string; description?: string }) => {
    await api.put(`/agents/instances/${instanceId}/skills/${skillId}`, body)
    await fetchSkills()
  }
  const uninstallSkill = async (skillName: string) => {
    await api.delete(`/agents/instances/${instanceId}/skills/${skillName}`)
    await fetchSkills()
  }

  return { skills, loading, refresh: fetchSkills, installSkill, updateSkill, uninstallSkill }
}

// ====== 监控 ======

export function useAgentMonitor(instanceId: string) {
  const [monitorModels, setMonitorModels] = useState<any[]>([])
  const [monitorChannels, setMonitorChannels] = useState<any[]>([])
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMonitor = useCallback(async () => {
    if (!instanceId) return
    try {
      setLoading(true)
      const [modelsRes, channelsRes, statusRes] = await Promise.allSettled([
        api.get<any[]>(`/agents/instances/${instanceId}/monitor/models`),
        api.get<any[]>(`/agents/instances/${instanceId}/monitor/channels`),
        api.get<MonitorStatus>(`/agents/instances/${instanceId}/monitor/status`),
      ])
      if (modelsRes.status === 'fulfilled') setMonitorModels(Array.isArray(modelsRes.value.data) ? modelsRes.value.data : [])
      if (channelsRes.status === 'fulfilled') setMonitorChannels(Array.isArray(channelsRes.value.data) ? channelsRes.value.data : [])
      if (statusRes.status === 'fulfilled') setMonitorStatus(statusRes.value.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [instanceId])

  useEffect(() => { fetchMonitor() }, [fetchMonitor])

  return { monitorModels, monitorChannels, monitorStatus, loading, refresh: fetchMonitor }
}

// ====== 日志 ======

export function useAgentLogs(instanceId: string) {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async (tail = 200) => {
    if (!instanceId) return
    try {
      setLoading(true)
      const { data } = await api.get<{ logs: string }>(`/agents/instances/${instanceId}/logs`, { tail })
      setLogs(data.logs || '')
    } catch {
      setLogs('[Error] 获取日志失败')
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return { logs, loading, refresh: fetchLogs }
}

// ====== 管理端 - 全部实例 ======

export function useAdminAgentInstances() {
  const [instances, setInstances] = useState<AgentInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchInstances = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const { data } = await api.get<ListResponse<AgentInstance>>('/admin/agents/instances')
      setInstances(data.list || [])
      setTotal(data.total || 0)
    } catch {
      if (!silent) setInstances([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInstances() }, [fetchInstances])

  return { instances, loading, total, refresh: fetchInstances }
}
