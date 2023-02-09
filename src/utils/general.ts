import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@kreskolabs/hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { FluxPriceFeedFactory } from "types/typechain/src/contracts/vendor/flux/FluxPriceFeedFactory";
export const getUsers = async (hre?: HardhatRuntimeEnvironment): Promise<Users> => {
    if (!hre) hre = require("hardhat");
    const {
        deployer,
        owner,
        admin,
        operator,
        userOne,
        userTwo,
        userThree,
        userFour,
        nonadmin,
        liquidator,
        feedValidator,
        treasury,
    } = await hre.ethers.getNamedSigners();
    return {
        deployer,
        owner,
        admin,
        operator,
        userOne,
        userTwo,
        userThree,
        userFour,
        nonadmin,
        liquidator,
        feedValidator,
        treasury,
    };
};
export const getOracle = async (oracleDesc: string, hre?: HardhatRuntimeEnvironment) => {
    const { feedValidator } = await hre.ethers.getNamedSigners();
    const factory = await hre.ethers.getContract<FluxPriceFeedFactory>("FluxPriceFeedFactory");

    const fluxFeed = await factory.addressOfPricePair(oracleDesc, 8, "0x4601716Ce33313D03dFDC5621E41937B0befe018");
    if (fluxFeed === hre.ethers.constants.AddressZero) {
        throw new Error(`Oracle ${oracleDesc} address is 0`);
    }
    return fluxFeed;
};
export const getAddresses = async (hre?: HardhatRuntimeEnvironment): Promise<Addresses> => {
    if (!hre) hre = require("hardhat");
    const {
        deployer,
        owner,
        admin,
        operator,
        userOne,
        userTwo,
        userThree,
        userFour,
        nonadmin,
        liquidator,
        feedValidator,
        treasury,
    } = await hre.ethers.getNamedSigners();
    return {
        ZERO: hre.ethers.constants.AddressZero,
        deployer: deployer.address,
        owner: owner.address,
        admin: admin.address,
        operator: operator.address,
        userOne: userOne.address,
        userTwo: userTwo.address,
        userThree: userThree.address,
        userFour: userFour.address,
        nonadmin: nonadmin.address,
        liquidator: liquidator.address,
        feedValidator: feedValidator.address,
        treasury: treasury.address,
    };
};

export const randomContractAddress = (hre: HardhatRuntimeEnvironment) => {
    const pubKey = hre.ethers.Wallet.createRandom().publicKey;

    return hre.ethers.utils.getContractAddress({
        from: pubKey,
        nonce: 0,
    });
};
