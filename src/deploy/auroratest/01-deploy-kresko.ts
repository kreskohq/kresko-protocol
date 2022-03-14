import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { treasury } = await hre.getNamedAccounts();
    await hre.run("deploy:kresko", {
        wait: 3,
        feeRecipient: treasury,
    });
};

func.tags = ["auroratest"];

export default func;
