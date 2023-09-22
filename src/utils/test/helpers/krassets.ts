import hre from "hardhat";
import { smock } from "@defi-wonderland/smock";
import { anchorTokenPrefix, allRedstoneAssets } from "@deploy-config/shared";
import { toBig } from "@kreskolabs/lib";
import { expect } from "chai";
import { KreskoAssetAnchor__factory, KreskoAsset__factory } from "types/typechain";
import {
    KrAssetStruct,
    OracleConfigurationStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { InputArgsSimple, TestKreskoAssetArgs, TestKreskoAssetUpdate, defaultKrAssetArgs } from "../mocks";
import roles from "../roles";
import { getCollateralConfig } from "./collaterals";
import { wrapContractWithSigner } from "./general";
import { getMockOracles, setPrice } from "./oracle";
import { OracleType } from "../oracles";

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
    const { deployer } = await hre.ethers.getNamedSigners();
    const { name, symbol, price, marketOpen, factor, supplyLimit, closeFee, openFee } = args;
    const kFactor = toBig(factor);
    // Create an oracle with price supplied

    const [[MockFeed, FakeFeed], krAsset, anchorFactory] = await Promise.all([
        getMockOracles(price, marketOpen),
        (await smock.mock<KreskoAsset__factory>("KreskoAsset")).deploy(),
        smock.mock<KreskoAssetAnchor__factory>("KreskoAssetAnchor"),
    ]);

    // create the underlying rebasing krAsset

    await krAsset.setVariable("_initialized", 0);
    krAsset.decimals.returns(18);

    // Initialize the underlying krAsset
    const [, akrAsset] = await Promise.all([
        krAsset.initialize(name, symbol, 18, deployer.address, hre.Diamond.address),
        anchorFactory.deploy(krAsset.address),
    ]);

    // Create the fixed krAsset
    // const akrAsset = await anchorFactory.deploy(krAsset.address);

    await akrAsset.setVariable("_initialized", 0);

    const [krAssetConfig] = await Promise.all([
        getKrAssetConfig(
            krAsset,
            akrAsset.address,
            kFactor,
            toBig(supplyLimit),
            toBig(closeFee),
            toBig(openFee),
            MockFeed.address,
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
            MockFeed.address,
            args.redstoneId,
            args.oracleIds,
        );
        await hre.Diamond.connect(deployer).addCollateralAsset(krAsset.address, ...config);
    }

    const [krAssetHasOperator, akrAssetHasOperator, akrAssetIsOperatorForKrAsset] = await Promise.all([
        krAsset.hasRole(roles.OPERATOR, hre.Diamond.address),
        akrAsset.hasRole(roles.OPERATOR, hre.Diamond.address),
        krAsset.hasRole(roles.OPERATOR, akrAsset.address),
    ]);

    expect(krAssetHasOperator).to.be.true;
    expect(akrAssetHasOperator).to.be.true;
    expect(akrAssetIsOperatorForKrAsset).to.be.true;

    const mocks = {
        contract: krAsset,
        anchor: akrAsset,
        mockFeed: MockFeed,
        fakeFeed: FakeFeed,
    };
    const asset: TestKrAsset = {
        krAsset: true,
        address: krAsset.address,
        // @ts-ignore
        kresko: async () => hre.Diamond.getKreskoAsset(krAsset.address),
        deployArgs: args,
        contract: KreskoAsset__factory.connect(krAsset.address, deployer),
        priceFeed: MockFeed.connect(deployer),
        mocks,
        anchor: KreskoAssetAnchor__factory.connect(akrAsset.address, deployer),
        setPrice: price => setPrice(mocks, price),
        setBalance: async (user, amount) => {
            const [tSupply, atSupply, diamondBal] = await Promise.all([
                krAsset.totalSupply(),
                akrAsset.totalSupply(),
                krAsset.balanceOf(hre.Diamond.address),
            ]);

            await Promise.all([
                akrAsset.setVariables({
                    _totalSupply: atSupply.add(amount),
                    _balances: {
                        [hre.Diamond.address]: diamondBal.add(amount),
                    },
                }),
                krAsset.setVariables({
                    _totalSupply: tSupply.add(amount),
                    _balances: {
                        [user.address]: amount,
                    },
                }),
            ]);
            return true;
        },
        setOracleOrder: order => hre.Diamond.updateKrAssetOracleOrder(krAsset.address, order),
        getPrice: async () => (await MockFeed.latestRoundData())[1],
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
        ...(await getKrAssetConfig(
            krAsset.contract,
            krAsset.mocks.anchor!.address,
            toBig(args.factor),
            toBig(args.supplyLimit, await krAsset.contract.decimals()),
            toBig(args.closeFee),
            toBig(args.openFee),
            args.oracle || krAsset.mocks.mockFeed.address,
            args.redstoneId,
            args.oracleIds,
        )),
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
    const kIndex = await hre.Diamond.getAccountMintIndex(user.address, asset.address);

    return wrapContractWithSigner(hre.Diamond, user).burnKreskoAsset(
        user.address,
        asset.address,
        convert ? toBig(+amount) : amount,
        kIndex,
    );
};
