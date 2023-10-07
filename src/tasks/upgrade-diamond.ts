import { getLogger } from '@utils/logging';
import { task } from 'hardhat/config';
import { TASK_UPGRADE_DIAMOND } from './names';
import { updateFacets } from '@scripts/update-facets';
import { minterFacets } from '@config/deploy';

const logger = getLogger(TASK_UPGRADE_DIAMOND);

task(TASK_UPGRADE_DIAMOND, 'Upgrade diamond').setAction(async function (args, hre) {
  logger.log('Upgrading diamond..');
  const [initializer] = await hre.deploy('CommonConfigurationFacet');

  await updateFacets({
    multisig: true,
    facetNames: minterFacets,
    initializer: {
      contract: initializer,
      func: 'initializeCommon',
      args: [],
    },
  });
});
