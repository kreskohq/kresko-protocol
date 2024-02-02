import optimized from '@utils/test/helpers/optimizations'
import { fromBig, toBig } from '@utils/values'
import { depositCollateral, depositMockCollateral } from './collaterals'
import { mintKrAsset } from './krassets'
export const getLiqAmount = async (user: SignerWithAddress, krAsset: TestKrAsset, collateral: any, log = false) => {
  const [maxLiquidatableValue, krAssetPrice] = await Promise.all([
    hre.Diamond.getMaxLiqValue(user.address, krAsset.address, collateral.address),
    krAsset.getPrice(),
  ])

  if (log) {
    const [accountMinimumCollateralValue, accountCollateralValue, ratio, kreskoAssetDebt, collateralPrice] =
      await Promise.all([
        hre.Diamond.getAccountMinCollateralAtRatio(user.address, optimized.getLiquidationThresholdMinter()),
        hre.Diamond.getAccountTotalCollateralValue(user.address),
        hre.Diamond.getAccountCollateralRatio(user.address),
        hre.Diamond.getAccountDebtAmount(user.address, krAsset.address),
        collateral.getPrice(),
      ])
    console.table({
      krAssetPrice,
      collateralPrice,
      accountCollateralValue,
      accountMinimumCollateralValue,
      ratio,
      valueUnder: fromBig(accountMinimumCollateralValue.sub(accountCollateralValue), 8),
      kreskoAssetDebt,
      maxValue: maxLiquidatableValue,
      maxAmount: maxLiquidatableValue.repayValue.wadDiv(krAssetPrice.pyth),
    })
  }

  return maxLiquidatableValue.repayValue.wadDiv(krAssetPrice.pyth)
}

export const liquidate = async (
  user: SignerWithAddress,
  krAsset: TestKrAsset,
  collateral: TestExtAsset | TestKrAsset,
  allowSeizeUnderflow = false,
) => {
  const [depositsBefore, debtBefore, liqAmount, updateData] = await Promise.all([
    hre.Diamond.getAccountCollateralAmount(user.address, collateral.address),
    hre.Diamond.getAccountDebtAmount(user.address, krAsset.address),
    getLiqAmount(user, krAsset, collateral),
    hre.updateData(),
  ])

  if (liqAmount.eq(0)) {
    return {
      collateralSeized: 0,
      debtRepaid: 0,
      tx: new Error('Not liquidatable'),
    }
  }
  const [minDebt, { pyth: pythPrice }] = await Promise.all([optimized.getMinDebtValue(), krAsset.getPrice()])

  const minDebtAmount = minDebt.wadDiv(pythPrice)
  const liquidationAmount = liqAmount.lt(minDebtAmount) ? minDebtAmount : liqAmount
  const liquidatorBal = await krAsset.balanceOf(hre.users.liquidator)
  if (liquidatorBal.lt(liquidationAmount)) {
    if (krAsset.address === collateral.address) {
      await depositMockCollateral({
        user: hre.users.liquidator,
        asset: hre.extAssets.find(c => c.config.args.ticker === 'Collateral2')!,
        amount: toBig(100_000),
      })
    } else {
      await collateral.contract.setVariable('_balances', {
        [hre.users.liquidator.address]: toBig(100_000),
      })
      await depositCollateral({
        user: hre.users.liquidator,
        asset: collateral,
        amount: toBig(100_000),
      })
    }
    await mintKrAsset({
      user: hre.users.liquidator,
      asset: krAsset,
      amount: liquidationAmount,
    })
  }

  const tx = await hre.Diamond.connect(hre.users.liquidator).liquidate({
    account: user.address,
    repayAssetAddr: krAsset.address,
    repayAmount: liquidationAmount,
    seizeAssetAddr: collateral.address,
    repayAssetIndex: optimized.getAccountMintIndex(user.address, krAsset.address),
    seizeAssetIndex: optimized.getAccountDepositIndex(user.address, collateral.address),
    prices: updateData,
  })

  const [depositsAfter, debtAfter, decimals] = await Promise.all([
    hre.Diamond.getAccountCollateralAmount(user.address, collateral.address),
    hre.Diamond.getAccountDebtAmount(user.address, krAsset.address),
    collateral.contract.decimals(),
  ])
  return {
    collateralSeized: fromBig(depositsBefore.sub(depositsAfter), decimals),
    debtRepaid: fromBig(debtBefore.sub(debtAfter), 18),
    tx,
  }
}
