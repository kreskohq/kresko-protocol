import { keccak256, pad, toHex } from 'viem';
export const Role = {
  DEFAULT_ADMIN: pad(toHex(0), { size: 32 }),
  ADMIN: keccak256(toHex('kresko.roles.minter.admin')),
  OPERATOR: keccak256(toHex('kresko.roles.minter.operator')),
  MANAGER: keccak256(toHex('kresko.roles.minter.manager')),
  SAFETY_COUNCIL: keccak256(toHex('kresko.roles.minter.safety.council')),
};

export default Role;
