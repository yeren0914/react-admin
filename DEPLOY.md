# 部署说明（Deployment Guide）

## 目录

* [1. 前置准备](#1-前置准备)
* [2. 配置 `config.json`](#2-配置-configjson)
* [3. 构建与部署](#3-构建与部署)
* [4. 验证部署](#4-验证部署)
* [故障排查（可选）](#故障排查可选)

---

## 1. 前置准备

在开始部署前，请确认以下信息已就绪：

1. **接口服务地址**：可访问的 Node 服务 API 基址（如 `http://52.48.173.231:3000/api`）
2. **链网络信息**：目标链的 `chainId` 与 `RPC URL`
3. **合约地址**：`MultiCall`、`MultiSign`、`TimeLock`、`FeeDispatcher`、`Executor`
4. **Owner 地址**：至少两位（满足阈值）的 Owner 账户地址，用于签名与执行

> 提示：确保 API 服务已放通跨域（CORS），且你将要部署的前端域名/IP 在白名单内（如后端有来源限制）。

---

## 2. 配置 `config.json`

在**前端项目根目录**创建 `config.json` 文件（。**注意：必须是合法 JSON，不能包含注释。**

```json
{
  "APP_ENV": "development",
  "API_BASE": "http://52.48.173.231:3000/api",

  "CONFIG_CHAIN_ID": 1337,
  "CONFIG_RPC_URL": "https://rpc8.testnet.kasplextest.xyz",

  "CONFIG_MULTICALL": "0xEc9933725C7CE6cc9A2D887ECCa20482d4bbb61e",
  "CONFIG_MULTISIGN": "0xEeF68c13df0Ab44C48fA78b09a970B251B47ae32",
  "CONFIG_TIME_LOCK": "0xea93165228B8F62013670Dc5c3B3A07A6da28Ba3",
  "CONFIG_FEE_DISPATCHER": "0xA218D609a65BAE33Ba2fFD867c7a66E8664b4E3e",
  "CONFIG_EXECUTOR": "0x69d4B3Fd107972655D6Ea256e9B1B52644Ec21E7",

  "CONFIG_OWNER0": "0xe65F4EA0c461693f6051845C195a14AD9701C2b4",
  "CONFIG_OWNER1": "0x29B011952eaF39D38804A8C4efCe3c5D502a3ab0",
  "CONFIG_OWNER2": "0x3EF5CDf950610FD3D3df7Ae245748E067A37028c"
}
```

**字段说明（关键项）**

* `APP_ENV`：运行环境（`development` / `production`）
* `API_BASE`：后端 API 基址
* `CONFIG_CHAIN_ID` / `CONFIG_RPC_URL`：链 ID 与 RPC 节点地址
* `CONFIG_MULTICALL` / `CONFIG_MULTISIGN` / `CONFIG_TIME_LOCK` / `CONFIG_FEE_DISPATCHER` / `CONFIG_EXECUTOR`：核心合约地址
* `CONFIG_OWNER0/1/2`：预置的 Owner 地址（用于签名联调）

> **务必确保**：MetaMask 所连接的网络与 `CONFIG_CHAIN_ID` / `CONFIG_RPC_URL` 一致，否则签名与链上交互将失败。

---

## 3. 构建与部署

### 3.1 安装依赖

```bash
# 使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### 3.2 本地开发启动

```bash
# yarn
yarn dev

# pnpm
pnpm run dev
```

### 3.3 生产构建

```bash
# yarn
yarn build:prod

# pnpm
pnpm run build:prod
```

构建完成后，将生成的静态资源部署到你的 Web 服务器（如 Nginx/Apache/静态托管平台）。

---


```nginx
# 1. HTTP 重定向到 HTTPS（可选）
server {
    listen 80;                  # HTTP 默认端口
    server_name localhost;      # 可换成域名或服务器IP

    return 301 https://$host$request_uri;  # 强制跳转到 HTTPS
}

# 2. HTTPS 配置
server {
    listen 443 ssl http2;       # HTTPS 端口
    server_name localhost;      # 替换为你的域名或服务器IP

    root /home/ubuntu/multi-sign/dist/;   # 静态资源目录
    index index.html;

    # SSL 证书配置
    ssl_certificate     /etc/nginx/ssl/multi-sign.crt;
    ssl_certificate_key /etc/nginx/ssl/multi-sign.key;

    # 安全优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 前端路由配置（Vue/React 单页应用）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存优化
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|ttf|woff|woff2)$ {
        expires 30d;
        access_log off;
    }
}
```

保存退出：`Ctrl + O → 回车 → Ctrl + X`

---

### 3.4 启用配置并重启 Nginx

```bash
# 检查配置是否正确
sudo nginx -t

# 启用站点配置
sudo ln -s /etc/nginx/sites-available/multi-sign.conf /etc/nginx/sites-enabled/

# 重载 Nginx
sudo systemctl reload nginx
```

查看已启用站点：

```bash
ls -l /etc/nginx/sites-enabled/
```

---

## 4. 验证部署

打开浏览器访问：`https://<你的域名或IP>`，检查以下内容：

* 页面可正常加载，无 404/500 等静态资源错误
* MetaMask 能够连接到指定网络（`CONFIG_CHAIN_ID`）
* “登录”操作可正常唤起签名，登录成功后接口请求携带 token
* 能创建交易、追加签名，并在满足阈值后由 Executor 执行上链


---

## 故障排查（可选）

* **页面空白 / 资源加载失败**：确认构建产物路径与服务器静态目录配置一致；检查浏览器控制台的 404/跨域报错
* **无法登录或请求被拒绝**：检查 `API_BASE` 是否可达、后端是否允许当前域名跨域（CORS）
* **MetaMask 网络不匹配**：切换到 `CONFIG_CHAIN_ID` 对应的网络；必要时在 MetaMask 中手动添加 RPC
* **签名/执行失败**：

  * 检查 `owners` 与 `threshold` 是否设置正确
  * 核对交易 `to/value/data/nonce` 是否一致（签名必须针对同一摘要）
  * 确保签名打包顺序按 **Owner 地址字典序升序** 严格排列
  * 必要时先用 `callStatic` 模拟执行，查看具体报错

---
