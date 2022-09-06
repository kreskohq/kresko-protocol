/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import hre from "hardhat";
const { ethers } = hre;
import minterConfig from "../config/minter";

export async function createKrAsset(name: string, symbol, decimals = 18) {
    const { deployer } = await ethers.getNamedSigners();
    const kresko = hre.Diamond;

    const underlyingSymbol = minterConfig.underlyingPrefix + symbol;
    const kreskoAssetInitializerArgs = [name, underlyingSymbol, decimals, deployer.address, kresko.address];

    const [KreskoAsset] = await hre.deploy<KreskoAsset>(underlyingSymbol, {
        from: deployer.address,
        log: true,
        contract: "KreskoAsset",
        proxy: {
            owner: deployer.address,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                methodName: "initialize",
                args: kreskoAssetInitializerArgs,
            },
        },
    });

    const fixedKreskoAssetInitializerArgs = [KreskoAsset.address, name, symbol, deployer.address];

    const [WrappedKreskoAsset] = await hre.deploy(symbol, {
        from: deployer.address,
        log: true,
        contract: "WrappedKreskoAsset",
        args: [KreskoAsset.address],
        proxy: {
            owner: deployer.address,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                methodName: "initialize",
                args: fixedKreskoAssetInitializerArgs,
            },
        },
    });
    const asset: KrAsset = {
        address: KreskoAsset.address,
        contract: KreskoAsset,
        wrapper: WrappedKreskoAsset,
    };

    hre.krAssets = hre.krAssets.filter(k => k.address !== krAsset.address).concat(asset);
    hre.allAssets = hre.allAssets.filter(a => a.address !== krAsset.address || a.collateral).concat(asset);

    return asset;
}
