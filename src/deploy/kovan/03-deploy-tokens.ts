import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const Dollar: Token = await hre.run("deploy:token", {
        name: "Dollar",
        symbol: "USD",
    });
    const contracts = {
        Dollar: Dollar.address,
    };
    console.table(contracts);
};
export default func;

func.tags = ["kovan", "mocktokens"];
