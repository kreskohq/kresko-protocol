import { testnetConfigs } from '@config/deploy/arbitrumGoerli';
import type { DeployFunction } from 'hardhat-deploy/dist/types';
import { TASK_DEPLOY_TOKEN } from '@tasks';
import { getLogger } from '@utils/logging';

const logger = getLogger('deploy-tokens');

const deploy: DeployFunction = async hre => {
  const assets = testnetConfigs[hre.network.name].assets.filter(a => !!a.collateralConfig && !a.krAssetConfig);
  for (const collateral of assets) {
    const isDeployed = await hre.deployments.getOrNull(collateral.symbol);

    if (collateral.symbol === 'WETH') {
      continue;
    }
    if (isDeployed != null) continue;

    logger.log(`Create: External Token ${collateral.name}`);

    await hre.run(TASK_DEPLOY_TOKEN, {
      name: collateral.name,
      symbol: collateral.symbol,
      log: true,
      amount: collateral.mintAmount,
      decimals: collateral.decimals,
    });
    logger.log(`Created: External Token ${collateral.name}`);
  }

  logger.success('Created external tokens.');
};

deploy.tags = ['all', 'local', 'tokens', 'external-assets'];

deploy.skip = async hre => {
  const assets = testnetConfigs[hre.network.name].assets.filter(a => !!a.collateralConfig && !a.krAssetConfig);
  if (!assets.length) {
    logger.log('Skip: Create External Assets, no external assets configured');
    return true;
  }

  if (await hre.deployments.getOrNull(assets[assets.length - 1].symbol)) {
    logger.log('Skip: Create External Assets, already created');
    return true;
  }
  return false;
};

export default deploy;
