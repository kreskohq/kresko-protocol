import { error, success } from '../lib/kresko-lib/utils/shared'
import { getDeployment } from './ffi-deploy'

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
