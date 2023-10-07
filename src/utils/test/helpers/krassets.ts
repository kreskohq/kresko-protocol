import { smock } from '@defi-wonderland/smock';
import { wrapKresko } from '@utils/redstone';
import { BigNumber } from 'ethers';
import { AssetArgs } from 'types';
import { KreskoAssetAnchor__factory, KreskoAsset__factory } from 'types/typechain';
import { InputArgsSimple, defaultCloseFee, defaultSupplyLimit, testKrAssetConfig } from '../mocks';
import roles from '../roles';
import { getAssetConfig, wrapContractWithSigner } from './general';
import optimized from './optimizations';
import { getFakeOracle, setPrice } from './oracle';
import { getBalanceKrAssetFunc, setBalanceKrAssetFunc } from './smock';
import { getAnchorNameAndSymbol } from '@utils/strings';
import { toBig } from '@utils/values';

export const getDebtIndexAdjustedBalance = async (user: SignerWithAddress, asset: TestAsset<KreskoAsset, any>) => {
  const balance = await asset.contract.balanceOf(user.address);
  return [balance, balance];
};

export const addMockKreskoAsset = async (args = testKrAssetConfig): Promise<TestAsset<KreskoAsset, 'mock'>> => {
  const deployer = hre.users.deployer;
  const { name, symbol, price, marketOpen } = args;
  const [krAsset, fakeFeed, anchorFactory] = await Promise.all([
    await (await smock.mock<KreskoAsset__factory>('KreskoAsset')).deploy(),
    getFakeOracle(price, marketOpen),
    smock.mock<KreskoAssetAnchor__factory>('KreskoAssetAnchor'),
  ]);

  await krAsset.setVariable('_initialized', 0);
  krAsset.decimals.returns(18);

  const [akrAsset] = await Promise.all([
    // Create the underlying rebasing krAsset
    anchorFactory.deploy(krAsset.address),
    // Initialize the underlying krAsset
    krAsset.initialize(name || symbol, symbol, 18, deployer.address, hre.Diamond.address),
  ]);

  await akrAsset.setVariable('_initialized', 0);
  const { anchorSymbol, anchorName } = getAnchorNameAndSymbol(symbol, name);
  const [config] = await Promise.all([
    getAssetConfig(krAsset, {
      ...args,
      feed: fakeFeed.address,
      krAssetConfig: { ...args.krAssetConfig!, anchor: akrAsset.address },
    }),
    // Initialize the anchor for krAsset
    akrAsset.initialize(krAsset.address, anchorName, anchorSymbol, deployer.address),
  ]);

  akrAsset.decimals.returns(18);

  // Add the asset to the protocol
  await Promise.all([
    hre.Diamond.connect(deployer).addAsset(krAsset.address, config.assetStruct, config.feedConfig, true),
    krAsset.grantRole(roles.OPERATOR, akrAsset.address),
  ]);

  const asset: TestAsset<KreskoAsset, 'mock'> = {
    underlyingId: args.underlyingId,
    isKrAsset: true,
    isCollateral: !!args.collateralConfig,
    address: krAsset.address,
    assetInfo: () => hre.Diamond.getAsset(krAsset.address),
    config,
    contract: krAsset,
    priceFeed: fakeFeed,
    anchor: akrAsset,
    setPrice: price => setPrice(fakeFeed, price),
    setBalance: setBalanceKrAssetFunc(krAsset, akrAsset),
    balanceOf: getBalanceKrAssetFunc(krAsset),
    setOracleOrder: order => hre.Diamond.updateOracleOrder(krAsset.address, order),
    getPrice: async () => (await fakeFeed.latestRoundData())[1],
    update: update => updateKrAsset(krAsset.address, update),
  };

  const found = hre.krAssets.findIndex(c => c.address === asset.address);
  if (found === -1) {
    hre.krAssets.push(asset);
    hre.allAssets.push(asset);
  } else {
    hre.krAssets = hre.krAssets.map(c => (c.address === asset.address ? asset : c));
    hre.allAssets = hre.allAssets.map(c => (c.address === asset.address ? asset : c));
  }
  return asset;
};

