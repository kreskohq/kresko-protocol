import { TASK_DEPLOY_KISS } from '@tasks';
import { getLogger } from '@kreskolabs/lib/meta';
import { toBig } from '@utils/values';
import type { DeployFunction } from 'hardhat-deploy/dist/types';

const logger = getLogger('create-kiss');

const deploy: DeployFunction = async hre => {
  try {
    await hre.deploy('MockOracle', {
      deploymentName: 'KISSFeed',
      args: ['KISS/USD', toBig(1, 8), 8],
    });
    logger.success('Created: KISS oracle.');
    await hre.run(TASK_DEPLOY_KISS);
    logger.success('Created: KISS.');
  } catch (e) {
    console.log(e);
  }
};

deploy.skip = async hre => {
  if ((await hre.deployments.getOrNull('KISS')) != null) {
    logger.log('Skip: Create KISS, already created.');
    return true;
  }
  return false;
};

deploy.tags = ['all', 'local', 'protocol-init', 'KISS'];
deploy.dependencies = ['common-facets', 'minter-facets', 'scdp-facets'];

export default deploy;
