import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { toFixedPoint } from "@utils";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-nrwt");
    const { getNamedAccounts, deploy } = hre;
    const { admin } = await getNamedAccounts();

    const [rebasingToken] = await deploy<RebasingToken>("RebasingToken", {
        from: admin,
        log: true,
        waitConfirmations: 3,
        args: [toFixedPoint(1)],
    });

    const [nonRebasingTokenWrapper, , deployment] = await deploy("NonRebasingWrapperToken", {
        from: admin,
        log: true,
        waitConfirmations: 3,
        proxy: {
            owner: admin,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                methodName: "initialize",
                args: [rebasingToken.address, "NonRebasingWrapperToken", "NRWT"],
            },
        },
    });

    const contracts = {
        RebasingToken: rebasingToken.address,
        NRTWProxy: nonRebasingTokenWrapper.address,
        NRTWImplementation: deployment.implementation,
    };

    logger.log(contracts);
    logger.success("Succesfully deployed nrwts");
};

func.tags = ["auroratest"];

export default func;
