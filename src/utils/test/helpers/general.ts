import { fromBig, toBig } from "@kreskolabs/lib";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { BigNumber } from "ethers";
import hre, { ethers } from "hardhat";
import optimized from "./optimizations";
import { defaultCloseFee } from "../mocks";
import { getCollateralConfig } from "./collaterals";
import { getKrAssetConfig } from "./krassets";
import { defaultRedstoneDataPoints } from "@deploy-config/shared";
import { wrapKresko } from "@utils/redstone";

/* -------------------------------------------------------------------------- */
/*                                  GENERAL                                   */
/* -------------------------------------------------------------------------- */

export const wrapContractWithSigner = <T>(contract: T, signer: Signer) =>
    // @ts-expect-error
    WrapperBuilder.wrap(contract.connect(signer)).usingSimpleNumericMock({
        mockSignersCount: 1,
        timestampMilliseconds: Date.now(),
        dataPoints: defaultRedstoneDataPoints,
    }) as T;

export const getHealthFactor = async (user: SignerWithAddress) => {
    const accountKrAssetValue = fromBig(await hre.Diamond.getAccountDebtValue(user.address), 8);
    const accountCollateral = fromBig(await hre.Diamond.getAccountCollateralValue(user.address), 8);

    return accountCollateral / accountKrAssetValue;
};

export const leverageKrAsset = async (
    user: SignerWithAddress,
    krAsset: TestKrAsset,
    collateralToUse: TestCollateral,
    amount: BigNumber,
) => {
    const [krAssetValueBig, mcrBig, [collateralValue], collateralToUseInfo, krAssetInfo, krAssetCollateralInfo] =
        await Promise.all([
            hre.Diamond.getDebtAmountToValue(krAsset.address, amount, false),
            optimized.getMinCollateralRatio(),
            hre.Diamond.getCollateralAmountToValue(collateralToUse.address, toBig(1), false),
            hre.Diamond.getCollateralAsset(collateralToUse.address),
            hre.Diamond.getKreskoAsset(krAsset.address),
            hre.Diamond.getCollateralAsset(krAsset.address),
        ]);

    await krAsset.contract.setVariable("_allowances", {
        [user.address]: {
            [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
        },
    });
    const krAssetValue = fromBig(krAssetValueBig, 8);
    const MCR = fromBig(mcrBig);
    const collateralValueRequired = krAssetValue * MCR;

    const price = fromBig(collateralValue, 8);
    const collateralAmount = collateralValueRequired / price;

    await collateralToUse.setBalance(user, toBig(collateralAmount), hre.Diamond.address);

    let addPromises: Promise<any>[] = [];
    if (!collateralToUseInfo.exists) {
        addPromises.push(
            hre.Diamond.addCollateralAsset(
                collateralToUse.address,
                ...(await getCollateralConfig(
                    collateralToUse.contract,
                    // @ts-expect-error
                    collateralToUse.anchor ? collateralToUse.anchor.address : ethers.constants.AddressZero,
                    toBig(1),
                    toBig(process.env.LIQUIDATION_INCENTIVE!),
                    collateralToUse.priceFeed.address,
                    "MockCollateral8",
                )),
            ),
        );
    }
    if (!krAssetInfo.exists) {
        addPromises.push(
            hre.Diamond.addKreskoAsset(
                krAsset.address,
                ...(await getKrAssetConfig(
                    krAsset.contract,
                    krAsset.anchor.address,
                    toBig(1),
                    toBig(1_000_000),
                    toBig(defaultCloseFee),
                    BigNumber.from(0),
                    krAsset.priceFeed.address,
                )),
            ),
        );
    }
    if (!krAssetCollateralInfo.exists) {
        addPromises.push(
            hre.Diamond.addCollateralAsset(
                krAsset.address,
                ...(await getCollateralConfig(
                    krAsset.contract,
                    krAsset.anchor.address,
                    toBig(1),
                    toBig(process.env.LIQUIDATION_INCENTIVE!),
                    krAsset.priceFeed.address,
                )),
            ),
        );
    }
    await Promise.all(addPromises);
    const UserKresko = wrapKresko(hre.Diamond, user);
    await UserKresko.depositCollateral(user.address, collateralToUse.address, toBig(collateralAmount));
    await Promise.all([
        UserKresko.mintKreskoAsset(user.address, krAsset.address, amount),
        UserKresko.depositCollateral(user.address, krAsset.address, amount),
    ]);

    // Deposit krAsset and withdraw other collateral to bare minimum of within healthy range
    const accountMinCollateralRequired = await hre.Diamond.getAccountMinCollateralAtRatio(
        user.address,
        optimized.getMinCollateralRatio(),
    );
    const accountCollateral = await hre.Diamond.getAccountCollateralValue(user.address);

    const withdrawAmount = fromBig(accountCollateral.sub(accountMinCollateralRequired), 8) / price - 0.1;
    const amountToWithdraw = toBig(withdrawAmount);

    if (amountToWithdraw.gt(0)) {
        await UserKresko.withdrawCollateral(
            user.address,
            collateralToUse.address,
            amountToWithdraw,
            optimized.getAccountDepositIndex(user.address, collateralToUse.address),
        );

        // "burn" collateral not needed
        collateralToUse.setBalance(user, toBig(0));
        // await collateralToUse.contract.connect(user).transfer(hre.ethers.constants.AddressZero, amountToWithdraw);
    }
};
