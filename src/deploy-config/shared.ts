/* ========================================================================== */
/*                         SHARED CONFIGURATION VALUES                        */
/* ========================================================================== */

import { toBig } from "@kreskolabs/lib";
import { envCheck } from "@utils/general";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { CollateraPoolInitializer, MinterInitializer, PositionsInitializer } from "types";
import { ICollateralPoolConfigFacet } from "types/typechain";
import { MinterInitArgsStruct } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { PositionsInitializerStruct } from "types/typechain/src/contracts/minter/collateral-pool/position/facets/PositionsConfigFacet";
envCheck();
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

export const collateralPoolFacets = [
    "CollateralPoolStateFacet",
    "CollateralPoolFacet",
    "CollateralPoolConfigFacet",
    "CollateralPoolSwapFacet",
] as const;

export const getDeploymentUsers = async (hre: HardhatRuntimeEnvironment) => {
    const users = await hre.getNamedAccounts();
    const Safe = await hre.getContractOrFork("GnosisSafeL2");
    if (!Safe) throw new Error("GnosisSafe not deployed for Minter initialization");

    const multisig = hre.network.live ? users.multisig : Safe.address;
    const treasury = hre.network.live ? users.treasury : Safe.address;
    return { admin: users.admin, multisig, treasury, collateralPoolSwapRecipient: users.collateralPoolSwapRecipient };
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
            minimumCollateralizationRatio: toBig(process.env.MINIMUM_COLLATERALIZATION_RATIO!),
            minimumDebtValue: toBig(process.env.MINIMUM_DEBT_VALUE!, 8),
            liquidationThreshold: toBig(process.env.LIQUIDATION_THRESHOLD!),
            extOracleDecimals: 8,
        },
    };
};
export const getCollateralPoolInitializer = async (
    hre: HardhatRuntimeEnvironment,
): Promise<CollateraPoolInitializer> => {
    const { collateralPoolSwapRecipient } = await getDeploymentUsers(hre);

    return {
        name: "CollateralPoolConfigFacet",
        args: {
            lt: toBig(2),
            mcr: toBig(5),
            swapFeeRecipient: collateralPoolSwapRecipient,
            positions: (await hre.getDeploymentOrFork("Positions"))!.address,
        },
    };
};

export const getPositionsInitializer = async (hre: HardhatRuntimeEnvironment): Promise<PositionsInitializer> => {
    return {
        name: "PositionsConfigFacet",
        args: {
            symbol: "krPOS",
            name: "Kresko Positions",
            kresko: hre.Diamond.address,
            minLeverage: toBig(0.1),
            maxLeverage: toBig(10),
            closeThreshold: toBig(1),
            liquidationThreshold: toBig(0.75),
        },
    };
};

export default {
    signatureFilters,
    diamondFacets,
    minterFacets,
    anchorTokenPrefix,
};
