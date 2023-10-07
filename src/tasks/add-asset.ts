import { getLogger } from '@utils/logging';
import { getAnchorNameAndSymbol } from '@utils/strings';
import { getAssetConfig } from '@utils/test/helpers/general';
import { task, types } from 'hardhat/config';

import { AssetArgs } from 'types';
import { TASK_ADD_ASSET } from './names';
import { testKrAssetConfig } from '@utils/test/mocks';
import { redstoneMap } from '@utils/redstone';
import { ZERO_ADDRESS } from '@kreskolabs/lib';
type AddAssetArgs = {
  address: string;
  assetConfig: AssetArgs;
  log: boolean;
};

const logger = getLogger(TASK_ADD_ASSET);
task(TASK_ADD_ASSET)
  .addParam('address', 'address of the asset')
  .addParam('assetConfig', 'configuration for the asset', testKrAssetConfig, types.json)
  .setAction(async function (taskArgs: AddAssetArgs, hre) {
    const { address } = taskArgs;
    const config = taskArgs.assetConfig;
    if (!config.feed || config.feed === ZERO_ADDRESS) {
      throw new Error(`Invalid feed address: ${config.feed}, Asset: ${config.symbol}`);
    }
    if (address == hre.ethers.constants.AddressZero) {
      throw new Error(`Invalid address: ${address}, Asset: ${config.symbol}`);
    }
    if (!config.collateralConfig && !config.krAssetConfig && !config.scdpDepositConfig && !config.scdpKrAssetConfig) {
      throw new Error(`No config supplied, Asset: ${config.symbol}`);
    }

    if (config.krAssetConfig && config.krAssetConfig.kFactor === 0) {
      throw new Error('Invalid kFactor for ' + config.symbol);
    }
    if (config.collateralConfig && config.collateralConfig.cFactor === 0) {
      throw new Error('Invalid cFactor for ' + config.symbol);
    }
    const redstoneId = redstoneMap[config.underlyingId as keyof typeof redstoneMap];
    if (!redstoneId) throw new Error(`RedstoneId not found for ${config.symbol}`);

    const Kresko = await hre.getContractOrFork('Kresko');
    const Asset =
      config.krAssetConfig || config.scdpKrAssetConfig
        ? await hre.getContractOrFork('KreskoAsset', config.symbol)
        : await hre.ethers.getContractAt('ERC20Upgradeable', address);

    const assetInfo = await Kresko.getAsset(Asset.address);
    const exists = assetInfo.decimals != 0;
    const asset: TestAsset<typeof Asset> = {
      underlyingId: config.underlyingId,
      address: Asset.address,
      isMocked: false,
      // @ts-expect-error
      config: {
        args: config,
      },
      m: null,
      balanceOf: acc => Asset.balanceOf(typeof acc === 'string' ? acc : acc.address),
      c: Asset,
      assetInfo: () => Kresko.getAsset(Asset.address),
      priceFeed: await hre.ethers.getContractAt('MockOracle', config.feed),
    };
    const { anchorSymbol } = getAnchorNameAndSymbol(config.symbol, config.name);
    if (exists) {
      logger.warn(`Asset ${config.symbol} already exists! Skipping..`);
    } else {
      const anchor =
        config.symbol === 'KISS'
          ? await hre.ethers.getContractAt('KreskoAssetAnchor', Asset.address)
          : await hre.getContractOrNull('KreskoAssetAnchor', anchorSymbol);

      if (config.krAssetConfig) {
        if (!anchor) {
          throw new Error(`Add asset fail: No anchor for KrAsset ${config.symbol}`);
        }
        config.krAssetConfig!.anchor = anchor.address;
        logger.log(`Is KrAsset, Anchor: ${config.krAssetConfig!.anchor}}`);
        asset.anchor = anchor;
        asset.isKrAsset = true;
      }

      if (config.scdpKrAssetConfig) {
        if (!anchor) {
          throw new Error(`Add assset fail - No anchor for SCDP KrAsset: ${config.symbol}`);
        }
        config.krAssetConfig!.anchor = anchor.address;
        asset.anchor = anchor;
        asset.isKrAsset = true;
      }

      logger.log(`Adding Asset: ${config.symbol}`);

      const parsedConfig = await getAssetConfig(Asset, config);
      asset.config.assetStruct = parsedConfig.assetStruct;
      asset.config.feedConfig = parsedConfig.feedConfig;
      asset.config.extendedInfo = parsedConfig.extendedInfo;
      const tx = await Kresko.addAsset(Asset.address, parsedConfig.assetStruct, parsedConfig.feedConfig, true);
      logger.success('txHash', tx.hash);
      logger.success(`Succesfully added asset: ${config.symbol}`);
    }

    const found = hre.krAssets.findIndex(c => c.address === Asset.address);
    if (found === -1) {
      if (asset.anchor != null) {
        hre.krAssets.push(asset as TestAsset<KreskoAsset, any>);
      }
      if (config.collateralConfig?.cFactor) {
        hre.extAssets.push(asset as TestAsset<ERC20Upgradeable, any>);
      }
      hre.allAssets.push(asset as TestAsset<typeof Asset>);
    } else {
      hre.krAssets = hre.krAssets.map(c => (c.address === asset.address ? (asset as TestAsset<KreskoAsset, any>) : c));
      hre.extAssets = hre.extAssets.map(c =>
        c.address === asset.address ? (asset as TestAsset<ERC20Upgradeable, any>) : c,
      );
      hre.allAssets = hre.allAssets.map(c => (c.address === asset.address ? asset : c));
    }
    return asset;
    return;
  });
