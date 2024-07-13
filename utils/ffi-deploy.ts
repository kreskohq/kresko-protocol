import { resolve } from 'node:path'
import { glob } from 'glob'
import { Address, encodeAbiParameters, parseAbiParameters } from 'viem'
const root = resolve(__dirname, '../')
const deploysBroadcasts = `${root}/out/foundry`

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

