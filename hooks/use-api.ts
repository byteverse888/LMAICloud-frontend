import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

/** 从 zustand persist 存储中获取 token（兼容组件外调用） */
function getPersistedToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.token || null
  } catch {
    return null
  }
}

// 实例类型定义
export interface Instance {
  id: string
  name: string
  status: 'running' | 'stopped' | 'creating' | 'starting' | 'stopping' | 'error' | 'releasing' | 'released'
  gpu_model: string
  gpu_count: number
  cpu_cores: number
  memory: number
  disk: number
  image_id?: string
  billing_type: string
  hourly_price: number
  created_at: string
  started_at?: string
  node_id: string
  node_type?: string
  resource_type?: string
  internal_ip?: string
  instance_count?: number
  image_url?: string
  startup_command?: string
  env_vars?: string
  storage_mounts?: string
  pip_source?: string
  conda_source?: string
  apt_source?: string
  auto_shutdown_type?: string
  auto_shutdown_minutes?: number
  auto_release_type?: string
  auto_release_minutes?: number
  deployment_yaml?: string
  // Deployment 运行时信息（由后端 K8s 查询注入）
  deployment_name?: string
  replicas?: number | null
  ready_replicas?: number | null
  available_replicas?: number | null
  // 详情页: Deployment 完整信息
  deployment_info?: {
    name: string
    replicas: number
    ready_replicas: number
    available_replicas: number
    updated_replicas: number
    images: string[]
    conditions: Array<{ type: string; status: string; reason?: string; message?: string }>
    strategy: string
    created_at?: string
  } | null
  // 详情页: 关联 Pod 列表
  pod_info?: Array<{
    name: string
    status: string
    ip?: string
    node_name?: string
    restart_count: number
    is_terminating: boolean
    containers?: any[]
  }>
}

// 镜像类型定义
export interface Image {
  id: string
  name: string
  tag: string
  size_gb: number
  type: 'base' | 'app' | 'community' | 'custom'
  description?: string
  image_url?: string
  created_at: string
}

// 存储类型定义
export interface StorageQuotaData {
  used: number
  total: number
  remaining: number
  used_percent: number
  file_count: number
  max_file_count: number
  max_upload_size: number
}

export interface UserFileItem {
  id: string
  name: string
  path: string
  is_dir: boolean
  size: number
  mime_type?: string
  storage_backend?: string
  created_at: string
  updated_at: string
}

interface ListResponse<T> { list: T[]; total: number; page: number; size: number }

// ====== 实例相关 hooks ======
export function useInstances() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // silent=true 时不触发 loading 状态，用于轮询/WS 静默刷新，避免表格闪烁
  const fetchInstances = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const { data } = await api.get<ListResponse<Instance>>('/instances')
      setInstances(data.list || []); setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取实例列表失败')
      if (!silent) setInstances([
        { id: '1', name: 'GPU-Instance-1', status: 'running', gpu_model: 'RTX 4090', gpu_count: 1, cpu_cores: 16, memory: 64, disk: 50, billing_type: 'hourly', hourly_price: 2.39, created_at: new Date().toISOString(), node_id: 'node-1', node_type: 'center', resource_type: 'vGPU', internal_ip: '10.42.0.15' },
        { id: '2', name: 'GPU-Instance-2', status: 'stopped', gpu_model: 'RTX 5090', gpu_count: 2, cpu_cores: 32, memory: 128, disk: 100, billing_type: 'hourly', hourly_price: 6.06, created_at: new Date().toISOString(), node_id: 'node-2', node_type: 'edge', resource_type: 'vGPU', internal_ip: '10.42.0.22' },
      ])
    } finally { if (!silent) setLoading(false) }
  }, [])
  const silentRefresh = useCallback(() => fetchInstances(true), [fetchInstances])
  useEffect(() => { fetchInstances() }, [fetchInstances])
  const createInstance = async (data: Partial<Instance>) => {
    const { data: newInstance } = await api.post<Instance>('/instances', data)
    setInstances(prev => [...prev, newInstance]); return newInstance
  }
  const startInstance = async (id: string) => {
    await api.post(`/instances/${id}/start`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'starting' as const } : i))
  }
  const stopInstance = async (id: string) => {
    await api.post(`/instances/${id}/stop`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' as const } : i))
  }
  const deleteInstance = async (id: string) => {
    await api.delete(`/instances/${id}`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'releasing' as const } : i))
  }
  const forceDeleteInstance = async (id: string) => {
    // 优先用 POST（兼容严格反向代理不放行 DELETE 子路径的环境）
    // 后端同时注册了 POST /instances/{id}/force 和 DELETE /instances/{id}/force
    await api.post(`/instances/${id}/force`)
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'released' as const } : i))
  }
  return { instances, loading, error, refresh: fetchInstances, silentRefresh, createInstance, startInstance, stopInstance, deleteInstance, forceDeleteInstance }
}

