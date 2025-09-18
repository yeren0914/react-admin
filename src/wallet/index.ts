
import Web3 from 'web3'
import type {
  MultiSignTx,
  CreateParams,
  DecodedResult,
} from '../types/types'
import {
  ethers,
  Contract,
  providers,
  utils,
  Signer,
} from 'ethers'
import {
  chainId,
  rpcUrl,
  multicall,
  multisign,
  timelock,
  feeDispatcher,
  MultiSignAbi,
  TimelockAbi,
  FeeDispatcherAbi,
} from '../utils/constants'
import { checkTimelockPermission } from '../utils/timelock'

const TransactionStatus = {
  INITED: 0,
  READY: 1,
  SIGNE: 2,
  PROPOSED: 3,
  EXECUTED: 4,
  CLOSED: 5,
}

class Tx {
  private readonly chainId: string
  private readonly rpcUrl: string
  private readonly multicallAddress: string
  private readonly multisignAddress: string
  private readonly timelockAddress: string
  private readonly feeDispatcherAddress: string

  private provider: providers.JsonRpcProvider | null = null
  private multisignContract: Contract | null = null
  private timelockContract: Contract | null = null
  private feeDispatcherContract: Contract | null = null

  public web3: Web3 | null = null
  public signer: Signer | null = null
  public address: string | null = null

  constructor() {
    this.chainId = chainId
    this.rpcUrl = rpcUrl
    this.multicallAddress = multicall
    this.multisignAddress = multisign
    this.timelockAddress = timelock
    this.feeDispatcherAddress = feeDispatcher
  }

  public setupProvider(): void {
    if (!this.provider) {
      this.provider = new providers.JsonRpcProvider(this.rpcUrl)
      this.web3 = new Web3(new Web3.providers.HttpProvider(this.rpcUrl))
    }
  }

  public async connectWallet(): Promise<{
    provider: providers.Web3Provider
    signer: Signer
    address: string
  }> {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask')
    }

    await window.ethereum.request({ method: 'eth_requestAccounts' })

    const provider = new providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    this.signer = signer

    this.multisignContract =
      this.multisignContract ??
      new Contract(this.multisignAddress, MultiSignAbi, this.signer)

    this.timelockContract =
      this.timelockContract ??
      new Contract(this.timelockAddress, TimelockAbi, this.signer)

    this.feeDispatcherContract =
      this.feeDispatcherContract ??
      new Contract(this.feeDispatcherAddress, FeeDispatcherAbi, this.signer)

    this.address = await signer.getAddress()
    this.setupProvider()

