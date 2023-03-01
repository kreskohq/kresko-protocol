import deployments from "./json/deployments.json";
import oracles from "./json/oracles.json";

export interface ContractExport {
    address: string;
    abi: any[];
    linkedData?: any;
}

export interface Export {
    chainId: string;
    name: string;
    contracts: { [key in DeploymentNames]: ContractExport };
}

export type MultiExport = {
    [chainId in DeployedChains]: typeof deployments[chainId][0];
};
export type Oracles = {
    asset: string;
    assetType: string;
    feed: string;
    marketstatus: string;
    pricefeed: string;
}[];

export { deployments, oracles };
export type DeploymentNames = keyof typeof deployments["420"][0]["contracts"] extends string
    ? keyof typeof deployments["420"][0]["contracts"]
    : never;
// export type KrAssetNames = keyof typeof deployments["420"][0]["contracts"] extends string
export const opgoerli = deployments["420"][0]["contracts"];
export type DeployedChains = keyof typeof deployments;
