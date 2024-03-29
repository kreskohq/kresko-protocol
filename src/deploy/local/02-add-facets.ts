import {
  commonFacets,
  getCommonInitializer,
  getMinterInitializer,
  getSCDPInitializer,
  minterFacets,
  peripheryFacets,
  scdpFacets,
} from '@config/hardhat/deploy'
import { addFacets } from '@scripts/add-facets'
import { getLogger } from '@utils/logging'
import type { DeployFunction } from 'hardhat-deploy/dist/types'
import { zeroAddress } from 'viem'

const logger = getLogger('common-facets')

const deploy: DeployFunction = async function (hre) {
  if (!hre.Diamond.address) {
    throw new Error('Diamond not deployed')
  }

  await hre.deploy('MockPyth', {
    args: [[]],
  })
  await hre.deploy('MockSequencerUptimeFeed')

  const [GatingManager] = await hre.deploy('GatingManager', {
    args: [
      hre.users.deployer.address,
      '0xAbDb949a18d27367118573A217E5353EDe5A0f1E',
      '0x1C04925779805f2dF7BbD0433ABE92Ea74829bF6',
      0,
    ],
  })
  const commonInit = (await getCommonInitializer(hre, GatingManager.address)).args
  if (commonInit.council === zeroAddress) throw new Error('Council address not set')
  await addFacets({
    names: commonFacets,
    initializerName: 'CommonConfigFacet',
    initializerFunction: 'initializeCommon',
    initializerArgs: commonInit,
  })
  logger.success('Added: Common facets')

  await addFacets({
    names: minterFacets,
    initializerName: 'MinterConfigFacet',
    initializerFunction: 'initializeMinter',
    initializerArgs: (await getMinterInitializer(hre)).args,
  })
  logger.success('Added: Minter facets')

  await addFacets({
    names: scdpFacets,
    initializerName: 'SCDPConfigFacet',
    initializerFunction: 'initializeSCDP',
    initializerArgs: (await getSCDPInitializer(hre)).args,
  })
  logger.success('Added: SCDP facets.')
  await addFacets({
    names: peripheryFacets,
  })

  logger.success('Added: Periphery facets.')
}

deploy.tags = ['all', 'local', 'core', 'facets']
deploy.dependencies = ['diamond', 'safe']
deploy.skip = async hre => hre.network.live

export default deploy
