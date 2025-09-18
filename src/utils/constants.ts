import { Contract, utils } from "ethers"
import type {
  TimelockProposal,
  FeeDispatcherOperation,
  MultiSignAddOwner,
  MultiSignRemoveOwner,
  MultiSignSwapOwner,
  DecodedResult
} from '../types/types'

//---------常量配置------------
export const TransactionType = [
  { label: 'Add Receiver', value: 1 },
  { label: 'Remove Receiver', value: 2 },
]

export const TransactionStatusList = [
  { label: 'READY', value: 1 },
  { label: 'SIGNE', value: 2 },
  { label: 'PROPOSED', value: 3 },
  { label: 'EXECUTED', value: 4 },
  { label: 'CLOSED', value: 5 },
  { label: 'ALL', value: -1 },
]

export const ownerList = [
  '0xe65F4EA0c461693f6051845C195a14AD9701C2b4',
  '0x29B011952eaF39D38804A8C4efCe3c5D502a3ab0',
  '0x3EF5CDf950610FD3D3df7Ae245748E067A37028c'
]

export const API_BASE_URL = import.meta.env.VITE_API_TARGET
export const chainId = import.meta.env.VITE_CONFIG_CHAIN_ID
export const rpcUrl = import.meta.env.VITE_CONFIG_RPC_URL
export const multicall = import.meta.env.VITE_CONFIG_MULTICALL
export const multisign = import.meta.env.VITE_CONFIG_MULTISIGN
export const timelock = import.meta.env.VITE_CONFIG_TIME_LOCK
export const feeDispatcher = import.meta.env.VITE_CONFIG_FEE_DISPATCHER
export const executor = import.meta.env.VITE_CONFIG_EXECUTOR

//---------ABI 信息-----------
export const MultiSignAbi = [
  'function getNonce() external view returns (uint256)',
  'function getTransactionHash(address to, uint256 value, bytes data, uint256 _nonce) external view returns (bytes32)',
  'function execTransaction(address to, uint256 value, bytes data, bytes signatures) external payable returns (bool)',
  'function isOwner(address owner) external view returns (bool)',
  'function getOwners() external view returns (address[])',
  'function addOwnerWithThreshold(address owner, uint256 threshold) external',
  'function removeOwner(address prevOwner, address newOwner, uint256 threshold) external',
  'function swapOwner(address prevOwner, address oldOwner, address newOwner) external',
  'function approveHash(bytes32 hashToApprove) external',
  'event ExecutionSuccess(bytes32 indexed txHash, uint256 value)'
]

export const TimelockAbi = [
  'event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)',
  'event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes payload)',
  'function schedule(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt, uint256 delay) external',
  'function execute(address target, uint256 value, bytes payload, bytes32 predecessor, bytes32 salt) external payable',
  'function getMinDelay() external view returns (uint256)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function getTimestamp(bytes32 id) external view returns (uint256)',
  'function getOperationState(bytes32 id) external view returns (uint8)'
]

export const FeeDispatcherAbi = [
  'function addReceiver(address receiver) external',
  'function removeReceiver(address receiver) external'
]

//---------辅助函数-----------
function calculateDomainSeparator(chainId: string, contractAddress: string): string {
  const DOMAIN_SEPARATOR_TYPEHASH = "0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f"
  const encodedData = utils.defaultAbiCoder.encode(
    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
    [
      DOMAIN_SEPARATOR_TYPEHASH,
      utils.keccak256(utils.toUtf8Bytes('MultiSign')),
      utils.keccak256(utils.toUtf8Bytes('1.0.0')),
      chainId,
      contractAddress
    ]
  )
  return utils.keccak256(encodedData)
}

