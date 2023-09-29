import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { formatBytesString } from "@utils/values";
import { defaultRedstoneDataPoints } from "@utils/redstone";
import { ethers } from "ethers";
import { AssetArgs, AssetConfig, OracleType } from "types";
import type {
    AssetStruct,
    FeedConfigurationStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

/* -------------------------------------------------------------------------- */
/*                                  GENERAL                                   */
/* -------------------------------------------------------------------------- */

export const getAssetConfig = async (
    asset: { symbol: Function; decimals: Function },
    config: AssetArgs,
): Promise<AssetConfig> => {
    if (!config.krAssetConfig && !config.collateralConfig && !config.scdpDepositConfig && !config.scdpKrAssetConfig)
        throw new Error("No config provided");
    const redstoneId = defaultRedstoneDataPoints.find(i => i.dataFeedId === config.id);
    if (!redstoneId) throw new Error(`No redstoneId found for ${config.id}`);

    const [decimals, symbol] = await Promise.all([asset.decimals(), asset.symbol()]);

    let assetStruct: AssetStruct = {
        id: formatBytesString(redstoneId.dataFeedId, 12),
        oracles: (config.oracleIds as any) ?? [OracleType.Redstone, OracleType.Chainlink],
        isCollateral: !!config.collateralConfig,
        isSCDPDepositAsset: !!config.scdpDepositConfig,
        isSCDPKrAsset: !!config.scdpKrAssetConfig,
        isKrAsset: !!config.krAssetConfig,
        factor: config.collateralConfig?.cFactor ?? 0,
        liqIncentive: config.collateralConfig?.liqIncentive ?? 0,
        depositLimitSCDP: config.scdpDepositConfig?.depositLimitSCDP ?? 0,
        openFeeSCDP: config.scdpKrAssetConfig?.openFeeSCDP ?? 0,
        closeFeeSCDP: config.scdpKrAssetConfig?.closeFeeSCDP ?? 0,
        liqIncentiveSCDP: config.scdpKrAssetConfig?.liqIncentiveSCDP ?? 0,
        protocolFeeSCDP: config.scdpKrAssetConfig?.protocolFeeSCDP ?? 0,
        kFactor: config.krAssetConfig?.kFactor ?? 0,
        supplyLimit: config.krAssetConfig?.supplyLimit ?? 0,
        closeFee: config.krAssetConfig?.closeFee ?? 0,
        openFee: config.krAssetConfig?.openFee ?? 0,
        anchor: config.krAssetConfig?.anchor ?? ethers.constants.AddressZero,
        liquidityIndexSCDP: 0,
        decimals: decimals,
        isSCDPCollateral: !!config.scdpDepositConfig || !!config.scdpKrAssetConfig,
        isSCDPCoverAsset: false,
    };

    if (assetStruct.isKrAsset) {
        if (assetStruct.anchor == ethers.constants.AddressZero || assetStruct.anchor == null) {
            throw new Error("KrAsset anchor cannot be zero address");
        }
        if (assetStruct.kFactor === 0) {
            throw new Error("KrAsset kFactor cannot be zero");
        }
    }

    if (assetStruct.isCollateral) {
        if (assetStruct.factor === 0) {
            throw new Error("Colalteral factor cannot be zero");
        }
        if (assetStruct.liqIncentive === 0) {
            throw new Error("Collateral liquidation incentive cannot be zero");
        }
    }

    if (assetStruct.isSCDPKrAsset) {
        if (assetStruct.liqIncentiveSCDP === 0) {
            throw new Error("KrAsset liquidation incentive cannot be zero");
        }
    }

    if (!config.feed) {
        throw new Error("No feed provided");
    }

    const feedConfig: FeedConfigurationStruct = {
        oracleIds: assetStruct.oracles,
        feeds:
            assetStruct.oracles[0] === OracleType.Redstone
                ? [ethers.constants.AddressZero, config.feed]
                : [config.feed, ethers.constants.AddressZero],
    };
    return { args: config, assetStruct, feedConfig, extendedInfo: { decimals, symbol } };
};

export const wrapContractWithSigner = <T>(contract: T, signer: Signer) =>
    // @ts-expect-error
    WrapperBuilder.wrap(contract.connect(signer)).usingSimpleNumericMock({
        mockSignersCount: 1,
        timestampMilliseconds: Date.now(),
        dataPoints: defaultRedstoneDataPoints,
    }) as T;

export const getHealthFactor = async (user: SignerWithAddress) => {
    const accountKrAssetValue = (await hre.Diamond.getAccountDebtValue(user.address)).toJS(8);
    const accountCollateral = (await hre.Diamond.getAccountCollateralValue(user.address)).toJS(8);

    return accountCollateral / accountKrAssetValue;
};
