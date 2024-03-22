import { getDeployment, getLatestBroadcastedDeployment } from './ffi-deploy'
import { getPythPrices } from './ffi-pyth'
import {
  deleteBatch,
  getSafePayloads,
  proposeBatch,
  safeSign,
  signBatch,
  signData,
  signHash,
  signMessage,
} from './ffi-safe'
import { error, success } from './ffi-shared'

const commands = {
  // -> getLatestBroadcastedDeployment NAME CHAIN_ID
  getLatestBroadcastedDeployment,
  // -> getDeployment CONTRACT_NAME CHAIN_ID DEPLOYMENT_ID
  getDeployment,
  // -> getSafePayloads SCRIPT_DRY_BROADCAST_ID CHAIN_ID SAFE_ADDRESS
  getSafePayloads,
  // -> proposeBatch FILENAME
  proposeBatch,
  // -> signBatch SAFE_ADDRESS CHAIN_ID DATA
  signBatch,
  // -> getPythPrices SYMBOL1,SYMBOL2,SYMBOL3 || getPythPrices 0xPYTH_ID,0xPYTH_ID,0xPYTH_ID
  getPythPrices,
  safeSign,
  signData,
  signHash,
  signMessage,
  deleteBatch,
}

type Commands = keyof typeof commands

const command = process.argv[2] as Commands

if (!command) {
  error('No command provided')
}

if (command in commands) {
  try {
    let result = commands[command]()
    if (result instanceof Promise) {
      // @ts-expect-error
      result = await result
    }
    result ? success(result as string | any[]) : error(`No result for command ${command}`)
  } catch (e: unknown) {
    error(`${command} -> ${e}`)
  }
} else {
  error(`Unknown command ${command}`)
}