// ====== 镜像相关 hooks ======
export function useImages() {
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchImages = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get<ListResponse<Image>>('/images')
      setImages(data.list || []); setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取镜像列表失败')
      setImages([
        { id: '1', name: 'PyTorch', tag: '2.1-cuda12.1', size_gb: 15, type: 'base', description: 'PyTorch 2.1 with CUDA 12.1', created_at: new Date().toISOString() },
        { id: '2', name: 'TensorFlow', tag: '2.15-cuda12.1', size_gb: 12, type: 'base', description: 'TensorFlow 2.15', created_at: new Date().toISOString() },
        { id: '3', name: 'DeepSeek-R1', tag: 'webui-v4', size_gb: 25, type: 'app', description: 'DeepSeek R1 WebUI', created_at: new Date().toISOString() },
      ])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchImages() }, [fetchImages])
  return { images, loading, error, refresh: fetchImages }
}

// ====== 存储相关 hooks ======
export function useStorage() {
  const [storages, setStorages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchStorage = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get<{ list: any[]; total: number }>('/storage')
      setStorages(data.list || []); setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取存储列表失败'); setStorages([])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchStorage() }, [fetchStorage])
  return { storages, loading, error, refresh: fetchStorage }
}

export function useStorageQuota() {
  const [quota, setQuota] = useState<StorageQuotaData | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchQuota = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get<StorageQuotaData>('/storage/quota')
      setQuota(data)
    } catch {
      setQuota({ used: 0, total: 10 * 1024 * 1024 * 1024, remaining: 10 * 1024 * 1024 * 1024, used_percent: 0, file_count: 0, max_file_count: 100, max_upload_size: 50 * 1024 * 1024 })
    }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchQuota() }, [fetchQuota])
  return { quota, loading, refresh: fetchQuota }
}

export function useBalance() {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const fetchBalance = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<{ balance: number }>('/billing/balance'); setBalance(data.balance) }
    catch { setBalance(156.05) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchBalance() }, [fetchBalance])
  return { balance, loading, refresh: fetchBalance }
}

// ====== GPU 市场数据 hooks ======
export function useMarketMachines(filters?: { region?: string; gpuModel?: string; gpuCount?: number }) {
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchMachines = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = {}
      if (filters?.region) params.region = filters.region
      if (filters?.gpuModel) params.gpu_model = filters.gpuModel
      if (filters?.gpuCount) params.gpu_count = filters.gpuCount
      const { data } = await api.get<{ list: any[]; total: number }>('/market/machines', params)
      setMachines(data.list || []); setTotal(data.total || 0)
    } catch {
      setMachines([
        { id: '876机', node_id: 'qvadxau6nv', region: '北京B区', gpu_model: 'RTX 4090D', gpu_memory: '24 GB', gpu_available: 1, gpu_total: 8, cpu_cores: 16, cpu_model: 'Xeon(R) Platinum 8352V', memory: 60, disk: 50, hourly_price: 1.98, member_price: 1.88 },
        { id: '472机', node_id: '73df479249', region: '北京B区', gpu_model: 'RTX 5090', gpu_memory: '32 GB', gpu_available: 1, gpu_total: 8, cpu_cores: 25, cpu_model: 'Xeon(R) Platinum 8470Q', memory: 90, disk: 50, hourly_price: 3.03, member_price: 2.39 },
      ]); setTotal(2)
    } finally { setLoading(false) }
  }, [filters?.region, filters?.gpuModel, filters?.gpuCount])
  useEffect(() => { fetchMachines() }, [fetchMachines])
  return { machines, loading, total, refresh: fetchMachines }
}

