import { smock } from "@defi-wonderland/smock";
import { redstoneMap } from "@deploy-config/arbitrumGoerli";
import { anchorTokenPrefix } from "@deploy-config/shared";
import { toBig } from "@kreskolabs/lib";
import { expect } from "chai";
import hre from "hardhat";
import { KreskoAssetAnchor__factory, KreskoAsset__factory, MockAggregatorV3__factory } from "types/typechain";
import { InputArgsSimple, TestKreskoAssetArgs, TestKreskoAssetUpdate, defaultKrAssetArgs } from "../mocks";
import roles from "../roles";
import { KrAssetStruct } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { getMockOraclesFor, setPrice, setMarketOpen } from "./oracle";
import { getCollateralConfig } from "./collaterals";
import { wrapContractWithSigner } from "./general";

export const getDebtIndexAdjustedBalance = async (user: SignerWithAddress, asset: TestKrAsset) => {
    const balance = await asset.contract.balanceOf(user.address);
    return [balance, balance];
};

export const getKrAssetConfig = async (
    asset: { symbol: Function },
    anchor: string,
    kFactor: BigNumber,
    oracle: string,
    supplyLimit: BigNumber,
    closeFee: BigNumber,
    openFee: BigNumber,
): Promise<KrAssetStruct> => {
    const redstone = redstoneMap[(await asset.symbol()) as keyof typeof redstoneMap];
    if (!redstone) {
        throw new Error(`Redstone not found for ${await asset.symbol()}`);
    }

    return {
        anchor,
        kFactor,
        oracle,
        supplyLimit,
        closeFee,
        openFee,
        exists: true,
        redstoneId: redstone,
    };
};

