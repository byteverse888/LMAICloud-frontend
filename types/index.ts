// 用户相关类型
export interface User {
  id: string
  email: string
  nickname: string
  avatar?: string
  role: 'user' | 'admin'
  balance: number
  frozen_balance: number
  status: 'active' | 'inactive' | 'banned'
  verified: boolean
  createdAt: string
  updatedAt: string
}

// 集群相关类型
export interface Cluster {
  id: string
  name: string
  region: string
  status: 'online' | 'offline' | 'maintenance'
  description?: string
  nodeCount?: number
  createdAt: string
  updatedAt: string
}

// 节点相关类型
export interface Node {
  id: string
  clusterId: string
  name: string
  type: 'center' | 'edge'
  status: 'online' | 'offline' | 'busy'
  gpuModel: string
  gpuCount: number
  gpuAvailable: number
  cpuModel: string
  cpuCores: number
  memory: number
  disk: number
  diskExpandable: number
  ipAddress: string
  driverVersion: string
  cudaVersion: string
  hourlyPrice: number
  onlineAt?: string
  createdAt: string
  updatedAt: string
}

// GPU实例相关类型
export type InstanceStatus =
  | 'creating'
  | 'running'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'error'
  | 'expired'
  | 'releasing'
  | 'released'

export type BillingType = 'hourly' | 'daily' | 'weekly' | 'monthly'
export type ResourceType = 'vGPU' | 'no_gpu'
export type NodeType = 'center' | 'edge'
export type AutoShutdownType = 'none' | 'timer' | 'scheduled'
export type AutoReleaseType = 'none' | 'timer'

export interface EnvVar {
  key: string
  value: string
}

export interface StorageMount {
  name: string
  mount_path: string
  size_gb: number
}

export interface Instance {
  id: string
  userId: string
  user_id?: string
  nodeId: string
  node_id?: string
  name: string
  status: InstanceStatus

  // 资源配置
  gpuCount: number
  gpu_count?: number
  gpuModel?: string
  gpu_model?: string
  cpuCores: number
  cpu_cores?: number
  memory: number
  disk: number
  resourceType?: ResourceType
  resource_type?: string
  nodeType?: NodeType
  node_type?: string
  instanceCount?: number
  instance_count?: number

  // 镜像与启动
  imageId?: string
  image_id?: string
  imageName?: string
  imageUrl?: string
  image_url?: string
  startupCommand?: string
  startup_command?: string
  envVars?: string
  env_vars?: string
  storageMounts?: string
  storage_mounts?: string

  // 安装源
  pipSource?: string
  pip_source?: string
  condaSource?: string
  conda_source?: string
  aptSource?: string
  apt_source?: string

  // 计费
  billingType: BillingType
  billing_type?: string
  hourlyPrice: number
  hourly_price?: number

  // 自动关机/释放
  autoShutdownType?: AutoShutdownType
  auto_shutdown_type?: string
  autoShutdownMinutes?: number
  auto_shutdown_minutes?: number
  autoReleaseType?: AutoReleaseType
  auto_release_type?: string
  autoReleaseMinutes?: number
  auto_release_minutes?: number

  // 连接信息
  internalIp?: string
  internal_ip?: string

  healthStatus?: 'healthy' | 'unhealthy' | 'unknown'
  health_status?: string
  deploymentYaml?: string
  deployment_yaml?: string

  startedAt?: string
  started_at?: string
  expiredAt?: string
  expired_at?: string
  releaseAt?: string
  release_at?: string
  createdAt: string
  created_at?: string
  updatedAt: string
  updated_at?: string
}

// 资源配置（创建实例时的资源选择表格行）
export interface ResourceConfig {
  node_id: string
  node_name: string
  node_type: NodeType
  resource_type: ResourceType
  gpu_model: string
  gpu_memory?: number
  cpu_model?: string
  cpu_cores?: number
  memory?: number
  disk?: number
  disk_expandable?: number
  network_desc?: string
  gpu_available: number
  gpu_total: number
  hourly_price: number
  region?: string
}

// 创建实例请求
export interface CreateInstanceRequest {
  name: string
  node_id: string
  gpu_count: number
  gpu_model?: string
  image_id?: string
  image_url?: string
  billing_type: string
  duration_hours?: number
  resource_type: string
  node_type: string
  instance_count: number
  env_vars?: EnvVar[]
  storage_mounts?: StorageMount[]
  startup_command?: string
  pip_source?: string
  conda_source?: string
  apt_source?: string
  auto_shutdown_type?: string
  auto_shutdown_minutes?: number
  auto_shutdown_time?: string
  auto_release_type?: string
  auto_release_minutes?: number
}

// 镜像相关类型
export interface Image {
  id: string
  name: string
  tag: string
  type: string
  category?: string
  description?: string
  icon?: string
  image_url?: string
  size_gb: number
  is_public?: boolean
  created_at: string
}

// 订单相关类型
export type OrderType = 'create' | 'renew' | 'upgrade' | 'recharge'
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded'

export interface Order {
  id: string
  userId: string
  instanceId?: string
  type: OrderType
  amount: number
  status: OrderStatus
  paidAt?: string
  createdAt: string
}

// 充值相关类型
export type PaymentMethod = 'wechat' | 'alipay' | 'bank'
export type RechargeStatus = 'pending' | 'success' | 'failed'

export interface Recharge {
  id: string
  userId: string
  amount: number
  paymentMethod: PaymentMethod
  transactionId?: string
  status: RechargeStatus
  createdAt: string
}

// 文件存储相关类型
export interface UserFile {
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

export interface StorageQuota {
  used: number       // 已用空间(字节)
  total: number      // 总配额(字节)
  remaining: number  // 剩余空间(字节)
  used_percent: number
  file_count: number      // 当前文件/目录数
  max_file_count: number  // 文件数上限
  max_upload_size: number // 单文件上传上限(字节)
}

export interface FileListResponse {
  files: UserFile[]
  total: number
  page: number
  page_size: number
  current_path: string
}

export interface FileLinkResponse {
  url: string
  filename: string
  expires_in: number
}

// 兼容旧类型
export interface StorageFile {
  id: string
  userId: string
  clusterId: string
  clusterName?: string
  name: string
  size: number
  path: string
  isDirectory: boolean
  createdAt: string
  updatedAt: string
}

// 分页相关类型
export interface PaginationParams {
  page?: number
  size?: number
}

export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  size: number
}

// 统计相关类型
export interface DashboardStats {
  instanceTotal: number
  instanceRunning: number
  instanceExpiring: number
  instanceReleasing: number
  storageUsed: number
  imageUsed: number
  fileStorageUsed: number
}

export interface UserBalance {
  available: number
  frozen: number
  coupon: number
  voucher: number
}

// 实例监控指标
export interface InstanceMetrics {
  instance_id: string
  status: string
  cpu_util: number
  memory_util: number
  gpu_util: number
  gpu_memory: number
  disk_util: number
  network_in: number
  network_out: number
  pod_status: any
  timestamp: string
}
