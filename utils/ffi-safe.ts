import { writeFileSync } from 'node:fs'
import ethProvider from 'eth-provider'
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

const typedData = (safe: Address, message: any) => ({
  types,
  domain: {
    verifyingContract: safe,
    chainId: 42161,
  },
  primaryType: 'SafeTx' as const,
  message: message,
})

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

  const [signature, signer] = await ethSign(decoded.txHash)
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

export async function proposeBatch() {
  const fileName = process.argv[3]
  const tx = require(fileName)

  const response = await fetch(`${SAFE_API}${checksumAddress(tx.safe)}/multisig-transactions/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tx),
  })
  const json = await response.json()
  return encodeAbiParameters(proposeOutput, [`${response.status}: ${response.statusText}`, json])
}

async function ethSign(txHash: Hex): Promise<[Hex, Address]> {
  const connection = ethProvider('frame')
  const accs = (await connection.enable()) as Address[]
  if (!accs.length) {
    throw new Error(`No accounts to sign with, does Frame exist?`)
  }
  const signer = accs[0]
  return [
    await connection.request({
      method: 'eth_sign',
      params: [signer, txHash],
    }),
    signer,
  ]
}

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
