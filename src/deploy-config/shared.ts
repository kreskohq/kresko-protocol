/* ========================================================================== */
/*                         SHARED CONFIGURATION VALUES                        */
/* ========================================================================== */

import { toBig } from "@kreskolabs/lib";
import { envCheck } from "@utils/general";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { SCDPInitializer, MinterInitializer } from "types";
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

export const scdpFacets = ["SCDPStateFacet", "SCDPFacet", "SCDPConfigFacet", "SCDPSwapFacet"] as const;

export const getDeploymentUsers = async (hre: HardhatRuntimeEnvironment) => {
    const users = await hre.getNamedAccounts();
    const Safe = await hre.getContractOrFork("GnosisSafeProxy", "GnosisSafeL2");
    if (!Safe) throw new Error("GnosisSafe not deployed for Minter initialization");

    const multisig = hre.network.live ? users.multisig : Safe.address;
    const treasury = hre.network.live ? users.treasury : Safe.address;
    return { admin: users.admin, multisig, treasury, swapFeeRecipient: users.scdpSwapFeeRecipient };
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
        },
    };
};
export const getSCDPInitializer = async (hre: HardhatRuntimeEnvironment): Promise<SCDPInitializer> => {
    const { swapFeeRecipient } = await getDeploymentUsers(hre);
    return {
        name: "SCDPConfigFacet",
        args: {
            lt: toBig(2),
            mcr: toBig(5),
            swapFeeRecipient: swapFeeRecipient,
        },
    };
};

export default {
    signatureFilters,
    diamondFacets,
    minterFacets,
    anchorTokenPrefix,
};
