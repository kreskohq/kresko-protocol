import { getDeploymentUsers } from '@config/hardhat/deploy'
import { getLogger } from '@utils/logging'
import { testKrAssetConfig } from '@utils/test/mocks'
import { Role } from '@utils/test/roles'
import { MaxUint128, toBig } from '@utils/values'
import { task } from 'hardhat/config'
import type { TaskArguments } from 'hardhat/types'
import { TASK_DEPLOY_KISS } from './names'

const logger = getLogger(TASK_DEPLOY_KISS)

task(TASK_DEPLOY_KISS).setAction(async function (_taskArgs: TaskArguments, hre) {
  logger.log(`Deploying KISS`)
  const { deployer } = await hre.getNamedAccounts()
  if (!hre.DeploymentFactory) {
    ;[hre.DeploymentFactory] = await hre.deploy('DeploymentFactory', {
      args: [deployer],
    })
  }
  const VaultDeployment = await hre.deployments.getOrNull('vKISS')
  if (!VaultDeployment?.address) {
    if (hre.network.name === 'hardhat') {
      await hre.run('deploy:vault', { withMockAsset: true })
    } else {
      throw new Error('Vault is not deployed')
    }
  }
  const Vault = await hre.getContractOrFork('Vault', 'vKISS')
  const { multisig } = await getDeploymentUsers(hre)
  const Diamond = await hre.getContractOrFork('Diamond')
  const args = {
    name: 'KISS',
    symbol: 'KISS',
    decimals: 18,
    admin: multisig,
    operator: Diamond.address,
  }

  const KISS = await hre.deployProxy('KISS', {
    initializer: 'initialize',
    initializerArgs: [args.name, args.symbol, args.decimals, args.admin, args.operator, Vault.address],
    type: 'create3',
    salt: 'KISS',
  })

  const hasRole = await KISS.hasRole(Role.OPERATOR, args.operator)
  const hasRoleAdmin = await KISS.hasRole(Role.ADMIN, args.admin)

  if (!hasRoleAdmin) {
    throw new Error(`Multisig is missing Role.ADMIN`)
  }
  if (!hasRole) {
    throw new Error(`Diamond is missing Role.OPERATOR`)
  }
  logger.success(`KISS succesfully deployed @ ${KISS.address}`)
  // Add to runtime for tests and further scripts

  const asset = {
    address: KISS.address,
    contract: KISS,
    config: {
      args: {
        name: 'KISS',
        price: 1,
        factor: 1e4,
        maxDebtMinter: MaxUint128,
        marketOpen: true,
        krAssetConfig: testKrAssetConfig.krAssetConfig,
      },
    },
    initialPrice: 1,
    errorId: ['KISS', KISS.address],
    assetInfo: () => hre.Diamond.getAsset(KISS.address),
    getPrice: async () => toBig(1, 8),
    priceFeed: {} as any,
  }

  return asset
})
