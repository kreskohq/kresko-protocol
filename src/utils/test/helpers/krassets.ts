import { KreskoAssetAnchor__factory, KreskoAsset__factory } from '@/types/typechain'
import { smock } from '@defi-wonderland/smock'
import { getAnchorNameAndSymbol } from '@utils/strings'
import { toBig } from '@utils/values'
import { type InputArgsSimple, defaultCloseFee, defaultSupplyLimit, testKrAssetConfig } from '../mocks'
import { Role } from '../roles'
import { getAssetConfig, updateTestAsset } from './general'
import optimized from './optimizations'
import { getFakeOracle, setPrice } from './oracle'
import { getBalanceKrAssetFunc, setBalanceKrAssetFunc } from './smock'

export const getDebtIndexAdjustedBalance = async (user: SignerWithAddress, asset: TestAsset<KreskoAsset, any>) => {
  const balance = await asset.contract.balanceOf(user.address)
  return [balance, balance]
}

export const addMockKreskoAsset = async (args = testKrAssetConfig): Promise<TestKrAsset> => {
  if (hre.krAssets.find(c => c.config.args.symbol === args.symbol)) {
    throw new Error(`Asset with symbol ${args.symbol} already exists`)
  }
  const deployer = hre.users.deployer
  const { name, symbol, price, marketOpen } = args
  const [krAsset, fakeFeed, anchorFactory] = await Promise.all([
    await (await smock.mock<KreskoAsset__factory>('KreskoAsset')).deploy(),
    getFakeOracle(price, marketOpen),
    smock.mock<KreskoAssetAnchor__factory>('KreskoAssetAnchor'),
  ])

  krAsset.decimals.returns(18)

  const [akrAsset] = await Promise.all([
    // Create the underlying rebasing krAsset
    anchorFactory.deploy(krAsset.address),
    // Initialize the underlying krAsset
    krAsset.initialize(
      name || symbol,
      symbol,
      18,
      deployer.address,
      hre.Diamond.address,
      hre.ethers.constants.AddressZero,
      hre.users.treasury.address,
      0,
      0,
    ),
  ])

  const { anchorSymbol, anchorName } = getAnchorNameAndSymbol(symbol, name)
  const [config] = await Promise.all([
    getAssetConfig(krAsset, {
      ...args,
      feed: fakeFeed.address,
      krAssetConfig: { ...args.krAssetConfig!, anchor: akrAsset.address },
    }),
    // Initialize the anchor for krAsset
    akrAsset.initialize(krAsset.address, anchorName, anchorSymbol, deployer.address),
  ])

  akrAsset.decimals.returns(18)

  // Add the asset to the protocol
  await Promise.all([
    hre.Diamond.connect(deployer).addAsset(krAsset.address, config.assetStruct, config.feedConfig),
    krAsset.grantRole(Role.OPERATOR, akrAsset.address),
  ])

  const asset: TestKrAsset = {
    ticker: args.ticker,
    isMinterMintable: true,
    isMinterCollateral: !!args.collateralConfig,
    address: krAsset.address,
    initialPrice: price!,
    assetInfo: () => hre.Diamond.getAsset(krAsset.address),
    config,
    contract: krAsset,
    priceFeed: fakeFeed,
    pythId: config.feedConfig.pythId,
    anchor: akrAsset,
    errorId: [symbol, krAsset.address],
    setPrice: price => setPrice(fakeFeed, price),
    setBalance: setBalanceKrAssetFunc(krAsset, akrAsset),
    balanceOf: getBalanceKrAssetFunc(krAsset),
    setOracleOrder: order => hre.Diamond.setAssetOracleOrder(krAsset.address, order),
    getPrice: async () => (await fakeFeed.latestRoundData())[1],
    update: update => updateTestAsset(asset, update),
  }

  const found = hre.krAssets.findIndex(c => c.address === asset.address)
  if (found === -1) {
    hre.krAssets.push(asset)
  } else {
    hre.krAssets = hre.krAssets.map(c => (c.address === asset.address ? asset : c))
  }
  return asset
}

export const mintKrAsset = async (args: InputArgsSimple, updateData: string[]) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number'
  const { user, asset, amount } = args
  return hre.Diamond.connect(user).mintKreskoAsset(
    {
      account: user.address,
      krAsset: asset.address,
      amount: convert ? toBig(+amount) : amount,
      receiver: user.address,
    },
    updateData,
  )
}