export const addMockKreskoAsset = async (
    args: TestKreskoAssetArgs = defaultKrAssetArgs,
    asCollateral?: boolean,
): Promise<TestKrAsset> => {
    const { deployer } = await hre.ethers.getNamedSigners();
    const { name, symbol, price, marketOpen, factor, supplyLimit, closeFee, openFee } = args;

    // Create an oracle with price supplied
    const [CLFeed, FluxFeed] = await getMockOraclesFor(name, price, marketOpen);

    // create the underlying rebasing krAsset
    const krAsset = await (await smock.mock<KreskoAsset__factory>("KreskoAsset")).deploy();
    await krAsset.setVariable("_initialized", 0);
    krAsset.decimals.returns(18);

    // Initialize the underlying krAsset
    await krAsset.initialize(name, symbol, 18, deployer.address, hre.Diamond.address);

    // Create the fixed krAsset
    const akrAsset = await (await smock.mock<KreskoAssetAnchor__factory>("KreskoAssetAnchor")).deploy(krAsset.address);

    await akrAsset.setVariable("_initialized", 0);
    await akrAsset.initialize(krAsset.address, name, anchorTokenPrefix + symbol, deployer.address);
    akrAsset.decimals.returns(18);

    // Add the asset to the protocol
    const kFactor = toBig(factor);
    await wrapContractWithSigner(hre.Diamond, deployer).addKreskoAsset(
        krAsset.address,
        await getKrAssetConfig(
            krAsset,
            akrAsset.address,
            kFactor,
            CLFeed.address,
            toBig(supplyLimit),
            toBig(closeFee),
            toBig(openFee),
        ),
    );
    if (asCollateral) {
        await hre.Diamond.connect(deployer).addCollateralAsset(
            krAsset.address,
            await getCollateralConfig(krAsset, akrAsset.address, toBig(1), toBig(1.05), CLFeed.address),
        );
    }
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
        clFeed: CLFeed,
        fluxFeed: FluxFeed,
    };
    const asset: TestKrAsset = {
        krAsset: true,
        address: krAsset.address,
        // @ts-ignore
        kresko: async () => await hre.Diamond.kreskoAsset(krAsset.address),
        deployArgs: args,
        contract: KreskoAsset__factory.connect(krAsset.address, deployer),
        priceFeed: MockAggregatorV3__factory.connect(CLFeed.address, deployer),
        mocks,
        anchor: KreskoAssetAnchor__factory.connect(akrAsset.address, deployer),
        setPrice: price => setPrice(mocks, price),
        setBalance: async (user, amount) => {
            const totalSupply = await krAsset.totalSupply();
            await akrAsset.setVariable("_totalSupply", (await akrAsset.totalSupply()).add(amount));
            await akrAsset.setVariable("_balances", {
                [hre.Diamond.address]: (await mocks.contract.balanceOf(hre.Diamond.address)).add(amount),
            });
            await mocks.contract.setVariable("_totalSupply", totalSupply.add(amount));
            await mocks.contract.setVariable("_balances", {
                [user.address]: amount,
            });
        },
        getPrice: async () => (await CLFeed.latestRoundData())[1],
        setMarketOpen: marketOpen => setMarketOpen(FluxFeed, marketOpen),
        getMarketOpen: () => FluxFeed.latestMarketOpen(),
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

export const addMockKreskoAssetWithAMMPair = async (
    args: TestKreskoAssetArgs = defaultKrAssetArgs,
): Promise<TestKrAsset> => {
    const { deployer } = await hre.ethers.getNamedSigners();
    const { name, symbol, price, marketOpen, factor, supplyLimit, closeFee, openFee } = args;

    // Create an oracle with price supplied
    const [CLFeed, FluxFeed] = await getMockOraclesFor(name, price, marketOpen);

    // create the underlying rebasing krAsset
    const krAsset = await (await smock.mock<KreskoAsset__factory>("KreskoAsset")).deploy();
    await krAsset.setVariable("_initialized", 0);
    krAsset.decimals.returns(18);

    // Initialize the underlying krAsset
    await krAsset.initialize(name, symbol, 18, deployer.address, hre.Diamond.address);

    // Create the fixed krAsset
    const akrAsset = await (await smock.mock<KreskoAssetAnchor__factory>("KreskoAssetAnchor")).deploy(krAsset.address);

    await akrAsset.setVariable("_initialized", 0);
    await akrAsset.initialize(krAsset.address, name, anchorTokenPrefix + symbol, deployer.address);
    akrAsset.decimals.returns(18);

    // Add the asset to the protocol

    await wrapContractWithSigner(hre.Diamond, deployer).addKreskoAsset(
        krAsset.address,
        await getKrAssetConfig(
            krAsset,
            akrAsset.address,
            toBig(factor),
            CLFeed.address,
            toBig(supplyLimit),
            toBig(closeFee),
            toBig(openFee),
        ),
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
        clFeed: CLFeed,
        fluxFeed: FluxFeed,
    };
    const asset: TestKrAsset = {
        krAsset: true,
        address: krAsset.address,
        // @ts-ignore
        kresko: async () => await hre.Diamond.kreskoAsset(krAsset.address),
        deployArgs: args,
        contract: KreskoAsset__factory.connect(krAsset.address, deployer),
        priceFeed: MockAggregatorV3__factory.connect(CLFeed.address, deployer),
        mocks,
        anchor: KreskoAssetAnchor__factory.connect(akrAsset.address, deployer),
        setPrice: price => setPrice(mocks, price),
        setBalance: async (user, amount) => {
            const totalSupply = await krAsset.totalSupply();
            await akrAsset.setVariable("_totalSupply", (await akrAsset.totalSupply()).add(amount));
            await akrAsset.setVariable("_balances", {
                [hre.Diamond.address]: (await mocks.contract.balanceOf(hre.Diamond.address)).add(amount),
            });
            await mocks.contract.setVariable("_totalSupply", totalSupply.add(amount));
            await mocks.contract.setVariable("_balances", {
                [user.address]: amount,
            });
        },
        getPrice: async () => (await CLFeed.latestRoundData())[1],
        setMarketOpen: marketOpen => setMarketOpen(FluxFeed, marketOpen),
        getMarketOpen: () => FluxFeed.latestMarketOpen(),
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
    const krAsset = hre.krAssets.find(c => c.address === address)!;
    await wrapContractWithSigner(hre.Diamond, deployer).updateKreskoAsset(
        krAsset.address,
        await getKrAssetConfig(
            krAsset.contract,
            krAsset.mocks.anchor!.address,
            toBig(args.factor),
            args.oracle || krAsset.mocks.clFeed.address,
            toBig(args.supplyLimit, await krAsset.contract.decimals()),
            toBig(args.closeFee),
            toBig(args.openFee),
        ),
    );

    const asset: TestKrAsset = {
        // @ts-ignore
        deployArgs: { ...krAsset.deployArgs, ...args },
        ...krAsset,
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

export const mintKrAsset = async (args: InputArgsSimple) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    await wrapContractWithSigner(hre.Diamond, user).mintKreskoAsset(
        user.address,
        asset.address,
        convert ? toBig(+amount) : amount,
    );
    return;
};

export const burnKrAsset = async (args: InputArgsSimple) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const kIndex = await hre.Diamond.getMintedKreskoAssetsIndex(user.address, asset.address);

    return wrapContractWithSigner(hre.Diamond, user).burnKreskoAsset(
        user.address,
        asset.address,
        convert ? toBig(+amount) : amount,
        kIndex,
    );
};
