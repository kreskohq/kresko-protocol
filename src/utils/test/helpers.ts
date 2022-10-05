import { MockContract, smock } from "@defi-wonderland/smock";
import { toFixedPoint } from "@utils/fixed-point";
import { toBig } from "@utils/numbers";
import { expect } from "chai";
import hre from "hardhat";

import {
    ERC20Upgradeable,
    ERC20Upgradeable__factory,
    FluxPriceAggregator__factory,
    FluxPriceFeed__factory,
    KreskoAsset,
    KreskoAsset__factory,
    WrappedKreskoAsset__factory,
} from "types/typechain";

import { getUsers } from "@utils/general";
import {
    defaultCollateralArgs,
    defaultKrAssetArgs,
    defaultOracleDecimals,
    defaultOraclePrice,
    InputArgs,
    TestCollateralAssetArgs,
    TestCollateralAssetUpdate,
    TestKreskoAssetArgs,
    TestKreskoAssetUpdate,
} from "./mocks";
import roles from "./roles";

export const getMockOracleFor = async (assetName = "Asset", price = defaultOraclePrice) => {
    const Oracle = await smock.fake<FluxPriceFeed>("FluxPriceFeed");
    const users = await getUsers();

    const PriceAggregator = await (
        await smock.mock<FluxPriceAggregator__factory>("FluxPriceAggregator")
    ).deploy(users.deployer.address, [Oracle.address], defaultOracleDecimals, assetName);

    PriceAggregator.latestAnswer.returns(hre.toBig(price, 8));
    return [PriceAggregator, Oracle] as const;
};
export const setPrice = (oracle: MockContract<FluxPriceAggregator>, price: number) => {
    oracle.latestAnswer.returns(hre.toBig(price, 8));
};

/* -------------------------------------------------------------------------- */
/*                              CollateralAssets                              */
/* -------------------------------------------------------------------------- */

export const addMockCollateralAsset = async (
    args: TestCollateralAssetArgs = defaultCollateralArgs,
): Promise<Collateral> => {
    const users = await getUsers();

    const { name, price, factor, decimals } = args;
    const [OracleAggregator, Oracle] = await getMockOracleFor(name, price);

    const Collateral = await (await smock.mock<ERC20Upgradeable__factory>("ERC20Upgradeable")).deploy();
    await Collateral.setVariable("_initialized", 0);

    Collateral.name.returns(name);
    Collateral.symbol.returns(name);
    
    Collateral.decimals.returns(decimals);

    const cFactor = toFixedPoint(factor);
    await hre.Diamond.connect(users.operator).addCollateralAsset(Collateral.address, cFactor, OracleAggregator.address);
    const mocks = {
        contract: Collateral,
        priceAggregator: OracleAggregator,
        priceFeed: Oracle,
    };
    const asset: Collateral = {
        address: Collateral.address,
        contract: ERC20Upgradeable__factory.connect(Collateral.address, users.deployer),
        kresko: () => hre.Diamond.collateralAsset(Collateral.address),
        priceAggregator: FluxPriceAggregator__factory.connect(OracleAggregator.address, users.deployer),
        priceFeed: FluxPriceFeed__factory.connect(Oracle.address, users.deployer),
        deployArgs: args,
        mocks,
        setPrice: price => setPrice(OracleAggregator, price),
        getPrice: () => OracleAggregator.latestAnswer(),
        update: update => updateCollateralAsset(Collateral.address, update),
    };
    const found = hre.collaterals.findIndex(c => c.address === asset.address)
    if(found === -1) {
        hre.collaterals.push(asset)
        hre.allAssets.push(asset)
    } else {
        hre.collaterals = hre.collaterals.map(c => c.address === c.address ? asset : c);
        hre.allAssets = hre.allAssets.map(c => c.address === asset.address && c.collateral ? asset : c);
    }
    return asset;
};

export const updateCollateralAsset = async (address: string, args: TestCollateralAssetUpdate) => {
    const users = await getUsers();
    const collateral = hre.collaterals.find(c => c.address === address);
    await hre.Diamond.connect(users.operator).updateCollateralAsset(
        collateral.address,
        toFixedPoint(args.factor),
        args.oracle || collateral.priceAggregator.address,
    );
    const asset: Collateral = {
        deployArgs: { ...collateral.deployArgs, ...args },
        ...collateral,
    };

    const found = hre.collaterals.findIndex(c => c.address === asset.address)
    if(found === -1) {
        hre.collaterals.push(asset)
        hre.allAssets.push(asset)
    } else {
        hre.collaterals = hre.collaterals.map(c => c.address === c.address ? asset : c);
        hre.allAssets = hre.allAssets.map(c => c.address === asset.address && c.collateral ? asset : c);
    }
    return asset;
};

export const depositMockCollateral = async (args: InputArgs) => {
    const { user, asset, amount } = args;
    const depositAmount = toBig(amount, await asset.contract.decimals());

    await asset.mocks.contract.setVariable("_balances", {
        [user.address]: depositAmount,
    });

    await asset.mocks.contract.setVariable("_allowances", {
        [user.address]: {
            [hre.Diamond.address]: depositAmount,
        },
    });
    return hre.Diamond.connect(user).depositCollateral(user.address, asset.contract.address, depositAmount);
};

