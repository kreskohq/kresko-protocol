import { MockContract, smock } from "@defi-wonderland/smock";
import hre, { ethers } from "hardhat";
import { FluxPriceAggregator__factory } from "types/typechain";
import { getUsers } from "@utils/general";
import { defaultCloseFee, defaultOracleDecimals, defaultOraclePrice } from "../mocks";
import { toBig } from "@kreskolabs/lib";
/* -------------------------------------------------------------------------- */
/*                                  GENERAL                                   */
/* -------------------------------------------------------------------------- */

export const getMockOracleFor = async (assetName = "Asset", price = defaultOraclePrice) => {
    const Oracle = await smock.fake<FluxPriceFeed>("FluxPriceFeed");
    const users = await getUsers();

    const PriceAggregator = await (
        await smock.mock<FluxPriceAggregator__factory>("FluxPriceAggregator")
    ).deploy(users.deployer.address, [Oracle.address], defaultOracleDecimals, assetName);

    PriceAggregator.latestAnswer.returns(hre.toBig(price, 8));
    return [PriceAggregator, Oracle] as const;
};

export const setPrice = (oracle: MockContract<FluxPriceAggregator>, price: number) => {
    oracle.latestAnswer.returns(hre.toBig(price, 8));
};

export const getHealthFactor = async (user: SignerWithAddress) => {
    const accountKrAssetValue = hre.fromBig(await hre.Diamond.getAccountKrAssetValue(user.address), 8);
    const accountCollateral = hre.fromBig(await hre.Diamond.getAccountCollateralValue(user.address), 8);

    return accountCollateral / accountKrAssetValue;
};

export const leverageKrAsset = async (
    user: SignerWithAddress,
    krAsset: any,
    collateralToUse: any,
    amount: BigNumber,
) => {
    await collateralToUse.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    await krAsset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);

    const krAssetValue = hre.fromBig((await hre.Diamond.getKrAssetValue(krAsset.address, amount, false)).rawValue, 8);
    const MCR = hre.fromBig(await hre.Diamond.minimumCollateralizationRatio());
    const collateralValueRequired = krAssetValue * MCR;
    const [collateralValue] = await hre.Diamond.getCollateralValueAndOraclePrice(
        collateralToUse.address,
        hre.toBig(1),
        false,
    );

    const price = hre.fromBig(collateralValue.rawValue, 8);
    const collateralAmount = collateralValueRequired / price;

    await collateralToUse.mocks.contract.setVariable("_balances", {
        [user.address]: hre.toBig(collateralAmount),
    });
    if (!(await hre.Diamond.collateralAsset(collateralToUse.address)).exists) {
        await hre.Diamond.connect(hre.users.operator).addCollateralAsset(
            collateralToUse.address,
            collateralToUse.anchor ? collateralToUse.anchor.address : ethers.constants.AddressZero,
            hre.toBig(1),
            collateralToUse.priceFeed.address,
        );
    }
    await hre.Diamond.connect(user).depositCollateral(
        user.address,
        collateralToUse.address,
        hre.toBig(collateralAmount),
    );
    if (!(await hre.Diamond.kreskoAsset(krAsset.address)).exists) {
        await hre.Diamond.connect(hre.users.operator).addKreskoAsset(
            krAsset.address,
            krAsset.anchor.address,
            toBig(1),
            krAsset.priceFeed.address,
            hre.toBig(1_000_000),
            defaultCloseFee,
        );
    }
    await hre.Diamond.connect(user).mintKreskoAsset(user.address, krAsset.address, amount);

    if (!(await hre.Diamond.collateralAsset(krAsset.address)).exists) {
        await hre.Diamond.connect(hre.users.operator).addCollateralAsset(
            krAsset.address,
            krAsset.anchor.address,
            toBig(1),
            krAsset.priceFeed.address,
        );
    }
    await hre.Diamond.connect(user).depositCollateral(user.address, krAsset.address, amount);

    // Deposit krAsset and withdraw other collateral to bare minimum of within healthy range
    const accountMinCollateralRequired = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(user.address, {
        rawValue: hre.toBig(1.5),
    });
    const accountCollateral = await hre.Diamond.getAccountCollateralValue(user.address);

    const amountToWithdraw =
        hre.fromBig(accountCollateral.rawValue.sub(accountMinCollateralRequired.rawValue), 8) / price;

    if (amountToWithdraw > 0) {
        await hre.Diamond.connect(user).withdrawCollateral(
            user.address,
            collateralToUse.address,
            hre.toBig(amountToWithdraw),
            await hre.Diamond.getDepositedCollateralAssetIndex(user.address, collateralToUse.address),
        );

        // "burn" collateral not needed
        await collateralToUse.contract
            .connect(user)
            .transfer(hre.ethers.constants.AddressZero, hre.toBig(amountToWithdraw));
    }
};
