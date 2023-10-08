import { FakeContract, MockContract, smock } from '@defi-wonderland/smock';
import { wrapKresko } from '@utils/redstone';
import { AssetArgs } from 'types';
import { ERC20Upgradeable__factory, MockOracle } from 'types/typechain';
import { InputArgs, testCollateralConfig } from '../mocks';
import { getAssetConfig } from './general';
import optimized from './optimizations';
import { getFakeOracle, setPrice } from './oracle';
import { getBalanceCollateralFunc, setBalanceCollateralFunc } from './smock';
import { envCheck } from '@utils/env';
import { toBig } from '@utils/values';

envCheck();

export const addMockExtAsset = async (args = testCollateralConfig): Promise<TestAsset<ERC20Upgradeable, 'mock'>> => {
  const { deployer } = await hre.ethers.getNamedSigners();
  const { name, price, symbol, decimals } = args;
  const [fakeFeed, contract]: [FakeContract<MockOracle>, MockContract<ERC20Upgradeable>] = await Promise.all([
    getFakeOracle(price),
    (await smock.mock<ERC20Upgradeable__factory>('ERC20Upgradeable')).deploy(),
  ]);

  contract.name.returns(name);
  contract.symbol.returns(symbol);
  contract.decimals.returns(decimals);
  const config = await getAssetConfig(contract, { ...args, feed: fakeFeed.address });
  await wrapKresko(hre.Diamond, deployer).addAsset(contract.address, config.assetStruct, config.feedConfig, true);
  const asset: TestAsset<ERC20Upgradeable, 'mock'> = {
    underlyingId: args.underlyingId,
    anchor: null,
    address: contract.address,
    contract: contract,
    assetInfo: () => hre.Diamond.getAsset(contract.address),
    priceFeed: fakeFeed,
    config,
    setPrice: price => setPrice(fakeFeed, price),
    setOracleOrder: order => hre.Diamond.updateOracleOrder(contract.address, order),
    getPrice: async () => (await fakeFeed.latestRoundData())[1],
    setBalance: setBalanceCollateralFunc(contract),
    balanceOf: getBalanceCollateralFunc(contract),
    update: update => updateCollateralAsset(contract.address, update),
  };
  const found = hre.extAssets.findIndex(c => c.address === asset.address);
  if (found === -1) {
    hre.extAssets.push(asset);
    hre.allAssets.push(asset);
  } else {
    hre.extAssets = hre.extAssets.map(c => (c.address === asset.address ? asset : c));
    hre.allAssets = hre.allAssets.map(c => (c.address === asset.address ? asset : c));
  }
  return asset;
};

export const updateCollateralAsset = async (address: string, args: AssetArgs) => {
  const { deployer } = await hre.ethers.getNamedSigners();
  const collateral = hre.extAssets.find(c => c.address === address);
  if (!collateral) throw new Error(`Collateral ${address} not found`);
  const config = await getAssetConfig(collateral.contract, args);
  await wrapKresko(hre.Diamond, deployer).updateAsset(collateral!.address, config.assetStruct);
  collateral.config = config;
  const found = hre.extAssets.findIndex(c => c.address === collateral.address);
  if (found === -1) {
    hre.extAssets.push(collateral);
    hre.allAssets.push(collateral);
  } else {
    hre.extAssets = hre.extAssets.map(c => (c.address === collateral.address ? collateral : c));
    hre.allAssets = hre.allAssets.map(c => (c.address === collateral.address ? collateral : c));
  }
  return collateral;
};

export const depositMockCollateral = async (args: InputArgs) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number';
  const { user, asset, amount } = args;
  const depositAmount = convert ? toBig(+amount, await asset.contract.decimals()) : amount;
  await asset.contract.setVariables({
    _balances: {
      [user.address]: depositAmount,
    },
    _allowances: {
      [user.address]: {
        [hre.Diamond.address]: depositAmount,
      },
    },
  });
  return wrapKresko(hre.Diamond, user).depositCollateral(user.address, asset.contract.address, depositAmount);
};

export const depositCollateral = async (args: InputArgs) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number';
  const { user, asset, amount } = args;
  const depositAmount = convert ? toBig(+amount) : amount;
  if ((await asset.contract.allowance(user.address, hre.Diamond.address)).lt(depositAmount)) {
    await asset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
  }
  return wrapKresko(hre.Diamond, user).depositCollateral(user.address, asset.address, depositAmount);
};

export const withdrawCollateral = async (args: InputArgs) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number';
  const { user, asset, amount } = args;
  const depositAmount = convert ? toBig(+amount) : amount;

  return wrapKresko(hre.Diamond, user).withdrawCollateral(
    user.address,
    asset.address,
    depositAmount,
    optimized.getAccountDepositIndex(user.address, asset.address),
  );
};

export const getMaxWithdrawal = async (user: string, collateral: any) => {
  const [collateralValue, MCR, collateralPrice] = await Promise.all([
    hre.Diamond.getAccountTotalCollateralValue(user),
    hre.Diamond.getMinCollateralRatio(),
    collateral.getPrice(),
  ]);

  const minCollateralRequired = await hre.Diamond.getAccountMinCollateralAtRatio(user, MCR);
  const maxWithdrawValue = collateralValue.sub(minCollateralRequired);
  const maxWithdrawAmount = maxWithdrawValue.wadDiv(collateralPrice);

  return { maxWithdrawValue, maxWithdrawAmount };
};
