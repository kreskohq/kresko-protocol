import type { FakeContract, MockContract } from '@defi-wonderland/smock';
import type {
  getBalanceCollateralFunc,
  getBalanceKrAssetFunc,
  setBalanceCollateralFunc,
  setBalanceKrAssetFunc,
} from '@utils/test/helpers/smock';
import type { BytesLike } from 'ethers';
import type { DeployResult } from 'hardhat-deploy/types';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { AssetArgs, AssetConfig, ContractTypes, OracleType } from 'src/types';
import type * as Contracts from './typechain';
import type { MockOracle } from './typechain';
import type { AssetStruct } from './typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko';

declare global {
  const hre: HardhatRuntimeEnvironment;
  /* -------------------------------------------------------------------------- */
  /*                              Minter Contracts                              */
  /* -------------------------------------------------------------------------- */
  export type TC = ContractTypes;
  type TestExtAsset = TestAsset<ERC20Upgradeable, 'mock'>;
  type TestKrAsset = TestAsset<KreskoAsset, 'mock'>;
  type TestAsset<C extends ERC20Upgradeable | KreskoAsset, T extends 'mock' | undefined = undefined> = {
    underlyingId: string;
    address: string;
    isKrAsset?: boolean;
    isCollateral?: boolean;
    isMocked?: boolean;
    contract: T extends 'mock' ? MockContract<C> : C;
    config: AssetConfig;
    assetInfo: () => Promise<AssetStruct>;
    anchor: C extends KreskoAsset
      ? T extends 'mock'
        ? MockContract<Contracts.KreskoAssetAnchor>
        : Contracts.KreskoAssetAnchor
      : null;
    priceFeed: T extends 'mock' ? FakeContract<MockOracle> : MockOracle;
    setBalance: T extends KreskoAsset
      ? ReturnType<typeof setBalanceKrAssetFunc>
      : ReturnType<typeof setBalanceCollateralFunc>;
    balanceOf: T extends KreskoAsset
      ? ReturnType<typeof getBalanceKrAssetFunc>
      : ReturnType<typeof getBalanceCollateralFunc>;
    setPrice: (price: number) => void;
    setOracleOrder: (order: [OracleType, OracleType]) => Promise<any>;
    getPrice: () => Promise<BigNumber>;
    update: (update: AssetArgs) => Promise<TestAsset<C, T>>;
  };

  export type TestTokenSymbols =
    | 'USDC'
    | 'TSLA'
    | 'Collateral'
    | 'Coll8Dec'
    | 'Coll18Dec'
    | 'Coll21Dec'
    | 'Collateral2'
    | 'Collateral3'
    | 'Collateral4'
    | 'KreskoAsset'
    | 'KrAsset'
    | 'KrAsset2'
    | 'KrAsset3'
    | 'KrAsset4'
    | 'KrAsset5';
  type Contract = import('ethers').Contract;
  type GnosisSafeL2 = any;

  type KreskoAsset = TC['KreskoAsset'];
  type KrStaking = any;
  type ERC20Upgradeable = TC['ERC20Upgradeable'];
  type IERC20 = TC['IERC20Permit'];
  type BigNumberish = import('ethers').BigNumberish;
  type BigNumber = import('ethers').BigNumber;
  /* -------------------------------------------------------------------------- */
  /*                               Signers / Users                              */
  /* -------------------------------------------------------------------------- */
  type Signer = import('ethers').Signer;
  type SignerWithAddress = import('@nomiclabs/hardhat-ethers/signers').SignerWithAddress;

  /* -------------------------------------------------------------------------- */
  /*                                 Deployments                                */
  /* -------------------------------------------------------------------------- */

  // type DeployResultWithSignaturesUnknown<C extends Contract> = readonly [C, string[], DeployResult];
  type DeployResultWithSignatures<T> = readonly [T, string[], DeployResult];

  type DiamondCutInitializer = [string, BytesLike];
}