    return { provider, signer, address: this.address }
  }

  private async getNonce(): Promise<ethers.BigNumber> {
    if (!this.multisignContract)
      throw new Error('Multisign contract not initialized')
    return await this.multisignContract.getNonce()
  }

  private isValidAddress(address: string): true {
    if (!utils.isAddress(address)) {
      throw new Error(`Invalid address: ${address}`)
    }
    return true
  }

  private validateThreshold(threshold: number): void {
    if (Number.isNaN(threshold) || threshold < 1) {
      throw new Error('Threshold must be greater than 0')
    }
  }

  private encodeFunctionCall(
    abi: string[],
    method: string,
    params: unknown[]
  ): string {
    const localIface = new utils.Interface(abi)
    return localIface.encodeFunctionData(method, params)
  }

  /** 检查当前钱包是否已经签名了交易 */
  private async hasCurrentWalletSigned(tx: MultiSignTx): Promise<boolean> {
    try {
      if (!this.signer || !this.multisignContract) {
        return false
      }
      const txHash = await this.multisignContract.getTransactionHash(
        tx.to,
        tx.value,
        tx.data,
        tx.nonce
      )

      const sigs = tx.signature.startsWith('0x')
        ? tx.signature.slice(2)
        : tx.signature
      const sigCount = sigs.length / 130

      for (let i = 0; i < sigCount; i++) {
        const sig = '0x' + sigs.slice(i * 130, (i + 1) * 130)
        const r = sig.slice(0, 66)
        const s = '0x' + sig.slice(66, 130)
        let v = parseInt(sig.slice(130, 132), 16)

        let recovered: string
        if (v === 0 || v === 1) {
          recovered = ethers.utils.getAddress(
            '0x' + sigs.slice(i * 130, i * 130 + 40)
          )
        } else {
          if (v >= 27 && v <= 28) {
            // ok
          } else if (v >= 31 && v <= 34) {
            v -= 4 // Gnosis Safe v > 30
          } else if (v === 0 || v === 1) {
            v += 27
          }
          recovered = ethers.utils.recoverAddress(txHash, { v, r, s })
        }

        if (recovered.toLowerCase() === this.address!.toLowerCase()) {
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Error checking signature:', error)
      return false
    }
  }

  private async canExecuteTimelockOperation(
    decoded: DecodedResult
  ): Promise<boolean> {
    if (!decoded.timelockOperation || !this.timelockContract || !this.address)
      return false

    const result = await checkTimelockPermission(
      this.rpcUrl,
      this.timelockAddress,
      this.multicallAddress,
      decoded.timelockOperation.id,
      this.address
    )
    return !!result.result
  }

  /** 创建多签签名 */
  private async createMultiSignSignature(
    to: string,
    value: number,
    data: string,
    nonce: bigint
  ) {
    if (!this.multisignContract || !this.signer || !this.address) {
      throw new Error('Multisign contract not initialized')
    }

    const txHash = await this.multisignContract.getTransactionHash(
      to,
      value,
      data,
      nonce
    )
    const signature = await this.signer.signMessage(
      ethers.utils.arrayify(txHash)
    )

    const sigBytes = ethers.utils.arrayify(signature)
    const r = sigBytes.slice(0, 32)
    const s = sigBytes.slice(32, 64)
    const v = sigBytes[64] + 4

    const ret = ethers.utils.hexlify(
      ethers.utils.concat([
        r,
        s,
        ethers.utils.hexZeroPad(ethers.utils.hexlify(v), 1),
      ])
    )

    // 验证签名
    try {
      const sigBytes = ethers.utils.arrayify(ret)
      const r_verify = sigBytes.slice(0, 32)
      const s_verify = sigBytes.slice(32, 64)
      const v_verify = sigBytes[64] - 4

      const signatureForVerify = ethers.utils.hexlify(
        ethers.utils.concat([
          r_verify,
          s_verify,
          ethers.utils.hexZeroPad(ethers.utils.hexlify(v_verify), 1),
        ])
      )

      const recoveredAddress = ethers.utils.verifyMessage(
        ethers.utils.arrayify(txHash),
        signatureForVerify
      )
      if (recoveredAddress.toLowerCase() !== this.address.toLowerCase()) {
        throw new Error('Signature verification failed: address mismatch')
      }
    } catch (error) {
      console.log('❌ Signature verification failed:', error)
      throw error
    }

    return ret
  }

  /** 创建 Approve 签名，用于批准已有的签名 */
  private createApproveSignature(signerAddress: string) {
    const r = ethers.utils.hexZeroPad(signerAddress, 32)
    const s = ethers.constants.HashZero
    const v = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 1)

    return ethers.utils.hexlify(ethers.utils.concat([r, s, v]))
  }

  // ==============================
  // 🔎 解析相关（内置，无需外部 decodeData）
  // ==============================

  /** 计算 EIP-712 域分隔符（与现有合约保持一致） */
  private calculateDomainSeparator(chainIdNum: number, contractAddress: string) {
    const DOMAIN_SEPARATOR_TYPEHASH =
      '0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f'
    const encoded = utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        DOMAIN_SEPARATOR_TYPEHASH,
        utils.keccak256(utils.toUtf8Bytes('MultiSign')),
        utils.keccak256(utils.toUtf8Bytes('1.0.0')),
        chainIdNum,
        contractAddress,
      ]
    )
    return utils.keccak256(encoded)
  }

  /** 计算多签交易 hash（EIP-712 digest） */
  private calculateMultiSignTxHash(
    to: string,
    value: string | number,
    data: string,
    nonce: bigint | ethers.BigNumberish,
    chainIdNum: number,
    contractAddress: string
  ) {
    const MULTISIGN_TX_TYPEHASH =
      '0x90f2abebc0ebf10eda0133cafe01e69b86c3048e61f94df8484576452f9be4e0'
    const domainSeparator = this.calculateDomainSeparator(
      chainIdNum,
      contractAddress
    )
    const encoded = utils.defaultAbiCoder.encode(
      ['bytes32', 'address', 'uint256', 'bytes32', 'uint256'],
      [MULTISIGN_TX_TYPEHASH, to, value, utils.keccak256(data), nonce]
    )
    const txHash = utils.keccak256(encoded)
    return utils.keccak256(
      utils.solidityPack(['bytes2', 'bytes32', 'bytes32'], ['0x1901', domainSeparator, txHash])
    )
  }

  /** 解析 MultiSign 自身的方法 */
  private _decodeMultiSignData(data: string) {
    const selector = data.slice(0, 10).toLowerCase()
    const iface = new utils.Interface(MultiSignAbi)
    if (selector === '0x0d582f13') {
      const decoded = iface.decodeFunctionData('addOwnerWithThreshold', data)
      return {
        name: 'addOwnerWithThreshold' as const,
        args: { owner: utils.getAddress(decoded[0]), threshold: Number(decoded[1]) },
      }
    } else if (selector === '0xf8dc5dd9') {
      const decoded = iface.decodeFunctionData('removeOwner', data)
      return {
        name: 'removeOwner' as const,
        args: {
          prevOwner: utils.getAddress(decoded[0]),
          owner: utils.getAddress(decoded[1]),
          threshold: Number(decoded[2]),
        },
      }
    } else if (selector === '0xe318b52b') {
      const decoded = iface.decodeFunctionData('swapOwner', data)
      return {
        name: 'swapOwner' as const,
        args: {
          prevOwner: utils.getAddress(decoded[0]),
          oldOwner: utils.getAddress(decoded[1]),
          newOwner: utils.getAddress(decoded[2]),
        },
      }
    }
    return undefined
  }

  /** 解析 TimelockController.schedule(...) */
  private _decodeTimelockData(data: string) {
    const iface = new utils.Interface(TimelockAbi)
    const decoded = iface.decodeFunctionData('schedule', data)
    const target = utils.getAddress(decoded[0])
    const value = decoded[1]
    const dataParam: string = decoded[2]
    const predecessor: string = decoded[3]
    const salt: string = decoded[4]
    const delay = decoded[5]

    // 生成与 OpenZeppelin TimelockController 相同的 operationId
    const abiCoder = utils.defaultAbiCoder
    const encodedData = abiCoder.encode(
      ['address', 'uint256', 'bytes', 'bytes32', 'bytes32'],
      [target, value, dataParam, predecessor, salt]
    )
    const id = utils.keccak256(encodedData)

    return { target, value, data: dataParam, predecessor, salt, delay, id }
  }

  /** 解析 FeeDispatcher 内层 data */
  private _decodeFeeDispatcherData(bytesData: string) {
    const selector = bytesData.slice(0, 10).toLowerCase()
    const iface = new utils.Interface(FeeDispatcherAbi)
    if (selector === '0x69d83ed1') {
      const [receiver] = iface.decodeFunctionData('addReceiver', bytesData)
      return {
        type: 'addReceiver' as const,
        receiver: utils.getAddress(receiver),
      }
    } else if (selector === '0x6552d8b4') {
      const [receiver] = iface.decodeFunctionData('removeReceiver', bytesData)
      return {
        type: 'removeReceiver' as const,
        receiver: utils.getAddress(receiver),
      }
    }
    return undefined
  }

  // 解析交易数据
  public decodeCalldata(
    data: string,
    opts?: { to?: string; nonce?: bigint }
  ): DecodedResult | null {
    try {
      if (!data || data.length < 10) return null

      const selector = data.slice(0, 10).toLowerCase()
      let to = opts?.to
      if (!to) {
        if (selector === '0x01d5062a') {
          to = this.timelockAddress
        } else if (
          selector === '0x0d582f13' ||
          selector === '0xf8dc5dd9' ||
          selector === '0xe318b52b'
        ) {
          to = this.multisignAddress
        }
      }
      const toLower = (to ?? '').toLowerCase()
      const multisignLower = this.multisignAddress.toLowerCase()
      const timelockLower = this.timelockAddress.toLowerCase()
      const feeDispatcherLower = this.feeDispatcherAddress.toLowerCase()

      let txHash: string | undefined
      if (to && opts?.nonce !== undefined && this.chainId) {
        const chainIdNum = Number(this.chainId)
        txHash = this.calculateMultiSignTxHash(
          to,
          '0',
          data,
          opts.nonce!,
          chainIdNum,
          this.multisignAddress
        )
      }

      if (toLower && toLower === multisignLower) {
        const ms = this._decodeMultiSignData(data)
        if (ms) {
          return {
            multiSignOperation: ms,
            txHash,
          } as unknown as DecodedResult
        }
        return null
      }

      if (toLower && toLower === timelockLower) {
        const tl = this._decodeTimelockData(data)
        if (tl.target.toLowerCase() === feeDispatcherLower) {
          const fd = this._decodeFeeDispatcherData(tl.data)
          return {
            timelockOperation: tl,
            feeDispatcherOperation: fd,
            txHash,
          } as unknown as DecodedResult
        }
        return {
          timelockOperation: tl,
          txHash,
        } as unknown as DecodedResult
      }

      if (selector === '0x01d5062a') {
        const tl = this._decodeTimelockData(data)
        const innerSel = tl.data.slice(0, 10).toLowerCase()
        const innerGuess =
          innerSel === '0x69d83ed1' || innerSel === '0x6552d8b4'
            ? this._decodeFeeDispatcherData(tl.data)
            : undefined
        return {
          timelockOperation: tl,
          feeDispatcherOperation: innerGuess,
          txHash,
        } as unknown as DecodedResult
      }
      const ms = this._decodeMultiSignData(data)
      if (ms) {
        return {
          multiSignOperation: ms,
          txHash,
        } as unknown as DecodedResult
      }

      return null
    } catch (error) {
      console.error('decodeCalldata error:', error)
      return null
    }
  }

  // ==============================
  // 创建交易相关方法
  // ==============================
  public async createTransaction(createParams: CreateParams) {
    if (!createParams.type) throw Error('Please select a transaction type')

    let txParams = null
    switch (createParams.type) {
      case 1:
        txParams = await this.createAddReceiverTransaction(
          createParams.toAddress!
        )
        break
      case 2:
        txParams = await this.createRemoveReceiverTransaction(
          createParams.removeAddress!
        )
        break
      case 3:
        txParams = await this.createAddOwnerTransaction(
          createParams.toAddress!,
          createParams.threshold!
        )
        break
      case 4:
        txParams = await this.createRemoveOwnerTransaction(
          createParams.removeAddress!,
          createParams.threshold!
        )
        break
      case 5:
        txParams = await this.createSwapOwnerTransaction(
          createParams.oldAddress!,
          createParams.newAddress!
        )
        break
      default:
        console.log('❌ 无效选择')
        return
    }

    if (!txParams) {
      throw Error('Transaction parameter generation failed')
    }

    const signature = await this.createMultiSignSignature(
      txParams.to,
      Number(txParams.value),
      txParams.data,
      BigInt(Number(txParams.nonce))
    )

    return {
      to: txParams.to,
      data: txParams.data,
      value: txParams.value,
      nonce: txParams.nonce,
      signature,
    }
  }

  public async createAddReceiverTransaction(toAddress: string) {
    try {
      this.isValidAddress(toAddress)

      const feeDispatcherInterface = new ethers.utils.Interface([
        'function addReceiver(address receiver) external',
      ])
      const addReceiverData = feeDispatcherInterface.encodeFunctionData(
        'addReceiver',
        [toAddress]
      )

      const target = this.feeDispatcherAddress
      const value = 0
      const predecessor = ethers.constants.HashZero
      const salt = ethers.constants.HashZero
      const delay = await this.timelockContract!.getMinDelay()

      const scheduleData = this.timelockContract!.interface.encodeFunctionData(
        'schedule',
        [target, value, addReceiverData, predecessor, salt, delay]
      )

      const to = this.timelockAddress
      const nonce = await this.getNonce()

      return {
        to,
        value,
        data: scheduleData,
        operation: 0,
        nonce: BigInt(Number(nonce)),
      }
    } catch (error) {
      const msg = typeof error === 'string' ? error : 'Encoding function failed'
      throw new Error(msg)
    }
  }

  public async createRemoveReceiverTransaction(address: string) {
    try {
      this.isValidAddress(address)

      const removeData = this.encodeFunctionCall(
        ['function removeReceiver(address receiver) external'],
        'removeReceiver',
        [address]
      )

      const delay = await this.timelockContract!.getMinDelay()
      const value = 0

      const scheduleData = this.timelockContract!.interface.encodeFunctionData(
        'schedule',
        [this.feeDispatcherAddress, value, removeData, ethers.constants.HashZero, ethers.constants.HashZero, delay]
      )

      const nonce = await this.getNonce()

      return { to: this.timelockAddress, data: scheduleData, value, nonce }
    } catch (error) {
      console.log('Encoding function failed', error)
      return null
    }
  }

  public async createAddOwnerTransaction(address: string, threshold: number) {
    try {
      this.isValidAddress(address)
      this.validateThreshold(threshold)

      const data = this.multisignContract!.interface.encodeFunctionData(
        'addOwnerWithThreshold',
        [address, threshold]
      )
      const nonce = await this.getNonce()

      return { to: this.multisignAddress, data, value: '0', nonce }
    } catch (error) {
      console.error('❌ 创建 AddOwner 交易失败:', error)
      return null
    }
  }

  public async createRemoveOwnerTransaction(
    removeAdderss: string,
    threshold: number
  ) {
    try {
      this.isValidAddress(removeAdderss)
      this.validateThreshold(threshold)

      const owners = await this.multisignContract!.getOwners()
      const idx = owners.findIndex(
        (a: string) => a.toLowerCase() === removeAdderss.toLowerCase()
      )
      if (idx === -1) throw new Error('Address is not Owner')

      const prevOwner = idx === 0 ? '0x0000000000000000000000000000000000000001' : owners[idx - 1]
      const data = this.multisignContract!.interface.encodeFunctionData(
        'removeOwner',
        [prevOwner, removeAdderss, threshold]
      )
      const nonce = await this.getNonce()

      return { to: this.multisignAddress, data, value: '0', nonce }
    } catch (error) {
      console.log('err', error)
    }
  }

  public async createSwapOwnerTransaction(oldAddr: string, newAddr: string) {
    try {
      this.isValidAddress(oldAddr)
      this.isValidAddress(newAddr)

      const owners = await this.multisignContract!.getOwners()
      const idx = owners.findIndex(
        (a: string) => a.toLowerCase() === oldAddr.toLowerCase()
      )
      if (idx === -1) throw new Error('Address is not Owner')

      const prevOwner = idx === 0 ? '0x0000000000000000000000000000000000000001' : owners[idx - 1]
      const data = this.multisignContract!.interface.encodeFunctionData(
        'swapOwner',
        [prevOwner, oldAddr, newAddr]
      )
      const nonce = await this.getNonce()

      return { to: this.multisignAddress, data, value: '0', nonce }
    } catch (error) {
      console.error('❌ 创建 SwapOwner 交易失败:', error)
      return null
    }
  }

  // ==============================
  // 交易执行
  // ==============================

  //多签
  public async multiSign(tx: MultiSignTx) {
    try {
      if (!this.signer || !this.multisignContract || !this.address) return false
      if (tx.status === 1 && !(await this.hasCurrentWalletSigned(tx))) {
        return await this.executeMultiSignTransaction(tx)
      }
    } catch (error) {
      const msg = typeof error === 'string' ? error : 'Failed to create MultiSign transaction'
      console.log('msg', msg)
      throw Error(msg)
    }
  }

  public async sendTransaction(tx: MultiSignTx) {
    if (!this.signer || !this.multisignContract || !this.address) return false
    try {
      const decoded = this.decodeCalldata(tx.data, { to: tx.to, nonce: BigInt(tx.nonce!) })
      if (decoded && (await this.canExecuteTimelockOperation(decoded))) {
        return await this.executeTimelockTransaction(decoded)
      }
    } catch (error) {
      const msg = typeof error === 'string' ? error : 'Failed to create timeLock transaction'
      throw Error(msg)
    }
  }

  private recoverOwnerFromSignature(dataHash: string, sig: string): string {
    const hex = sig.startsWith('0x') ? sig.slice(2) : sig;
    const r = '0x' + hex.slice(0, 64);
    const s = '0x' + hex.slice(64, 128);
    const vRaw = parseInt(hex.slice(128, 130), 16);

    if (vRaw === 1) {
      // 伪签名：r 里装的是 owner（左填充到 32 字节）
      const owner = ethers.utils.hexDataSlice(r, 12); // 取后 20 字节
      return ethers.utils.getAddress(owner);
    }

    if (vRaw > 30) {
      const v = vRaw - 4;
      const sigForVerify = ethers.utils.hexlify(
        ethers.utils.concat([
          r, s, ethers.utils.hexZeroPad(ethers.utils.hexlify(v), 1)
        ])
      );
      return ethers.utils.verifyMessage(
        ethers.utils.arrayify(dataHash),
        sigForVerify
      );
    }

    const v = (vRaw === 0 || vRaw === 1) ? vRaw + 27 : vRaw;
    return ethers.utils.verifyMessage(
      ethers.utils.arrayify(dataHash),
      { r, s, v }
    );
  }



  private async executeMultiSignTransaction(tx: MultiSignTx) {
    try {
      if (!this.signer || !this.multisignContract || !this.address) {
        this.connectWallet()
        throw Error('Please initialize the wallet first')
      }
      console.log('正在生成批准签名...')
      const currentNonce = await this.multisignContract.getNonce();
      if (Number(currentNonce) !== tx.nonce) {
        console.log('nonce 不一致')
        return
      } else {
        console.log('currentNonce', Number(currentNonce))
        console.log('tx nonce', tx.nonce)
      }

      // const dataHash = await this.multisignContract.getTransactionHash(
      //   tx.to, tx.value, tx.data, tx.nonce
      // );

      // const mySignature = await this.createMultiSignSignature(
      //   tx.to, Number(tx.value), tx.data, BigInt(tx.nonce)
      // );
      // console.log('mySignature', mySignature)
      // console.log('currentAddress', this.address)

      // const packed = this.sortAndPackSignaturesByOwner(dataHash, [
      //   tx.signature,
      //   mySignature
      // ]);
      // console.log('tx.signature', tx.signature)
      const owners = await this.multisignContract.getOwners();
      const threshold = await this.multisignContract.getThreshold?.() ?? 2;
      // console.log('正在执行 MultiSign 交易...');
      // const txResponse = await this.multisignContract.connect(this.signer)
      //   .execTransaction(tx.to, tx.value, tx.data, packed, { value: tx.value });

      const approveSignature = this.createApproveSignature(this.address)
      const allSignatures = tx.creator.toLowerCase() < this.address.toLowerCase()
        ? ethers.utils.concat([tx.signature, approveSignature])
        : ethers.utils.concat([approveSignature, tx.signature])

      console.log('owners        :', owners);
      console.log('threshold     :', Number(threshold));
      console.log('packed length :', (allSignatures.length - 2) / 130, 'signatures');
      console.log('allSignatures', allSignatures.length)
      console.log('正在执行MultiSign交易...');
      const txResponse = await this.multisignContract.connect(this.signer).execTransaction(
        tx.to,
        tx.value,
        tx.data,
        allSignatures,
        { value: tx.value }
      )
      console.log('等待交易确认...')
      await txResponse.wait()
      console.log('✅ 交易已确认!')
      return {
        status:
          tx.to.toLowerCase() === this.timelockAddress.toLowerCase()
            ? TransactionStatus.PROPOSED
            : TransactionStatus.EXECUTED,
        txid: txResponse.hash,
      }
    } catch (error) {
      console.error('MultiSign交易执行失败:', error)
      throw Error('MultiSign transaction execution failed')
    }
  }

  private async executeTimelockTransaction(decoded: DecodedResult) {
    try {
      if (!decoded.timelockOperation) throw new Error('Timelock operation does not exist')
      if (!this.signer || !this.timelockContract || !this.address) {
        this.connectWallet()
        throw Error('Please initialize the wallet first')
      }
      const timelockOp = decoded.timelockOperation
      const txResponse = await this.timelockContract
        .connect(this.signer)
        .execute(
          timelockOp.target,
          timelockOp.value,
          timelockOp.data,
          timelockOp.predecessor,
          timelockOp.salt,
          { value: timelockOp.value }
        )

      console.log('等待交易确认...')
      await txResponse.wait()
      console.log('✅ 交易已确认!')
      return { status: TransactionStatus.EXECUTED, txid: txResponse.hash }
    } catch (error) {
      const msg = typeof error === 'string' ? error : 'Timelock transaction execution failed'
      throw Error(msg)
    }
  }
}

export default Tx
