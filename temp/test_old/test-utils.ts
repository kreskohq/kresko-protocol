/* tslint:disable */

import hre, { waffle, deployments } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { toFixedPoint } from "../fixed-point";
import { expect } from "chai";
import { Artifact } from "hardhat/types";
import { constructors } from "../constructors";
import { DeployOptions } from "@kreskolabs/hardhat-deploy/types";
import { toBig } from "../numbers";
import type { IERC20MetadataUpgradeable, UniswapV2Factory, UniswapV2Router02 } from "types";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export const ADDRESS_ONE = "0x0000000000000000000000000000000000000001";
export const ADDRESS_TWO = "0x0000000000000000000000000000000000000002";
export const SYMBOL_ONE = "ONE";
export const SYMBOL_TWO = "TWO";
export const NAME_ONE = "One Kresko Asset";
export const NAME_TWO = "Two Kresko Asset";
export const MARKET_CAP_ONE_MILLION = toFixedPoint(1000000);
export const MARKET_CAP_FIVE_MILLION = toFixedPoint(5000000);
export const BURN_FEE = toFixedPoint(0.01); // 1%
export const MINIMUM_COLLATERALIZATION_RATIO = toFixedPoint(1.5); // 150%
export const CLOSE_FACTOR = toFixedPoint(0.2); // 20%
export const LIQUIDATION_INCENTIVE = toFixedPoint(1.1); // 110% -> liquidators make 10% on liquidations
export const MINIMUM_DEBT_VALUE = toFixedPoint(10); // $10
export const SECONDS_UNTIL_PRICE_STALE = 60;
export const FEE_RECIPIENT_ADDRESS = "0x0000000000000000000000000000000000000FEE";

export const { deployContract } = waffle;

export const ONE = toFixedPoint(1);
export const ZERO_POINT_FIVE = toFixedPoint(0.5);

export interface CollateralAssetInfo {
    collateralAsset: IERC20MetadataUpgradeable;
    oracle: FluxPriceFeed;
    factor: BigNumber;
    oraclePrice: BigNumber;
    decimals: number;
    fromDecimal: (decimalValue: any) => BigNumber;
    fromFixedPoint: (fixedPointValue: BigNumber) => BigNumber;
    rebasingToken: IERC20;
}

export function expectBigNumberToBeWithinTolerance(
    value: BigNumber,
    expected: BigNumber,
    lessThanTolerance: BigNumber,
    greaterThanTolerance: BigNumber,
) {
    const minExpected = expected.sub(lessThanTolerance);
    const maxExpected = expected.add(greaterThanTolerance);
    expect(value.gte(minExpected) && value.lte(maxExpected)).to.be.true;
}

export async function deployWETH10AsCollateralWithLiquidator(
    Kresko: Kresko,
    signer: SignerWithAddress,
    factor: number,
    oraclePrice: number,
) {
    const oracleArtifact: Artifact = await hre.artifacts.readArtifact("FluxPriceFeed");
    const oracle = <FluxPriceFeed>await deployContract(signer, oracleArtifact, [signer.address, 18, "ETH/USD"]);
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.transmit(fixedPointOraclePrice);

    const WETH10Artifact: Artifact = await hre.artifacts.readArtifact("MockWETH10");
    const WETH10 = await deployContract(signer, WETH10Artifact);

    const FlashLiquidatorArtifact: Artifact = await hre.artifacts.readArtifact("ExampleFlashLiquidator");

    const FlashLiquidator = await deployContract(signer, FlashLiquidatorArtifact, [WETH10.address, Kresko.address]);

    const fixedPointFactor = toFixedPoint(factor);

    await Kresko.addCollateralAsset(WETH10.address, fixedPointFactor, oracle.address);

    return {
        WETH10,
        oracle,
        factor: fixedPointFactor,
        FlashLiquidator,
    };
}

