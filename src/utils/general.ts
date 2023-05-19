import { config } from "dotenv";
import type { HardhatRuntimeEnvironment, HardhatUsers } from "hardhat/types/runtime";
export const getUsers = async (hre?: HardhatRuntimeEnvironment): Promise<HardhatUsers<SignerWithAddress>> => {
    if (!hre) hre = require("hardhat");

    return (await hre!.ethers.getNamedSigners()) as HardhatUsers<SignerWithAddress>;
};

export const getAddresses = async (hre?: HardhatRuntimeEnvironment): Promise<HardhatUsers<string>> => {
    if (!hre) hre = require("hardhat");

    return (await hre!.getNamedAccounts()) as HardhatUsers<string>;
};

export const randomContractAddress = (hre: HardhatRuntimeEnvironment) => {
    const pubKey = hre!.ethers.Wallet.createRandom().publicKey;

    return hre!.ethers.utils.getContractAddress({
        from: pubKey,
        nonce: 0,
    });
};

export const envCheck = () => {
    config();
    if (typeof process.env.LIQUIDATION_INCENTIVE === "undefined") {
        throw new Error("LIQUIDATION_INCENTIVE env var not set");
    }
    if (typeof process.env.MINIMUM_COLLATERALIZATION_RATIO === "undefined") {
        throw new Error("MINIMUM_COLLATERALIZATION_RATIO env var not set");
    }
    if (typeof process.env.MINIMUM_DEBT_VALUE === "undefined") {
        throw new Error("MINIMUM_DEBT_VALUE env var not set");
    }
};
