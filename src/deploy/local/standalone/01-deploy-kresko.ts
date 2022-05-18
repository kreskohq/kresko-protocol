import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { treasury } = await hre.getNamedAccounts();
    await hre.run("deploy:kresko", {
        log: true,
        feeRecipient: treasury,
    });
};

func.tags = ["local"];

export default func;
