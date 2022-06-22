import { ethers } from "ethers";

export default {
    ADMIN: ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32),
    OPERATOR: ethers.utils.id("kresko.roles.minter.operator"),
    MANAGER: ethers.utils.id("kresko.roles.minter.manager"),
    SAFETY_COUNCIL: ethers.utils.id("kresko.roles.minter.safety.council"),
};
