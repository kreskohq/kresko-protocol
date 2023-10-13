import type { HardhatRuntimeEnvironment, HardhatUsers } from 'hardhat/types/runtime';
export const getUsers = async (hre: HardhatRuntimeEnvironment): Promise<HardhatUsers<SignerWithAddress>> => {
  if (!hre) hre = require('hardhat');

  return (await hre.ethers.getNamedSigners()) as HardhatUsers<SignerWithAddress>;
};

export const getAddresses = async (hre?: HardhatRuntimeEnvironment): Promise<HardhatUsers<string>> => {
  if (!hre) hre = require('hardhat');

  return (await hre!.getNamedAccounts()) as HardhatUsers<string>;
};
