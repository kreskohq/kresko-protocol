import { testnetConfigs } from '@config/hardhat/deploy/arbitrumSepolia'
import { createKrAsset } from '@scripts/create-krasset'
import { getLogger } from '@utils/logging'
import type { DeployFunction } from 'hardhat-deploy/types'

const logger = getLogger('Create KrAsset')

const deploy: DeployFunction = async function (hre) {
  const assets = testnetConfigs[hre.network.name].assets.filter(a => !!a.krAssetConfig || !!a.scdpKrAssetConfig)

  for (const krAsset of assets) {
    if (krAsset.symbol === 'KISS') {
      logger.warn(`Skip: ${krAsset.symbol}`)
      continue
    }
    const isDeployed = await hre.deployments.getOrNull(krAsset.symbol)
    if (isDeployed != null) continue
    // Deploy the asset
    if (!krAsset.krAssetConfig?.underlyingAddr)
      throw new Error(`Underlying address should be zero address if it does not exist (${krAsset.symbol})`)

    logger.log(`Create: ${krAsset.name} (${krAsset.symbol})`)
    await createKrAsset(
      krAsset.symbol,
      krAsset.name ? krAsset.name : krAsset.symbol,
      18,
      krAsset.krAssetConfig.underlyingAddr,
      hre.users.treasury.address,
      0,
      0,
    )
    logger.log(`Success: ${krAsset.name}.`)
  }

  logger.success('Done.')
}

deploy.skip = async hre => {
  const logger = getLogger('deploy-tokens')
  const krAssets = testnetConfigs[hre.network.name].assets.filter(a => !!a.krAssetConfig || !!a.scdpKrAssetConfig)
  if (!krAssets.length) {
    logger.log('Skip: No krAssets configured.')
    return true
  }
  if (await hre.deployments.getOrNull(krAssets[krAssets.length - 1].symbol)) {
    logger.log('Skip: Create krAssets, already created.')
    return true
  }
  return false
}

deploy.tags = ['local', 'all', 'tokens', 'krassets']
deploy.dependencies = ['core']

export default deploy
