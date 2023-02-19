import deploymentsJson from "./deployments/deployments.json";
export { ERC20Upgradeable as ERC20 } from '../../types/typechain/src/contracts/shared/ERC20Upgradeable';
export { ERC4626Upgradeable as ERC4626 } from '../../types/typechain/src/contracts/shared/ERC4626Upgradeable';
export { Kresko } from '../../types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko';
export { Kresko__factory } from '../../types/typechain/factories/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko__factory';
export { KreskoAsset, KreskoAssetAnchor, IKreskoAssetIssuer } from '../../types/typechain/src/contracts/kreskoasset';
export { UniswapV2Oracle } from '../../types/typechain/src/contracts/minter/UniswapV2Oracle';
export { KrStaking, KrStakingHelper } from '../../types/typechain/src/contracts/staking';
export { UniswapV2LiquidityMathLibrary, UniswapMath } from '../../types/typechain/src/contracts/test/markets';
export { UniswapV2Router02 } from '../../types/typechain/src/contracts/vendor/uniswap/v2-periphery';
export { UniswapV2Factory, UniswapV2Pair } from '../../types/typechain/src/contracts/vendor/uniswap/v2-core';
export { WETH, Multisender } from '../../types/typechain/src/contracts/test';
export { FluxPriceFeed, FluxPriceFeedFactory } from '../../types/typechain/src/contracts/vendor/flux';
export { KISS } from '../../types/typechain/src/contracts/kiss';
export { GnosisSafeL2 } from '../../types/typechain/src/contracts/vendor/gnosis';
export interface ContractExport {
    address: string;
    abi: any[];
    linkedData?: any;
}
export interface Export {
    chainId: string;
    name: string;
    contracts: {
        [name: string]: ContractExport;
    };
}
export type MultiExport = {
    [chainId: string]: Export[];
};
export type Oracles = {
    asset: string;
    assetType: string;
    feed: string;
    marketstatus: string;
    pricefeed: string;
}[];
export type ContractNames = keyof typeof deploymentsJson["420"][0]["contracts"];
declare const _default: {
    deployments: any;
    oracles: any;
};
export default _default;