function calculateMultiSignTxHash(
  to: string,
  value: string,
  data: string,
  nonce: number,
  chainId: string,
  contractAddress: string
): string {
  const MULTISIGN_TX_TYPEHASH = "0xd6ef4cb259e00f7881e149edf0399d7975b1e7840c351fa9ef36d2e16374204c"
  const domainSeparator = calculateDomainSeparator(chainId, contractAddress)
  const encodedData = utils.defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256', 'bytes32', 'uint8', 'uint256'],
    [MULTISIGN_TX_TYPEHASH, to, value, utils.keccak256(data), 0, nonce]
  )
  const txHash = utils.keccak256(encodedData)
  return utils.keccak256(utils.solidityPack(['bytes2', 'bytes32', 'bytes32'], ['0x1901', domainSeparator, txHash]))
}

function decodeContractData<T>(
  contractAddress: string,
  abi: string[],
  functionSelectors: Record<string, string>,
  data: string
): T | undefined {
  const contract = new Contract(contractAddress, abi)
  const selector = data.slice(0, 10).toLowerCase()
  const functionName = functionSelectors[selector]
  if (!functionName) return undefined
  const decoded = contract.interface.decodeFunctionData(functionName as string, data)
  return decoded as unknown as T
}

//---------FeeDispatcher Decode-----------
export function decodeFeeDispatcherData(
  feeDispatcherAddress: string,
  data: string
): FeeDispatcherOperation | undefined {

  const decoded = decodeContractData<[string]>(
    feeDispatcherAddress,
    FeeDispatcherAbi,
    {
      '0x69d83ed1': 'addReceiver',
      '0x6552d8b4': 'removeReceiver'
    },
    data
  )
  if (!decoded) return undefined
  return {
    type: data.slice(0, 10).toLowerCase() === '0x69d83ed1' ? 'addReceiver' : 'removeReceiver',
    receiver: decoded[0]
  }
}

//---------MultiSign Decode-----------
export function decodeMultiSignData(
  multisignAddress: string,
  data: string
): MultiSignAddOwner | MultiSignRemoveOwner | MultiSignSwapOwner | undefined {
  return decodeContractData(
    multisignAddress,
    MultiSignAbi,
    {
      '0x0d582f13': 'addOwnerWithThreshold',
      '0xf8dc5dd9': 'removeOwner',
      '0xe318b52b': 'swapOwner'
    },
    data
  ) as MultiSignAddOwner | MultiSignRemoveOwner | MultiSignSwapOwner | undefined
}

//---------Timelock Decode-----------
export function decodeTimelockData(
  timelockAddress: string,
  data: string
): TimelockProposal {
  const contract = new Contract(timelockAddress, TimelockAbi)
  const decoded = contract.interface.decodeFunctionData('schedule', data)

  const [target, value, dataParam, predecessor, salt, delay] = decoded
  const id = utils.keccak256(utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'bytes', 'bytes32', 'bytes32'],
    [target, value, dataParam, predecessor, salt]
  ))

  return { target, value, data: dataParam, predecessor, salt, delay, id }
}

//---------综合 Decode-----------
export function decodeData(
  to: string,
  data: string,
  multisignAddress: string,
  timelockAddress: string,
  feeDispatcherAddress: string,
  nonce: number,
  chainId: string
): DecodedResult | null {
  try {
    if (!to || !data || !multisignAddress || !timelockAddress || !feeDispatcherAddress || nonce == null || !chainId) {
      console.error('Invalid parameters for decodeData')
      return null
    }

    const txHash = calculateMultiSignTxHash(to, "0", data, nonce, chainId, multisignAddress)
    const toLower = to.toLowerCase()

    if (toLower === multisignAddress.toLowerCase()) {
      const multiSignOp = decodeMultiSignData(multisignAddress, data)
      return multiSignOp ? { multiSignOperation: multiSignOp, txHash } : null
    }

    if (toLower === timelockAddress.toLowerCase()) {
      const timelockOp = decodeTimelockData(timelockAddress, data)
      let feeDispatcherOp
      if (timelockOp.target.toLowerCase() === feeDispatcherAddress.toLowerCase()) {
        feeDispatcherOp = decodeFeeDispatcherData(feeDispatcherAddress, timelockOp.data)
      }
      return { timelockOperation: timelockOp, feeDispatcherOperation: feeDispatcherOp, txHash }
    }

    return null
  } catch (error) {
    console.error('decodeData error:', error)
    return null
  }
}
