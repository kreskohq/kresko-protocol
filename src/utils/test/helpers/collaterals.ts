import { type MockERC20, MockERC20__factory, type MockOracle } from '@/types/typechain'
import { type FakeContract, type MockContract, smock } from '@defi-wonderland/smock'
import { envCheck } from '@utils/env'
import { wrapKresko } from '@utils/redstone'
import { toBig } from '@utils/values'
import { type InputArgs, testCollateralConfig } from '../mocks'
import { getAssetConfig, updateTestAsset } from './general'
import optimized from './optimizations'
import { getFakeOracle, setPrice } from './oracle'
import { getBalanceCollateralFunc, setBalanceCollateralFunc } from './smock'

envCheck()

export const addMockExtAsset = async (args = testCollateralConfig): Promise<TestExtAsset> => {
  const { deployer } = await hre.ethers.getNamedSigners()
  const { name, price, symbol, decimals } = args
  const [fakeFeed, contract]: [FakeContract<MockOracle>, MockContract<MockERC20>] = await Promise.all([
    getFakeOracle(price),
    (await smock.mock<MockERC20__factory>('MockERC20')).deploy(name ?? symbol, symbol, decimals ?? 18, 0), //shh
  ])

  const config = await getAssetConfig(contract, { ...args, feed: fakeFeed.address })
  await wrapKresko(hre.Diamond, deployer).addAsset(contract.address, config.assetStruct, config.feedConfig.feeds)
  const asset: TestExtAsset = {
    ticker: args.ticker,
    anchor: null,
    address: contract.address,
    contract: contract,
    assetInfo: () => hre.Diamond.getAsset(contract.address),
    priceFeed: fakeFeed,
    config,
    errorId: [symbol, contract.address],
    setPrice: price => setPrice(fakeFeed, price),
    setBalance: setBalanceCollateralFunc(contract),
    setOracleOrder: order => hre.Diamond.setAssetOracleOrder(contract.address, order),
    balanceOf: getBalanceCollateralFunc(contract),
    getPrice: async () => (await fakeFeed.latestRoundData())[1],
    update: update => updateTestAsset(asset, update),
  }
  const found = hre.extAssets.findIndex(c => c.address === asset.address)
  if (found === -1) {
    hre.extAssets.push(asset)
    hre.allAssets.push(asset)
  } else {
    hre.extAssets = hre.extAssets.map(c => (c.address === asset.address ? asset : c))
    hre.allAssets = hre.allAssets.map(c => (c.address === asset.address ? asset : c))
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
  return wrapKresko(hre.Diamond, user).depositCollateral(user.address, asset.contract.address, depositAmount)
}

export const depositCollateral = async (args: InputArgs) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number'
  const { user, asset, amount } = args
  const depositAmount = convert ? toBig(+amount) : amount
  if ((await asset.contract.allowance(user.address, hre.Diamond.address)).lt(depositAmount)) {
    await asset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256)
  }
  return wrapKresko(hre.Diamond, user).depositCollateral(user.address, asset.address, depositAmount)
}

export const withdrawCollateral = async (args: InputArgs) => {
  const convert = typeof args.amount === 'string' || typeof args.amount === 'number'
  const { user, asset, amount } = args
  const depositAmount = convert ? toBig(+amount) : amount

  return wrapKresko(hre.Diamond, user).withdrawCollateral(
    user.address,
    asset.address,
    depositAmount,
    optimized.getAccountDepositIndex(user.address, asset.address),
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
  const maxWithdrawAmount = maxWithdrawValue.wadDiv(collateralPrice)

  return { maxWithdrawValue, maxWithdrawAmount }
}