export function useRegions() {
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const f = async () => {
      try { const { data } = await api.get<{ regions: any[] }>('/market/regions'); setRegions(data.regions || []) }
      catch { setRegions([{ id: 'beijing-b', name: '北京B区' }, { id: 'beijing-a', name: '北京A区' }, { id: 'northwest-b', name: '西北B区' }]) }
      finally { setLoading(false) }
    }; f()
  }, [])
  return { regions, loading }
}

export function useGpuModels() {
  const [gpuModels, setGpuModels] = useState<{ id: string; name: string; available: number; total: number }[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const f = async () => {
      try { const { data } = await api.get<{ gpu_models: any[] }>('/market/gpu-models'); setGpuModels(data.gpu_models || []) }
      catch { setGpuModels([{ id: 'RTX 5090', name: 'RTX 5090', available: 100, total: 200 }, { id: 'RTX 4090', name: 'RTX 4090', available: 50, total: 100 }]) }
      finally { setLoading(false) }
    }; f()
  }, [])
  return { gpuModels, loading }
}

export function useOrders(page: number = 1, size: number = 20) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get<{ list: any[]; total: number }>('/billing/orders', { page, size })
      setOrders(data.list || []); setTotal(data.total || 0)
    } catch {
      setOrders([
        { id: '17340085070493927', created_at: '2024-12-12 21:01:47', type: 'create', status: 'pending', amount: 0 },
        { id: '17340082078379671', created_at: '2024-12-12 20:56:48', type: 'create', status: 'paid', amount: 10.5 },
      ]); setTotal(2)
    } finally { setLoading(false) }
  }, [page, size])
  useEffect(() => { fetchOrders() }, [fetchOrders])
  return { orders, loading, total, refresh: fetchOrders }
}

export function useUserBalance() {
  const [balance, setBalance] = useState(0)
  const [frozenBalance, setFrozenBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const fetchBalance = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<{ balance: number; frozen_balance: number }>('/users/me'); setBalance(data.balance || 0); setFrozenBalance(data.frozen_balance || 0) }
    catch { setBalance(156.05); setFrozenBalance(0) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchBalance() }, [fetchBalance])
  return { balance, frozenBalance, loading, refresh: fetchBalance }
}

// ====== 单个实例详情 hook ======
export function useInstance(instanceId: string) {
  const [instance, setInstance] = useState<Instance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchInstance = useCallback(async () => {
    if (!instanceId) return
    try { setLoading(true); const { data } = await api.get<Instance>(`/instances/${instanceId}`); setInstance(data); setError(null) }
    catch (err) { setError(err instanceof Error ? err.message : '获取实例详情失败') }
    finally { setLoading(false) }
  }, [instanceId])
  useEffect(() => { fetchInstance() }, [fetchInstance])
  const startInstance = async () => { await api.post(`/instances/${instanceId}/start`); setInstance(prev => prev ? { ...prev, status: 'starting' } : null) }
  const stopInstance = async () => { await api.post(`/instances/${instanceId}/stop`); setInstance(prev => prev ? { ...prev, status: 'stopping' } : null) }
  const releaseInstance = async () => { await api.delete(`/instances/${instanceId}`); setInstance(prev => prev ? { ...prev, status: 'releasing' } : null) }
  return { instance, loading, error, refresh: fetchInstance, startInstance, stopInstance, releaseInstance }
}

export function useInstanceLogs(instanceId: string, tail: number = 100) {
  const [logs, setLogs] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const fetchLogs = useCallback(async () => {
    if (!instanceId) return
    try { setLoading(true); const { data } = await api.get<{ logs: string }>(`/instances/${instanceId}/logs`, { tail }); setLogs(data.logs || '') }
    catch { setLogs('[Error] 获取日志失败') } finally { setLoading(false) }
  }, [instanceId, tail])
  useEffect(() => { fetchLogs() }, [fetchLogs])
  return { logs, loading, refresh: fetchLogs }
}

