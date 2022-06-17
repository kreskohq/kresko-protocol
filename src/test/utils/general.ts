import hre from "hardhat";
import { MockContract, smock } from "@defi-wonderland/smock";
import { ethers } from "hardhat";
import { ERC20Upgradeable, ERC20Upgradeable__factory, FluxPriceAggregator__factory } from "types/typechain";
import { toFixedPoint } from "@utils/fixed-point";

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

export const addCollateralAsset = async (
    marketPrice: number,
    factor = 0.8,
): Promise<MockContract<ERC20Upgradeable>> => {
    const price = toFixedPoint(marketPrice);
    const Oracles = [await smock.fake<FluxPriceFeed>("FluxPriceFeed")];
    const users = await getUsers();

    const OracleAggregator = await (
        await smock.mock<FluxPriceAggregator__factory>("FluxPriceAggregator")
    ).deploy(
        users.deployer.address,
        Oracles.map(o => o.address),
        8,
        "Collateral1",
    );

    const Collateral = await (await smock.mock<ERC20Upgradeable__factory>("ERC20Upgradeable")).deploy();
    Collateral.decimals.returns(18);

    const cFactor = toFixedPoint(factor);
    await hre.Diamond.connect(users.operator).addCollateralAsset(
        Collateral.address,
        cFactor,
        OracleAggregator.address,
        false,
    );

    OracleAggregator.latestAnswer.returnsAtCall(0, price);

    return Collateral;
};
