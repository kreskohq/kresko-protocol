import { deployWithSignatures } from "@utils/deployment";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { MockERC20 } from "types/typechain";

task("deploy-token")
    .addParam("name", "Name of the token")
    .addParam("symbol", "Symbol for the token")
    .addOptionalParam("decimals", "token decimals", 18, types.int)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("amount", "Amount to mint to deployer", 100000000, types.float)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);

        const { name, symbol, amount, decimals } = taskArgs;
        const [Token] = await deploy<MockERC20>(symbol, {
            from: deployer,
            contract: "MockERC20",
            args: [name, symbol, decimals, hre.toBig(amount, decimals)],
        });

        return Token;
    });
