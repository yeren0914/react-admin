// 交易状态
export const ListStatus = {
  0: 'INITED',
  1: 'READY',
  2: 'SIGNED',
  3: 'PROPOSED',
  4: 'EXECUTED',
  5: 'CLOSED',
}

//创建交易类型
export const CreateTxType = {
  ADD_OWNER: 'ADD_OWNER',
  REMOVE_OWNER: 'REMOVE_OWNER',
  SWAP_OWNER: 'SWAP_OWNER',
  ADD_RECEIVER: 'ADD_RECEIVER',
  REMOVE_RECEIVER: 'REMOVE_RECEIVER',
}
