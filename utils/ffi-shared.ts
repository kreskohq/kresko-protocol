import path from 'path'
import type { Address, Hex } from 'viem'

type TxType = 'CALL' | 'CREATE' | 'CREATE2'
type AdditionalContract = {
  transactionType: TxType
  address: Address
  initCode: Hex
}

export type Transaction = {
  type: Hex
  from: Address
  to?: Address
  value: Hex
  data: Hex
  nonce: Hex
  accessList: any[]
  gas: Hex
}

export type TxBroadcast = {
  hash: string | null
  transactionType: TxType
  contractName: string | null
  contractAddress: Address | null
  function: string | null
  arguments: string[] | null
  transaction: Transaction
  additionalContracts: AdditionalContract[]
  isFixedGasLimit: boolean
}

type Log = {
  address: Address
  topics: Hex[]
  data: Hex
  blockHash: Hex
  blockNumber: Hex
  transactionHash: Hex
  transactionIndex: Hex
  logIndex: Hex
  removed: boolean
}
type Receipt = {
  transactionHash: Hex
  transactionIndex: Hex
  blockHash: Hex
  blockNumber: Hex
  from: Address
  to: Address | null
  cumulativeGasUsed: Hex
  gasUsed: Hex
  contractAddress: Address
  logs: Log[]
  status: Hex
  logsBloom: Hex
  type: Hex
  effectiveGasPrice: Hex
}

export type BroadcastJSON = {
  transactions: TxBroadcast[]
  receipts: Receipt[]
  chain: number
  timestamp: number
  commit: string
  libraries: any[]
  pending: any[]
  returns: any
}

export type SafeInfoResponse = {
  address: Address
  nonce: number
  threshold: number
  owners: Address[]
  masterCopy: Address
  modules: Address[]
  fallbackHandler: Address
  guard: Address
  version: string
}

export const root = path.resolve(__dirname, '../')
export const deploysBroadcasts = `${root}/out/foundry`

export const signaturesPath = `${process.cwd()}/temp/sign/`

export function success(str: string | any[]) {
  if (!str?.length) process.exit(0)
  if (Array.isArray(str)) {
    process.stdout.write(str.join('\n'))
  } else {
    if (str.startsWith('0x')) {
      process.stdout.write(str)
    } else {
      process.stdout.write(Buffer.from(str).toString('utf-8'))
    }
  }

  process.exit(0)
}

export function error(str: string) {
  if (!str?.length) process.exit(1)

  if (str.startsWith('0x')) {
    process.stdout.write(str)
  } else {
    process.stderr.write(Buffer.from(str).toString('utf-8'))
  }
  process.exitCode = 1
  setTimeout(() => process.exit(1), 1)
}