export async function deployAndWhitelistCollateralAsset(
    kresko: Contract,
    collateralFactor: number,
    oraclePrice: number,
    decimals: number,
    isNonRebasingWrapperToken: boolean = false,
): Promise<CollateralAssetInfo> {
    // Really this is MockToken | NonRebasingWrapperToken, but to avoid type pains
    // just using any.
    let collateralAsset: any;
    let rebasingToken: IERC20 | undefined;

    if (isNonRebasingWrapperToken) {
        const nwrtInfo = await deployNonRebasingWrapperToken(kresko.signer);
        collateralAsset = nwrtInfo.nonRebasingWrapperToken;
        rebasingToken = nwrtInfo.rebasingToken;
    } else {
        const mockTokenArtifact: Artifact = await hre.artifacts.readArtifact("MockToken");
        collateralAsset = <IERC20MetadataUpgradeable>await deployContract(kresko.signer, mockTokenArtifact, [decimals]);
    }

    const signerAddress = await kresko.signer.getAddress();
    const description = "TEST/USD";
    const fluxPriceFeedArtifact: Artifact = await hre.artifacts.readArtifact("FluxPriceFeed");
    const oracle = <FluxPriceFeed>(
        await deployContract(kresko.signer, fluxPriceFeedArtifact, [signerAddress, 8, description])
    );
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.transmit(fixedPointOraclePrice);

    const fixedPointCollateralFactor = toFixedPoint(collateralFactor);
    await kresko.addCollateralAsset(
        collateralAsset.address,
        fixedPointCollateralFactor,
        oracle.address,
        isNonRebasingWrapperToken,
    );

    return {
        collateralAsset,
        oracle,
        factor: fixedPointCollateralFactor,
        oraclePrice: fixedPointOraclePrice,
        decimals,
        fromDecimal: (decimalValue: any) => toFixedPoint(decimalValue, decimals),
        fromFixedPoint: (fixedPointValue: BigNumber) => {
            // Converts a fixed point value (ie a number with 18 decimals) to `decimals` decimals
            if (decimals > 18) {
                return fixedPointValue.mul(10 ** (decimals - 18));
            } else if (decimals < 18) {
                return fixedPointValue.div(10 ** (18 - decimals));
            }
            return fixedPointValue;
        },
        rebasingToken,
    };
}

export async function addNewKreskoAssetWithOraclePrice(
    kresko: Contract,
    name: string,
    symbol: string,
    kFactor: number,
    oraclePrice: number,
    marketCapUSDLimit: BigNumber,
) {
    const signerAddress = await kresko.signer.getAddress();
    const decimals = 8;
    const description = symbol.concat("/USD");
    const fluxPriceFeedArtifact: Artifact = await hre.artifacts.readArtifact("FluxPriceFeed");
    const oracle = <FluxPriceFeed>(
        await deployContract(kresko.signer, fluxPriceFeedArtifact, [signerAddress, decimals, description])
    );
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.transmit(fixedPointOraclePrice);
    const fixedPointKFactor = toFixedPoint(kFactor);

    const kreskoAssetFactory = await hre.ethers.getContractFactory("KreskoAsset");
    const kreskoAsset = <KreskoAsset>await (
        await hre.upgrades.deployProxy(kreskoAssetFactory, [name, symbol, signerAddress, kresko.address], {
            unsafeAllow: ["constructor"],
        })
    ).deployed();

    await kresko.addKreskoAsset(kreskoAsset.address, symbol, fixedPointKFactor, oracle.address, marketCapUSDLimit);

    return {
        kreskoAsset,
        oracle,
        oraclePrice: fixedPointOraclePrice,
        kFactor: fixedPointKFactor,
        marketCapUSDLimit: marketCapUSDLimit,
    };
}

export async function deployNonRebasingWrapperToken(signer: Signer) {
    const rebasingTokenArtifact: Artifact = await hre.artifacts.readArtifact("RebasingToken");
    const rebasingToken = <IERC20>await deployContract(signer, rebasingTokenArtifact, [toFixedPoint(1)]);

    const nonRebasingWrapperTokenFactory = await hre.ethers.getContractFactory("NonRebasingWrapperToken");
    const nonRebasingWrapperToken = <IERC20MetadataUpgradeable>await (
        await hre.upgrades.deployProxy(
            nonRebasingWrapperTokenFactory,
            [rebasingToken.address, "NonRebasingWrapperToken", "NRWT"],
            {
                unsafeAllow: ["constructor"],
            },
        )
    ).deployed();

    return {
        rebasingToken,
        nonRebasingWrapperToken,
    };
}

