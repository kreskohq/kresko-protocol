import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task } from "hardhat/config";
// import { bytecode } from "artifacts/src/contracts/vendor/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json";
task("get-init-codehash").setAction(async function (_, _hre) {
    const logger = getLogger("init-codehash", true);
    // const result = _hre.ethers.utils.keccak256(bytecode);
    logger.log(`init codehash: `);
});
