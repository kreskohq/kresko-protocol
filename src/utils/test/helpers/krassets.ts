import { smock } from "@defi-wonderland/smock";
import { allRedstoneAssets, anchorTokenPrefix } from "@deploy-config/shared";
import { toBig } from "@kreskolabs/lib";
import { wrapKresko } from "@utils/redstone";
import optimized from "./optimizations";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { KreskoAssetAnchor__factory, KreskoAsset__factory } from "types/typechain";
import {
    KrAssetStruct,
    OracleConfigurationStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { InputArgsSimple, TestKreskoAssetArgs, TestKreskoAssetUpdate, defaultKrAssetArgs } from "../mocks";
import { OracleType } from "../oracles";
import roles from "../roles";
import { getCollateralConfig } from "./collaterals";
import { wrapContractWithSigner } from "./general";
import { getFakeOracle, setPrice } from "./oracle";
import { getBalanceKrAssetFunc, setBalanceKrAssetFunc } from "./smock";

export const getDebtIndexAdjustedBalance = async (user: SignerWithAddress, asset: TestKrAsset) => {
    const balance = await asset.contract.balanceOf(user.address);
    return [balance, balance];
};

export const getKrAssetConfig = async (
    asset: { symbol: Function; redstoneId?: string },
    anchor: string,
    kFactor: BigNumber,
    supplyLimit: BigNumber,
    closeFee: BigNumber,
    openFee: BigNumber,
    oracle: string,
    customRedstoneId?: string,
    oracleIds: [OracleType, OracleType] = [OracleType.Redstone, OracleType.Chainlink],
): Promise<[OracleConfigurationStruct, KrAssetStruct]> => {
    const redstoneId = customRedstoneId
        ? hre.ethers.utils.formatBytes32String(customRedstoneId)
        : allRedstoneAssets[(await asset.symbol()) as keyof typeof allRedstoneAssets];
    if (!redstoneId) {
        throw new Error(`redstoneId not found for ${await asset.symbol()}`);
    }

    const oracleConfig: OracleConfigurationStruct = {
        oracleIds: oracleIds,
        feeds:
            oracleIds[0] === OracleType.Redstone
                ? [hre.ethers.constants.AddressZero, oracle]
                : [oracle, hre.ethers.constants.AddressZero],
    };
    const assetConfig: KrAssetStruct = {
        anchor,
        kFactor,
        oracles: oracleIds,
        supplyLimit,
        closeFee,
        openFee,
        exists: true,
        id: redstoneId,
    };
    return [oracleConfig, assetConfig];
};

export const addMockKreskoAsset = async (
    args: TestKreskoAssetArgs = defaultKrAssetArgs,
    asCollateral?: boolean,
): Promise<TestKrAsset> => {
    const deployer = hre.users.deployer;
    const { name, symbol, price, marketOpen, factor, supplyLimit, closeFee, openFee } = args;

    const [krAsset, fakeFeed, anchorFactory] = await Promise.all([
        await (await smock.mock<KreskoAsset__factory>("KreskoAsset")).deploy(),
        getFakeOracle(price, marketOpen),
        smock.mock<KreskoAssetAnchor__factory>("KreskoAssetAnchor"),
    ]);

    // create the underlying rebasing krAsset

    await krAsset.setVariable("_initialized", 0);
    krAsset.decimals.returns(18);

    // Initialize the underlying krAsset
    const [akrAsset] = await Promise.all([
        anchorFactory.deploy(krAsset.address),
        krAsset.initialize(name, symbol, 18, deployer.address, hre.Diamond.address),
    ]);

    await akrAsset.setVariable("_initialized", 0);

    const [krAssetConfig] = await Promise.all([
        getKrAssetConfig(
            krAsset,
            akrAsset.address,
            toBig(factor),
            toBig(supplyLimit),
            toBig(closeFee),
            toBig(openFee),
            fakeFeed.address,
            args.redstoneId,
            args.oracleIds,
        ),
        akrAsset.initialize(krAsset.address, name, anchorTokenPrefix + symbol, deployer.address),
    ]);

    akrAsset.decimals.returns(18);

    // Add the asset to the protocol
    await Promise.all([
        hre.Diamond.connect(deployer).addKreskoAsset(krAsset.address, ...krAssetConfig),
        krAsset.grantRole(roles.OPERATOR, akrAsset.address),
    ]);
    if (asCollateral) {
        const config = await getCollateralConfig(
            krAsset,
            akrAsset.address,
            toBig(1),
            toBig(1.05),
            fakeFeed.address,
            args.redstoneId,
            args.oracleIds,
        );
        await hre.Diamond.connect(deployer).addCollateralAsset(krAsset.address, ...config);
    }

    // const [krAssetHasOperator, akrAssetHasOperator, akrAssetIsOperatorForKrAsset] = await Promise.all([
    //     krAsset.hasRole(roles.OPERATOR, hre.Diamond.address),
    //     akrAsset.hasRole(roles.OPERATOR, hre.Diamond.address),
    //     krAsset.hasRole(roles.OPERATOR, akrAsset.address),
    // ]);

    const asset: TestKrAsset = {
        krAsset: true,
        address: krAsset.address,
        kresko: () => hre.Diamond.getKreskoAsset(krAsset.address),
        deployArgs: args,
        contract: krAsset,
        priceFeed: fakeFeed,
        anchor: akrAsset,
        setPrice: price => setPrice(fakeFeed, price),
        setBalance: setBalanceKrAssetFunc(krAsset, akrAsset),
        balanceOf: getBalanceKrAssetFunc(krAsset),
        setOracleOrder: order => hre.Diamond.updateKrAssetOracleOrder(krAsset.address, order),
        getPrice: async () => (await fakeFeed.latestRoundData())[1],
        update: update => updateKrAsset(krAsset.address, update),
    };

    const found = hre.krAssets.findIndex(c => c.address === asset.address);
    if (found === -1) {
        hre.krAssets.push(asset);
        hre.allAssets.push(asset);
    } else {
        hre.krAssets = hre.krAssets.map(c => (c.address === asset.address ? asset : c));
        hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
    }
    return asset;
};

export const updateKrAsset = async (address: string, args: TestKreskoAssetUpdate) => {
    const { deployer } = await hre.ethers.getNamedSigners();
    const krAsset = hre.krAssets.find(c => c.address === address);
    if (!krAsset) throw new Error(`KrAsset ${address} not found`);
    await wrapContractWithSigner(hre.Diamond, deployer).updateKreskoAsset(
        krAsset.address,
        ...(await getKrAssetConfig(
            krAsset.contract,
            krAsset.anchor.address,
            toBig(args.factor),
            toBig(args.supplyLimit),
            toBig(args.closeFee),
            toBig(args.openFee),
            args.oracle || krAsset.priceFeed.address,
            args.redstoneId,
            args.oracleIds,
        )),
    );

    krAsset.deployArgs = { ...krAsset.deployArgs, ...args };
    const found = hre.krAssets.findIndex(c => c.address === krAsset.address);
    if (found === -1) {
        hre.krAssets.push(krAsset);
        hre.allAssets.push(krAsset);
    } else {
        hre.krAssets = hre.krAssets.map(c => (c.address === krAsset.address ? krAsset : c));
        hre.allAssets = hre.allAssets.map(c => (c.address === krAsset.address && c.collateral ? krAsset : c));
    }
    return krAsset;
};

export const mintKrAsset = async (args: InputArgsSimple) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    return wrapKresko(hre.Diamond, user).mintKreskoAsset(
        user.address,
        asset.address,
        convert ? toBig(+amount) : amount,
    );
};

export const burnKrAsset = async (args: InputArgsSimple) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;

    return wrapKresko(hre.Diamond, user).burnKreskoAsset(
        user.address,
        asset.address,
        convert ? toBig(+amount) : amount,
        optimized.getAccountMintIndex(user.address, asset.address),
    );
};
