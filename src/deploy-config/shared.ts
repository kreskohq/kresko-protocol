/* ========================================================================== */
/*                         SHARED CONFIGURATION VALUES                        */
/* ========================================================================== */

import { toBig } from "@kreskolabs/lib";
import { envCheck } from "@utils/general";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { SCDPInitializer, MinterInitializer, CommonInitializer } from "types";
import { redstoneMap, testnetConfigs } from "./arbitrumGoerli";
import { ethers } from "ethers";

envCheck();

export const defaultRedstoneDataPoints = [
    { dataFeedId: "DAI", value: 0 },
    { dataFeedId: "USDC", value: 0 },
    { dataFeedId: "ETH", value: 0 },
    { dataFeedId: "BTC", value: 0 },
    { dataFeedId: "KISS", value: 0 },
    { dataFeedId: "TSLA", value: 0 },
    { dataFeedId: "MockCollateral8Dec", value: 0 },
    { dataFeedId: "MockCollateral", value: 0 },
    { dataFeedId: "MockCollateral2", value: 0 },
    { dataFeedId: "MockCollateralSCDP1", value: 0 },
    { dataFeedId: "MockCollateralSCDP2", value: 0 },
    { dataFeedId: "MockKreskoAsset", value: 0 },
    { dataFeedId: "MockKreskoAssetSCDP1", value: 0 },
    { dataFeedId: "MockKreskoAssetSCDP2", value: 0 },
    { dataFeedId: "MockKreskoAsset2", value: 0 },
];

export const allRedstoneAssets = {
    Collateral: ethers.utils.formatBytes32String("USDC"),
    KreskoAsset: ethers.utils.formatBytes32String("USDC"),
    KreskoAsset1: ethers.utils.formatBytes32String("USDC"),
    KreskoAsset2: ethers.utils.formatBytes32String("USDC"),
    KreskoAssetPrice10USD: ethers.utils.formatBytes32String("USDC"),
    CollateralAsset: ethers.utils.formatBytes32String("USDC"),
    Collateral18Dec: ethers.utils.formatBytes32String("USDC"),
    Collateral8Dec: ethers.utils.formatBytes32String("USDC"),
    Collateral21Dec: ethers.utils.formatBytes32String("USDC"),
    CollateralAsset8Dec: ethers.utils.formatBytes32String("USDC"),
    KreskoAssetLiquidation: ethers.utils.formatBytes32String("USDC"),
    SecondKreskoAsset: ethers.utils.formatBytes32String("USDC"),
    krasset2: ethers.utils.formatBytes32String("USDC"),
    krasset3: ethers.utils.formatBytes32String("USDC"),
    krasset4: ethers.utils.formatBytes32String("USDC"),
    quick: ethers.utils.formatBytes32String("USDC"),
    KreskoAssetPrice100USD: ethers.utils.formatBytes32String("USDC"),
    MockCollateral: ethers.utils.formatBytes32String("MockCollateral"),
    MockKreskoAsset: ethers.utils.formatBytes32String("MockKreskoAsset"),
    ...redstoneMap,
};

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

export const commonFacets = ["CommonConfigurationFacet", "CommonStateFacet", "AssetConfigurationFacet"] as const;

export const minterFacets = [
    "AccountStateFacet",
    "BurnFacet",
    "ConfigurationFacet",
    "DepositWithdrawFacet",
    "LiquidationFacet",
    "MintFacet",
    "SafetyCouncilFacet",
    "StateFacet",
] as const;

export const peripheryFacets = ["UIDataProviderFacet", "UIDataProviderFacet2", "BurnHelperFacet"];

export const scdpFacets = ["SCDPStateFacet", "SCDPFacet", "SCDPConfigFacet", "SCDPSwapFacet", "SDIFacet"] as const;

export const oracleFacets = ["OracleConfigFacet", "OracleViewFacet"] as const;

export const getDeploymentUsers = async (hre: HardhatRuntimeEnvironment) => {
    const users = await hre.getNamedAccounts();
    const Safe = await hre.deployments.getOrNull("GnosisSafeL2");
    if (!Safe) throw new Error("GnosisSafe not deployed for Minter initialization");

    const multisig = hre.network.live ? users.multisig : Safe.address;
    const treasury = hre.network.live ? users.treasury : Safe.address;
    return { admin: users.admin, multisig, treasury, swapFeeRecipient: users.scdpSwapFeeRecipient };
};

export const getMinterInitializer = async (hre: HardhatRuntimeEnvironment): Promise<MinterInitializer> => {
    const config = testnetConfigs[hre.network.name].protocolParams;

    return {
        name: "ConfigurationFacet",
        args: {
            minCollateralRatio: toBig(config.minCollateralRatio),
            liquidationThreshold: toBig(config.liquidationThreshold),
        },
    };
};
export const getInitializer = async (hre: HardhatRuntimeEnvironment): Promise<CommonInitializer> => {
    const { treasury, admin, multisig } = await getDeploymentUsers(hre);

    const config = testnetConfigs[hre.network.name].protocolParams;

    return {
        name: "CommonConfigurationFacet",
        args: {
            admin,
            treasury,
            council: multisig,
            minDebtValue: toBig(config.minDebtValue, 8),
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
