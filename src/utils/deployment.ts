import { DeployOptions } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export const deployWithSignatures =
    (hre: HardhatRuntimeEnvironment) =>
    async <T extends Contract>(name: string, options?: DeployOptions): Promise<DeployResultWithSignatures<T>> => {
        const { getNamedAccounts, deployments, ethers } = hre;
        const { admin } = await getNamedAccounts();
        const { deploy } = deployments;
        const defaultOptions = {
            from: admin,
            log: true,
        };
        const deployment = await deploy(name, options ? { ...options } : defaultOptions);

        const implementation = await ethers.getContract<T>(name);
        return [
            implementation,
            implementation.interface.fragments
                .filter(frag => frag.type !== "constructor")
                .map(frag => ethers.utils.Interface.getSighash(frag)),
            deployment,
        ];
    };
