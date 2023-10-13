import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Errors__factory } from '@/types/typechain';

export const Errors = (hre: HardhatRuntimeEnvironment) => {
  return Errors__factory.connect(hre.Diamond.address, hre.Diamond.provider);
};
