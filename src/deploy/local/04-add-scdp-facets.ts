import { getSCDPInitializer, scdpFacets } from '@config/deploy';
import { addFacets } from '@scripts/add-facets';
import { getLogger } from '@utils/logging';
import type { DeployFunction } from 'hardhat-deploy/dist/types';

const logger = getLogger('init-scdp-facets');

const deploy: DeployFunction = async function (hre) {
  if (!hre.Diamond.address) {
    throw new Error('Diamond not deployed');
  }

  const initializer = await getSCDPInitializer(hre);

  await addFacets({
    names: scdpFacets,
    initializerName: initializer.name,
    initializerFunction: 'initializeSCDP',
    initializerArgs: initializer.args,
  });

  logger.success('Added: SCDP facets.');
};

deploy.tags = ['all', 'local', 'protocol-test', 'protocol-init', 'scdp-facets'];
deploy.dependencies = ['minter-facets'];
deploy.skip = async hre => hre.network.live;

export default deploy;