export function useInstanceStatus(instanceId: string) {
  const [podStatus, setPodStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const fetchStatus = useCallback(async () => {
    if (!instanceId) return
    try { setLoading(true); const { data } = await api.get<any>(`/instances/${instanceId}/status`); setPodStatus(data) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [instanceId])
  useEffect(() => { fetchStatus(); const iv = setInterval(fetchStatus, 10000); return () => clearInterval(iv) }, [fetchStatus])
  return { podStatus, loading, refresh: fetchStatus }
}

export interface InstanceMetrics {
  instance_id: string; status: string; cpu_util: number; memory_util: number
  gpu_util: number; gpu_memory: number; disk_util: number
  network_in: number; network_out: number; timestamp: string
}

export function useInstanceMetrics(instanceId: string, refreshInterval: number = 5000) {
  const [metrics, setMetrics] = useState<InstanceMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchMetrics = useCallback(async () => {
    if (!instanceId) return
    try { setLoading(true); const { data } = await api.get<InstanceMetrics>(`/instances/${instanceId}/metrics`); setMetrics(data) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [instanceId])
  useEffect(() => { fetchMetrics(); const iv = setInterval(fetchMetrics, refreshInterval); return () => clearInterval(iv) }, [fetchMetrics, refreshInterval])
  return { metrics, loading, refresh: fetchMetrics }
}

// ====== 当前用户信息 hook ======
export interface User {
  id: string; email: string; nickname: string; phone?: string; avatar?: string
  verified: boolean; balance: number; frozen_balance: number; api_key?: string; created_at: string
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchUser = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<User>('/users/me'); setUser(data) }
    catch {
      setUser({ id: 'usr_5325abc123', email: 'user@example.com', nickname: '炼丹师5325', phone: '138****8888', verified: false, balance: 156.05, frozen_balance: 0, api_key: 'sk-xxxx****xxxx', created_at: '2024-01-15' })
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchUser() }, [fetchUser])
  const updateProfile = async (data: Partial<User>) => { const { data: updated } = await api.patch<User>('/users/me', data); setUser(updated); return updated }
  return { user, loading, refresh: fetchUser, updateProfile }
}

// ====== 管理后台 Hooks ======
export interface AdminNode {
  id: string; name: string; cluster: string; status: 'online' | 'offline' | 'busy'
  node_type: 'edge' | 'center'; gpu_model: string; gpu_count: number; gpu_available: number
  cpu_cores: number; memory: number; hourly_price: number; created_at: string
}

export function useAdminNodes() {
  const [nodes, setNodes] = useState<AdminNode[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchNodes = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<{ list: AdminNode[]; total: number }>('/admin/nodes'); setNodes(data.list || []); setTotal(data.total || 0) }
    catch { setNodes([]); setTotal(0) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchNodes() }, [fetchNodes])
  return { nodes, loading, total, refresh: fetchNodes }
}

export function useDeleteAdminNode() {
  const [loading, setLoading] = useState(false)
  const deleteNode = async (nodeName: string) => { try { setLoading(true); await api.delete(`/admin/nodes/${nodeName}`) } finally { setLoading(false) } }
  return { deleteNode, loading }
}

export interface AdminUser {
  id: string; email: string; nickname: string; balance: number
  status: 'active' | 'banned' | 'inactive'; verified: boolean; instances: number; created_at: string
}

export function useAdminUsers(page: number = 1, size: number = 20) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchUsers = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<{ list: AdminUser[]; total: number }>('/admin/users', { page, size }); setUsers(data.list || []); setTotal(data.total || 0) }
    catch {
      setUsers([
        { id: 'usr-001', email: 'user1@example.com', nickname: '炼丹师5325', balance: 1250.5, status: 'active', verified: true, instances: 3, created_at: '2024-01-05' },
        { id: 'usr-002', email: 'user2@example.com', nickname: 'AI研究者', balance: 580.0, status: 'active', verified: true, instances: 1, created_at: '2024-01-10' },
      ]); setTotal(2)
    } finally { setLoading(false) }
  }, [page, size])
  useEffect(() => { fetchUsers() }, [fetchUsers])
  return { users, loading, total, refresh: fetchUsers }
}