export const burnKrAsset = async (args: InputArgsSimple, updateData: string[]) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number'
  const { user, asset, amount } = args

  return hre.Diamond.connect(user).burnKreskoAsset(
    {
      account: user.address,
      krAsset: asset.address,
      amount: convert ? toBig(+amount) : amount,
      mintIndex: optimized.getAccountMintIndex(user.address, asset.address),
      repayee: user.address,
    },
    updateData,
  )
}

export const leverageKrAsset = async (
  user: SignerWithAddress,
  krAsset: TestAsset<KreskoAsset, 'mock'>,
  collateralToUse: TestAsset<any, 'mock'>,
  amount: BigNumber,
  updateData: string[],
) => {
  const [krAssetValueBig, mcrBig, collateralValue, collateralToUseInfo, krAssetInfo] = await Promise.all([
    hre.Diamond.getValue(krAsset.address, amount),
    optimized.getMinCollateralRatioMinter(),
    hre.Diamond.getValue(collateralToUse.address, toBig(1)),
    hre.Diamond.getAsset(collateralToUse.address),
    hre.Diamond.getAsset(krAsset.address),
  ])

  await krAsset.contract.setVariable('_allowances', {
    [user.address]: {
      [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
    },
  })

  const collateralValueRequired = krAssetValueBig.percentMul(mcrBig)

  const price = collateralValue.num(8)
  const collateralAmount = collateralValueRequired.wadDiv(await collateralToUse.getPrice())

  await collateralToUse.setBalance(user, collateralAmount, hre.Diamond.address)

  const addPromises: Promise<any>[] = []
  if (!collateralToUseInfo.isMinterCollateral) {
    const config = { ...collateralToUseInfo, isMinterCollateral: true, factor: 1e4, liqIncentive: 1.1e4 }
    addPromises.push(hre.Diamond.updateAsset(collateralToUse.address, config))
  }
  if (!krAssetInfo.isMinterMintable) {
    const config = {
      ...krAssetInfo,
      isMinterMintable: true,
      kFactor: 1e4,
      maxDebtMinter: defaultSupplyLimit,
      anchor: krAsset.anchor.address,
      closeFee: defaultCloseFee,
      openFee: 0,
    }
    addPromises.push(hre.Diamond.updateAsset(krAsset.address, config))
  }
  if (!krAssetInfo.isMinterCollateral) {
    const config = { ...krAssetInfo, isMinterCollateral: true, factor: 1e4, liqIncentive: 1.1e4 }
    addPromises.push(hre.Diamond.updateAsset(krAsset.address, config))
  }
  await Promise.all(addPromises)
  const UserKresko = hre.Diamond.connect(user)
  await UserKresko.depositCollateral(user.address, collateralToUse.address, collateralAmount)
  await Promise.all([
    UserKresko.mintKreskoAsset(
      { account: user.address, krAsset: krAsset.address, amount, receiver: user.address },
      updateData,
    ),
    UserKresko.depositCollateral(user.address, krAsset.address, amount),
  ])

  // Deposit krAsset and withdraw other collateral to bare minimum of within healthy range

  const accountMinCollateralRequired = await hre.Diamond.getAccountMinCollateralAtRatio(
    user.address,
    optimized.getMinCollateralRatioMinter(),
  )
  const accountCollateral = await hre.Diamond.getAccountTotalCollateralValue(user.address)

  const withdrawAmount = accountCollateral.sub(accountMinCollateralRequired).num(8) / price - 0.1
  const amountToWithdraw = withdrawAmount.ebn()

  if (amountToWithdraw.gt(0)) {
    await UserKresko.withdrawCollateral(
      {
        account: user.address,
        asset: collateralToUse.address,
        amount: amountToWithdraw,
        collateralIndex: optimized.getAccountDepositIndex(user.address, collateralToUse.address),
        receiver: user.address,
      },
      updateData,
    )

    // "burn" collateral not needed
    collateralToUse.setBalance(user, toBig(0))
    // await collateralToUse.contract.connect(user).transfer(hre.ethers.constants.AddressZero, amountToWithdraw);
  }
}
