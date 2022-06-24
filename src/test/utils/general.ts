import hre, { collaterals } from "hardhat";
import { MockContract, smock } from "@defi-wonderland/smock";
import { ethers } from "hardhat";
import { toFixedPoint } from "@utils/fixed-point";
import { toBig } from "@utils/numbers";
import {
    ERC20Upgradeable,
    KreskoAsset,
    ERC20Upgradeable__factory,
    FluxPriceAggregator__factory,
    KreskoAsset__factory,
    WrappedKreskoAsset__factory,
    WrappedKreskoAsset,
} from "types/typechain";
import { expect } from "chai";

export const getUsers = async (): Promise<Users> => {
    const {
        deployer,
        owner,
        admin,
        operator,
        userOne,
        userTwo,
        userThree,
        nonadmin,
        liquidator,
        feedValidator,
        treasury,
    } = await ethers.getNamedSigners();
    return {
        deployer,
        owner,
        admin,
        operator,
        userOne,
        userTwo,
        userThree,
        nonadmin,
        liquidator,
        feedValidator,
        treasury,
    };
};

export const randomContractAddress = () => {
    const pubKey = ethers.Wallet.createRandom().publicKey;

    return ethers.utils.getContractAddress({
        from: pubKey,
        nonce: 0,
    });
};

export const getMockOracleFor = async (assetName = "Asset", price = 10) => {
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
        8,
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

export const defaultCollateralArgs = {
    name: "Collateral",
    price: 5,
    factor: 0.9,
    decimals: 18,
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
};
export const defaultKrAssetArgs = { name: "KreskoAsset", price: 10, factor: 1.1, supplyLimit: 1000 };

export const addMockKreskoAsset = async (
    args: KreskoAssetArgs = defaultKrAssetArgs,
): Promise<[MockContract<KreskoAsset>, MockContract<WrappedKreskoAsset>, MockContract<FluxPriceAggregator>]> => {
    const users = await getUsers();
    const { name, price, factor, supplyLimit } = args;

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
    await hre.Diamond.connect(users.operator).addKreskoAsset(
        krAsset.address,
        kFactor,
        OracleAggregator.address,
        toBig(supplyLimit),
    );

    const OPERATOR_ROLE = ethers.utils.id("kresko.roles.minter.operator");
    const hasOperatorElastic = await krAsset.hasRole(OPERATOR_ROLE, hre.Diamond.address);
    const hasOperatorFixed = await krAssetFixed.hasRole(OPERATOR_ROLE, hre.Diamond.address);
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
