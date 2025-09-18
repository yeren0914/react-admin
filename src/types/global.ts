import type { EthereumProvider } from './types'
declare global {
  interface Window {
    ethereum?: EthereumProvider;
    kasware?: EthereumProvider
  }
}