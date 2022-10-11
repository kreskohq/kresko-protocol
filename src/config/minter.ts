/* ========================================================================== */
/*                         KRESKO MINTER CONFIGURATION                        */
/* ========================================================================== */

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { toFixedPoint } from "@utils/fixed-point";
import { MinterInitArgsStruct } from "types/typechain/src/contracts/minter/interfaces/IConfiguration";

const facets = [
    "ConfigurationFacet",
    "SafetyCouncilFacet",
    "AccountStateFacet",
    "LiquidationFacet",
    "ActionFacet",
    "StateFacet",
    "UIDataProviderFacet",
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
        name: "ConfigurationFacet",
        args: {
            feeRecipient: treasury,
            operator,
            council: Safe.address,
            liquidationIncentiveMultiplier: toFixedPoint(process.env.LIQUIDATION_INCENTIVE),
            minimumCollateralizationRatio: toFixedPoint(process.env.MINIMUM_COLLATERALIZATION_RATIO),
            minimumDebtValue: toFixedPoint(process.env.MINIMUM_DEBT_VALUE, 8),
            liquidationThreshold: toFixedPoint(process.env.LIQUIDATION_THRESHOLD),
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

export const wrapperPrefix = "a";

const krAssets = {
    test: [
        ["Tesla Inc.", "krTSLA", wrapperPrefix + "krTSLA"],
        ["GameStop Corp.", "krGME", wrapperPrefix + "krGME"],
        ["iShares Gold Trust", "krIAU", wrapperPrefix + "krIAU"],
        ["Invesco QQQ Trust", "krQQQ", wrapperPrefix + "krQQQ"],
    ],
};

export default {
    facets,
    getMinterInitializer,
    krAssets,
    collaterals,
    wrapperPrefix,
};
