import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { TASK_DEPLOY_TOKEN } from "./names";
import { toBig } from "@utils/values";

task(TASK_DEPLOY_TOKEN)
  .addParam("name", "Name of the token")
  .addParam("symbol", "Symbol for the token")
  .addOptionalParam("decimals", "token decimals", 18, types.int)
  .addOptionalParam("wait", "wait confirmations", 1, types.int)
  .addOptionalParam("amount", "Amount to mint to deployer", 100000000, types.float)
  .setAction(async function (taskArgs: TaskArguments, hre) {
    const { getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();

    const { name, symbol, amount, decimals } = taskArgs;
    const [Token] = await hre.deploy("MockERC20Restricted", {
      from: deployer,
      deploymentName: symbol,
      args: [name, symbol, decimals, toBig(amount, decimals)],
    });

    return Token;
  });
