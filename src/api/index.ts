import { get, post, deleteFun, putFun } from '../utils/http'
import type { ApiTxResponse, LoginResponse } from '../types/apiTypes'

export const getBalance = async (address: string) => {
  return get('/getBalance', { address });
}

// 登录
export const login = async (address: string, login_at: string, signature: string): Promise<LoginResponse> => {
  return post('/login', { address, login_at, signature })
}

// 创建交易
export const createTx = async (to: string, data: string, value: string, nonce: number, signature: string): Promise<ApiTxResponse> => {
  return post('/tx', { to, data, value, nonce, signature })
}

// 查询交易列表
export const getTxs = async (page: number = 0, pageSize: number = 10, id?: number, status?: number): Promise<ApiTxResponse> => {
  return get('/txs', { page, pageSize, id, status })
}

// 更新交易
export const updateTxById = async (id: string, status: number, txid: string): Promise<ApiTxResponse> => {
  return putFun(`/tx/${id}`, { status, txid })
}

//删除交易
export const delTxId = async (id: string): Promise<ApiTxResponse> => {
  return deleteFun(`/tx/${id}`)
}