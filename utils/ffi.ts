import { resolve } from 'node:path'
import { glob } from 'glob'
import { Address, encodeAbiParameters, parseAbiParameters } from 'viem'
import { error, success } from '../lib/kresko-lib/utils/shared'

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

const commands = {
  // -> getDeployment CONTRACT_NAME CHAIN_ID DEPLOYMENT_ID
  getDeployment,
}

type Commands = keyof typeof commands

const command = process.argv[2] as Commands

if (!command) {
  error('No command provided')
}

if (command in commands) {
  try {
    const result = commands[command]()
    result ? success(result as string | any[]) : error(`No result for command ${command}`)
  } catch (e: unknown) {
    error(`${command} -> ${e}`)
  }
} else {
  error(`Unknown command ${command}`)
}
