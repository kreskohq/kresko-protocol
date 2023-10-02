// import { getDeploymentUsers } from "@deploy-config/shared";
// import { getLogger } from "@kreskolabs/lib/meta";
// import { toBig } from "@kreskolabs/lib";
// import { task, types } from "hardhat/config";
// import type { TaskArguments } from "hardhat/types";
// import { TASK_DEPLOY_STAKING } from "./names";

// task(TASK_DEPLOY_STAKING)
//     .addParam("stakingToken", "Address of the token to be staked")
//     .addParam("rewardTokens", "Addresses of the tokens to be rewarded, separate by ,")
//     .addParam("rewardPerBlocks", "Tokens rewarded per block, separate by ,")
//     .addOptionalParam("startBlock", "Block to start reward drip, current block if not supplied", 0, types.int)
//     .addOptionalParam("wait", "wait confirmations", 1, types.int)
//     .addOptionalParam("log", "log information", true, types.boolean)
//     .setAction(async function (taskArgs: TaskArguments, hre) {
//         const { stakingToken, rewardTokens, rewardPerBlocks, startBlock, log } = taskArgs;
//         const logger = getLogger("latestAnswer", log);

//         const { multisig } = await getDeploymentUsers(hre);
//         const { deployer } = await hre.getNamedAccounts();
//         const rewardTokenArr = rewardTokens.split(",");
//         const rewardPerBlocksArr = rewardPerBlocks.split(",");

//         if (rewardTokenArr.length !== rewardPerBlocksArr.length) {
//             logger.error("Must provide reward per block for each token");
//             throw new Error();
//         } else {
//             const [Staking] = await hre.deploy("KrStaking", {
//                 from: deployer,
//                 log: true,
//                 proxy: {
//                     owner: deployer,
//                     proxyContract: "OptimizedTransparentProxy",
//                     execute: {
//                         methodName: "initialize",
//                         args: [
//                             rewardTokenArr,
//                             rewardPerBlocksArr.map((val: string) => toBig(Number(val))),
//                             stakingToken,
//                             1000,
//                             startBlock,
//                             multisig,
//                             multisig,
//                         ],
//                     },
//                 },
//             });
//             logger.success(
//                 "Succesfully deployed Staking with",
//                 rewardTokenArr.length,
//                 "reward tokens",
//                 "rewardPerBlocks:",
//                 rewardPerBlocksArr.join(" - "),
//             );
//             return Staking;
//         }
//     });
