import deploymentsJson from "./deployments/deployments.json";
import oracleJson from "./deployments/oracles.json"
export {ERC20Upgradeable as ERC20} from '../../types/forged';
export {ERC4626Upgradeable as ERC4626} from '../../types/forged';
export {Kresko} from '../../types/forged/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko';
export {KreskoAsset, KreskoAssetAnchor, IKreskoAssetIssuer} from '../../types/forged';
export {UniswapV2Oracle} from '../../types/forged';
export {KrStaking, KrStakingHelper} from '../../types/forged';
export {UniswapV2LiquidityMathLibrary, UniswapMath} from '../../types/forged';
export {UniswapV2Router02} from '../../types/forged';
export {UniswapV2Factory, UniswapV2Pair} from '../../types/forged';
export {WETH, Multisender} from '../../types/typechain/src/contracts/test';
export {FluxPriceFeed, FluxPriceFeedFactory} from '../../types/forged';
export {KISS} from '../../types/forged';
export {GnosisSafeL2} from '../../types/typechain/src/contracts/vendor/gnosis';
export {Error as ErrorCodes} from '../../src/utils/test/errors'
export interface ContractExport {
    address: string;
    abi: any[];
    linkedData?: any;
}

export interface Export {
    chainId: string;
    name: string;
    contracts: { [name: string]: ContractExport };
}

export type MultiExport = {
    [chainId: string]: Export[];
  };
export type Oracles = {
    asset: string;
    assetType: string
    feed: string;
    marketstatus: string;
    pricefeed: string;
}[]

export const deployments = deploymentsJson;

export const oracles = oracleJson;
export type ContractNames = keyof typeof deploymentsJson["420"][0]["contracts"];

export type DeployedChains = keyof typeof deploymentsJson;
