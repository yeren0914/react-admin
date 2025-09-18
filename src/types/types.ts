export interface RequestParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ErrorResponse {
  message?: string;
}

export interface DataType {
  id: string;
  address: string;
  amount: number;
  sign: string;
  hash: string;
  createdAt: string;
  creator: string;
  data: string;
  nonce: number;
  signature: string;
  to: string;
  updatedAt: string;
  value: string;
  receiver?: string;
  createdAtFormatted?: string;
  executionTxHash?: string | null;
  metadata?: string | null;
  proposalTxHash?: string | null;
  createType: string;
  status: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface EthereumProvider {
  getBalance: () => Promise<number | { error?: string }>;
  getNetwork: () => Promise<string | { error?: string }>;
  switchNetwork: (network: string) => Promise<void>;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  [key: string]: ((...args: never[]) => unknown) | undefined;
}


export interface CreateTxData {
  data: string;
  noce: number;
} 

export interface MultiSignTx {
  id: string
  to: string
  value: bigint
  data: string
  creator: string
  signature: string
  nonce?: number
  status?: number
  address?: string
}
export interface MultiSignAddOwner {
  owner: string
  threshold: number
}

export interface MultiSignRemoveOwner {
  prevOwner: string
  newOwner: string
  threshold: number
}

export interface MultiSignSwapOwner {
  prevOwner: string
  oldOwner: string
  newOwner: string
}

export interface TimelockProposal {
  target: string
  value: string
  data: string
  predecessor: string
  salt: string
  delay: string
  id: string
}

export interface CreateParams {
  type: number,
  toAddress?: string,
  oldAddress?: string,
  newAddress?: string,
  removeAddress?: string,
  threshold?: number,
}


export interface FeeDispatcherOperation {
  type: 'addReceiver' | 'removeReceiver'
  receiver: string
}

export interface DecodedResult {
  multiSignOperation?: MultiSignAddOwner | MultiSignRemoveOwner | MultiSignSwapOwner
  timelockOperation?: TimelockProposal
  feeDispatcherOperation?: FeeDispatcherOperation
  txHash: string
}