export const updateKrAsset = async (address: string, args: AssetArgs) => {
  const { deployer } = await hre.ethers.getNamedSigners();
  const krAsset = hre.krAssets.find(c => c.address === address);
  if (!krAsset) throw new Error(`KrAsset ${address} not found`);

  krAsset.config = await getAssetConfig(krAsset.contract, args);
  await wrapContractWithSigner(hre.Diamond, deployer).updateAsset(krAsset.address, krAsset.config.assetStruct);

  const found = hre.krAssets.findIndex(c => c.address === krAsset.address);
  if (found === -1) {
    hre.krAssets.push(krAsset);
    hre.allAssets.push(krAsset);
  } else {
    hre.krAssets = hre.krAssets.map(c => (c.address === krAsset.address ? krAsset : c));
    hre.allAssets = hre.allAssets.map(c => (c.address === krAsset.address ? krAsset : c));
  }
  return krAsset;
};

export const mintKrAsset = async (args: InputArgsSimple) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number';
  const { user, asset, amount } = args;
  return wrapKresko(hre.Diamond, user).mintKreskoAsset(user.address, asset.address, convert ? toBig(+amount) : amount);
};

export const burnKrAsset = async (args: InputArgsSimple) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number';
  const { user, asset, amount } = args;

  return wrapKresko(hre.Diamond, user).burnKreskoAsset(
    user.address,
    asset.address,
    convert ? toBig(+amount) : amount,
    optimized.getAccountMintIndex(user.address, asset.address),
  );
};

export const leverageKrAsset = async (
  user: SignerWithAddress,
  krAsset: TestAsset<KreskoAsset, 'mock'>,
  collateralToUse: TestAsset<any, 'mock'>,
  amount: BigNumber,
) => {
  const [krAssetValueBig, mcrBig, collateralValue, collateralToUseInfo, krAssetInfo] = await Promise.all([
    hre.Diamond.getValue(krAsset.address, amount),
    optimized.getMinCollateralRatio(),
    hre.Diamond.getValue(collateralToUse.address, toBig(1)),
    hre.Diamond.getAsset(collateralToUse.address),
    hre.Diamond.getAsset(krAsset.address),
  ]);

  await krAsset.contract.setVariable('_allowances', {
    [user.address]: {
      [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
    },
  });

  const collateralValueRequired = krAssetValueBig.percentMul(mcrBig);

  const price = collateralValue.num(8);
  const collateralAmount = collateralValueRequired.wadDiv(await collateralToUse.getPrice());

  await collateralToUse.setBalance(user, collateralAmount, hre.Diamond.address);

  let addPromises: Promise<any>[] = [];
  if (!collateralToUseInfo.isCollateral) {
    const config = { ...collateralToUseInfo, isCollateral: true, factor: 1e4, liqIncentive: 1.1e4 };
    addPromises.push(hre.Diamond.updateAsset(collateralToUse.address, config));
  }
  if (!krAssetInfo.isKrAsset) {
    const config = {
      ...krAssetInfo,
      isKrAsset: true,
      kFactor: 1e4,
      supplyLimit: defaultSupplyLimit,
      anchor: krAsset.anchor.address,
      closeFee: defaultCloseFee,
      openFee: 0,
    };
    addPromises.push(hre.Diamond.updateAsset(krAsset.address, config));
  }
  if (!krAssetInfo.isCollateral) {
    const config = { ...krAssetInfo, isCollateral: true, factor: 1e4, liqIncentive: 1.1e4 };
    addPromises.push(hre.Diamond.updateAsset(krAsset.address, config));
  }
  await Promise.all(addPromises);
  const UserKresko = wrapKresko(hre.Diamond, user);
  await UserKresko.depositCollateral(user.address, collateralToUse.address, collateralAmount);
  await Promise.all([
    UserKresko.mintKreskoAsset(user.address, krAsset.address, amount),
    UserKresko.depositCollateral(user.address, krAsset.address, amount),
  ]);

  // Deposit krAsset and withdraw other collateral to bare minimum of within healthy range

  const accountMinCollateralRequired = await hre.Diamond.getAccountMinCollateralAtRatio(
    user.address,
    optimized.getMinCollateralRatio(),
  );
  const accountCollateral = await wrapContractWithSigner(
    hre.Diamond,
    hre.users.deployer,
  ).getAccountTotalCollateralValue(user.address);

  const withdrawAmount = accountCollateral.sub(accountMinCollateralRequired).num(8) / price - 0.1;
  const amountToWithdraw = withdrawAmount.ebn();

  if (amountToWithdraw.gt(0)) {
    await UserKresko.withdrawCollateral(
      user.address,
      collateralToUse.address,
      amountToWithdraw,
      optimized.getAccountDepositIndex(user.address, collateralToUse.address),
    );

    // "burn" collateral not needed
    collateralToUse.setBalance(user, BigNumber.from(0));
    // await collateralToUse.contract.connect(user).transfer(hre.ethers.constants.AddressZero, amountToWithdraw);
  }
};
