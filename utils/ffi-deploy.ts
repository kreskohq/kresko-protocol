import { glob } from 'glob'
import { Address, encodeAbiParameters, encodeFunctionData, parseAbiParameters } from 'viem'
import { type BroadcastJSON, deploysBroadcasts } from './ffi-shared'

export const getLatestBroadcastedDeployment = () => {
  const name = process.argv[3]
  const chainId = process.argv[4]
  const deployments = findBroadcastedDeployment(name, Number(chainId))
  if (!deployments.length) {
    throw new Error(`No deployment found for ${name} on chain ${chainId}`)
  }
  return deployments.sort((a, b) => Number(a.transaction.nonce) - Number(b.transaction.nonce)).pop()?.contractAddress
}

export function getDeployment() {
  const name = process.argv[3]
  const chainId = process.argv[4]
  const deployId = process.argv[5]

  const files = glob.sync(`${deploysBroadcasts}/deploy/${chainId}/${deployId}-latest.json`)
  if (files.length != 1) throw new Error(`Found ${files.length} deployments for ${name}-${chainId}-${deployId}`)

  const data = require(files[0])
  const keys = Object.keys(data)
  const key = keys.find(k => k.toLowerCase() === name.toLowerCase())

  if (!key) throw new Error(`Found deployment but no entry for ${name}-${chainId}-${deployId}`)
  return encodeAbiParameters(parseAbiParameters(['address']), [data[key].address as Address])
}

const findBroadcastedDeployment = (name: string, chainId: number) => {
  const results = []
  const files = glob.sync(`${deploysBroadcasts}/broadcast/**/${chainId}/*-latest.json`)

  for (const file of files) {
    const data: BroadcastJSON = require(file)
    if (!data.transactions?.length) continue
    const transaction = data.transactions.find(tx => {
      if (!tx?.hash) return false

      const isCreate = tx.transactionType.startsWith('CREATE')
      // const isInnerCreate = transaction.transaction.additionalContracts.length > 0;
      // if(!isCreate && !isInnerCreate) return false;
      if (!isCreate) return false

      return tx.contractName?.toLowerCase() === name.toLowerCase()
    })
    if (!transaction) continue
    results.push(transaction)
  }

  return results
}
