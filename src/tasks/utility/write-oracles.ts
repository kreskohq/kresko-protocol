import { testnetConfigs } from '@config/deploy/arbitrumGoerli';
import { getLogger } from '@utils/logging';
import { writeFileSync } from 'fs';
import { task } from 'hardhat/config';
import { TaskArguments } from 'hardhat/types';
import { TASK_WRITE_ORACLE_JSON } from '../names';

const logger = getLogger(TASK_WRITE_ORACLE_JSON);

task(TASK_WRITE_ORACLE_JSON).setAction(async function (_taskArgs: TaskArguments, hre) {
  const values = [];
  for (const collateral of testnetConfigs[hre.network.name].assets.filter(a => !!a.collateralConfig)) {
    let contract = await hre.getContractOrFork('ERC20Upgradeable', collateral.symbol);
    if (collateral.symbol === 'WETH') {
      contract = await hre.ethers.getContractAt('ERC20Upgradeable', '0x4200000000000000000000000000000000000006');
    }

    if (!collateral.feed) continue;

    if (!collateral.symbol || collateral.symbol === 'WETH') {
      values.push({
        asset: await contract.symbol(),
        assetAddress: contract.address,
        assetType: 'collateral',
        feed: collateral.feed,
      });
      continue;
    }
    values.push({
      asset: await contract.symbol(),
      assetAddress: contract.address,
      assetType: 'collateral',
      feed: collateral.feed,
    });
  }
  for (const krAsset of testnetConfigs[hre.network.name].assets.filter(a => !!a.krAssetConfig)) {
    const contract = await hre.getContractOrFork('ERC20Upgradeable', krAsset.symbol);
    if (!krAsset.feed) continue;
    values.push({
      asset: await contract.symbol(),
      assetAddress: contract.address,
      assetType: 'krAsset',
      feed: krAsset.feed,
      pricefeed: await hre.Diamond.getFeedForAddress(contract.address, 1),
    });
  }

  writeFileSync('./packages/contracts/src/deployments/json/oracles.json', JSON.stringify(values));
  logger.success('feeds: packages/contracts/src/deployments/json/oracles.json');
});
