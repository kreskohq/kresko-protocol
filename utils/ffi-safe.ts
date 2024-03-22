import { writeFileSync } from 'node:fs'
import TrezorConnect from '@trezor/connect'
import { glob } from 'glob'
import {
  Address,
  Hex,
  checksumAddress,
  decodeAbiParameters,
  encodeAbiParameters,
  parseAbiParameters,
  toFunctionSelector,
  zeroAddress,
} from 'viem'
import type { BroadcastJSON, SafeInfoResponse } from './ffi-shared'
import { deploysBroadcasts, signaturesPath } from './ffi-shared'

const SAFE_API = 'https://safe-transaction-arbitrum.safe.global/api/v1/safes/'
const SAFE_API_V1 = 'https://safe-transaction-arbitrum.safe.global/api/v1/'

const txPayloadOutput = parseAbiParameters([
  'Payloads result',
  'struct Payload { address to; uint256 value; bytes data; }',
  'struct PayloadExtra { string name; address contractAddr; string transactionType; string func; string funcSig; string[] args; address[] creations; uint256 gas; }',
  'struct Payloads { Payload[] payloads; PayloadExtra[] extras; uint256 txCount; uint256 creationCount; uint256 totalGas; uint256 safeNonce; string safeVersion; uint256 timestamp; uint256 chainId; }',
])

const signPayloadInput = parseAbiParameters([
  'Batch batch',
  'struct Batch { address to; uint256 value; bytes data; uint8 operation; uint256 safeTxGas; uint256 baseGas; uint256 gasPrice; address gasToken; address refundReceiver; uint256 nonce; bytes32 txHash; bytes signature; }',
])

const signatureOutput = parseAbiParameters(['string,bytes,address'])
const proposeOutput = parseAbiParameters(['string,string'])

const DERIVATION_PATH = process.env.MNEMONIC_PATH || "m/44'/60'/0'/0/0"
export const types = {
  EIP712Domain: [
    { name: 'verifyingContract', type: 'address' },
    { name: 'chainId', type: 'uint256' },
  ],
  SafeTx: [
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'operation', type: 'uint8' },
    { name: 'safeTxGas', type: 'uint256' },
    { name: 'baseGas', type: 'uint256' },
    { name: 'gasPrice', type: 'uint256' },
    { name: 'gasToken', type: 'address' },
    { name: 'refundReceiver', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
}
const get = async (op: (trezor: typeof TrezorConnect) => Promise<[signature: Hex, address: Address]>) => {
  await TrezorConnect.init({
    manifest: {
      email: 'hello@kresko.fi',
      appUrl: 'https://kresko.fi',
    },
  })
  return op(TrezorConnect)
}
const typedData = (safe: Address, message: any) => ({
  types,
  domain: {
    verifyingContract: safe,
    chainId: 42161,
  },
  primaryType: 'SafeTx' as const,
  message: message,
})

export async function getSafePayloads() {
  const name = process.argv[3]
  const chainId = process.argv[4]
  const safeAddr = process.argv[5] as Address
  const payloads = await parseBroadcast(name, Number(chainId), safeAddr)

  if (!payloads.length) {
    throw new Error(`No payloads found for ${name} on chain ${chainId}`)
  }
  return payloads
}

export async function signBatch() {
  const timestamp = Math.floor(Date.now() / 1000)

  const safe = process.argv[3] as Address
  const chainId = process.argv[4]
  const data = process.argv[5] as Hex
  const file = (suffix: string) => `${signaturesPath}${timestamp}-${chainId}-${suffix}.json`

  const [decoded] = decodeAbiParameters(signPayloadInput, data)
  const typed = typedData(safe, {
    to: decoded.to,
    value: Number(decoded.value),
    data: decoded.data,
    operation: Number(decoded.operation),
    safeTxGas: Number(decoded.safeTxGas),
    baseGas: Number(decoded.baseGas),
    gasPrice: Number(decoded.gasPrice),
    gasToken: decoded.gasToken,
    refundReceiver: decoded.refundReceiver,
    nonce: Number(decoded.nonce),
  })

  const [signature, signer] = await safeSign(decoded.txHash)
  const fileName = file('signed-batch')
  writeFileSync(
    fileName,
    JSON.stringify({
      ...typed.message,
      safe,
      sender: signer,
      signature,
      contractTransactionHash: decoded.txHash,
    }),
  )

  return encodeAbiParameters(signatureOutput, [fileName, signature, signer])
}

export async function proposeBatch(filename?: string) {
  const file = getArg(filename)
  const results = !file.startsWith(process.cwd()) ? glob.sync(`${signaturesPath}${file}.json`) : [file]
  if (results.length !== 1) throw new Error(`Expected 1 file, got ${results.length} for ${file}`)
  const tx = require(results[0])
  const isCLI = process.argv[4] != null

  const response = await fetch(`${SAFE_API}${checksumAddress(tx.safe)}/multisig-transactions/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tx),
  })
  const json = await response.json()
  if (isCLI) {
    console.log(json)
    return
  }
  return encodeAbiParameters(proposeOutput, [`${response.status}: ${response.statusText}`, json])
}

export async function deleteBatch(txHash?: Hex) {
  const safeTxHash = getArg(txHash)
  const [signature] = await signData(deleteData(safeTxHash))

  const response = await fetch(`${SAFE_API_V1}transactions/${safeTxHash}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signature, safeTxHash }),
  })
  if (!response.ok) throw new Error(await response.text())
  return response.statusText
}

