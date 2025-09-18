import { ethers } from "ethers"
import { providers } from "@0xsequence/multicall"

export function createEthersProvider(rpc: string): ethers.providers.BaseProvider {
  let provider: ethers.providers.BaseProvider
  if (rpc.startsWith("ws")) {
    provider = new ethers.providers.WebSocketProvider(rpc)
  } else {
    provider = new ethers.providers.JsonRpcProvider(rpc)
  }
  return provider
}

export function createMCProvider(
  provider: ethers.providers.Provider,
  contract: string = "0xd130B43062D875a4B7aF3f8fc036Bc6e9D3E1B3E"
) {
  return new providers.MulticallProvider(provider, { contract })
}