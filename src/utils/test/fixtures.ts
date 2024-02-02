import type { SCDPKrAssetConfig } from '@/types'
import { SmockCollateralReceiver, SmockCollateralReceiver__factory } from '@/types/typechain'
import type { Kresko } from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import type { AllTokenSymbols } from '@config/hardhat/deploy'
import { type MockContract, smock } from '@defi-wonderland/smock'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { createKrAsset } from '@scripts/create-krasset'
import { MaxUint128, toBig } from '@utils/values'
import type { Facet } from 'hardhat-deploy/types'
import { zeroAddress } from 'viem'
import { addMockExtAsset, depositCollateral } from './helpers/collaterals'
import { addMockKreskoAsset, leverageKrAsset, mintKrAsset } from './helpers/krassets'

import {
  HUNDRED_USD,
  ONE_USD,
  TEN_USD,
  defaultCloseFee,
  defaultOpenFee,
  defaultSupplyLimit,
  testCollateralConfig,
  testKrAssetConfig,
} from './mocks'
import { Role } from './roles'

type SCDPFixtureParams = undefined

export type SCDPFixture = {
  reset: () => Promise<void>
  krAssets: TestKrAsset[]
  collaterals: TestExtAsset[]
  usersArr: SignerWithAddress[]
  KrAsset: TestKrAsset
  KrAsset2: TestKrAsset
  KISS: TestKrAsset
  Collateral: TestExtAsset
  Collateral8Dec: TestExtAsset
  swapKissConfig: SCDPKrAssetConfig
  CollateralPrice: BigNumber
  KrAssetPrice: BigNumber
  KrAsset2Price: BigNumber
  KISSPrice: BigNumber
  swapKrAssetConfig: SCDPKrAssetConfig
  swapper: SignerWithAddress
  depositor: SignerWithAddress
  depositor2: SignerWithAddress
  liquidator: SignerWithAddress
  KRASSET_KISS_ROUTE_FEE: number
  KreskoSwapper: typeof hre.Diamond
  KreskoDepositor: typeof hre.Diamond
  KreskoDepositor2: typeof hre.Diamond
  KreskoLiquidator: typeof hre.Diamond
}

