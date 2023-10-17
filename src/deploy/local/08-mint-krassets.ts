import { testnetConfigs } from '@config/deploy/arbitrumGoerli';
import { getLogger } from '@utils/logging';
import { TASK_MINT_OPTIMAL } from '@tasks';
import { wrapKresko } from '@utils/redstone';
import { fromBig, toBig } from '@utils/values';
import type { DeployFunction } from 'hardhat-deploy/dist/types';

const logger = getLogger('mint-krassets');

const deploy: DeployFunction = async function (hre) {
  const krAssets = testnetConfigs[hre.network.name].assets.filter(a => !!a.krAssetConfig);

  const kresko = await hre.getContractOrFork('Kresko');
  const { deployer } = await hre.ethers.getNamedSigners();

  const DAI = await hre.getContractOrFork('MockERC20', 'DAI');

  await DAI.mint(deployer.address, toBig(2_500_000_000));
  await DAI.approve(kresko.address, hre.ethers.constants.MaxUint256);
  await kresko.connect(deployer).depositCollateral(deployer.address, DAI.address, toBig(2_500_000_000));
  const KISS = await hre.getContractOrFork('KISS');
  await wrapKresko(kresko, deployer).mintKreskoAsset(deployer.address, KISS.address, toBig(1_200_000_000));

  for (const krAsset of krAssets) {
    const asset = await hre.getContractOrFork('KreskoAsset', krAsset.symbol);
    const debt = await kresko.getAccountDebtAmount(deployer.address, asset.address);

    if (!krAsset.mintAmount || debt.gt(0) || krAsset.symbol === 'KISS') {
      logger.log(`Skipping minting ${krAsset.symbol}`);
      continue;
    }
    logger.log(`minting ${krAsset.mintAmount} of ${krAsset.name}`);

    await hre.run(TASK_MINT_OPTIMAL, {
      kreskoAsset: krAsset.symbol,
      amount: krAsset.mintAmount,
    });
  }
};
deploy.tags = ['all', 'local', 'mint-krassets'];
deploy.dependencies = ['configuration'];

deploy.skip = async hre => {
  if (hre.network.name === 'hardhat') {
    logger.log('Skip: Mint KrAssets, is hardhat network');
    return true;
  }
  const krAssets = testnetConfigs[hre.network.name].assets.filter(a => !!a.krAssetConfig);
  if (!krAssets.length) {
    logger.log('Skip: Mint KrAssets, no krAssets configured');
    return true;
  }

  const kresko = await hre.getContractOrFork('Kresko');
  const lastAsset = await hre.deployments.get(krAssets[krAssets.length - 1].symbol);

  const { deployer } = await hre.getNamedAccounts();
  if (fromBig(await kresko.getAccountDebtAmount(deployer, lastAsset.address)) > 0) {
    logger.log('Skip: Mint krAssets, already minted.');
    return true;
  }
  return false;
};

export default deploy;
