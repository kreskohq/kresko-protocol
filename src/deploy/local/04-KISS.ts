import { TASK_DEPLOY_KISS, TASK_DEPLOY_VAULT } from '@tasks'
import { getLogger } from '@utils/logging'
import type { DeployFunction } from 'hardhat-deploy/dist/types'

const logger = getLogger('create-kiss')

const deploy: DeployFunction = async hre => {
  try {
    await hre.run(TASK_DEPLOY_VAULT, { withMockAsset: true })
    const Vault = await hre.getContractOrFork('Vault', 'vKISS')
    logger.success(`Deployed vKISS @ ${Vault.address}`)
    await hre.run(TASK_DEPLOY_KISS)
  } catch (e) {
    console.log(e)
  }
}

deploy.skip = async hre => {
  if ((await hre.deployments.getOrNull('KISS')) != null) {
    logger.log('Skip: Create KISS, already created.')
    return true
  }
  return false
}

deploy.tags = ['all', 'local', 'tokens', 'KISS']
deploy.dependencies = ['facets', 'core']

export default deploy
