import { fromBig, toBig } from "@kreskolabs/lib";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { BigNumber } from "ethers";
import hre, { ethers } from "hardhat";
import { defaultCloseFee } from "../mocks";
import { getCollateralConfig } from "./collaterals";
import { getKrAssetConfig } from "./krassets";

/* -------------------------------------------------------------------------- */
/*                                  GENERAL                                   */
/* -------------------------------------------------------------------------- */

export const wrapContractWithSigner = (contract: any, signer: Signer) =>
    WrapperBuilder.wrap(contract.connect(signer)).usingSimpleNumericMock({
        mockSignersCount: 1,
        timestampMilliseconds: Date.now(),
        dataPoints: [
            { dataFeedId: "DAI", value: 0 },
            { dataFeedId: "USDC", value: 0 },
            { dataFeedId: "TSLA", value: 0 },
            { dataFeedId: "ETH", value: 0 },
            { dataFeedId: "BTC", value: 0 },
        ],
    });

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
        await wrapContractWithSigner(hre.Diamond, hre.users.deployer).addCollateralAsset(
            collateralToUse.address,
            await getCollateralConfig(
                collateralToUse.contract,
                collateralToUse.anchor ? collateralToUse.anchor.address : ethers.constants.AddressZero,
                toBig(1),
                toBig(process.env.LIQUIDATION_INCENTIVE!),
                collateralToUse.priceFeed.address,
            ),
        );
    }
    await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
        user.address,
        collateralToUse.address,
        toBig(collateralAmount),
    );
    if (!(await hre.Diamond.kreskoAsset(krAsset.address)).exists) {
        await wrapContractWithSigner(hre.Diamond, hre.users.deployer).addKreskoAsset(
            krAsset.address,
            await getKrAssetConfig(
                krAsset.contract,
                krAsset.anchor.address,
                toBig(1),
                krAsset.priceFeed.address,
                toBig(1_000_000),
                toBig(defaultCloseFee),
                BigNumber.from(0),
            ),
        );
    }
    await wrapContractWithSigner(hre.Diamond, user).mintKreskoAsset(user.address, krAsset.address, amount);

    if (!(await hre.Diamond.collateralAsset(krAsset.address)).exists) {
        await wrapContractWithSigner(hre.Diamond, hre.users.deployer).addCollateralAsset(
            krAsset.address,
            await getCollateralConfig(
                krAsset.contract,
                krAsset.anchor.address,
                toBig(1),
                toBig(process.env.LIQUIDATION_INCENTIVE!),
                krAsset.priceFeed.address,
            ),
        );
    }
    await wrapContractWithSigner(hre.Diamond, user).depositCollateral(user.address, krAsset.address, amount);

    // Deposit krAsset and withdraw other collateral to bare minimum of within healthy range
    const accountMinCollateralRequired = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
        user.address,
        hre.Diamond.minimumCollateralizationRatio(),
    );
    const accountCollateral = await hre.Diamond.getAccountCollateralValue(user.address);

    const withdrawAmount = fromBig(accountCollateral.sub(accountMinCollateralRequired), 8) / price - 0.1;
    const amountToWithdraw = toBig(withdrawAmount);

    if (amountToWithdraw.gt(0)) {
        await wrapContractWithSigner(hre.Diamond, user).withdrawCollateral(
            user.address,
            collateralToUse.address,
            amountToWithdraw,
            await hre.Diamond.getDepositedCollateralAssetIndex(user.address, collateralToUse.address),
        );

        // "burn" collateral not needed
        await collateralToUse.contract.connect(user).transfer(hre.ethers.constants.AddressZero, amountToWithdraw);
    }
};
