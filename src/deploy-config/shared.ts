/* ========================================================================== */
/*                         SHARED CONFIGURATION VALUES                        */
/* ========================================================================== */

import { toFixedPoint } from "@kreskolabs/lib";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { MinterInitializer } from "types";
import { MinterInitArgsStruct } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

// These function namings are ignored when generating ABI for the diamond
const signatureFilters = ["init", "initializer"];

export const diamondFacets = [
    "DiamondCutFacet",
    "DiamondLoupeFacet",
    "DiamondOwnershipFacet",
    "AuthorizationFacet",
    "ERC165Facet",
] as const;

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
] as const;

export const getDeploymentUsers = async (hre: HardhatRuntimeEnvironment) => {
    const users = await hre.getNamedAccounts();
    const Safe = await hre.getContractOrFork("GnosisSafeL2");
    if (!Safe) throw new Error("GnosisSafe not deployed for Minter initialization");

    const multisig = hre.network.live ? users.multisig : Safe.address;
    const treasury = hre.network.live ? users.treasury : Safe.address;
    return { admin: users.admin, multisig, treasury };
};
export const getMinterInitializer = async (
    hre: HardhatRuntimeEnvironment,
): Promise<MinterInitializer<MinterInitArgsStruct>> => {
    const { treasury, admin, multisig } = await getDeploymentUsers(hre);

    return {
        name: "ConfigurationFacet",
        args: {
            admin,
            treasury,
            council: multisig,
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
