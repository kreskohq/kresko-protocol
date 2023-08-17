import { deployments } from "./deployments";
import { Split, SplitReverse } from "./util";

export { Error } from "./error";
export { deployments };

export type DeploymentNames = keyof (typeof deployments)[421613] extends string
    ? keyof (typeof deployments)[421613]
    : never;

export type DeployedChains = 421613;

export type DeploymentChainNames = "arbitrumGoerli";
export type KreskoAssetNames =
    | Exclude<
          Split<SplitReverse<keyof (typeof deployments)[421613], "kr">, "_">[0],
          "Implementation" | "Proxy" | "krCUBE"
      >
    | "KISS";

export type AllTokenNames = keyof Pick<(typeof deployments)[421613], KreskoAssetNames | "WETH" | "DAI">;
