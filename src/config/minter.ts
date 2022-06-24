/* ========================================================================== */
/*                         KRESKO MINTER CONFIGURATION                        */
/* ========================================================================== */

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MinterInitArgsStruct } from "types/typechain/Kresko";
import { toFixedPoint } from "@utils/fixed-point";

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

const getMinterInitializer = async (
    hre: HardhatRuntimeEnvironment,
): Promise<MinterInitializer<MinterInitArgsStruct>> => {
    const { treasury, operator } = hre.addr;
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

const collaterals = {
    test: [
        ["USDC", "USDC"],
        ["Wrapped ETH", "WETH"],
        ["Aurora", "Aurora"],
        ["Wrapped NEAR", "WNEAR"],
    ],
};

const underlyingPrefix = "e-";

const krAssets = {
    test: [
        ["Tesla Inc.", "krTSLA", underlyingPrefix + "krTSLA"],
        ["GameStop Corp.", "krGME", underlyingPrefix + "krGME"],
        ["iShares Gold Trust", "krIAU", underlyingPrefix + "krIAU"],
        ["Invesco QQQ Trust", "krQQQ", underlyingPrefix + "krQQQ"],
    ],
};

export default {
    facets,
    getMinterInitializer,
    krAssets,
    collaterals,
    underlyingPrefix,
};
