import { type AssetArgs, type AssetConfig, OracleType } from '@/types'
import type { MockERC20 } from '@/types/typechain'
import type {
  AssetStruct,
  FeedConfigurationStruct,
} from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import { formatBytesString } from '@utils/values'
import { zeroAddress } from 'viem'
import { toBytes } from './oracle'

/* -------------------------------------------------------------------------- */
/*                                  GENERAL                                   */
/* -------------------------------------------------------------------------- */
export const updateTestAsset = async <T extends MockERC20 | KreskoAsset>(
  asset: TestAsset<T, 'mock'>,
  args: TestAssetUpdate,
) => {
  const { deployer } = await hre.ethers.getNamedSigners()
  const { newPrice, ...assetStruct } = args
  if (newPrice) {
    await asset.setPrice(newPrice)
    asset.config.args.price = newPrice
  }
  const newAssetConfig = { ...asset.config.assetStruct, ...assetStruct }
  await hre.Diamond.connect(deployer).updateAsset(asset.address, newAssetConfig)
  asset.config.assetStruct = newAssetConfig
  return asset
}
export const getAssetConfig = async (
  asset: { symbol: Function; decimals: Function },
  config: AssetArgs,
): Promise<AssetConfig> => {
  if (!config.krAssetConfig && !config.collateralConfig && !config.scdpDepositConfig && !config.scdpKrAssetConfig)
    throw new Error('No config provided')
  const [decimals, symbol] = await Promise.all([asset.decimals(), asset.symbol()])

  const assetStruct: AssetStruct = {
    ticker: formatBytesString(config.ticker, 32),
    oracles: (config.oracleIds as any) ?? [OracleType.Pyth, OracleType.Chainlink],
    isMinterCollateral: !!config.collateralConfig,
    isSharedCollateral: !!config.scdpDepositConfig,
    isSwapMintable: !!config.scdpKrAssetConfig,
    isMinterMintable: !!config.krAssetConfig,
    factor: config.collateralConfig?.cFactor ?? 0,
    liqIncentive: config.collateralConfig?.liqIncentive ?? 0,
    maxDebtSCDP: config.scdpKrAssetConfig?.maxDebtSCDP ?? 0,
    depositLimitSCDP: config.scdpDepositConfig?.depositLimitSCDP ?? 0,
    swapInFeeSCDP: config.scdpKrAssetConfig?.swapInFeeSCDP ?? 0,
    swapOutFeeSCDP: config.scdpKrAssetConfig?.swapOutFeeSCDP ?? 0,
    liqIncentiveSCDP: config.scdpKrAssetConfig?.liqIncentiveSCDP ?? 0,
    protocolFeeShareSCDP: config.scdpKrAssetConfig?.protocolFeeShareSCDP ?? 0,
    kFactor: config.krAssetConfig?.kFactor ?? 0,
    maxDebtMinter: config.krAssetConfig?.maxDebtMinter ?? 0,
    closeFee: config.krAssetConfig?.closeFee ?? 0,
    openFee: config.krAssetConfig?.openFee ?? 0,
    anchor: config.krAssetConfig?.anchor ?? zeroAddress,
    decimals: decimals,
    isSharedOrSwappedCollateral: !!config.scdpDepositConfig || !!config.scdpKrAssetConfig,
    isCoverAsset: false,
  }

  if (assetStruct.isMinterMintable) {
    if (assetStruct.anchor == zeroAddress || assetStruct.anchor == null) {
      throw new Error('KrAsset anchor cannot be zero address')
    }
    if (assetStruct.kFactor === 0) {
      throw new Error('KrAsset kFactor cannot be zero')
    }
  }

  if (assetStruct.isMinterCollateral) {
    if (assetStruct.factor === 0) {
      throw new Error('Colalteral factor cannot be zero')
    }
    if (assetStruct.liqIncentive === 0) {
      throw new Error('Collateral liquidation incentive cannot be zero')
    }
  }

  if (assetStruct.isSwapMintable) {
    if (assetStruct.liqIncentiveSCDP === 0) {
      throw new Error('KrAsset liquidation incentive cannot be zero')
    }
  }

  if (!config.feed) {
    throw new Error('No feed provided')
  }

  const feedConfig: FeedConfigurationStruct = {
    oracleIds: assetStruct.oracles,
    pythId: toBytes(config.pyth.id),
    invertPyth: config.pyth.invert,
    isClosable: false,
    staleTimes: config.staleTimes ?? [10000, 86401],
    feeds: assetStruct.oracles[0] === OracleType.Pyth ? [zeroAddress, config.feed] : [config.feed, zeroAddress],
  }
  return { args: config, assetStruct, feedConfig, extendedInfo: { decimals, symbol } }
}
