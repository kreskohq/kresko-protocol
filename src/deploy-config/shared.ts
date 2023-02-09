/* ========================================================================== */
/*                         SHARED CONFIGURATION VALUES                        */
/* ========================================================================== */

import { toFixedPoint } from "@kreskolabs/lib";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { MinterInitArgsStruct } from "types/Kresko";
import type { MinterInitializer } from "types";

// These function namings are ignored when generating ABI for the diamond
const signatureFilters = ["init", "initializer"];

export const diamondFacets = [
    "DiamondCutFacet",
    "DiamondLoupeFacet",
    "DiamondOwnershipFacet",
    "AuthorizationFacet",
    "ERC165Facet",
];
export const anchorTokenPrefix = "a";

export const minterFacets = [
    "AccountStateFacet",
    "BurnFacet",
    "BurnHelperFacet",
    "ConfigurationFacet",
    "DepositWithdrawFacet",
    "InterestLiquidationFacet",
    "LiquidationFacet",
    "MintFacet",
    "SafetyCouncilFacet",
    "StateFacet",
    "StabilityRateFacet",
    "UIDataProviderFacet",
    "UIDataProviderFacet2",
];

export const getMinterInitializer = async (
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
            extOracleDecimals: 8,
        },
    };
};

export default {
    signatureFilters,
    diamondFacets,
    minterFacets,
    anchorTokenPrefix,
};
