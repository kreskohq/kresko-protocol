import { type MockERC20, MockERC20__factory, type MockOracle } from '@/types/typechain'
import { type FakeContract, type MockContract, smock } from '@defi-wonderland/smock'
import { envCheck } from '@utils/env'
import { toBig } from '@utils/values'
import { type InputArgs, testCollateralConfig } from '../mocks'
import { getAssetConfig, updateTestAsset } from './general'
import optimized from './optimizations'
import { createOracles, getPythPrice, updatePrices } from './oracle'
import { getBalanceCollateralFunc, setBalanceCollateralFunc } from './smock'

envCheck()

export const addMockExtAsset = async (args = testCollateralConfig): Promise<TestExtAsset> => {
  const { name, price, symbol, decimals } = args
  const [fakeFeed, contract]: [FakeContract<MockOracle>, MockContract<MockERC20>] = await Promise.all([
    createOracles(hre, args.pyth.id, price),
    (await smock.mock<MockERC20__factory>('MockERC20')).deploy(name ?? symbol, symbol, decimals ?? 18, 0), //shh
  ])

  const config = await getAssetConfig(contract, {
    ...args,
    feed: fakeFeed.address,
    pyth: args.pyth,
    staleTimes: args.staleTimes ?? [10000, 86401],
  })
  await hre.Diamond.addAsset(contract.address, config.assetStruct, config.feedConfig)
  const asset: TestExtAsset = {
    ticker: args.ticker,
    anchor: null,
    address: contract.address,
    contract: contract,
    initialPrice: args.price ?? 10,
    pythId: config.feedConfig.pythId,
    assetInfo: () => hre.Diamond.getAsset(contract.address),
    priceFeed: fakeFeed,
    config,
    errorId: [symbol, contract.address],
    setPrice: price => updatePrices(hre, fakeFeed, price, config.feedConfig.pythId.toString()),
    setBalance: setBalanceCollateralFunc(contract),
    setOracleOrder: order => hre.Diamond.setAssetOracleOrder(contract.address, order),
    balanceOf: getBalanceCollateralFunc(contract),
    getPrice: async () => ({
      push: (await fakeFeed.latestRoundData())[1],
      pyth: getPythPrice(config.feedConfig.pythId.toString()),
    }),
    update: update => updateTestAsset(asset, update),
  }
  const found = hre.extAssets.findIndex(c => c.address === asset.address)
  if (found === -1) {
    hre.extAssets.push(asset)
  } else {
    hre.extAssets = hre.extAssets.map(c => (c.address === asset.address ? asset : c))
  }
  return asset
}

export const depositMockCollateral = async (args: InputArgs) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number'
  const { user, asset, amount } = args
  const depositAmount = convert ? toBig(+amount, await asset.contract.decimals()) : amount
  await asset.contract.setVariables({
    _balances: {
      [user.address]: depositAmount,
    },
    _allowances: {
      [user.address]: {
        [hre.Diamond.address]: depositAmount,
      },
    },
  })
  return hre.Diamond.connect(user).depositCollateral(user.address, asset.contract.address, depositAmount)
}

export const depositCollateral = async (args: InputArgs) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number'
  const { user, asset, amount } = args
  const depositAmount = convert ? toBig(+amount) : amount
  if ((await asset.contract.allowance(user.address, hre.Diamond.address)).lt(depositAmount)) {
    await asset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256)
  }
  return hre.Diamond.connect(user).depositCollateral(user.address, asset.address, depositAmount)
}

export const withdrawCollateral = async (args: InputArgs, updateData: string[]) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number'
  const { user, asset, amount } = args
  const depositAmount = convert ? toBig(+amount) : amount
  return hre.Diamond.connect(user).withdrawCollateral(
    {
      account: user.address,
      asset: asset.address,
      amount: depositAmount,
      collateralIndex: optimized.getAccountDepositIndex(user.address, asset.address),
      receiver: user.address,
    },
    updateData,
  )
}

export const getMaxWithdrawal = async (user: string, collateral: any) => {
  const [collateralValue, MCR, collateralPrice] = await Promise.all([
    hre.Diamond.getAccountTotalCollateralValue(user),
    hre.Diamond.getMinCollateralRatioMinter(),
    collateral.getPrice(),
  ])

  const minCollateralRequired = await hre.Diamond.getAccountMinCollateralAtRatio(user, MCR)
  const maxWithdrawValue = collateralValue.sub(minCollateralRequired)
  const maxWithdrawAmount = maxWithdrawValue.wadDiv(collateralPrice.pyth)

  return { maxWithdrawValue, maxWithdrawAmount }
}
