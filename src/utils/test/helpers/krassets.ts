import { smock } from "@defi-wonderland/smock";
import { anchorTokenPrefix } from "@deploy-config/shared";
import { toFixedPoint, toBig } from "@kreskolabs/lib";
import { getUsers } from "@utils/general";
import { expect } from "chai";
import hre from "hardhat";
import {
    KreskoAsset__factory,
    KreskoAssetAnchor__factory,
    FluxPriceAggregator__factory,
    FluxPriceFeed__factory,
} from "types";
import { TestKreskoAssetArgs, defaultKrAssetArgs, TestKreskoAssetUpdate, InputArgs } from "../mocks";
import roles from "../roles";
import { getMockOracleFor, setPrice, setMarketOpen } from "./general";

export const addMockKreskoAsset = async (args: TestKreskoAssetArgs = defaultKrAssetArgs): Promise<KrAsset> => {
    const users = await getUsers();
    const { name, symbol, price, marketOpen, factor, supplyLimit, closeFee, openFee } = args;

    // Create an oracle with price supplied
    const [OracleAggregator, Oracle] = await getMockOracleFor(name, price, marketOpen);

    // create the underlying rebasing krAsset
    const krAsset = await (await smock.mock<KreskoAsset__factory>("KreskoAsset")).deploy();
    await krAsset.setVariable("_initialized", 0);
    krAsset.decimals.returns(18);

    // Initialize the underlying krAsset
    await krAsset.initialize(name, symbol, 18, users.deployer.address, hre.Diamond.address);

    // Create the fixed krAsset
    const akrAsset = await (await smock.mock<KreskoAssetAnchor__factory>("KreskoAssetAnchor")).deploy(krAsset.address);

    await akrAsset.setVariable("_initialized", 0);
    await akrAsset.initialize(krAsset.address, name, anchorTokenPrefix + symbol, users.deployer.address);
    akrAsset.decimals.returns(18);

    // Add the asset to the protocol
    const kFactor = toFixedPoint(factor);
    await hre.Diamond.connect(users.operator).addKreskoAsset(
        krAsset.address,
        akrAsset.address,
        kFactor,
        OracleAggregator.address,
        toBig(supplyLimit, await krAsset.decimals()),
        toFixedPoint(closeFee),
        toFixedPoint(openFee),
    );
    await krAsset.grantRole(roles.OPERATOR, akrAsset.address);

    const krAssetHasOperator = await krAsset.hasRole(roles.OPERATOR, hre.Diamond.address);
    const akrAssetHasOperator = await akrAsset.hasRole(roles.OPERATOR, hre.Diamond.address);
    const akrAssetIsOperatorForKrAsset = await krAsset.hasRole(roles.OPERATOR, akrAsset.address);

    expect(krAssetHasOperator).to.be.true;
    expect(akrAssetHasOperator).to.be.true;
    expect(akrAssetIsOperatorForKrAsset).to.be.true;

    const mocks = {
        contract: krAsset,
        anchor: akrAsset,
        priceAggregator: OracleAggregator,
        priceFeed: Oracle,
    };
    const asset: KrAsset = {
        krAsset: true,
        address: krAsset.address,
        // @ts-ignore
        kresko: async () => await hre.Diamond.kreskoAsset(krAsset.address),
        deployArgs: args,
        contract: KreskoAsset__factory.connect(krAsset.address, users.deployer),
        priceAggregator: FluxPriceAggregator__factory.connect(OracleAggregator.address, users.deployer),
        priceFeed: FluxPriceFeed__factory.connect(Oracle.address, users.deployer),
        mocks,
        anchor: KreskoAssetAnchor__factory.connect(akrAsset.address, users.deployer),
        setPrice: price => setPrice(OracleAggregator, price),
        getPrice: () => OracleAggregator.latestAnswer(),
        setMarketOpen: marketOpen => setMarketOpen(OracleAggregator, marketOpen),
        getMarketOpen: () => OracleAggregator.latestMarketOpen(),
        update: update => updateKrAsset(krAsset.address, update),
    };

    const found = hre.krAssets.findIndex(c => c.address === asset.address);
    if (found === -1) {
        hre.krAssets.push(asset);
        hre.allAssets.push(asset);
    } else {
        hre.krAssets = hre.krAssets.map(c => (c.address === c.address ? asset : c));
        hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
    }
    return asset;
};

export const updateKrAsset = async (address: string, args: TestKreskoAssetUpdate) => {
    const users = await getUsers();
    const krAsset = hre.krAssets.find(c => c.address === address);
    await hre.Diamond.connect(users.operator).updateKreskoAsset(
        krAsset.address,
        krAsset.mocks.anchor.address,
        toFixedPoint(args.factor),
        args.oracle || krAsset.priceAggregator.address,
        hre.toBig(args.supplyLimit, await krAsset.contract.decimals()),
        toFixedPoint(args.closeFee),
        toFixedPoint(args.openFee),
    );

    const asset: KrAsset = {
        deployArgs: { ...krAsset.deployArgs, ...args },
        ...krAsset,
    };
    const found = hre.krAssets.findIndex(c => c.address === asset.address);
    if (found === -1) {
        hre.krAssets.push(asset);
        hre.allAssets.push(asset);
    } else {
        hre.krAssets = hre.krAssets.map(c => (c.address === c.address ? asset : c));
        hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
    }
    return asset;
};

export const mintKrAsset = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    return hre.Diamond.connect(user).mintKreskoAsset(user.address, asset.address, convert ? toBig(+amount) : amount);
};

export const burnKrAsset = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const kIndex = await hre.Diamond.getMintedKreskoAssetsIndex(user.address, asset.address);

    return hre.Diamond.connect(user).burnKreskoAsset(
        user.address,
        asset.address,
        convert ? toBig(+amount) : amount,
        kIndex,
    );
};
