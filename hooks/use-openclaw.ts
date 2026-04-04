import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

// ====== 类型定义 ======

export interface OpenClawInstance {
  id: string
  name: string
  status: 'creating' | 'running' | 'stopped' | 'error' | 'releasing' | 'released' | 'expired'
  namespace: string
  node_name?: string
  node_type: 'center' | 'edge'
  cpu_cores: number
  memory_gb: number
  disk_gb: number
  image_url?: string
  port: number
  deployment_name?: string
  service_name?: string
  internal_ip?: string
  gateway_token?: string
  billing_type?: 'hourly' | 'monthly' | 'yearly'
  hourly_price?: number
  expired_at?: string
  started_at?: string
  created_at: string
  updated_at?: string
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

export interface OpenClawSkill {
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
}

interface ListResponse<T> { list: T[]; total: number }

// ====== 实例列表 ======

export function useOpenClawInstances() {
  const [instances, setInstances] = useState<OpenClawInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchInstances = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const { data } = await api.get<ListResponse<OpenClawInstance>>('/openclaw/instances')
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
    const { data } = await api.post<OpenClawInstance>('/openclaw/instances', body)
    await fetchInstances(true)
    return data
  }

  const startInstance = async (id: string) => {
    await api.post(`/openclaw/instances/${id}/start`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'creating' as const } : i))
  }

  const stopInstance = async (id: string) => {
    await api.post(`/openclaw/instances/${id}/stop`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' as const } : i))
  }

  const deleteInstance = async (id: string) => {
    await api.delete(`/openclaw/instances/${id}`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'releasing' as const } : i))
  }

  return { instances, loading, total, refresh: fetchInstances, silentRefresh, createInstance, startInstance, stopInstance, deleteInstance }
}

// ====== 实例详情 ======

export function useOpenClawInstance(instanceId: string) {
  const [instance, setInstance] = useState<OpenClawInstance | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInstance = useCallback(async () => {
    if (!instanceId) return
    try {
      setLoading(true)
      const { data } = await api.get<OpenClawInstance>(`/openclaw/instances/${instanceId}`)
      setInstance(data)
    } catch {
      setInstance(null)
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => { fetchInstance() }, [fetchInstance])

  const startInstance = async () => {
    await api.post(`/openclaw/instances/${instanceId}/start`)
    setInstance(prev => prev ? { ...prev, status: 'creating' } : null)
  }
  const stopInstance = async () => {
    await api.post(`/openclaw/instances/${instanceId}/stop`)
    setInstance(prev => prev ? { ...prev, status: 'stopped' } : null)
  }
  const deleteInstance = async () => {
    await api.delete(`/openclaw/instances/${instanceId}`)
    setInstance(prev => prev ? { ...prev, status: 'releasing' } : null)
  }
  const updateSpec = async (body: { cpu_cores?: number; memory_gb?: number; disk_gb?: number }) => {
    const { data } = await api.patch<OpenClawInstance>(`/openclaw/instances/${instanceId}/spec`, body)
    setInstance(data)
    return data
  }

  return { instance, loading, refresh: fetchInstance, startInstance, stopInstance, deleteInstance, updateSpec }
}

// ====== 大模型密钥 ======

export function useOpenClawModelKeys(instanceId: string) {
  const [keys, setKeys] = useState<ModelKey[]>([])
  const [loading, setLoading] = useState(true)

  const fetchKeys = useCallback(async () => {
    if (!instanceId) return
    try {
      setLoading(true)
      const { data } = await api.get<ModelKey[]>(`/openclaw/instances/${instanceId}/model-keys`)
      setKeys(Array.isArray(data) ? data : [])
    } catch {
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const addKey = async (body: { provider: string; alias?: string; api_key: string; base_url?: string; model_name?: string }) => {
    await api.post(`/openclaw/instances/${instanceId}/model-keys`, body)
    await fetchKeys()
  }
  const updateKey = async (keyId: string, body: { alias?: string; api_key?: string; base_url?: string; model_name?: string; is_active?: boolean }) => {
    await api.put(`/openclaw/instances/${instanceId}/model-keys/${keyId}`, body)
    await fetchKeys()
  }
  const deleteKey = async (keyId: string) => {
    await api.delete(`/openclaw/instances/${instanceId}/model-keys/${keyId}`)
    await fetchKeys()
  }

  return { keys, loading, refresh: fetchKeys, addKey, updateKey, deleteKey }
}

// ====== 通道配置 ======

export function useOpenClawChannels(instanceId: string) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!instanceId) return
    try {
      setLoading(true)
      const { data } = await api.get<Channel[]>(`/openclaw/instances/${instanceId}/channels`)
      setChannels(Array.isArray(data) ? data : [])
    } catch {
      setChannels([])
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  const addChannel = async (body: { type: string; name?: string; config?: string }) => {
    await api.post(`/openclaw/instances/${instanceId}/channels`, body)
    await fetchChannels()
  }
  const updateChannel = async (channelId: string, body: { name?: string; config?: string; is_active?: boolean }) => {
    await api.put(`/openclaw/instances/${instanceId}/channels/${channelId}`, body)
    await fetchChannels()
  }
  const deleteChannel = async (channelId: string) => {
    await api.delete(`/openclaw/instances/${instanceId}/channels/${channelId}`)
    await fetchChannels()
  }

  return { channels, loading, refresh: fetchChannels, addChannel, updateChannel, deleteChannel }
}

// ====== Skills ======

export function useOpenClawSkills(instanceId: string) {
  const [skills, setSkills] = useState<OpenClawSkill[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSkills = useCallback(async () => {
    if (!instanceId) return
    try {
      setLoading(true)
      const { data } = await api.get<OpenClawSkill[]>(`/openclaw/instances/${instanceId}/skills`)
      setSkills(Array.isArray(data) ? data : [])
    } catch {
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  const installSkill = async (body: { name: string; description?: string; version?: string }) => {
    await api.post(`/openclaw/instances/${instanceId}/skills`, body)
    await fetchSkills()
  }
  const uninstallSkill = async (skillName: string) => {
    await api.delete(`/openclaw/instances/${instanceId}/skills/${skillName}`)
    await fetchSkills()
  }

  return { skills, loading, refresh: fetchSkills, installSkill, uninstallSkill }
}

// ====== 监控 ======

export function useOpenClawMonitor(instanceId: string) {
  const [monitorModels, setMonitorModels] = useState<any[]>([])
  const [monitorChannels, setMonitorChannels] = useState<any[]>([])
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMonitor = useCallback(async () => {
    if (!instanceId) return
    try {
      setLoading(true)
      const [modelsRes, channelsRes, statusRes] = await Promise.allSettled([
        api.get<any[]>(`/openclaw/instances/${instanceId}/monitor/models`),
        api.get<any[]>(`/openclaw/instances/${instanceId}/monitor/channels`),
        api.get<MonitorStatus>(`/openclaw/instances/${instanceId}/monitor/status`),
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

export function useOpenClawLogs(instanceId: string) {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async (tail = 200) => {
    if (!instanceId) return
    try {
      setLoading(true)
      const { data } = await api.get<{ logs: string }>(`/openclaw/instances/${instanceId}/logs`, { tail })
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

export function useAdminOpenClawInstances() {
  const [instances, setInstances] = useState<OpenClawInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchInstances = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const { data } = await api.get<ListResponse<OpenClawInstance>>('/admin/openclaw/instances')
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
