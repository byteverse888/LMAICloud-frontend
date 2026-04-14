# LMAICloud Frontend

LMAICloud GPU算力云平台前端，基于 Next.js 16 + Tailwind CSS 4 构建，支持深浅色主题。

## 技术栈

- **Next.js 16** - React全栈框架（App Router）
- **TypeScript** - 类型安全
- **Tailwind CSS 4** - 原子化样式
- **Zustand** - 全局状态管理
- **next-intl** - 国际化（中/英文）
- **next-themes** - 深浅色主题
- **xterm.js** - WebSSH终端
- **react-hot-toast** - 消息通知
- **WebSocket** - 实例状态实时订阅

## 项目结构

```
app/
├── (auth)/              # 登录/注册页面
├── (dashboard)/         # 主控制台
│   ├── page.tsx             # 首页仪表盘
│   ├── instances/           # GPU实例管理
│   │   ├── page.tsx         # 实例列表
│   │   ├── create/          # 创建实例
│   │   └── [id]/            # 实例详情（SSH/日志/续费）
│   ├── storage/             # 文件存储
│   ├── billing/             # 充值与账单
│   │   ├── page.tsx         # 充值（微信/支付宝）
│   │   ├── details/         # 消费明细
│   │   └── statements/      # 账单汇总
│   ├── market/              # 算力市场
│   ├── images/              # 镜像列表
│   ├── public-data/         # 公共数据集
│   └── account/             # 账户设置
└── admin/               # 管理后台
    ├── dashboard/           # 管理概览
    ├── nodes/               # 节点管理
    ├── clusters/            # 集群管理
    ├── users/               # 用户管理
    ├── orders/              # 订单管理
    ├── reports/             # 数据报表
    └── settings/            # 系统设置
components/              # 公共组件
hooks/
└── use-api.ts           # 所有API请求Hooks
stores/                  # Zustand状态
lib/
├── api.ts               # Axios实例配置
└── utils.ts             # 工具函数
```

## 快速启动

### 1. 安装依赖

```bash
npm install
```

**国内加速（推荐）：**
```bash
# 使用淘宝镜像源
npm install --registry=https://registry.npmmirror.com

# 或设置全局镜像（一次设置永久生效）
npm config set registry https://registry.npmmirror.com
npm install

# 使用 pnpm（更快）
npm install -g pnpm
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

`.env.local` 内容：
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### 3. 启动开发服务器

```bash
npm run dev
或
PORT=3001 npm run dev
```

访问：http://localhost:3000

邮箱	密码	角色
test@example.com	Test@1234	普通用户
admin@example.com	Admin@1234	管理员

### 4. 构建生产版本

```bash
npm run build
# npm start

# 用 PM2 守护（进程崩溃自动重启）
# pm2 start "node .next/standalone/server.js" --name lmai-frontend
pm2 startup   # 开机自启
pm2 save

# 守护模式
npm install -g pm2
pm2 start "npx next start -p 3000" --name lmai-frontend

# 重启
pm2 restart lmai-frontend
# 停止
pm2 stop lmai-frontend
# 删除进程
pm2 delete lmai-frontend
# 查看状态
pm2 status
# 查看日志
pm2 logs lmai-frontend

# standlone模式
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
node .next/standalone/server.js  # 监听 3000 端口

或者跑在docker里面

```

## 主要页面

| 路径 | 功能 |
|------|------|
| `/login` | 用户登录 |
| `/register` | 用户注册 |
| `/` | 控制台首页 |
| `/instances` | GPU实例列表 |
| `/instances/create` | 创建实例 |
| `/instances/[id]` | 实例详情/SSH终端 |
| `/storage` | 文件存储管理 |
| `/billing` | 充值（微信/支付宝）|
| `/market` | 算力市场 |
| `/admin` | 管理后台 |

## 主题支持

支持深色/浅色模式自动切换，通过 `next-themes` 实现，可跟随系统设置或手动切换。

## 国际化

支持中文/英文切换，语言文件位于 `messages/` 目录。
