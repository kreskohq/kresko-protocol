import { getLogger } from '@utils/logging';
import { task } from 'hardhat/config';
import { TASK_DEPLOY_CONTRACT } from './names';

const logger = getLogger(TASK_DEPLOY_CONTRACT);

task(TASK_DEPLOY_CONTRACT, 'deploy something', async (_, _hre) => {
  logger.log(`Deploying contract...`);
  //   const { deployer } = await hre.ethers.getNamedSigners();

  //   // const [Contract] = await hre.deploy("KrStakingHelper", {
  //   //   from: deployer.address,
  //   //   args: [Router.address, Factory.address, Staking.address],
  //   // });

  //   logger.success(`Contract deployed: ${Contract.address}`);

  //   return Contract;
});
