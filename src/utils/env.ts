export interface AppConfig {
  APP_ENV: string
  API_BASE: string
  CONFIG_CHAIN_ID: number
  CONFIG_RPC_URL: string
  CONFIG_MULTICALL: string
  CONFIG_MULTISIGN: string
  CONFIG_TIME_LOCK: string
  CONFIG_FEE_DISPATCHER: string
  CONFIG_EXECUTOR: string
  CONFIG_OWNER0: string
  CONFIG_OWNER1: string
  CONFIG_OWNER2: string
}

// 存储运行时配置
let runtimeConfig: AppConfig | null = null

// 初始化加载配置（在应用入口 async 调用一次）
export async function loadConfig(): Promise<AppConfig> {
  if (runtimeConfig) return runtimeConfig

  const res = await fetch('./config.json')
  if (!res.ok) throw new Error('Failed to load config.json')
  runtimeConfig = await res.json()
  return runtimeConfig!
}

// 获取配置
export function getConfig(): AppConfig {
  if (!runtimeConfig) throw new Error('Config not loaded yet, call loadConfig() first')
  return runtimeConfig
}