export async function deploySimpleToken(name: string, amountToDeployer: number, params?: DeployOptions) {
    const { admin } = await hre.getNamedAccounts();

    const token = await hre.deploy<IERC20MetadataUpgradeable>("Token", {
        from: admin,
        args: [name, name, toBig(amountToDeployer), 18],
        log: false,
        ...params,
    });

    return token;
}

export async function deployOracle(name: string, description: string, oraclePrice: number) {
    const Oracle: FluxPriceFeed = await hre.run("deployone:fluxpricefeed", {
        name,
        decimals: 8,
        description,
    });

    await Oracle.transmit(toFixedPoint(oraclePrice));

    return Oracle;
}

export async function deployKreskoAsset(name: string, amountToDeployer: number) {
    const { admin } = await hre.getNamedAccounts();

    const token = await hre.deploy<IERC20MetadataUpgradeable>("Token", {
        from: admin,
        args: [name, name, toBig(amountToDeployer)],
    });

    return token;
}

export const deployUniswap = deployments.createFixture(async ({ deploy }) => {
    await deployments.fixture("");
    const { getNamedAccounts } = hre;
    const { admin, treasury } = await getNamedAccounts();

    const [UniFactory] = await deploy<UniswapV2Factory>("UniswapV2Factory", {
        from: admin,
        args: [admin],
    });

    await UniFactory.setFeeTo(treasury);

    const [WETH] = await deploy<WETH9>("WETH9", {
        from: admin,
    });

    const [UniRouter] = await deploy<UniswapV2Router02>("UniswapV2Router02", {
        from: admin,
        args: [UniFactory.address, WETH.address],
    });

    return {
        UniFactory,
        UniRouter,
        WETH,
    };
});

export const setupTestsStaking = (stakingTokenAddr: string, routerAddr: string, factoryAddr: string) =>
    deployments.createFixture(async ({ deployments, ethers }) => {
        await deployments.fixture("staking-test");
        const { admin, userOne, userTwo, userThree, nonadmin, operator } = await ethers.getNamedSigners();

        const [RewardTKN1] = await deploySimpleToken("RewardTKN1", 0);
        const [RewardTKN2] = await deploySimpleToken("RewardTKN2", 0);

        const KrStaking = await hre.run("deploy:staking", {
            stakingToken: stakingTokenAddr,
            rewardTokens: `${RewardTKN1.address},${RewardTKN2.address}`,
            rewardPerBlocks: "0.1,0.2",
            log: false,
        });

        const KrStakingUniHelper = await hre.run("deploy:stakingunihelper", { routerAddr, factoryAddr, log: false });

        return {
            KrStaking,
            KrStakingUniHelper,
            RewardTKN1,
            RewardTKN2,
            signers: {
                admin,
                userOne,
                userTwo,
                userThree,
                nonadmin,
                operator,
            },
        };
    });

export const setupTests = deployments.createFixture(async ({ deployments, ethers, deploy }) => {
    const deploymentTag = "kresko-test";
    await deployments.fixture(deploymentTag); // ensure you start from fresh deployments
    const { admin, userOne, userTwo, userThree, nonadmin, operator } = await ethers.getNamedSigners();
    const constructor = constructors.Kresko();

    const [kresko] = await deploy<Kresko>("Kresko", {
        from: admin.address,
        log: true,
        proxy: {
            owner: admin.address,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                methodName: "initialize",
                args: Object.values(constructor),
            },
        },
    });
    return {
        kresko,
        signers: {
            admin,
            userOne,
            userTwo,
            userThree,
            nonadmin,
            operator,
        },
    };
});
