import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { toFixedPoint } from "@utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { getNamedAccounts, deploy } = hre;
    const { admin } = await getNamedAccounts();

    const [rebasingToken] = await deploy<RebasingToken>("RebasingToken", {
        from: admin,
        log: true,
        args: [toFixedPoint(1)],
    });

    const [nonRebasingTokenWrapper, , deployment] = await deploy("NonRebasingWrapperToken", {
        from: admin,
        log: true,
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

    console.log(contracts);
};

func.tags = ["local", "nrwt"];

export default func;
