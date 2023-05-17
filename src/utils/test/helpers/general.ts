import { MockContract, smock } from "@defi-wonderland/smock";
import { fromBig, toBig } from "@kreskolabs/lib";
import hre, { ethers } from "hardhat";
import { FluxPriceFeed__factory } from "types/typechain";
import { defaultCloseFee, defaultOracleDecimals, defaultOraclePrice } from "../mocks";

/* -------------------------------------------------------------------------- */
/*                                  GENERAL                                   */
/* -------------------------------------------------------------------------- */

export const getMockOracleFor = async (assetName = "Asset", price = defaultOraclePrice, marketOpen = true) => {
    const FakeFeed = await smock.fake<FluxPriceFeed>("FluxPriceFeed");
    const { deployer } = await hre.ethers.getNamedSigners();

    const MockFeed = await (
        await smock.mock<FluxPriceFeed__factory>("FluxPriceFeed")
    ).deploy(deployer.address, defaultOracleDecimals, assetName);

    MockFeed.latestAnswer.returns(toBig(price, 8));
    MockFeed.latestMarketOpen.returns(marketOpen);
    MockFeed.decimals.returns(8);
    FakeFeed.latestAnswer.returns(toBig(price, 8));
    FakeFeed.latestMarketOpen.returns(marketOpen);
    FakeFeed.decimals.returns(8);
    return [MockFeed, FakeFeed] as const;
};

export const setPrice = (oracles: any, price: number) => {
    oracles.priceFeed.latestAnswer.returns(toBig(price, 8));
    oracles.mockFeed.latestAnswer.returns(toBig(price, 8));
};

export const setMarketOpen = <T extends "FluxPriceFeed">(oracle: MockContract<TC[T]>, marketOpen: boolean) => {
    oracle.latestMarketOpen.returns(marketOpen);
};

export const getHealthFactor = async (user: SignerWithAddress) => {
    const accountKrAssetValue = fromBig(await hre.Diamond.getAccountKrAssetValue(user.address), 8);
    const accountCollateral = fromBig(await hre.Diamond.getAccountCollateralValue(user.address), 8);

    return accountCollateral / accountKrAssetValue;
};

export const leverageKrAsset = async (
    user: SignerWithAddress,
    krAsset: TestKrAsset,
    collateralToUse: TestCollateral,
    amount: BigNumber,
) => {
    await collateralToUse.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    await krAsset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);

    const krAssetValue = fromBig(await hre.Diamond.getKrAssetValue(krAsset.address, amount, false), 8);
    const MCR = fromBig(await hre.Diamond.minimumCollateralizationRatio());
    const collateralValueRequired = krAssetValue * MCR;

    const [collateralValue] = await hre.Diamond.getCollateralValueAndOraclePrice(
        collateralToUse.address,
        toBig(1),
        false,
    );

    const price = fromBig(collateralValue, 8);
    const collateralAmount = collateralValueRequired / price;

    await collateralToUse.mocks?.contract.setVariable("_balances", {
        [user.address]: toBig(collateralAmount),
    });
    if (!(await hre.Diamond.collateralAsset(collateralToUse.address)).exists) {
        await hre.Diamond.connect(hre.users.deployer).addCollateralAsset(
            collateralToUse.address,
            collateralToUse.anchor ? collateralToUse.anchor.address : ethers.constants.AddressZero,
            toBig(1),
            toBig(process.env.LIQUIDATION_INCENTIVE as string),
            collateralToUse.priceFeed.address,
            collateralToUse.priceFeed.address,
        );
    }
    await hre.Diamond.connect(user).depositCollateral(user.address, collateralToUse.address, toBig(collateralAmount));
    if (!(await hre.Diamond.kreskoAsset(krAsset.address)).exists) {
        await hre.Diamond.connect(hre.users.deployer).addKreskoAsset(
            krAsset.address,
            krAsset.anchor.address,
            toBig(1),
            krAsset.priceFeed.address,
            krAsset.priceFeed.address,
            toBig(1_000_000),
            defaultCloseFee,
            0,
        );
    }
    await hre.Diamond.connect(user).mintKreskoAsset(user.address, krAsset.address, amount);

    if (!(await hre.Diamond.collateralAsset(krAsset.address)).exists) {
        await hre.Diamond.connect(hre.users.deployer).addCollateralAsset(
            krAsset.address,
            krAsset.anchor.address,
            toBig(1),
            toBig(process.env.LIQUIDATION_INCENTIVE as string),
            krAsset.priceFeed.address,
            krAsset.priceFeed.address,
        );
    }
    await hre.Diamond.connect(user).depositCollateral(user.address, krAsset.address, amount);

    // Deposit krAsset and withdraw other collateral to bare minimum of within healthy range
    const accountMinCollateralRequired = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
        user.address,
        hre.Diamond.minimumCollateralizationRatio(),
    );
    const accountCollateral = await hre.Diamond.getAccountCollateralValue(user.address);

    const withdrawAmount = fromBig(accountCollateral.sub(accountMinCollateralRequired), 8) / price - 0.1;
    const amountToWithdraw = toBig(withdrawAmount).rayDiv(await hre.Diamond.getDebtIndexForAsset(krAsset.address));

    if (amountToWithdraw.gt(0)) {
        await hre.Diamond.connect(user).withdrawCollateral(
            user.address,
            collateralToUse.address,
            amountToWithdraw,
            await hre.Diamond.getDepositedCollateralAssetIndex(user.address, collateralToUse.address),
        );

        // "burn" collateral not needed
        await collateralToUse.contract.connect(user).transfer(hre.ethers.constants.AddressZero, amountToWithdraw);
    }
};
