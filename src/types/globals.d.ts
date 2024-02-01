import type { AssetConfig, ContractTypes, OracleType } from '@/types';
import type { FakeContract, MockContract } from '@defi-wonderland/smock';
import type {
  getBalanceCollateralFunc,
  getBalanceKrAssetFunc,
  setBalanceCollateralFunc,
  setBalanceKrAssetFunc,
} from '@utils/test/helpers/smock';
import type { BytesLike } from 'ethers';
import type { DeployResult, Deployment } from 'hardhat-deploy/types';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type * as Contracts from './typechain';
import type { MockOracle } from './typechain';
import type { AssetStruct } from './typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko';
import { PromiseOrValue } from './typechain/common';

declare global {
  const hre: HardhatRuntimeEnvironment;
  /* -------------------------------------------------------------------------- */
  /*                              Minter Contracts                              */
  /* -------------------------------------------------------------------------- */
  export type TC = ContractTypes;
  type TestExtAsset = TestAsset<Contracts.MockERC20, 'mock'>;
  type TestKrAsset = TestAsset<KreskoAsset, 'mock'>;
  type TestAssetUpdate = Partial<AssetStruct> & { newPrice?: number };
  type TestAsset<
    C extends Contracts.MockERC20 | KreskoAsset | Contracts.KISS,
    T extends 'mock' | undefined = undefined,
  > = {
    ticker: string;
    address: string;
    isMinterMintable?: boolean;
    isMinterCollateral?: boolean;
    initialPrice: number;
    pythId: PromiseOrValue<BytesLike>;
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
    errorId: [string, string];
    balanceOf: T extends KreskoAsset
      ? ReturnType<typeof getBalanceKrAssetFunc>
      : ReturnType<typeof getBalanceCollateralFunc>;
    setPrice: (price: number) => Promise<void>;
    setOracleOrder: (order: [OracleType, OracleType]) => Promise<any>;
    getPrice: () => Promise<{push: BigNumber, pyth: BigNumber}>;
    update: (update: TestAssetUpdate) => Promise<TestAsset<C, T>>;
  };

  export type TestTokenSymbols =
    | 'krSYMBOL'
    | 'USDC'
    | 'MockKISS'
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
  type GnosisSafeL2 = any;

  type KreskoAsset = TC['KreskoAsset'];
  type ERC20Upgradeable = TC['ERC20Upgradeable'];
  type BigNumberish = import('ethers').BigNumberish;
  type BigNumber = import('ethers').BigNumber;
  /* -------------------------------------------------------------------------- */
  /*                               Signers / Users                              */
  /* -------------------------------------------------------------------------- */
  type SignerWithAddress = import('@nomiclabs/hardhat-ethers/signers').SignerWithAddress;

  /* -------------------------------------------------------------------------- */
  /*                                 Deployments                                */
  /* -------------------------------------------------------------------------- */

  // type DeployResultWithSignaturesUnknown<C extends Contract> = readonly [C, string[], DeployResult];
  type DeployResultWithSignatures<T> = readonly [T, string[], DeployResult];
  type ProxyDeployResult<T> = readonly [T, Deployment];

  type DiamondCutInitializer = [string, BytesLike];
}
