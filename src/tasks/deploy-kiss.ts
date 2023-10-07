import { getDeploymentUsers } from '@config/deploy';
import { getLogger } from '@utils/logging';
import { testKrAssetConfig } from '@utils/test/mocks';
import { Role } from '@utils/test/roles';
import { task } from 'hardhat/config';
import type { TaskArguments } from 'hardhat/types';
import { TASK_DEPLOY_KISS } from './names';
import { MaxUint128, toBig } from '@utils/values';

const logger = getLogger(TASK_DEPLOY_KISS);

task(TASK_DEPLOY_KISS).setAction(async function (_taskArgs: TaskArguments, hre) {
  logger.log(`Deploying KISS`);

  const { multisig } = await getDeploymentUsers(hre);
  const { deployer } = await hre.ethers.getNamedSigners();
  const Diamond = await hre.getContractOrFork('Diamond');
  const args = {
    name: 'KISS',
    symbol: 'KISS',
    decimals: 18,
    admin: multisig,
    operator: Diamond.address,
  };

  const VAULT_ADDRESS = hre.ethers.constants.AddressZero;

  const [KISSContract] = await hre.deploy('KISS', {
    from: deployer.address,
    contract: 'KISS',
    log: true,
    proxy: {
      owner: deployer.address,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [args.name, args.symbol, args.decimals, args.admin, args.operator, VAULT_ADDRESS],
      },
    },
  });
  logger.log(`KISS deployed at ${KISSContract.address}, checking roles...`);
  const hasRole = await KISSContract.hasRole(Role.OPERATOR, args.operator);
  const hasRoleAdmin = await KISSContract.hasRole(Role.ADMIN, args.admin);

  if (!hasRoleAdmin) {
    throw new Error(`Multisig is missing Role.ADMIN`);
  }
  if (!hasRole) {
    throw new Error(`Diamond is missing Role.OPERATOR`);
  }
  logger.success(`KISS succesfully deployed @ ${KISSContract.address}`);

  // Add to runtime for tests and further scripts
  const asset = {
    address: KISSContract.address,
    contract: KISSContract,
    config: {
      args: {
        name: 'KISS',
        price: 1,
        factor: 1e4,
        supplyLimit: MaxUint128,
        marketOpen: true,
        krAssetConfig: testKrAssetConfig.krAssetConfig,
      },
    },
    assetInfo: async () => hre.Diamond.getAsset(KISSContract.address),
    getPrice: async () => toBig(1, 8),
    priceFeed: {} as any,
  };

  const found = hre.krAssets.findIndex(c => c.address === asset.address);

  if (found === -1) {
    // @ts-expect-error
    hre.krAssets.push(asset);
    // @ts-expect-error
    hre.allAssets.push(asset);
  } else {
    // @ts-expect-error
    hre.krAssets = hre.krAssets.map(c => (c.address === c.address ? asset : c));
    // @ts-expect-error
    hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
  }
  return {
    contract: KISSContract,
  };
});