export interface AdminOrder {
  id: string; user_id: string; user_email: string; type: string; status: string; amount: number; created_at: string
}

export function useAdminOrders(page: number = 1, size: number = 20) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchOrders = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<{ list: AdminOrder[]; total: number }>('/admin/orders', { page, size }); setOrders(data.list || []); setTotal(data.total || 0) }
    catch {
      setOrders([
        { id: 'ord-001', user_id: 'usr-001', user_email: 'user1@example.com', type: 'recharge', status: 'paid', amount: 500, created_at: '2024-03-01 10:30:00' },
        { id: 'ord-002', user_id: 'usr-002', user_email: 'user2@example.com', type: 'instance', status: 'pending', amount: 23.9, created_at: '2024-03-01 09:15:00' },
      ]); setTotal(2)
    } finally { setLoading(false) }
  }, [page, size])
  useEffect(() => { fetchOrders() }, [fetchOrders])
  return { orders, loading, total, refresh: fetchOrders }
}

export function useAdminClusters() {
  const [clusters, setClusters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchClusters = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<{ list: any[] }>('/admin/clusters'); setClusters(data.list || []) }
    catch { setClusters([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchClusters() }, [fetchClusters])
  return { clusters, loading, refresh: fetchClusters }
}

export function useClusterOverview() {
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const fetchOverview = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<any>('/admin/clusters/overview'); setOverview(data) }
    catch { setOverview(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchOverview() }, [fetchOverview])
  return { overview, loading, refresh: fetchOverview }
}

export function useClusterHealth() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const fetchHealth = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<any>('/admin/clusters/health'); setHealth(data) }
    catch { setHealth(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchHealth() }, [fetchHealth])
  return { health, loading, refresh: fetchHealth }
}

export function useClusterNodeMetrics() {
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchMetrics = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<{ list: any[] }>('/admin/clusters/node-metrics'); setMetrics(data.list || []) }
    catch { setMetrics([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchMetrics() }, [fetchMetrics])
  return { metrics, loading, refresh: fetchMetrics }
}

export function useClusterEvents() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchEvents = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<{ list: any[] }>('/admin/clusters/events'); setEvents(data.list || []) }
    catch { setEvents([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchEvents() }, [fetchEvents])
  return { events, loading, refresh: fetchEvents }
}

export function useAdminReports() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const fetchStats = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<any>('/admin/reports/stats'); setStats(data) }
    catch { setStats({ totalUsers: 1250, activeInstances: 86, totalRevenue: 125680.5, todayNewUsers: 12, todayOrders: 45, gpuUtilization: 72.5 }) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchStats() }, [fetchStats])
  return { stats, loading, refresh: fetchStats }
}

// ====== WebSocket Hooks ======
export function useWebSocketStatus(onMessage?: (data: any) => void) {
  const [connected, setConnected] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const callbackRef = useRef(onMessage)
  callbackRef.current = onMessage

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = getPersistedToken()
    if (!token) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    const baseWsUrl = apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
    let socket: WebSocket
    try {
      socket = new WebSocket(`${baseWsUrl}/ws/status?token=${token}`)
    } catch (e) {
      console.warn('[WS] Failed to create WebSocket:', e)
      return
    }
    socket.onopen = () => { setConnected(true) }
    socket.onmessage = (event) => { try { callbackRef.current?.(JSON.parse(event.data)) } catch (e) { console.error('[WS] Parse error:', e) } }
    socket.onclose = () => { setConnected(false) }
    socket.onerror = () => { /* 连接失败静默处理，onclose 会触发 */ }
    setWs(socket)
    const pingInterval = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' })) }, 30000)
    return () => { clearInterval(pingInterval); socket.close() }
  }, [])
  const subscribeInstance = useCallback((instanceId: string) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'subscribe_instance', instance_id: instanceId }))
  }, [ws])
  return { connected, subscribeInstance }
}

