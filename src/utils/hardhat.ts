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
