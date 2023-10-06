import { MockContract, smock } from "@defi-wonderland/smock";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { createKrAsset } from "@scripts/create-krasset";
import { wrapKresko } from "@utils/redstone";
import { MaxUint128, toBig } from "@utils/values";
import { Facet } from "hardhat-deploy/types";
import { KreskoAssetAnchor, SmockCollateralReceiver, SmockCollateralReceiver__factory } from "types/typechain";
import { Kresko } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { addMockExtAsset, depositCollateral } from "./helpers/collaterals";
import { wrapContractWithSigner } from "./helpers/general";
import { addMockKreskoAsset, leverageKrAsset, mintKrAsset } from "./helpers/krassets";
import {
  ONE_USD,
  TEN_USD,
  defaultCloseFee,
  defaultOpenFee,
  defaultSupplyLimit,
  testCollateralConfig,
  testKrAssetConfig,
} from "./mocks";
import Role from "./roles";
import { AllTokenSymbols } from "@deploy-config/shared";

type SCDPFixtureParams = {
  krAssets: () => Promise<TestKrAsset>[];
  collaterals: () => Promise<TestExtAsset>[];
};

export type SCDPFixture = {
  reset: () => Promise<void>;
  krAssets: TestKrAsset[];
  collaterals: TestExtAsset[];
  users: [SignerWithAddress, Kresko][];
  usersArr: SignerWithAddress[];
  KrAsset: TestKrAsset;
  KrAsset2: TestKrAsset;
  KISS: TestKrAsset;
  Collateral: TestExtAsset;
  Collateral8Dec: TestExtAsset;
};

