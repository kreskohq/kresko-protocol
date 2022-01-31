import { fromBig } from "@utils/numbers";
import { deployWithSignatures } from "@utils/deployment";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deploy:token")
    .addParam("name", "Name of the token")
    .addParam("symbol", "Symbol for the token")
    .addOptionalParam("amount", "Amount to mint to deployer", 10000000, types.float)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);

        const { name, symbol, amount } = taskArgs;

        const [Token] = await deploy<Token>(name, {
            from: deployer,
            contract: "Token",
            args: [name, symbol, hre.toBig(amount)],
        });

        return Token;
    });
