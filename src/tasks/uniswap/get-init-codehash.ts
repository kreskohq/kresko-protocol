// import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
// import { UniswapV2Pair__factory } from "types/typechain";
// import { bytecode } from "artifacts/src/contracts/vendor/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json";
const TASK_NAME = "get-init-codehash";
task(TASK_NAME).setAction(async function (_, _hre) {
    // const logger = getLogger(TASK_NAME, true);
    // const INIT_CODE_HASH = hre.ethers.utils.keccak256(UniswapV2Pair__factory.bytecode);
    // logger.log(`INIT_CODE_HASH: ${INIT_CODE_HASH}`);
    // return INIT_CODE_HASH;
});
