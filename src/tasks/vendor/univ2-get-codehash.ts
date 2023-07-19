// import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
// import { UniswapV2Pair__factory } from "types/typechain";
import { TASK_UNIV2_GET_INIT_CODEHASH } from "../names";
import { getLogger } from "@kreskolabs/lib";
// import { bytecode } from "artifacts/src/contracts/vendor/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json";

task(TASK_UNIV2_GET_INIT_CODEHASH).setAction(async function (_taskArgs, _hre) {
    // const logger = getLogger(TASK_UNIV2_GET_INIT_CODEHASH, true);
    // const INIT_CODE_HASH = hre.ethers.utils.keccak256(bytecode);
    // logger.log(`INIT_CODE_HASH: ${INIT_CODE_HASH}`);
    // return INIT_CODE_HASH;
});
