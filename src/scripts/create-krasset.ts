import { Role } from "@utils/test/roles";
import { AllTokenSymbols, getDeploymentUsers } from "@deploy-config/shared";
import { getAnchorNameAndSymbol } from "@utils/strings";
import { KreskoAssetAnchor } from "types/typechain";

export async function createKrAsset<T extends AllTokenSymbols>(
    symbol: T,
    name: string,
    decimals = 18,
): Promise<{ KreskoAsset: KreskoAsset; KreskoAssetAnchor: KreskoAssetAnchor }> {
    const { deployer } = await hre.ethers.getNamedSigners();
    const { admin } = await getDeploymentUsers(hre);

    const { anchorName, anchorSymbol } = getAnchorNameAndSymbol(symbol, name);

    const Kresko = await hre.getContractOrFork("Kresko");
    const kreskoAssetInitArgs = [name, symbol, decimals, admin, Kresko.address];
    const num = 100;
    num.RAY;
    const [KreskoAsset] = await hre.deploy("KreskoAsset", {
        from: deployer.address,
        log: true,
        deploymentName: symbol,
        proxy: {
            owner: deployer.address,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                methodName: "initialize",
                args: kreskoAssetInitArgs,
            },
        },
    });

    const kreskoAssetAnchorInitArgs = [KreskoAsset.address, anchorName, anchorSymbol, admin];

    const [KreskoAssetAnchor] = await hre.deploy("KreskoAssetAnchor", {
        from: deployer.address,
        log: true,
        deploymentName: anchorSymbol,
        args: [KreskoAsset.address],
        proxy: {
            owner: deployer.address,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                methodName: "initialize",
                args: kreskoAssetAnchorInitArgs,
            },
        },
    });

    await KreskoAsset.grantRole(Role.OPERATOR, KreskoAssetAnchor.address);

    return {
        KreskoAsset,
        KreskoAssetAnchor,
    };
}