export const scdpFixture = hre.deployments.createFixture<SCDPFixture, SCDPFixtureParams>(async (hre, params) => {
  const result = await hre.deployments.fixture("local");
  if (result.Diamond) {
    hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
  }
  await time.increase(3610);
  const [krAssets, collaterals] = await Promise.all([
    Promise.all(params!.krAssets()),
    Promise.all(params!.collaterals()),
  ]);
  const [KreskoAsset, KreskoAsset2, KISS] = krAssets;
  const [CollateralAsset, CollateralAsset8Dec] = collaterals;
  const users = [hre.users.testUserFive, hre.users.testUserSix, hre.users.testUserSeven];

  await hre.Diamond.setFeeAssetSCDP(krAssets[2].address);
  for (const user of users) {
    await Promise.all([
      ...krAssets.map(async asset =>
        asset.contract.setVariable("_allowances", {
          [user.address]: {
            [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
          },
        }),
      ),
      ...collaterals.map(async asset =>
        asset.contract.setVariable("_allowances", {
          [user.address]: {
            [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
          },
        }),
      ),
    ]);
  }

  await hre.Diamond.setSwapPairs([
    {
      assetIn: KreskoAsset2.address,
      assetOut: KreskoAsset.address,
      enabled: true,
    },
    {
      assetIn: KISS.address,
      assetOut: KreskoAsset2.address,
      enabled: true,
    },
    {
      assetIn: KreskoAsset.address,
      assetOut: KISS.address,
      enabled: true,
    },
  ]);

  const reset = async () => {
    const collateralPrice = 10;
    const KreskoAsset2Price = 100;
    const depositAmount = 1000;
    const depositAmount18Dec = toBig(depositAmount);
    const depositAmount8Dec = toBig(depositAmount, 8);
    CollateralAsset.setPrice(collateralPrice);
    CollateralAsset8Dec.setPrice(collateralPrice);
    KreskoAsset.setPrice(collateralPrice);
    KreskoAsset2.setPrice(KreskoAsset2Price);
    KISS.setPrice(ONE_USD);

    for (const user of users) {
      await CollateralAsset.setBalance(user, depositAmount18Dec, hre.Diamond.address);
      await CollateralAsset8Dec.setBalance(user, depositAmount8Dec, hre.Diamond.address);
    }
  };

  const KreskoSwapper = wrapKresko(hre.Diamond, users[0]);
  const KreskoDepositor = wrapKresko(hre.Diamond, users[1]);
  const KreskoDepositor2 = wrapKresko(hre.Diamond, users[2]);
  const KreskoLiquidator = wrapKresko(hre.Diamond, hre.users.liquidator);

  return {
    reset,
    KrAsset: KreskoAsset,
    KrAsset2: KreskoAsset2,
    KISS,
    Collateral: CollateralAsset,
    Collateral8Dec: CollateralAsset8Dec,
    collaterals,
    krAssets,
    usersArr: users,
    users: [
      [users[0], KreskoSwapper],
      [users[1], KreskoDepositor],
      [users[2], KreskoDepositor2],
      [hre.users.liquidator, KreskoLiquidator],
    ],
  };
});

const getReceiver = async (kresko: Kresko, grantRole = true) => {
  const Receiver = await (
    await smock.mock<SmockCollateralReceiver__factory>("SmockCollateralReceiver")
  ).deploy(kresko.address);
  if (grantRole) {
    await kresko.grantRole(Role.MANAGER, Receiver.address);
  }
  return Receiver;
};

export const diamondFixture = hre.deployments.createFixture<{ facets: Facet[] }, {}>(async hre => {
  const result = await hre.deployments.fixture("diamond-init");
  if (result.Diamond) {
    hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
  }

  return {
    facets: result.Diamond?.facets?.length ? result.Diamond.facets : [],
  };
});

export const kreskoAssetFixture = hre.deployments.createFixture<
  Awaited<ReturnType<typeof createKrAsset>>,
  { name: string; symbol: AllTokenSymbols }
>(async (hre, opts) => createKrAsset(opts!.symbol, opts!.name));

export type DefaultFixture = {
  users: [SignerWithAddress, Kresko][];
  collaterals: TestExtAsset[];
  krAssets: TestKrAsset[];
  KrAsset: TestKrAsset;
  Collateral: TestExtAsset;
  Collateral2: TestExtAsset;
  Receiver: MockContract<SmockCollateralReceiver>;
  depositAmount: BigNumber;
  mintAmount: BigNumber;
};

export const defaultFixture = hre.deployments.createFixture<DefaultFixture, {}>(async hre => {
  const result = await hre.deployments.fixture("local");
  if (result.Diamond) {
    hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
  }
  await time.increase(3610);
  const depositAmount = toBig(1000);
  const mintAmount = toBig(100);
  const DefaultCollateral = hre.extAssets!.find(c => c.config.args.underlyingId === testCollateralConfig.underlyingId)!;
  const Collateral2 = hre.extAssets!.find(c => c.config.args.underlyingId === "Collateral2")!;
  const DefaultKrAsset = hre.krAssets!.find(k => k.config.args.underlyingId === testKrAssetConfig.underlyingId)!;

  let blankUser = hre.users.userOne;
  let userWithDeposits = hre.users.userTwo;
  let userWithMint = hre.users.userThree;

  await DefaultCollateral.setBalance(userWithDeposits, depositAmount, hre.Diamond.address);
  await DefaultCollateral.setBalance(userWithMint, depositAmount, hre.Diamond.address);

  await depositCollateral({ user: userWithDeposits, asset: DefaultCollateral, amount: depositAmount });
  await depositCollateral({ user: userWithMint, asset: DefaultCollateral, amount: depositAmount });
  await mintKrAsset({ user: userWithMint, asset: DefaultKrAsset, amount: mintAmount });
  const Receiver = await getReceiver(hre.Diamond);
  return {
    users: [
      [blankUser, wrapKresko(hre.Diamond, blankUser)],
      [userWithDeposits, wrapKresko(hre.Diamond, userWithDeposits)],
      [userWithMint, wrapKresko(hre.Diamond, userWithMint)],
    ],
    collaterals: hre.extAssets,
    krAssets: hre.krAssets,
    KrAsset: DefaultKrAsset,
    Collateral: DefaultCollateral,
    Collateral2,
    Receiver: wrapContractWithSigner(Receiver, userWithMint),
    depositAmount,
    mintAmount,
  };
});
export type AssetValuesFixture = {
  startingBalance: number;
  user: SignerWithAddress;
  KreskoAsset: TestKrAsset;
  CollateralAsset: TestExtAsset;
  CollateralAsset8Dec: TestExtAsset;
  CollateralAsset21Dec: TestExtAsset;
  oracleDecimals: number;
};
export const assetValuesFixture = hre.deployments.createFixture<AssetValuesFixture, {}>(async hre => {
  const result = await hre.deployments.fixture("local");
  if (result.Diamond) {
    hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
  }
  await time.increase(3610);
  const KreskoAsset = await addMockKreskoAsset({
    underlyingId: "KrAsset5",
    symbol: "KrAsset5",
    price: TEN_USD,
    marketOpen: true,
    krAssetConfig: {
      anchor: null,
      closeFee: 0.1e4,
      openFee: 0.1e4,
      kFactor: 2e4,
      supplyLimit: defaultSupplyLimit,
    },
  });
  const CollateralAsset = await addMockExtAsset({
    underlyingId: "Coll18Dec",
    symbol: "Coll18Dec",
    price: TEN_USD,
    decimals: 18,
    collateralConfig: {
      cFactor: 0.5e4,
      liqIncentive: 1.1e4,
    },
  });

  const CollateralAsset8Dec = await addMockExtAsset({
    underlyingId: "Coll8Dec",
    symbol: "Coll8Dec",
    price: TEN_USD,
    collateralConfig: {
      cFactor: 0.5e4,
      liqIncentive: 1.1e4,
    },
    decimals: 8, // eg USDT
  });
  const CollateralAsset21Dec = await addMockExtAsset({
    underlyingId: "Coll21Dec",
    symbol: "Coll21Dec",
    price: TEN_USD,
    collateralConfig: {
      cFactor: 0.5e4,
      liqIncentive: 1.1e4,
    },
    decimals: 21, // more
  });
  let user = hre.users.testUserSeven;
  const startingBalance = 100;
  await CollateralAsset.setBalance(user, toBig(startingBalance), hre.Diamond.address);
  await CollateralAsset8Dec.setBalance(user, toBig(startingBalance, 8), hre.Diamond.address);
  await CollateralAsset21Dec.setBalance(user, toBig(startingBalance, 21), hre.Diamond.address);
  const oracleDecimals = await hre.Diamond.getExtOracleDecimals();
  return {
    oracleDecimals,
    startingBalance,
    user,
    KreskoAsset,
    CollateralAsset,
    CollateralAsset8Dec,
    CollateralAsset21Dec,
  };
});

export type DepositWithdrawFixture = {
  users: [SignerWithAddress, Kresko][];
  initialDeposits: BigNumber;
  initialBalance: BigNumber;
  Collateral: TestExtAsset;
  KrAsset: TestKrAsset;
  Collateral2: TestExtAsset;
  KrAssetCollateral: TestKrAsset;
};

export const depositWithdrawFixture = hre.deployments.createFixture<DepositWithdrawFixture, {}>(async hre => {
  const result = await hre.deployments.fixture("local");
  if (result.Diamond) {
    hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
  }
  await time.increase(3610);

  const withdrawer = hre.users.userThree;

  const DefaultCollateral = hre.extAssets!.find(c => c.config.args.underlyingId === testCollateralConfig.underlyingId)!;

  const DefaultKrAsset = hre.krAssets!.find(k => k.config.args.underlyingId === testKrAssetConfig.underlyingId)!;
  const KrAssetCollateral = hre.krAssets!.find(k => k.config.args.underlyingId === "KrAsset3")!;

  const initialDeposits = toBig(10000);
  const initialBalance = toBig(100000);
  await DefaultCollateral.setBalance(withdrawer, initialDeposits, hre.Diamond.address);
  await KrAssetCollateral.contract.setVariable("_allowances", {
    [withdrawer.address]: {
      [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
    },
  });
  await DefaultCollateral.setBalance(hre.users.userOne, initialBalance, hre.Diamond.address);
  await DefaultCollateral.setBalance(hre.users.userTwo, initialBalance, hre.Diamond.address);
  await wrapKresko(hre.Diamond, withdrawer).depositCollateral(
    withdrawer.address,
    DefaultCollateral.address,
    initialDeposits,
  );

  return {
    initialDeposits,
    initialBalance,
    users: [
      [hre.users.userOne, wrapKresko(hre.Diamond, hre.users.userOne)], // user1
      [hre.users.userTwo, wrapKresko(hre.Diamond, hre.users.userTwo)], // "depositor"
      [hre.users.userThree, wrapKresko(hre.Diamond, hre.users.userThree)], // "withdrawer"
    ],
    Collateral: DefaultCollateral,
    KrAsset: DefaultKrAsset,
    Collateral2: hre.extAssets!.find(c => c.config.args.underlyingId === "Collateral2")!,
    KrAssetCollateral,
  };
});
export type MintRepayFixture = {
  reset: () => Promise<void>;
  Collateral: TestExtAsset;
  KrAsset: TestKrAsset;
  KrAsset2: TestKrAsset;
  Collateral2: TestExtAsset;
  KrAssetCollateral: TestKrAsset;
  users: [SignerWithAddress, Kresko][];
  collaterals: TestExtAsset[];
  krAssets: TestKrAsset[];
  initialDeposits: BigNumber;
  initialMintAmount: BigNumber;
};

export const mintRepayFixture = hre.deployments.createFixture<MintRepayFixture, {}>(async hre => {
  const result = await hre.deployments.fixture("local");
  if (result.Diamond) {
    hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
  }
  await time.increase(3610);

  const DefaultCollateral = hre.extAssets!.find(c => c.config.args.underlyingId === testCollateralConfig.underlyingId)!;

  const DefaultKrAsset = hre.krAssets!.find(k => k.config.args.underlyingId === testKrAssetConfig.underlyingId)!;
  const KrAsset2 = hre.krAssets!.find(k => k.config.args.underlyingId === "KrAsset2")!;
  const KrAssetCollateral = hre.krAssets!.find(k => k.config.args.underlyingId === "KrAsset3")!;

  await DefaultKrAsset.contract.grantRole(Role.OPERATOR, hre.users.deployer.address);

  // Load account with collateral
  const initialDeposits = toBig(10000);
  const initialMintAmount = toBig(20);
  await DefaultCollateral.setBalance(hre.users.userOne, initialDeposits, hre.Diamond.address);
  await DefaultCollateral.setBalance(hre.users.userTwo, initialDeposits, hre.Diamond.address);

  // User deposits 10,000 collateral
  await depositCollateral({
    amount: initialDeposits,
    user: hre.users.userOne,
    asset: DefaultCollateral,
  });

  // Load userThree with Kresko Assets
  await depositCollateral({
    user: hre.users.userTwo,
    asset: DefaultCollateral,
    amount: initialDeposits,
  });
  await mintKrAsset({ user: hre.users.userTwo, asset: DefaultKrAsset, amount: initialMintAmount });
  const reset = async () => {
    DefaultKrAsset.setPrice(TEN_USD);
    DefaultCollateral.setPrice(TEN_USD);
  };
  return {
    reset,
    collaterals: hre.extAssets,
    krAssets: hre.krAssets,
    initialDeposits,
    initialMintAmount,
    users: [
      [hre.users.userOne, wrapKresko(hre.Diamond, hre.users.userOne)],
      [hre.users.userTwo, wrapKresko(hre.Diamond, hre.users.userTwo)],
    ],
    Collateral: DefaultCollateral,
    KrAsset: DefaultKrAsset,
    KrAsset2,
    Collateral2: hre.extAssets!.find(c => c.config.args.underlyingId === "Collateral2")!,
    KrAssetCollateral,
  };
});

export type LiquidationFixture = {
  Collateral: TestExtAsset;
  userOneMaxLiqPrecalc: BigNumber;
  Collateral2: TestExtAsset;
  Collateral8Dec: TestExtAsset;
  KrAsset: TestKrAsset;
  KrAsset2: TestKrAsset;
  KrAssetCollateral: TestKrAsset;
  users: [SignerWithAddress, Kresko][];
  collaterals: TestExtAsset[];
  krAssets: TestKrAsset[];
  initialMintAmount: BigNumber;
  initialDeposits: BigNumber;
  reset: () => Promise<void>;
  resetRebasing: () => Promise<void>;
  krAssetArgs: {
    price: number;
    factor: BigNumberish;
    supplyLimit: BigNumberish;
    closeFee: BigNumberish;
    openFee: BigNumberish;
  };
};

// Set up mock KreskoAsset

export const liquidationsFixture = hre.deployments.createFixture<LiquidationFixture, {}>(async hre => {
  const result = await hre.deployments.fixture("local");
  if (result.Diamond) {
    hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
  }
  await time.increase(3610);

  const KrAssetCollateral = hre.krAssets!.find(k => k.config.args.underlyingId === "KrAsset3")!;
  const DefaultCollateral = hre.extAssets.find(c => c.config.args.underlyingId === testCollateralConfig.underlyingId)!;

  const Collateral2 = hre.extAssets.find(c => c.config.args.underlyingId === "Collateral2")!;

  const Collateral8Dec = hre.extAssets.find(c => c.config.args.underlyingId === "Coll8Dec")!;

  const KreskoAsset2 = hre.krAssets.find(c => c.config.args.underlyingId === "KrAsset2")!;

  const DefaultKrAsset = hre.krAssets.find(c => c.config.args.underlyingId === testKrAssetConfig.underlyingId)!;

  await DefaultKrAsset.contract.grantRole(Role.OPERATOR, hre.users.deployer.address);

  const initialDeposits = toBig(16.5);
  await DefaultCollateral.setBalance(hre.users.liquidator, toBig(100000000), hre.Diamond.address);
  await DefaultCollateral.setBalance(hre.users.userOne, initialDeposits, hre.Diamond.address);

  await depositCollateral({
    user: hre.users.userOne,
    amount: initialDeposits,
    asset: DefaultCollateral,
  });
  await depositCollateral({
    user: hre.users.liquidator,
    amount: toBig(100000000),
    asset: DefaultCollateral,
  });
  const initialMintAmount = toBig(10); // 10 * $11 = $110 in debt value
  await mintKrAsset({
    user: hre.users.userOne,
    amount: initialMintAmount,
    asset: DefaultKrAsset,
  });
  await mintKrAsset({
    user: hre.users.liquidator,
    amount: initialMintAmount.mul(1000),
    asset: DefaultKrAsset,
  });
  DefaultKrAsset.setPrice(11);
  DefaultCollateral.setPrice(7.5);
  const userOneMaxLiqPrecalc = (
    await hre.Diamond.getMaxLiqValue(hre.users.userOne.address, DefaultKrAsset.address, DefaultCollateral.address)
  ).repayValue;

  DefaultCollateral.setPrice(TEN_USD);

  const reset = async () => {
    DefaultKrAsset.setPrice(11);
    KreskoAsset2.setPrice(TEN_USD);
    DefaultCollateral.setPrice(testCollateralConfig.price!);
    Collateral2.setPrice(TEN_USD);
    Collateral8Dec.setPrice(TEN_USD);
    await hre.Diamond.updateCollateralFactor(DefaultCollateral.address, 1e4);
    await hre.Diamond.updateKFactor(KrAssetCollateral.address, 1e4);
  };

  /* -------------------------------------------------------------------------- */
  /*                               Rebasing setup                               */
  /* -------------------------------------------------------------------------- */

  const collateralPriceRebasing = TEN_USD;
  const krAssetPriceRebasing = ONE_USD;
  const thousand = toBig(1000); // $10k
  const rebasingAmounts = {
    liquidatorDeposits: thousand,
    userDeposits: thousand,
  };
  // liquidator
  await DefaultCollateral.setBalance(hre.users.testUserSix, rebasingAmounts.liquidatorDeposits, hre.Diamond.address);
  await depositCollateral({
    user: hre.users.testUserSix,
    asset: DefaultCollateral,
    amount: rebasingAmounts.liquidatorDeposits,
  });

  // another user
  await DefaultCollateral.setBalance(hre.users.userFour, rebasingAmounts.liquidatorDeposits, hre.Diamond.address);
  await depositCollateral({
    user: hre.users.userFour,
    asset: DefaultCollateral,
    amount: rebasingAmounts.liquidatorDeposits,
  });
  DefaultKrAsset.setPrice(krAssetPriceRebasing);
  await mintKrAsset({
    user: hre.users.userFour,
    asset: DefaultKrAsset,
    amount: toBig(6666.66666),
  });
  // another user
  await DefaultCollateral.setBalance(hre.users.testUserEight, rebasingAmounts.liquidatorDeposits, hre.Diamond.address);
  await depositCollateral({
    user: hre.users.testUserEight,
    asset: DefaultCollateral,
    amount: rebasingAmounts.liquidatorDeposits,
  });
  DefaultKrAsset.setPrice(krAssetPriceRebasing);
  await mintKrAsset({
    user: hre.users.testUserEight,
    asset: DefaultKrAsset,
    amount: toBig(6666.66666),
  });
  DefaultKrAsset.setPrice(11);
  // another user
  await leverageKrAsset(hre.users.userThree, KrAssetCollateral, DefaultCollateral, rebasingAmounts.userDeposits);
  await leverageKrAsset(hre.users.userThree, KrAssetCollateral, DefaultCollateral, rebasingAmounts.userDeposits);
  const resetRebasing = async () => {
    DefaultCollateral.setPrice(collateralPriceRebasing);
    DefaultKrAsset.setPrice(krAssetPriceRebasing);
  };

  /* --------------------------------- Values --------------------------------- */
  return {
    resetRebasing,
    reset,
    userOneMaxLiqPrecalc,
    collaterals: hre.extAssets,
    krAssets: hre.krAssets,
    initialDeposits,
    initialMintAmount,
    users: [
      [hre.users.userOne, wrapKresko(hre.Diamond, hre.users.userOne)], // acc1
      [hre.users.userTwo, wrapKresko(hre.Diamond, hre.users.userTwo)], // acc2
      [hre.users.userThree, wrapKresko(hre.Diamond, hre.users.userThree)], // acc3
      [hre.users.userFour, wrapKresko(hre.Diamond, hre.users.userFour)], // acc4
      [hre.users.testUserEight, wrapKresko(hre.Diamond, hre.users.testUserEight)], // acc5
      [hre.users.liquidator, wrapKresko(hre.Diamond, hre.users.liquidator)], // liq1
      [hre.users.userFive, wrapKresko(hre.Diamond, hre.users.userFive)], // liq2
      [hre.users.testUserSix, wrapKresko(hre.Diamond, hre.users.testUserSix)], // liq3
    ],
    Collateral: DefaultCollateral,
    KrAsset: DefaultKrAsset,
    Collateral2,
    Collateral8Dec,
    KrAsset2: KreskoAsset2,
    KrAssetCollateral,
    krAssetArgs: {
      price: 11, // $11
      factor: 1e4,
      supplyLimit: MaxUint128,
      closeFee: defaultCloseFee,
      openFee: defaultOpenFee,
    },
  };
});
