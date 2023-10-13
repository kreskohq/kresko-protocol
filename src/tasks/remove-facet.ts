import { getLogger } from '@utils/logging';
import { task, types } from 'hardhat/config';
import type { TaskArguments } from 'hardhat/types';
import { removeFacet } from '../scripts/remove-facet';
import { TASK_REMOVE_FACET } from './names';

const logger = getLogger(TASK_REMOVE_FACET);

task(TASK_REMOVE_FACET)
  .addParam('name', 'Artifact/Contract name of the facet')
  .addOptionalParam('initializerName', 'Contract to delegatecall to when adding the facet')
  .addOptionalParam('initializerArgs', 'Args to delegatecall when adding the facet', '0x', types.string)
  .setAction(async function ({ name, initializerName, initializerArgs }: TaskArguments, hre) {
    logger.log(`Removing facet ${name} from diamond`);
    const Deployed = await hre.deployments.getOrNull('Diamond');
    if (!Deployed) {
      throw new Error(`No diamond deployed @ ${hre.network.name}`);
    }
    await removeFacet({ name, initializerName, initializerArgs });
    logger.success(`Removed facet ${name} from diamond`);
  });
