import path from 'path'
import { type Address, type Hex } from 'viem'

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
  input: Hex
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

export const root = path.resolve(__dirname, '../')
export const deploysBroadcasts = `${root}/out/foundry`

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
