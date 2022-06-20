import hre from "hardhat";
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
} from "types/typechain";
import { expect } from "chai";

export const getUsers = async (): Promise<Users> => {
    const { deployer, owner, operator, userOne, userTwo, userThree, nonadmin, liquidator, feedValidator, treasury } =
        await ethers.getNamedSigners();
    return {
        deployer,
        owner,
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

export const getPriceAggregatorForAsset = async (assetName = "Asset", price = 10) => {
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

export const addCollateralAsset = async (
    args: CollateralAssetArgs = defaultCollateralArgs,
): Promise<[MockContract<ERC20Upgradeable>, MockContract<FluxPriceAggregator>]> => {
    const users = await getUsers();

    const { name, price, factor, decimals } = args;
    const OracleAggregator = await getPriceAggregatorForAsset(name, price);

    const Collateral = await (await smock.mock<ERC20Upgradeable__factory>("ERC20Upgradeable")).deploy();

    Collateral.decimals.returns(decimals);
    Collateral.symbol.returns(name);
    Collateral.name.returns(name);

    const cFactor = toFixedPoint(factor);
    await hre.Diamond.connect(users.operator).addCollateralAsset(Collateral.address, cFactor, OracleAggregator.address);
    return [Collateral, OracleAggregator];
};

type InputArgs = {
    user: SignerWithAddress;
    asset: MockContract<ERC20Upgradeable | KreskoAsset>;
    amount: number | string;
};

export const depositCollateral = async (args: InputArgs) => {
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

export const addKreskoAsset = async (
    args: KreskoAssetArgs = defaultKrAssetArgs,
): Promise<[MockContract<KreskoAsset>, MockContract<FluxPriceAggregator>]> => {
    const users = await getUsers();
    const { name, price, factor, supplyLimit } = args;

    const OracleAggregator = await getPriceAggregatorForAsset(name, price);
    const krAsset = await (await smock.mock<KreskoAsset__factory>("KreskoAsset")).deploy();
    await krAsset.initialize(name, name, users.deployer.address, hre.Diamond.address);
    krAsset.decimals.returns(18);

    const kFactor = toFixedPoint(factor);
    await hre.Diamond.connect(users.operator).addKreskoAsset(
        krAsset.address,
        kFactor,
        OracleAggregator.address,
        toBig(supplyLimit),
    );

    const hasRole = await krAsset.hasRole(ethers.utils.id("kresko.roles.minter.operator"), hre.Diamond.address);
    expect(hasRole).to.be.true;
    return [krAsset, OracleAggregator];
};

export const borrowKrAsset = async (args: InputArgs) => {
    const { user, asset, amount } = args;
    const borrowAmount = toBig(amount);

    await expect(hre.Diamond.connect(user).mintKreskoAsset(user.address, asset.address, borrowAmount)).not.to.be
        .reverted;
    expect(await hre.Diamond.kreskoAssetDebt(user.address, asset.address)).to.equal(borrowAmount);
};
