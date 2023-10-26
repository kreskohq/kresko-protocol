import { testnetConfigs } from '@config/deploy/arbitrumGoerli'
import { TASK_ADD_ASSET } from '@tasks'
import { getLogger } from '@utils/logging'
import type { DeployFunction } from 'hardhat-deploy/dist/types'

const logger = getLogger(TASK_ADD_ASSET)

const deploy: DeployFunction = async function (hre) {
  const assets = testnetConfigs[hre.network.name].assets
  for (const asset of assets) {
    if (!asset.feed) {
      logger.warn(`Skip: ${asset.symbol} (no oracle)`)
      continue
    }
    logger.log(`Add: ${asset.symbol}`)

    const oracleAddr = hre.network.live
      ? asset.feed
      : (
          await hre.deploy('MockOracle', {
            deploymentName: `MockOracle_${asset.symbol}`,
            args: [`${asset.symbol}/USD`, await asset.getPrice(), 8],
          })
        )[0].address
    await hre.run(TASK_ADD_ASSET, {
      address: (await hre.deployments.getOrNull(asset.symbol))?.address,
      assetConfig: { ...asset, feed: oracleAddr },
    })
  }

  logger.success('Added assets.')
}

deploy.tags = ['local', 'all', 'configuration']
deploy.dependencies = ['core', 'tokens']
// deploy.skip = async hre => hre.network.live;

export default deploy
