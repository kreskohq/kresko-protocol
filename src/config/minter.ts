/* ========================================================================== */
/*                         KRESKO MINTER CONFIGURATION                        */
/* ========================================================================== */

import { toFixedPoint } from "@utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MinterInitArgsStruct } from "types/typechain/Kresko";

const facets = [
    "OperatorFacet",
    "SafetyCouncilFacet",
    "UserFacet",
    "LiquidationFacet",
    "AssetViewFacet",
    "GeneralViewFacet",
];

export type MinterInitializer<A> = {
    name: string;
    args: A;
};

const getInitializer = async (hre: HardhatRuntimeEnvironment): Promise<MinterInitializer<MinterInitArgsStruct>> => {
    const { treasury, operator } = await hre.getNamedAccounts();
    const Safe = await hre.deployments.getOrNull("Multisig");
    if (!Safe) throw new Error("GnosisSafe not deployed for Minter initialization");
    return {
        name: "OperatorFacet",
        args: {
            feeRecipient: treasury,
            operator,
            council: Safe.address,
            burnFee: toFixedPoint(process.env.BURN_FEE),
            liquidationIncentiveMultiplier: toFixedPoint(process.env.LIQUIDATION_INCENTIVE),
            minimumCollateralizationRatio: toFixedPoint(process.env.MINIMUM_COLLATERALIZATION_RATIO),
            minimumDebtValue: toFixedPoint(process.env.MINIMUM_DEBT_VALUE, 8),
            secondsUntilStalePrice: toFixedPoint(process.env.SECONDS_UNTIL_STALE_PRICE, 8),
        },
    };
};

const krAssets = {
    test: [
        ["Tesla Inc.", "krTSLA"],
        ["GameStop Corp.", "krGME"],
        ["iShares Gold Trust", "krIAU"],
        ["Invesco QQQ Trust", "krQQQ"],
    ],
};

export default {
    facets,
    getInitializer,
    krAssets,
};
