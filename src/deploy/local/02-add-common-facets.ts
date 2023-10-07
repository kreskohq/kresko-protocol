import { commonFacets, getCommonInitializer } from '@config/deploy';
import { getLogger } from '@kreskolabs/lib/meta';
import { addFacets } from '@scripts/add-facets';
import type { DeployFunction } from 'hardhat-deploy/dist/types';

const logger = getLogger('common-facets');

const deploy: DeployFunction = async function (hre) {
  if (!hre.Diamond.address) {
    throw new Error('Diamond not deployed');
  }
  await hre.deploy('MockSequencerUptimeFeed');
  await addFacets({
    names: commonFacets,
    initializerName: 'CommonConfigurationFacet',
    initializerFunction: 'initializeCommon',
    initializerArgs: (await getCommonInitializer(hre)).args,
  });
  logger.success('Added: Common facets');
};

deploy.tags = ['all', 'local', 'protocol-test', 'common-facets'];
deploy.dependencies = ['diamond-init', 'gnosis-safe'];
deploy.skip = async hre => hre.network.live;

export default deploy;