export function useInstanceWebSocket(instanceId: string, onStatusChange?: (status: string, data?: any) => void) {
  const [connected, setConnected] = useState(false)
  // 使用 ref 存储回调，避免回调变化导致 WebSocket 重连
  const callbackRef = useRef(onStatusChange)
  callbackRef.current = onStatusChange

  useEffect(() => {
    if (!instanceId || typeof window === 'undefined') return
    const token = getPersistedToken()
    if (!token) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    const baseWsUrl = apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
    let socket: WebSocket
    try {
      socket = new WebSocket(`${baseWsUrl}/ws/instance/${instanceId}/status?token=${token}`)
    } catch (e) {
      console.warn('[WS] Failed to create instance WebSocket:', e)
      return
    }
    socket.onopen = () => { setConnected(true) }
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'instance_status' || data.type === 'connected') {
          callbackRef.current?.(data.status || data.current_status, data)
        }
      } catch (e) { console.error('[WS] Parse error:', e) }
    }
    socket.onclose = () => setConnected(false)
    socket.onerror = () => { /* 静默处理 */ }
    const pingInterval = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' })) }, 30000)
    return () => { clearInterval(pingInterval); socket.close() }
  }, [instanceId])
  return { connected }
}

// ====== 实例续费 ======
export function useInstanceRenew() {
  const [loading, setLoading] = useState(false)
  const renewInstance = async (instanceId: string, durationHours: number, billingType: string = 'hourly') => {
    try {
      setLoading(true)
      const { data } = await api.post<{ message: string; instance_id: string; renew_amount: number; new_expired_at: string; remaining_balance: number }>(
        `/instances/${instanceId}/renew`, { duration_hours: durationHours, billing_type: billingType }
      )
      return data
    } finally { setLoading(false) }
  }
  return { renewInstance, loading }
}