export async function safeSign(txHash?: Hex): Promise<[Hex, Address]> {
  const [signature, signer] = await signHash(getArg(txHash))
  const v1 = parseInt(signature.slice(-2), 16) + 4
  return [`${signature.slice(0, -2)}${v1.toString(16)}` as Hex, signer]
}

export function signHash(hash?: string) {
  return get(async trezor => {
    const result = await trezor.ethereumSignMessage({
      message: getArg(hash),
      hex: true,
      path: DERIVATION_PATH,
    })
    if (!result.success) throw new Error(result.payload.error)
    return [`0x${result.payload.signature}` as Hex, result.payload.address as Address]
  })
}

export function signMessage(message?: string) {
  return get(async trezor => {
    const result = await trezor.ethereumSignMessage({
      message: getArg(message),
      hex: false,
      path: DERIVATION_PATH,
    })
    if (!result.success) throw new Error(result.payload.error)
    return [`0x${result.payload.signature}` as Hex, result.payload.address as Address]
  })
}

export async function signData(data?: any) {
  return get(async trezor => {
    let arg = getArg(data)
    if (typeof arg === 'string') {
      arg = JSON.parse(arg)
    }
    const result = await trezor.ethereumSignTypedData({
      path: DERIVATION_PATH,
      data: arg,
      metamask_v4_compat: true,
    })
    if (!result.success) throw new Error(result.payload.error)
    return [`0x${result.payload.signature}` as Hex, result.payload.address as Address]
  })
}

const getArg = <T>(arg?: T) => {
  if (!arg) arg = process.argv[3] as T
  if (!arg) throw new Error('No argument provided')
  return arg
}

async function parseBroadcast(name: string, chainId: number, safeAddr: Address) {
  const files = glob.sync(`${deploysBroadcasts}/broadcast/**/${chainId}/dry-run/${name}-latest.json`)
  if (files.length !== 1) throw new Error(`Expected 1 file, got ${files.length}`)
  const data: BroadcastJSON = require(files[0])

  if (!data.transactions?.length) {
    throw new Error(`No transactions found for ${name} on chain ${chainId}`)
  }

  const safeInfo: SafeInfoResponse = await fetch(`${SAFE_API}${checksumAddress(safeAddr)}`).then(res => res.json())

  const result = data.transactions.map(tx => {
    const to = tx.transaction.to
    const value = tx.transaction.value
    const gas = tx.transaction.gas
    const data = tx.transaction.data
    return {
      payload: {
        to: checksumAddress(to ?? zeroAddress),
        value: BigInt(value),
        data,
      },
      payloadInfo: {
        name,
        transactionType: tx.transactionType,
        contractAddr: checksumAddress(tx.contractAddress ?? zeroAddress),
        func: tx.function ?? '',
        funcSig: tx.function ? toFunctionSelector(tx.function) : '0x',
        args: tx.arguments ?? [],
        creations: tx.additionalContracts.map(c => checksumAddress(c.address)),
        gas: BigInt(gas),
      },
    }
  })

  const metadata = {
    payloads: result.map(r => r.payload),
    extras: result.map(r => r.payloadInfo),
    txCount: BigInt(data.transactions.length),
    creationCount: BigInt(data.transactions.reduce((res, tx) => res + tx.additionalContracts.length, 0)),
    totalGas: BigInt(data.transactions.reduce((acc, tx) => acc + Number(tx.transaction.gas), 0)),
    safeNonce: BigInt(safeInfo.nonce),
    safeVersion: safeInfo.version,
    timestamp: BigInt(data.timestamp),
    chainId: BigInt(data.chain),
  }
  return encodeAbiParameters(txPayloadOutput, [metadata])
}

const deleteData = (txHash: Hex) => ({
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    DeleteRequest: [
      { name: 'safeTxHash', type: 'bytes32' },
      { name: 'totp', type: 'uint256' },
    ],
  },
  primaryType: 'DeleteRequest',
  domain: {
    name: 'Safe Transaction Service',
    version: '1.0',
    chainId: 42161,
    verifyingContract: '0x266489Bde85ff0dfe1ebF9f0a7e6Fed3a973cEc3',
  },
  message: {
    safeTxHash: txHash,
    totp: Math.floor(Date.now() / 1000 / 3600),
  },
})
