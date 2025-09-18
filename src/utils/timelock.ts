import { ethers, Contract } from 'ethers'
import { TimelockAbi } from '../utils/constants'
import { createMCProvider } from '../utils/provider'

const EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"))

export const OperationState = {
  Unset: 0,
  Waiting: 1,
  Ready: 2,
  Done: 3,
} as const;

export type OperationState = typeof OperationState[keyof typeof OperationState];

export interface TimelockPermissionResult {
  result: boolean
  reason: string
  details?: {
    minDelay: string
    hasExecutorRoleZero: boolean
    hasExecutorRoleWallet: boolean
    timestamp: string
    operationState: OperationState
    isOperationReady: boolean
    isOperationDone: boolean
    isOperationPending: boolean
    timeDiff?: number
  }
}

export async function checkTimelockPermission(
  rpcUrl: string,
  timelockAddress: string,
  multicallAddress: string,
  operationId: string,
  walletAddress: string
): Promise<TimelockPermissionResult> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const mcProvider = createMCProvider(provider, multicallAddress)
    const timelockContract = new Contract(timelockAddress, TimelockAbi, mcProvider)

    const [
      minDelay, 
      hasExecutorRoleZero, 
      hasExecutorRoleWallet,
      timestamp,
      operationState
    ] = await Promise.all([
      timelockContract.getMinDelay(),
      timelockContract.hasRole(EXECUTOR_ROLE, ethers.constants.AddressZero),
      timelockContract.hasRole(EXECUTOR_ROLE, walletAddress),
      timelockContract.getTimestamp(operationId),
      timelockContract.getOperationState(operationId)
    ])

    const isOperationReady = operationState === OperationState.Ready
    const isOperationDone = operationState === OperationState.Done
    const isOperationPending = operationState === OperationState.Waiting || operationState === OperationState.Ready

    let timeDiff: number | undefined
    if (timestamp.gt(0)) {
      const currentTime = Math.floor(Date.now() / 1000)
      timeDiff = currentTime - timestamp.toNumber()
    }

    let canExecute = false
    let reason = ''

    if (operationState === OperationState.Unset) {
      reason = 'Operation不存在或未设置'
    } else if (isOperationDone) {
      reason = 'Operation已完成'
    } else if (!isOperationReady) {
      if (operationState === OperationState.Waiting) {
        reason = `Operation还在等待中，还需要等待 ${timeDiff ? Math.abs(timeDiff) : '未知'} 秒`
      } else {
        reason = 'Operation未准备好执行'
      }
    } else if (hasExecutorRoleZero) {
      canExecute = true
      reason = 'address(0)有EXECUTOR_ROLE，任何人都可以执行timelock操作'
    } else if (hasExecutorRoleWallet) {
      canExecute = true
      reason = `钱包地址 ${walletAddress} 有EXECUTOR_ROLE权限，可以执行timelock操作`
    } else {
      reason = `钱包地址 ${walletAddress} 没有EXECUTOR_ROLE权限，无法执行timelock操作`
    }

    return {
      result: canExecute,
      reason,
      details: {
        minDelay: minDelay.toString(),
        hasExecutorRoleZero,
        hasExecutorRoleWallet,
        timestamp: timestamp.toString(),
        operationState,
        isOperationReady,
        isOperationDone,
        isOperationPending,
        timeDiff
      }
    }
  } catch (error) {
    return {
      result: false,
      reason: `权限检查失败: ${(error as Error).message}`
    }
  }
}