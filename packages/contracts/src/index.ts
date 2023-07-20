export { Error } from "./error";

import deployments from "./deployments";
import { Split, SplitReverse } from "./util";

export const arbitrumGoerli = deployments[421613][0].contracts;

export const getContracts = (chainId: DeployedChains) => {
    return deployments[chainId][0].contracts;
};

export type DeploymentNames = keyof typeof arbitrumGoerli extends string ? keyof typeof arbitrumGoerli : never;

export type DeployedChains = keyof typeof deployments;

export type DeploymentChainNames = (typeof deployments)[DeployedChains][0]["name"];
export type KreskoAssetNames =
    | Exclude<Split<SplitReverse<keyof typeof arbitrumGoerli, "kr">, "_">[0], "Implementation" | "Proxy" | "krCUBE">
    | "KISS";

export type AllTokenDeployments = Pick<typeof arbitrumGoerli, KreskoAssetNames | "WETH" | "DAI">;
export type AllTokenNames = keyof Pick<typeof arbitrumGoerli, KreskoAssetNames | "WETH" | "DAI">;

export type CollateralAssetNames = keyof AllTokenDeployments;
