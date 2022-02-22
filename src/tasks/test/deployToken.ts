import { fromBig } from "@utils/numbers";
import { deployWithSignatures } from "@utils/deployment";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deploy:token")
    .addParam("name", "Name of the token")
    .addParam("symbol", "Symbol for the token")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("amount", "Amount to mint to deployer", 100000000, types.float)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);

        const { name, symbol, amount, wait } = taskArgs;

        const [Token] = await deploy<Token>(name, {
            from: deployer,
            waitConfirmations: wait,
            contract: "Token",
            args: [name, symbol, hre.toBig(amount)],
        });

        return Token;
    });
