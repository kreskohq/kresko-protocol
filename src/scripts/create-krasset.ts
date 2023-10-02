import { Role } from "@utils/test/roles";
import { anchorTokenPrefix, getDeploymentUsers } from "@deploy-config/shared";

export async function createKrAsset(
    name: string,
    symbol: string,
    decimals = 18,
    token: string = hre.ethers.constants.AddressZero,
    tokenDecimals = 0,
    feeRecipient = hre.ethers.constants.AddressZero,
    openFee = 0,
    closeFee = 0,
) {
    const { deployer } = await hre.ethers.getNamedSigners();
    const { admin } = await getDeploymentUsers(hre);
    const anchorSymbol = anchorTokenPrefix + symbol;

    feeRecipient = feeRecipient == hre.ethers.constants.AddressZero ? deployer.address : feeRecipient;

    const Kresko = await hre.getContractOrFork("Kresko");
    const kreskoAssetInitArgs = [
        name,
        symbol,
        decimals,
        admin,
        Kresko.address,
        token,
        tokenDecimals,
        feeRecipient,
        openFee,
        closeFee,
    ];

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

    const kreskoAssetAnchorInitArgs = [KreskoAsset.address, name, anchorSymbol, admin];

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

    const asset: any = {
        address: KreskoAsset.address,
        contract: KreskoAsset,
        anchor: KreskoAssetAnchor,
        deployArgs: {
            name,
            symbol,
            decimals,
            anchorSymbol,
        },
    };

    const found = hre.krAssets.findIndex(c => c.address === asset.address);
    if (found === -1) {
        hre.krAssets.push(asset);
        hre.allAssets.push(asset);
    } else {
        hre.krAssets = hre.krAssets.map(c => (c.address === c.address ? asset : c));
        hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
    }
    return asset;
}
