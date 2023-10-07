import { ethers } from 'ethers';
export const Role = {
  DEFAULT_ADMIN: ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32),
  ADMIN: ethers.utils.id('kresko.roles.minter.admin'),
  OPERATOR: ethers.utils.id('kresko.roles.minter.operator'),
  MANAGER: ethers.utils.id('kresko.roles.minter.manager'),
  SAFETY_COUNCIL: ethers.utils.id('kresko.roles.minter.safety.council'),
};

export default Role;
