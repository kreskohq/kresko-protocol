import { getLogger } from '@kreskolabs/lib/meta';
import { BigNumber } from 'ethers';
import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

/** @note folders supplied will be cleared */
export const getOutDir = (...ids: string[]) => {
  for (const id of ids) {
    const dir = path.join('out', id);
    // create the directory if it does not exist

    if (existsSync(dir)) {
      rmSync(dir, { recursive: true });
    }
    getLogger('task-utils').log(`creating ${dir} directory`);
    mkdirSync(dir, { recursive: true });
  }
  return ids.map(id => path.join('out', id));
};

/** @description Log hre context information to console and gets common signers + contracts */
export const getDeployedContext = async () => {
  // get common users
  const { deployer, feedValidator } = await hre.ethers.getNamedSigners();
  const randomAccount = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);

  // get common contracts
  const Kresko = await hre.getContractOrFork('Kresko');
  const KISS = await hre.getContractOrFork('KISS');

  // log the hre context
  await logContext(`kresko: ${Kresko.address}`, `randomAccount: ${randomAccount.address}`);

  return {
    deployer,
    feedValidator,
    randomAccount,
    Kresko,
    KISS,
  };
};

export const logContext = async (...extras: any[]) => {
  const logger = getLogger('context');
  const { deployer } = await hre.ethers.getNamedSigners();

  const all = await hre.deployments.all();
  const bal = await hre.ethers.provider.getBalance(deployer.address);

  const gasPrice = await hre.ethers.provider.getGasPrice();
  const gasPriceConfig = hre.ethers.utils.formatUnits(hre.network.config.gasPrice, 'gwei');
  const gasPriceProvider = hre.ethers.utils.formatUnits(gasPrice, 'gwei');

  const diamondDeployCostConfig = hre.ethers.utils.formatEther(
    BigNumber.from(hre.network.config.gasPrice).mul(1593953),
  );
  const diamondDeployCostProvider = hre.ethers.utils.formatEther(gasPrice.mul(1593953));
  const itemsToLog = [
    `-- hardhat`,
    `network: ${hre.network.name} (${hre.network.config.chainId})`,
    `live: ${hre.network.live}`,
    `forking: ${hre.network.companionNetworks['live'] ? hre.network.companionNetworks['live'] : 'none'}`,
    `deployments: ${Object.keys(all).length} contracts`,
    `root account: ${deployer.address}`,
    `balance: ${hre.ethers.utils.formatEther(bal)} ETH`,
    `gas (provider): ${gasPriceProvider} gwei`,
    `gas (config): ${gasPriceConfig} gwei`,
    `cost (provider): ${diamondDeployCostProvider} ETH (Diamond.sol)`,
    `cost (config): ${diamondDeployCostConfig} ETH (Diamond.sol)`,
    extras.length ? '-- extras' : undefined,
    ...extras,
  ];

  for (const item of itemsToLog) {
    logger.log(item);
  }
};
