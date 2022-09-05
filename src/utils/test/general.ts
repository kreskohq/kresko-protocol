import hre from "hardhat";
import { MockContract, smock } from "@defi-wonderland/smock";
import { toFixedPoint } from "@utils/fixed-point";
import { toBig } from "@utils/numbers";
import { expect } from "chai";

import type {
    ERC20Upgradeable,
    KreskoAsset,
    ERC20Upgradeable__factory,
    FluxPriceAggregator__factory,
    KreskoAsset__factory,
    WrappedKreskoAsset__factory,
    WrappedKreskoAsset,
} from "types/typechain";

import { defaultOraclePrice, defaultOracleDecimals, defaultCollateralArgs, defaultKrAssetArgs } from "./config";
import roles from "./roles";
import { getUsers } from "@utils/general";

export const getMockOracleFor = async (assetName = "Asset", price = defaultOraclePrice) => {
    const Oracles = [
        await smock.fake<FluxPriceFeed>("FluxPriceFeed"),
        await smock.fake<FluxPriceFeed>("FluxPriceFeed"),
    ];
    const users = await getUsers();

    const PriceAggregator = await (
        await smock.mock<FluxPriceAggregator__factory>("FluxPriceAggregator")
    ).deploy(
        users.deployer.address,
        Oracles.map(o => o.address),
        defaultOracleDecimals,
        assetName,
    );
    PriceAggregator.latestAnswer.returns(toFixedPoint(price));
    return PriceAggregator;
};

/* -------------------------------------------------------------------------- */
/*                              CollateralAssets                              */
/* -------------------------------------------------------------------------- */

type CollateralAssetArgs = {
    name: string;
    price: number;
    factor: number;
    decimals: number;
};

export const addMockCollateralAsset = async (
    args: CollateralAssetArgs = defaultCollateralArgs,
): Promise<[MockContract<ERC20Upgradeable>, MockContract<FluxPriceAggregator>]> => {
    const users = await getUsers();

    const { name, price, factor, decimals } = args;
    const OracleAggregator = await getMockOracleFor(name, price);

    const Collateral = await (await smock.mock<ERC20Upgradeable__factory>("ERC20Upgradeable")).deploy();
    await Collateral.setVariable("_initialized", 0);

    await Collateral.setVariable("name", name);
    await Collateral.setVariable("symbol", name);
    await Collateral.setVariable("decimals", decimals);

    const cFactor = toFixedPoint(factor);
    await hre.Diamond.connect(users.operator).addCollateralAsset(Collateral.address, cFactor, OracleAggregator.address);
    return [Collateral, OracleAggregator];
};

type InputArgs = {
    user: SignerWithAddress;
    asset: MockContract<ERC20Upgradeable | KreskoAsset>;
    amount: number | string;
};

export const depositMockCollateral = async (args: InputArgs) => {
    const { user, asset, amount } = args;
    const depositAmount = toBig(amount);

    await asset.setVariable("_balances", {
        [user.address]: depositAmount,
    });

    await asset.setVariable("_allowances", {
        [user.address]: {
            [hre.Diamond.address]: depositAmount,
        },
    });

    await expect(hre.Diamond.connect(user).depositCollateral(user.address, asset.address, depositAmount)).not.to.be
        .reverted;
    expect(await hre.Diamond.collateralDeposits(user.address, asset.address)).to.equal(depositAmount);
};

export const depositCollateral = async (args: InputArgs) => {
    const { user, asset, amount } = args;
    const depositAmount = toBig(amount);

    await asset.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);

    await expect(hre.Diamond.connect(user).depositCollateral(user.address, asset.address, depositAmount)).not.to.be
        .reverted;
    expect(await hre.Diamond.collateralDeposits(user.address, asset.address)).to.equal(depositAmount);
};

/* -------------------------------------------------------------------------- */
/*                                  KrAssets                                  */
/* -------------------------------------------------------------------------- */

type KreskoAssetArgs = {
    name: string;
    price: number;
    factor: number;
    supplyLimit: number;
    closeFee: number;
};

export const addMockKreskoAsset = async (
    args: KreskoAssetArgs = defaultKrAssetArgs,
): Promise<[MockContract<KreskoAsset>, MockContract<WrappedKreskoAsset>, MockContract<FluxPriceAggregator>]> => {
    const users = await getUsers();
    const { name, price, factor, supplyLimit, closeFee } = args;

    // Create an oracle with price supplied
    const OracleAggregator = await getMockOracleFor(name, price);

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
    const closeFeeFP = toFixedPoint(closeFee);
    await hre.Diamond.connect(users.operator).addKreskoAsset(
        krAsset.address,
        kFactor,
        OracleAggregator.address,
        toBig(supplyLimit),
        closeFeeFP,
    );

    const hasOperatorElastic = await krAsset.hasRole(roles.OPERATOR, hre.Diamond.address);
    const hasOperatorFixed = await krAssetFixed.hasRole(roles.OPERATOR, hre.Diamond.address);

    expect(hasOperatorElastic).to.be.true;
    expect(hasOperatorFixed).to.be.true;
    return [krAsset, krAssetFixed, OracleAggregator];
};

export const borrowKrAsset = async (args: InputArgs) => {
    const { user, asset, amount } = args;
    const borrowAmount = toBig(amount);

    await hre.Diamond.connect(user).mintKreskoAsset(user.address, asset.address, borrowAmount);
    expect(await hre.Diamond.kreskoAssetDebt(user.address, asset.address)).to.equal(borrowAmount);
};
