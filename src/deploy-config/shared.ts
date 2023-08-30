/* ========================================================================== */
/*                         SHARED CONFIGURATION VALUES                        */
/* ========================================================================== */

import { toBig } from "@kreskolabs/lib";
import { envCheck } from "@utils/general";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { CollateraPoolInitializer, MinterInitializer, PositionsInitializer } from "types";
import { MinterInitArgsStruct } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { testnetConfigs } from "./arbitrumGoerli";
import { ethers } from "ethers";

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
    "LiquidationFacet",
    "MintFacet",
    "SafetyCouncilFacet",
    "StateFacet",
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

    const config = testnetConfigs[hre.network.name].protocolParams;

    return {
        name: "ConfigurationFacet",
        args: {
            admin,
            treasury,
            council: multisig,
            minimumCollateralizationRatio: toBig(config.minimumCollateralizationRatio),
            minimumDebtValue: toBig(config.minimumDebtValue, 8),
            liquidationThreshold: toBig(config.liquidationThreshold),
            extOracleDecimals: config.extOracleDecimals,
            oracleDeviationPct: toBig(config.oracleDeviationPct),
            sequencerUptimeFeed: hre.network.live ? config.sequencerUptimeFeed : ethers.constants.AddressZero,
            sequencerGracePeriodTime: config.sequencerGracePeriodTime,
            oracleTimeout: config.oracleTimeout,
            phase: 3,
            kreskian: hre.ethers.constants.AddressZero,
            questForKresk: hre.ethers.constants.AddressZero,
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
        },
    };
};

export const getPositionsInitializer = async (hre: HardhatRuntimeEnvironment): Promise<PositionsInitializer> => {
    const Kresko = await hre.getContractOrFork("Kresko");
    return {
        name: "PositionsConfigFacet",
        args: {
            symbol: "krPOS",
            name: "Kresko Positions",
            kresko: Kresko.address,
            minLeverage: toBig(1),
            maxLeverage: toBig(10),
            closeThreshold: toBig(0.5),
            liquidationThreshold: toBig(-0.5),
        },
    };
};

export default {
    signatureFilters,
    diamondFacets,
    minterFacets,
    anchorTokenPrefix,
};
