import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@kreskolabs/hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
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
