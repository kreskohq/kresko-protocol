import { getLogger } from '@utils/logging';
import { task } from 'hardhat/config';
import { TASK_UPGRADE_CONTRACT } from './names';

const logger = getLogger(TASK_UPGRADE_CONTRACT);

task(TASK_UPGRADE_CONTRACT, 'upgrade something', async (_, hre) => {
  logger.log(`Upgrading contract...`);
  const { deployer } = await hre.ethers.getNamedSigners();

  await hre.deploy('KreskoAsset', {
    from: deployer.address,
    deploymentName: 'krBTC',
    proxy: {
      proxyContract: 'OptimizedTransparentProxy',
    },
  });
  await hre.deploy('KreskoAsset', {
    from: deployer.address,
    deploymentName: 'krETH',
    proxy: {
      proxyContract: 'OptimizedTransparentProxy',
    },
  });
  await hre.deploy('KreskoAsset', {
    from: deployer.address,
    deploymentName: 'krTSLA',
    proxy: {
      proxyContract: 'OptimizedTransparentProxy',
    },
  });
});