export const depositCollateral = async (args: InputArgs) => {
    const { user, asset, amount } = args;
    const depositAmount = toBig(amount);
    await asset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    return hre.Diamond.connect(user).depositCollateral(user.address, asset.address, depositAmount);
};

/* -------------------------------------------------------------------------- */
/*                                  KrAssets                                  */
/* -------------------------------------------------------------------------- */

export const addMockKreskoAsset = async (args: TestKreskoAssetArgs = defaultKrAssetArgs): Promise<KrAsset> => {
    const users = await getUsers();
    const { name, price, factor, supplyLimit, closeFee, openFee } = args;

    // Create an oracle with price supplied
    const [OracleAggregator, Oracle] = await getMockOracleFor(name, price);

    // create the underlying elastic krAsset
    const krAsset = await (await smock.mock<KreskoAsset__factory>("KreskoAsset")).deploy();
    await krAsset.setVariable("_initialized", 0);
    krAsset.decimals.returns(18)

    // Initialize the underlying krAsset
    await krAsset.initialize(name, name, 18, users.deployer.address, hre.Diamond.address);

    // Create the fixed krAsset
    const krAssetFixed = await (
        await smock.mock<WrappedKreskoAsset__factory>("WrappedKreskoAsset")
    ).deploy(krAsset.address);

    await krAssetFixed.setVariable("_initialized", 0);
    await krAssetFixed.initialize(krAsset.address, name, name, users.deployer.address);

    // Add the asset to the protocol
    const kFactor = toFixedPoint(factor);
    await hre.Diamond.connect(users.operator).addKreskoAsset(
        krAsset.address,
        kFactor,
        OracleAggregator.address,
        toBig(supplyLimit, await krAsset.decimals()),
        toFixedPoint(closeFee),
        toFixedPoint(openFee),
    );

    const hasOperatorElastic = await krAsset.hasRole(roles.OPERATOR, hre.Diamond.address);
    const hasOperatorFixed = await krAssetFixed.hasRole(roles.OPERATOR, hre.Diamond.address);

    expect(hasOperatorElastic).to.be.true;
    expect(hasOperatorFixed).to.be.true;
    const mocks = {
        contract: krAsset,
        wrapper: krAssetFixed,
        priceAggregator: OracleAggregator,
        priceFeed: Oracle,
    };
    const asset: KrAsset = {
        krAsset: true,
        address: krAsset.address,
        kresko: async () => await hre.Diamond.kreskoAsset(krAsset.address),
        deployArgs: args,
        contract: KreskoAsset__factory.connect(krAsset.address, users.deployer),
        wrapper: WrappedKreskoAsset__factory.connect(krAssetFixed.address, users.deployer),
        priceAggregator: FluxPriceAggregator__factory.connect(OracleAggregator.address, users.deployer),
        priceFeed: FluxPriceFeed__factory.connect(Oracle.address, users.deployer),
        mocks,
        setPrice: price => setPrice(OracleAggregator, price),
        getPrice: () => OracleAggregator.latestAnswer(),
        update: update => updateKrAsset(krAsset.address, update),
    };


    const found = hre.krAssets.findIndex(c => c.address === asset.address)
    if(found === -1) {
        hre.krAssets.push(asset)
        hre.allAssets.push(asset)
    } else {
        hre.krAssets = hre.krAssets.map(c => c.address === c.address ? asset : c);
        hre.allAssets = hre.allAssets.map(c => c.address === asset.address && c.collateral ? asset : c);
    }
    return asset;
};

export const updateKrAsset = async (address: string, args: TestKreskoAssetUpdate) => {
    const users = await getUsers();
    const krAsset = hre.krAssets.find(c => c.address === address);
    await hre.Diamond.connect(users.operator).updateKreskoAsset(
        krAsset.address,
        toFixedPoint(args.factor),
        args.oracle || krAsset.priceAggregator.address,
        typeof args.mintable === "undefined" ? true : args.mintable,
        hre.toBig(args.supplyLimit, await krAsset.contract.decimals()),
        toFixedPoint(args.closeFee),
        toFixedPoint(args.openFee),
    );

    const asset: KrAsset = {
        deployArgs: { ...krAsset.deployArgs, ...args },
        ...krAsset,
    };
    const found = hre.krAssets.findIndex(c => c.address === asset.address)
    if(found === -1) {
        hre.krAssets.push(asset)
        hre.allAssets.push(asset)
    } else {
        hre.krAssets = hre.krAssets.map(c => c.address === c.address ? asset : c);
        hre.allAssets = hre.allAssets.map(c => c.address === asset.address && c.collateral ? asset : c);
    }
    return asset;
};

export const borrowKrAsset = async (args: InputArgs) => {
    const { user, asset, amount } = args;
    return hre.Diamond.connect(user).mintKreskoAsset(user.address, asset.address, toBig(amount));
};
