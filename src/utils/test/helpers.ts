import { MockContract, smock } from "@defi-wonderland/smock";
import { toFixedPoint } from "@utils/fixed-point";
import { toBig } from "@utils/numbers";
import { expect } from "chai";
import hre from "hardhat";

import {
    ERC20Upgradeable,
    ERC20Upgradeable__factory,
    FluxPriceAggregator__factory,
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

    await Collateral.setVariable("name", name);
    await Collateral.setVariable("symbol", name);
    await Collateral.setVariable("decimals", decimals);

    const cFactor = toFixedPoint(factor);
    await hre.Diamond.connect(users.operator).addCollateralAsset(Collateral.address, cFactor, OracleAggregator.address);
    const mocks = {
        contract: Collateral,
        priceAggregator: OracleAggregator,
        priceFeed: Oracle,
    };
    const asset: Collateral = {
        address: Collateral.address,
        contract: Collateral as unknown as ERC20Upgradeable,
        kresko: () => hre.Diamond.collateralAsset(Collateral.address),
        priceAggregator: OracleAggregator as unknown as FluxPriceAggregator,
        priceFeed: Oracle as unknown as FluxPriceFeed,
        deployArgs: args,
        mocks,
        setPrice: price => setPrice(OracleAggregator, price),
        getPrice: () => OracleAggregator.latestAnswer(),
        update: update => updateCollateralAsset(Collateral.address, update),
    };
    hre.collaterals = hre.collaterals.filter(c => c.address !== Collateral.address).concat(asset);
    hre.allAssets = hre.allAssets.filter(a => a.address !== Collateral.address || a.krAsset).concat(asset);
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
    hre.collaterals = hre.collaterals.filter(c => c.address !== address).concat(asset);
    hre.allAssets = hre.allAssets.filter(a => a.address !== address || a.krAsset).concat(asset);
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
    const { name, price, factor, supplyLimit } = args;

    // Create an oracle with price supplied
    const [OracleAggregator, Oracle] = await getMockOracleFor(name, price);

    // create the underlying elastic krAsset
    const krAsset = await (await smock.mock<KreskoAsset__factory>("KreskoAsset")).deploy();
    await krAsset.setVariable("_initialized", 0);

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
        contract: krAsset as unknown as KreskoAsset,
        wrapper: krAssetFixed as unknown as WrappedKreskoAsset,
        priceAggregator: OracleAggregator as unknown as FluxPriceAggregator,
        priceFeed: Oracle as unknown as FluxPriceFeed,
        mocks,
        setPrice: price => setPrice(OracleAggregator, price),
        getPrice: () => OracleAggregator.latestAnswer(),
        update: update => updateKrAsset(krAsset.address, update),
    };
    hre.krAssets = hre.krAssets.filter(k => k.address !== krAsset.address).concat(asset);
    hre.allAssets = hre.allAssets.filter(a => a.address !== krAsset.address || a.collateral).concat(asset);
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
    );

    const asset: KrAsset = {
        deployArgs: { ...krAsset.deployArgs, ...args },
        ...krAsset,
    };
    hre.krAssets = hre.krAssets.filter(k => k.address !== krAsset.address).concat(asset);
    hre.allAssets = hre.allAssets.filter(a => a.address !== krAsset.address || a.collateral).concat(asset);
    return asset;
};

export const borrowKrAsset = async (args: InputArgs) => {
    const { user, asset, amount } = args;
    return hre.Diamond.connect(user).mintKreskoAsset(user.address, asset.address, toBig(amount));
};