export const scdpFixture = hre.deployments.createFixture<SCDPFixture, SCDPFixtureParams>(async hre => {
  const result = await hre.deployments.fixture('local')

  if (result.Diamond) {
    hre.Diamond = await hre.getContractOrFork('Kresko')
  }
  // preload for price updates
  await hre.users.deployer.sendTransaction({
    to: hre.Diamond.address,
    value: (1).ebn(18),
  })

  await time.increase(3610)

  const Collateral = hre.extAssets.find(c => c.config.args.symbol === testCollateralConfig.symbol)!
  const Coll8Dec = hre.extAssets.find(c => c.config.args.symbol === 'Coll8Dec')!

  await Collateral.update({
    isSharedCollateral: true,
    depositLimitSCDP: MaxUint128,
    newPrice: TEN_USD,
  })
  await Coll8Dec.update({
    isSharedCollateral: true,
    depositLimitSCDP: MaxUint128,
    factor: 0.8e4,
    newPrice: TEN_USD,
  })

  const KrAsset = hre.krAssets.find(k => k.config.args.symbol === testKrAssetConfig.symbol)!
  const KrAsset2 = hre.krAssets.find(k => k.config.args.symbol === 'KrAsset2')!
  const swapKrAssetConfig = {
    swapInFeeSCDP: 0.015e4,
    swapOutFeeSCDP: 0.015e4,
    protocolFeeShareSCDP: 0.25e4,
    liqIncentiveSCDP: 1.05e4,
    maxDebtSCDP: defaultSupplyLimit,
  }

  const swapKissConfig = {
    swapInFeeSCDP: 0.025e4,
    swapOutFeeSCDP: 0.025e4,
    liqIncentiveSCDP: 1.05e4,
    protocolFeeShareSCDP: 0.25e4,
    maxDebtSCDP: defaultSupplyLimit,
  }
  const KISS = await addMockKreskoAsset({
    ticker: 'MockKISS',
    price: ONE_USD,
    symbol: 'KISS',
    pyth: {
      id: 'MockKISS',
      invert: false,
    },
    krAssetConfig: {
      anchor: null,
      closeFee: 0.025e4,
      openFee: 0.025e4,
      kFactor: 1e4,
      maxDebtMinter: defaultSupplyLimit,
    },
    collateralConfig: {
      cFactor: 1e4,
      liqIncentive: 1.1e4,
    },
    scdpKrAssetConfig: swapKissConfig,
    scdpDepositConfig: {
      depositLimitSCDP: MaxUint128,
    },
    marketOpen: true,
  })
  await KrAsset.update({
    kFactor: 1.25e4,
    openFee: 0.01e4,
    closeFee: 0.01e4,
    isMinterCollateral: true,
    factor: 1e4,
    liqIncentive: 1.1e4,
    isSwapMintable: true,
    newPrice: TEN_USD,
    ...swapKrAssetConfig,
  })
  await KrAsset2.update({
    kFactor: 1e4,
    openFee: 0.015e4,
    closeFee: 0.015e4,
    isMinterCollateral: true,
    factor: 1e4,
    liqIncentive: 1.1e4,
    isSwapMintable: true,
    newPrice: HUNDRED_USD,
    ...swapKrAssetConfig,
  })

  const krAssets = [KrAsset, KrAsset2, KISS]
  const collaterals = [Collateral, Coll8Dec]

  const users = [hre.users.userTen, hre.users.userEleven, hre.users.userTwelve]

  await hre.Diamond.setFeeAssetSCDP(KISS.address)
  for (const user of users) {
    await Promise.all([
      ...krAssets.map(async asset =>
        asset.contract.setVariable('_allowances', {
          [user.address]: {
            [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
          },
        }),
      ),
      ...collaterals.map(async asset =>
        asset.contract.setVariable('_allowances', {
          [user.address]: {
            [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
          },
        }),
      ),
    ])
  }

  await hre.Diamond.setSwapRoutesSCDP([
    {
      assetIn: KrAsset2.address,
      assetOut: KrAsset.address,
      enabled: true,
    },
    {
      assetIn: KISS.address,
      assetOut: KrAsset2.address,
      enabled: true,
    },
    {
      assetIn: KrAsset.address,
      assetOut: KISS.address,
      enabled: true,
    },
  ])

  const reset = async () => {
    const depositAmount = 1000
    const depositAmount18Dec = toBig(depositAmount)
    const depositAmount8Dec = toBig(depositAmount, 8)
    await Promise.all([
      Collateral.setPrice(TEN_USD),
      Coll8Dec.setPrice(TEN_USD),
      KrAsset.setPrice(TEN_USD),
      KrAsset2.setPrice(HUNDRED_USD),
      KISS.setPrice(ONE_USD),
    ])

    for (const user of users) {
      await Collateral.setBalance(user, depositAmount18Dec, hre.Diamond.address)
      await Coll8Dec.setBalance(user, depositAmount8Dec, hre.Diamond.address)
    }
  }

  return {
    reset,
    CollateralPrice: TEN_USD.ebn(8),
    KrAssetPrice: TEN_USD.ebn(8),
    KrAsset2Price: HUNDRED_USD.ebn(8),
    KISSPrice: ONE_USD.ebn(8),
    swapKissConfig,
    swapKrAssetConfig,
    KrAsset: KrAsset,
    KrAsset2: KrAsset2,
    KISS,
    KRASSET_KISS_ROUTE_FEE: swapKissConfig.swapOutFeeSCDP + swapKrAssetConfig.swapInFeeSCDP,
    Collateral: Collateral,
    Collateral8Dec: Coll8Dec,
    collaterals,
    krAssets,
    usersArr: users,
    swapper: users[0],
    depositor: users[1],
    depositor2: users[2],
    liquidator: hre.users.liquidator,
    KreskoSwapper: hre.Diamond.connect(users[0]),
    KreskoDepositor: hre.Diamond.connect(users[1]),
    KreskoDepositor2: hre.Diamond.connect(users[2]),
    KreskoLiquidator: hre.Diamond.connect(hre.users.liquidator),
  }
})

const getReceiver = async (kresko: Kresko, grantRole = true) => {
  const Receiver = await (await smock.mock<SmockCollateralReceiver__factory>('SmockCollateralReceiver')).deploy(
    kresko.address,
  )
  if (grantRole) {
    await kresko.grantRole(Role.MANAGER, Receiver.address)
  }
  return Receiver
}

export const diamondFixture = hre.deployments.createFixture<{ facets: Facet[] }, {}>(async hre => {
  const result = await hre.deployments.fixture('diamond-init')
  if (result.Diamond) {
    hre.Diamond = await hre.getContractOrFork('Kresko')
  }

  return {
    facets: result.Diamond?.facets?.length ? result.Diamond.facets : [],
  }
})

export const kreskoAssetFixture = hre.deployments.createFixture<
  Awaited<ReturnType<typeof createKrAsset>>,
  { name: string; symbol: AllTokenSymbols; underlyingToken?: string }
>(async (hre, opts) => {
  const result = await hre.deployments.fixture(['diamond-init', opts?.name!])
  if (result.Diamond) {
    hre.Diamond = await hre.getContractOrFork('Kresko')
  }
  if (!opts) throw new Error('Must supply options')
  return createKrAsset(
    opts?.symbol,
    opts?.name,
    18,
    opts.underlyingToken ?? zeroAddress,
    hre.users.treasury.address,
    0,
    0,
  )
})

export type DefaultFixture = {
  users: [SignerWithAddress, Kresko][]
  collaterals: TestExtAsset[]
  krAssets: TestKrAsset[]
  KrAsset: TestKrAsset
  Collateral: TestExtAsset
  Collateral2: TestExtAsset
  Receiver: MockContract<SmockCollateralReceiver>
  depositAmount: BigNumber
  mintAmount: BigNumber
}

export const defaultFixture = hre.deployments.createFixture<DefaultFixture, {}>(async hre => {
  const result = await hre.deployments.fixture('local')
  if (result.Diamond) {
    hre.Diamond = await hre.getContractOrFork('Kresko')
  }
  // preload for price updates
  await hre.users.deployer.sendTransaction({
    to: hre.Diamond.address,
    value: (1).ebn(18),
  })

  await time.increase(3610)

  const depositAmount = toBig(1000)
  const mintAmount = toBig(100)
  const DefaultCollateral = hre.extAssets.find(c => c.config.args.ticker === testCollateralConfig.ticker)!
  const DefaultKrAsset = hre.krAssets.find(k => k.config.args.ticker === testKrAssetConfig.ticker)!
  const Collateral2 = hre.extAssets.find(c => c.config.args.ticker === 'Collateral2')!

  const blankUser = hre.users.userOne
  const userWithDeposits = hre.users.userTwo
  const userWithMint = hre.users.userThree

  await DefaultCollateral.setBalance(userWithDeposits, depositAmount, hre.Diamond.address)
  await DefaultCollateral.setBalance(userWithMint, depositAmount, hre.Diamond.address)

  await depositCollateral({ user: userWithDeposits, asset: DefaultCollateral, amount: depositAmount })
  await depositCollateral({ user: userWithMint, asset: DefaultCollateral, amount: depositAmount })
  await mintKrAsset({ user: userWithMint, asset: DefaultKrAsset, amount: mintAmount })

  const Receiver = await getReceiver(hre.Diamond)

  return {
    users: [
      [blankUser, hre.Diamond.connect(blankUser)],
      [userWithDeposits, hre.Diamond.connect(userWithDeposits)],
      [userWithMint, hre.Diamond.connect(userWithMint)],
    ],
    collaterals: hre.extAssets,
    krAssets: hre.krAssets,
    KrAsset: DefaultKrAsset,
    Collateral: DefaultCollateral,
    Collateral2,
    Receiver: Receiver.connect(userWithMint),
    depositAmount,
    mintAmount,
  }
})
export type AssetValuesFixture = {
  startingBalance: number
  user: SignerWithAddress
  KreskoAsset: TestKrAsset
  CollateralAsset: TestExtAsset
  CollateralAsset8Dec: TestExtAsset
  CollateralAsset21Dec: TestExtAsset
  oracleDecimals: number
}

export const assetValuesFixture = hre.deployments.createFixture<AssetValuesFixture, {}>(async hre => {
  const result = await hre.deployments.fixture('local')

  if (result.Diamond) {
    hre.Diamond = await hre.getContractOrFork('Kresko')
  }
  // preload for price updates
  await hre.users.deployer.sendTransaction({
    to: hre.Diamond.address,
    value: (1).ebn(18),
  })

  await time.increase(3610)
  const KreskoAsset = hre.krAssets.find(c => c.config.args.symbol === testKrAssetConfig.symbol)!
  await hre.Diamond.updateAsset(KreskoAsset.address, {
    ...KreskoAsset.config.assetStruct,
    openFee: 0.1e4,
    closeFee: 0.1e4,
    kFactor: 2e4,
  })

  const CollateralAsset = hre.extAssets.find(c => c.config.args.symbol === testCollateralConfig.symbol)!
  const Coll8Dec = hre.extAssets!.find(c => c.config.args.symbol === 'Coll8Dec')!

  const CollateralAsset21Dec = await addMockExtAsset({
    ticker: 'Coll21Dec',
    symbol: 'Coll21Dec',
    price: TEN_USD,
    pyth: {
      id: 'Coll21Dec',
      invert: false,
    },
    collateralConfig: {
      cFactor: 0.5e4,
      liqIncentive: 1.1e4,
    },
    decimals: 21, // more
  })
  await hre.Diamond.setAssetCFactor(Coll8Dec.address, 0.5e4)
  await hre.Diamond.setAssetCFactor(CollateralAsset.address, 0.5e4)

  const user = hre.users.userEight
  const startingBalance = 100
  await CollateralAsset.setBalance(user, toBig(startingBalance), hre.Diamond.address)
  await Coll8Dec.setBalance(user, toBig(startingBalance, 8), hre.Diamond.address)
  await CollateralAsset21Dec.setBalance(user, toBig(startingBalance, 21), hre.Diamond.address)

  return {
    oracleDecimals: await hre.Diamond.getDefaultOraclePrecision(),
    startingBalance,
    user,
    KreskoAsset,
    CollateralAsset,
    CollateralAsset8Dec: Coll8Dec,
    CollateralAsset21Dec,
  }
})

export type DepositWithdrawFixture = {
  initialDeposits: BigNumber
  initialBalance: BigNumber
  Collateral: TestExtAsset
  KrAsset: TestKrAsset
  Collateral2: TestExtAsset
  KrAssetCollateral: TestKrAsset
  depositor: SignerWithAddress
  withdrawer: SignerWithAddress
  user: SignerWithAddress
  User: Kresko
  Depositor: Kresko
  Withdrawer: Kresko
}

export const depositWithdrawFixture = hre.deployments.createFixture<DepositWithdrawFixture, {}>(async hre => {
  const result = await hre.deployments.fixture('local')
  // preload for price updates
  await hre.users.deployer.sendTransaction({
    to: hre.Diamond.address,
    value: (1).ebn(18),
  })
  if (result.Diamond) {
    hre.Diamond = await hre.getContractOrFork('Kresko')
  }
  await time.increase(3610)

  const withdrawer = hre.users.userThree

  const DefaultCollateral = hre.extAssets.find(c => c.config.args.ticker === testCollateralConfig.ticker)!

  const DefaultKrAsset = hre.krAssets.find(k => k.config.args.ticker === testKrAssetConfig.ticker)!
  const KrAssetCollateral = hre.krAssets.find(k => k.config.args.ticker === 'KrAsset3')!

  const initialDeposits = toBig(10000)
  const initialBalance = toBig(100000)
  await DefaultCollateral.setBalance(withdrawer, initialDeposits, hre.Diamond.address)
  await KrAssetCollateral.contract.setVariable('_allowances', {
    [withdrawer.address]: {
      [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
    },
  })
  await DefaultCollateral.setBalance(hre.users.userOne, initialBalance, hre.Diamond.address)
  await DefaultCollateral.setBalance(hre.users.userTwo, initialBalance, hre.Diamond.address)
  await hre.Diamond.connect(withdrawer).depositCollateral(
    withdrawer.address,
    DefaultCollateral.address,
    initialDeposits,
  )

  return {
    initialDeposits,
    initialBalance,
    Collateral: DefaultCollateral,
    KrAsset: DefaultKrAsset,
    Collateral2: hre.extAssets!.find(c => c.config.args.ticker === 'Collateral2')!,
    KrAssetCollateral,
    user: hre.users.userOne,
    depositor: hre.users.userTwo,
    withdrawer: hre.users.userThree,
    User: hre.Diamond.connect(hre.users.userOne),
    Depositor: hre.Diamond.connect(hre.users.userTwo),
    Withdrawer: hre.Diamond.connect(hre.users.userThree),
  }
})

export type MintRepayFixture = {
  reset: () => Promise<void>
  Collateral: TestExtAsset
  KrAsset: TestKrAsset
  KrAsset2: TestKrAsset
  Collateral2: TestExtAsset
  KrAssetCollateral: TestKrAsset
  collaterals: TestExtAsset[]
  krAssets: TestKrAsset[]
  initialDeposits: BigNumber
  initialMintAmount: BigNumber
  user1: SignerWithAddress
  user2: SignerWithAddress
  User1: Kresko
  User2: Kresko
}

export const mintRepayFixture = hre.deployments.createFixture<MintRepayFixture, {}>(async hre => {
  const result = await hre.deployments.fixture('local')
  await hre.users.deployer.sendTransaction({
    to: hre.Diamond.address,
    value: (1).ebn(18),
  })
  if (result.Diamond) {
    hre.Diamond = await hre.getContractOrFork('Kresko')
  }
  await time.increase(3610)

  const DefaultCollateral = hre.extAssets.find(c => c.config.args.ticker === testCollateralConfig.ticker)!

  const DefaultKrAsset = hre.krAssets.find(k => k.config.args.ticker === testKrAssetConfig.ticker)!
  const KrAsset2 = hre.krAssets.find(k => k.config.args.ticker === 'KrAsset2')!
  const KrAssetCollateral = hre.krAssets.find(k => k.config.args.ticker === 'KrAsset3')!

  await DefaultKrAsset.contract.grantRole(Role.OPERATOR, hre.users.deployer.address)

  // Load account with collateral
  const initialDeposits = toBig(10000)
  const initialMintAmount = toBig(20)
  await DefaultCollateral.setBalance(hre.users.userOne, initialDeposits, hre.Diamond.address)
  await DefaultCollateral.setBalance(hre.users.userTwo, initialDeposits, hre.Diamond.address)

  // User deposits 10,000 collateral
  await depositCollateral({
    amount: initialDeposits,
    user: hre.users.userOne,
    asset: DefaultCollateral,
  })

  // Load userThree with Kresko Assets
  await depositCollateral({
    user: hre.users.userTwo,
    asset: DefaultCollateral,
    amount: initialDeposits,
  })

  await mintKrAsset({ user: hre.users.userTwo, asset: DefaultKrAsset, amount: initialMintAmount })

  const reset = async () => {
    await DefaultKrAsset.setPrice(TEN_USD)
    await DefaultCollateral.setPrice(TEN_USD)
  }

  return {
    reset,
    collaterals: hre.extAssets,
    krAssets: hre.krAssets,
    initialDeposits,
    initialMintAmount,
    Collateral: DefaultCollateral,
    KrAsset: DefaultKrAsset,
    KrAsset2,
    Collateral2: hre.extAssets!.find(c => c.config.args.ticker === 'Collateral2')!,
    KrAssetCollateral,
    user1: hre.users.userOne,
    user2: hre.users.userTwo,
    User1: hre.Diamond.connect(hre.users.userOne),
    User2: hre.Diamond.connect(hre.users.userTwo),
  }
})

export type LiquidationFixture = {
  Collateral: TestExtAsset
  userOneMaxLiqPrecalc: BigNumber
  Collateral2: TestExtAsset
  Collateral8Dec: TestExtAsset
  KrAsset: TestKrAsset
  KrAsset2: TestKrAsset
  KrAssetCollateral: TestKrAsset
  collaterals: TestExtAsset[]
  krAssets: TestKrAsset[]
  initialMintAmount: BigNumber
  initialDeposits: BigNumber
  reset: () => Promise<void>
  resetRebasing: () => Promise<void>
  Liquidator: Kresko
  LiquidatorTwo: Kresko
  User: Kresko
  liquidator: SignerWithAddress
  liquidatorTwo: SignerWithAddress
  user1: SignerWithAddress
  user2: SignerWithAddress
  user3: SignerWithAddress
  user4: SignerWithAddress
  user5: SignerWithAddress
  krAssetArgs: {
    price: number
    factor: BigNumberish
    maxDebtMinter: BigNumberish
    closeFee: BigNumberish
    openFee: BigNumberish
  }
}

// Set up mock KreskoAsset

export const liquidationsFixture = hre.deployments.createFixture<LiquidationFixture, {}>(async hre => {
  const result = await hre.deployments.fixture('local')
  // preload for price updates
  await hre.users.deployer.sendTransaction({
    to: hre.Diamond.address,
    value: (1).ebn(18),
  })
  if (result.Diamond) {
    hre.Diamond = await hre.getContractOrFork('Kresko')
  }
  await time.increase(3610)
  const DefaultCollateral = hre.extAssets.find(c => c.config.args.ticker === testCollateralConfig.ticker)!
  const DefaultKrAsset = hre.krAssets.find(c => c.config.args.ticker === testKrAssetConfig.ticker)!

  const KreskoAsset2 = hre.krAssets.find(c => c.config.args.ticker === 'KrAsset2')!
  const KrAssetCollateral = hre.krAssets!.find(k => k.config.args.ticker === 'KrAsset3')!
  const Collateral2 = hre.extAssets.find(c => c.config.args.ticker === 'Collateral2')!
  const Collateral8Dec = hre.extAssets.find(c => c.config.args.ticker === 'Coll8Dec')!

  await DefaultKrAsset.contract.grantRole(Role.OPERATOR, hre.users.deployer.address)

  const initialDeposits = toBig(16.5)
  await DefaultCollateral.setBalance(hre.users.liquidator, toBig(100000000), hre.Diamond.address)
  await DefaultCollateral.setBalance(hre.users.userOne, initialDeposits, hre.Diamond.address)

  await depositCollateral({
    user: hre.users.userOne,
    amount: initialDeposits,
    asset: DefaultCollateral,
  })

  await depositCollateral({
    user: hre.users.liquidator,
    amount: toBig(100000000),
    asset: DefaultCollateral,
  })
  const initialMintAmount = toBig(10) // 10 * $11 = $110 in debt value
  await mintKrAsset({
    user: hre.users.userOne,
    amount: initialMintAmount,
    asset: DefaultKrAsset,
  })
  await mintKrAsset({
    user: hre.users.liquidator,
    amount: initialMintAmount.mul(1000),
    asset: DefaultKrAsset,
  })
  await DefaultKrAsset.setPrice(11)
  await DefaultCollateral.setPrice(7.5)
  const userOneMaxLiqPrecalc = (
    await hre.Diamond.getMaxLiqValue(hre.users.userOne.address, DefaultKrAsset.address, DefaultCollateral.address)
  ).repayValue

  await DefaultCollateral.setPrice(TEN_USD)

  const reset = async () => {
    await Promise.all([
      DefaultKrAsset.setPrice(11),
      KreskoAsset2.setPrice(TEN_USD),
      DefaultCollateral.setPrice(testCollateralConfig.price!),
      Collateral2.setPrice(TEN_USD),
      Collateral8Dec.setPrice(TEN_USD),
      hre.Diamond.setAssetCFactor(DefaultCollateral.address, 1e4),
      hre.Diamond.setAssetKFactor(KrAssetCollateral.address, 1e4),
    ])
  }

  /* -------------------------------------------------------------------------- */
  /*                               Rebasing setup                               */
  /* -------------------------------------------------------------------------- */

  const collateralPriceRebasing = TEN_USD
  const krAssetPriceRebasing = ONE_USD
  const thousand = toBig(1000) // $10k
  const rebasingAmounts = {
    liquidatorDeposits: thousand,
    userDeposits: thousand,
  }
  // liquidator
  await DefaultCollateral.setBalance(hre.users.userSeven, rebasingAmounts.liquidatorDeposits, hre.Diamond.address)
  await depositCollateral({
    user: hre.users.userSeven,
    asset: DefaultCollateral,
    amount: rebasingAmounts.liquidatorDeposits,
  })

  // another user
  await DefaultCollateral.setBalance(hre.users.userFour, rebasingAmounts.liquidatorDeposits, hre.Diamond.address)
  await depositCollateral({
    user: hre.users.userFour,
    asset: DefaultCollateral,
    amount: rebasingAmounts.liquidatorDeposits,
  })

  await DefaultKrAsset.setPrice(krAssetPriceRebasing)
  await mintKrAsset({
    user: hre.users.userFour,
    asset: DefaultKrAsset,
    amount: toBig(6666.66666),
  })

  // another user
  await DefaultCollateral.setBalance(hre.users.userNine, rebasingAmounts.liquidatorDeposits, hre.Diamond.address)
  await depositCollateral({
    user: hre.users.userNine,
    asset: DefaultCollateral,
    amount: rebasingAmounts.liquidatorDeposits,
  })

  await DefaultKrAsset.setPrice(krAssetPriceRebasing)
  await mintKrAsset({
    user: hre.users.userNine,
    asset: DefaultKrAsset,
    amount: toBig(6666.66666),
  })

  await DefaultKrAsset.setPrice(11)

  // another user
  await leverageKrAsset(hre.users.userThree, KrAssetCollateral, DefaultCollateral, rebasingAmounts.userDeposits)
  await leverageKrAsset(hre.users.userThree, KrAssetCollateral, DefaultCollateral, rebasingAmounts.userDeposits)

  const resetRebasing = async () => {
    await DefaultCollateral.setPrice(collateralPriceRebasing)
    await DefaultKrAsset.setPrice(krAssetPriceRebasing)
  }

  /* --------------------------------- Values --------------------------------- */
  return {
    resetRebasing,
    reset,
    userOneMaxLiqPrecalc,
    collaterals: hre.extAssets,
    krAssets: hre.krAssets,
    initialDeposits,
    initialMintAmount,
    Collateral: DefaultCollateral,
    KrAsset: DefaultKrAsset,
    Collateral2,
    Collateral8Dec,
    KrAsset2: KreskoAsset2,
    KrAssetCollateral,
    Liquidator: hre.Diamond.connect(hre.users.liquidator),
    LiquidatorTwo: hre.Diamond.connect(hre.users.userFive),
    User: hre.Diamond.connect(hre.users.userOne),
    liquidator: hre.users.liquidator,
    liquidatorTwo: hre.users.userFive,
    user1: hre.users.userOne,
    user2: hre.users.userTwo,
    user3: hre.users.userThree,
    user4: hre.users.userFour,
    user5: hre.users.userNine, // obviously not user5
    krAssetArgs: {
      price: 11, // $11
      factor: 1e4,
      maxDebtMinter: MaxUint128,
      closeFee: defaultCloseFee,
      openFee: defaultOpenFee,
    },
  }
})