// ====== 存储文件操作 ======
export function useStorageFiles(initialPath: string = '/', pageSize: number = 50) {
  const [files, setFiles] = useState<UserFileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // 用 ref 避免 useCallback 依赖 state 导致双重 fetch
  const pathRef = useRef(initialPath)
  const pageRef = useRef(1)

  const fetchFiles = useCallback(async (targetPath?: string, targetPage?: number) => {
    const p = targetPath ?? pathRef.current
    const pg = targetPage ?? pageRef.current
    try {
      setLoading(true)
      const { data } = await api.get<{ files: UserFileItem[]; total: number; page: number; page_size: number; current_path: string }>(
        '/storage/files', { path: p, page: pg, page_size: pageSize }
      )
      setFiles(data.files || [])
      setTotal(data.total || 0)
      const resolvedPath = data.current_path || p
      setCurrentPath(resolvedPath)
      pathRef.current = resolvedPath
    } catch { setFiles([]); setTotal(0) }
    finally { setLoading(false) }
  }, [pageSize])

  // 仅在初始挂载时 fetch 一次
  useEffect(() => { fetchFiles() }, [fetchFiles])

  const uploadFile = async (file: File) => {
    // 前端预检: 50MB
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      throw new Error(`文件过大, 单文件最大允许 50MB, 当前 ${(file.size / 1024 / 1024).toFixed(1)}MB`)
    }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', pathRef.current)
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/storage/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getPersistedToken()}` },
      body: formData,
    })
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.detail || '上传失败')
    }
    const data = await response.json()
    fetchFiles()
    return data
  }

  const deleteFile = async (fileId: string) => {
    await api.delete(`/storage/files/${fileId}`)
    fetchFiles()
  }

  const getFileLink = async (fileId: string): Promise<{ url: string; filename: string }> => {
    const { data } = await api.get<{ url: string; filename: string; expires_in: number }>(`/storage/files/${fileId}/link`)
    return data
  }

  const createFolder = async (name: string) => {
    await api.post('/storage/mkdir', { path: pathRef.current, name })
    fetchFiles()
  }

  const navigateTo = (newPath: string) => {
    pathRef.current = newPath
    pageRef.current = 1
    setCurrentPath(newPath)
    setPage(1)
    fetchFiles(newPath, 1)
  }

  const goToPage = (newPage: number) => {
    pageRef.current = newPage
    setPage(newPage)
    fetchFiles(pathRef.current, newPage)
  }

  return {
    files, loading, currentPath, total, page, pageSize,
    uploadFile, deleteFile, getFileLink, createFolder, navigateTo, goToPage,
    refresh: fetchFiles,
  }
}

// ====== 可用资源配置 ======
export function useResourceConfigs(filters?: { gpu_model?: string; node_type?: string; resource_type?: string }) {
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (filters?.gpu_model) params.gpu_model = filters.gpu_model
      if (filters?.node_type) params.node_type = filters.node_type
      if (filters?.resource_type) params.resource_type = filters.resource_type
      const { data } = await api.get<{ list: any[]; total: number }>('/instances/resource-configs', params)
      setConfigs(data.list || [])
    } catch {
      setConfigs([
        { node_id: 'node-1', node_name: 'gpu-node-01', node_type: 'center', resource_type: 'no_gpu', gpu_model: 'intel', gpu_memory: 0, cpu_model: 'intel 1核', cpu_cores: 1, memory: 2, disk: 30, network_desc: '--', gpu_available: 100, gpu_total: 0, hourly_price: 0.1 },
        { node_id: 'node-2', node_name: 'gpu-node-02', node_type: 'center', resource_type: 'vGPU', gpu_model: 'NVIDIA-A100-SXM4-80GB', gpu_memory: 20, cpu_model: 'intel 3核', cpu_cores: 3, memory: 25, disk: 50, network_desc: '--', gpu_available: 28, gpu_total: 32, hourly_price: 1.75 },
        { node_id: 'node-3', node_name: 'gpu-node-03', node_type: 'center', resource_type: 'vGPU', gpu_model: 'NVIDIA-A100-SXM4-80GB', gpu_memory: 40, cpu_model: 'intel 6核', cpu_cores: 6, memory: 50, disk: 50, network_desc: '--', gpu_available: 13, gpu_total: 16, hourly_price: 3.5 },
        { node_id: 'node-4', node_name: 'edge-node-01', node_type: 'edge', resource_type: 'no_gpu', gpu_model: 'AMD', gpu_memory: 0, cpu_model: 'AMD 1核', cpu_cores: 1, memory: 2, disk: 30, network_desc: '--', gpu_available: 0, gpu_total: 0, hourly_price: 0.1 },
      ])
    } finally { setLoading(false) }
  }, [filters?.gpu_model, filters?.node_type, filters?.resource_type])
  useEffect(() => { fetchConfigs() }, [fetchConfigs])
  return { configs, loading, refresh: fetchConfigs }
}

// ====== 获取实例 Deployment YAML ======
export function useInstanceYaml(instanceId: string) {
  const [yaml, setYaml] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const fetchYaml = useCallback(async () => {
    if (!instanceId) return
    try { setLoading(true); const { data } = await api.get<{ yaml: string }>(`/instances/${instanceId}/yaml`); setYaml(data.yaml || '') }
    catch { setYaml('') } finally { setLoading(false) }
  }, [instanceId])
  useEffect(() => { fetchYaml() }, [fetchYaml])
  return { yaml, loading, refresh: fetchYaml }
}

// ====== 管理后台 - 命名空间 ======
export function useAdminNamespaces() {
  const [namespaces, setNamespaces] = useState<{ name: string; status: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const fetchNamespaces = useCallback(async () => {
    try { setLoading(true); const { data } = await api.get<{ list: any[] }>('/admin/clusters/namespaces/list'); setNamespaces(data.list || []) }
    catch { setNamespaces([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchNamespaces() }, [fetchNamespaces])
  return { namespaces, loading, refresh: fetchNamespaces }
}

// ====== 管理后台 - Deployment 管理 ======
export function useAdminDeployments(namespace?: string, search?: string) {
  const [deployments, setDeployments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchDeployments = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (namespace) params.namespace = namespace
      if (search) params.search = search
      const { data } = await api.get<{ list: any[]; total: number }>('/admin/deployments', params)
      setDeployments(data.list || []); setTotal(data.total || 0)
    } catch { setDeployments([]); setTotal(0) } finally { setLoading(false) }
  }, [namespace, search])
  useEffect(() => { fetchDeployments() }, [fetchDeployments])
  return { deployments, loading, total, refresh: fetchDeployments }
}

// ====== 管理后台 - Service 管理 ======
export function useAdminServices(namespace?: string, search?: string) {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (namespace) params.namespace = namespace
      if (search) params.search = search
      const { data } = await api.get<{ list: any[]; total: number }>('/admin/services', params)
      setServices(data.list || []); setTotal(data.total || 0)
    } catch { setServices([]); setTotal(0) } finally { setLoading(false) }
  }, [namespace, search])
  useEffect(() => { fetchServices() }, [fetchServices])
  return { services, loading, total, refresh: fetchServices }
}

// ====== 管理后台 - Pod 管理 ======
export function useAdminPods(namespace?: string, node?: string, status?: string, search?: string) {
  const [pods, setPods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchPods = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (namespace) params.namespace = namespace
      if (node) params.node = node
      if (status) params.status = status
      if (search) params.search = search
      const { data } = await api.get<{ list: any[]; total: number }>('/admin/pods', params)
      setPods(data.list || []); setTotal(data.total || 0)
    } catch { setPods([]); setTotal(0) } finally { setLoading(false) }
  }, [namespace, node, status, search])
  useEffect(() => { fetchPods() }, [fetchPods])
  return { pods, loading, total, refresh: fetchPods }
}

// ====== 管理后台 - Pod 日志 ======
export function useAdminPodLogs(ns: string, name: string, container?: string, tail: number = 200) {
  const [logs, setLogs] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const fetchLogs = useCallback(async () => {
    if (!ns || !name) return
    try {
      setLoading(true)
      const params: Record<string, string | number> = { tail }
      if (container) params.container = container
      const { data } = await api.get<{ logs: string }>(`/admin/pods/${ns}/${name}/logs`, params)
      setLogs(data.logs || '')
    } catch { setLogs('[Error] 获取日志失败') } finally { setLoading(false) }
  }, [ns, name, container, tail])
  useEffect(() => { fetchLogs() }, [fetchLogs])
  return { logs, loading, refresh: fetchLogs }
}

// ====== 管理后台 - 存储管理 ======
export function useAdminPVs(search?: string) {
  const [pvs, setPVs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchPVs = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (search) params.search = search
      const { data } = await api.get<{ list: any[]; total: number }>('/admin/storage/pvs', params)
      setPVs(data.list || []); setTotal(data.total || 0)
    } catch { setPVs([]); setTotal(0) } finally { setLoading(false) }
  }, [search])
  useEffect(() => { fetchPVs() }, [fetchPVs])
  return { pvs, loading, total, refresh: fetchPVs }
}

export function useAdminPVCs(namespace?: string, search?: string) {
  const [pvcs, setPVCs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchPVCs = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (namespace) params.namespace = namespace
      if (search) params.search = search
      const { data } = await api.get<{ list: any[]; total: number }>('/admin/storage/pvcs', params)
      setPVCs(data.list || []); setTotal(data.total || 0)
    } catch { setPVCs([]); setTotal(0) } finally { setLoading(false) }
  }, [namespace, search])
  useEffect(() => { fetchPVCs() }, [fetchPVCs])
  return { pvcs, loading, total, refresh: fetchPVCs }
}

export function useAdminStorageClasses(search?: string) {
  const [storageClasses, setStorageClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const fetchSCs = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (search) params.search = search
      const { data } = await api.get<{ list: any[]; total: number }>('/admin/storage/storageclasses', params)
      setStorageClasses(data.list || []); setTotal(data.total || 0)
    } catch { setStorageClasses([]); setTotal(0) } finally { setLoading(false) }
  }, [search])
  useEffect(() => { fetchSCs() }, [fetchSCs])
  return { storageClasses, loading, total, refresh: fetchSCs }
}
