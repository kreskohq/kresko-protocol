import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { bytecode } from "artifacts/src/contracts/vendor/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json";
task("get-init-codehash").setAction(async function (taskArgs: TaskArguments, hre) {
    const logger = getLogger("init-codehash", true);
    const result = hre.ethers.utils.keccak256(bytecode);
    logger.log(`init codehash: ${result}`);
});
