/* tslint:disable */

import hre, { waffle, deployments, getNamedAccounts } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { toFixedPoint } from "../utils/fixed-point";
import { expect } from "chai";
import { Artifact } from "hardhat/types";
import { constructors } from "../utils/constuctors";
import { DeployOptions } from "hardhat-deploy/types";
import { toBig } from "./numbers";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export const ADDRESS_ONE = "0x0000000000000000000000000000000000000001";
export const ADDRESS_TWO = "0x0000000000000000000000000000000000000002";
export const SYMBOL_ONE = "ONE";
export const SYMBOL_TWO = "TWO";
export const NAME_ONE = "One Kresko Asset";
export const NAME_TWO = "Two Kresko Asset";
export const BURN_FEE = toFixedPoint(0.01); // 1%
export const MINIMUM_COLLATERALIZATION_RATIO = toFixedPoint(1.5); // 150%
export const CLOSE_FACTOR = toFixedPoint(0.2); // 20%
export const LIQUIDATION_INCENTIVE = toFixedPoint(1.1); // 110% -> liquidators make 10% on liquidations
export const MINIMUM_DEBT_VALUE = toFixedPoint(10); // $10
export const FEE_RECIPIENT_ADDRESS = "0x0000000000000000000000000000000000000FEE";

export const { deployContract } = waffle;

export const ONE = toFixedPoint(1);
export const ZERO_POINT_FIVE = toFixedPoint(0.5);

export interface CollateralAssetInfo {
    collateralAsset: MockToken;
    oracle: FluxPriceFeed;
    factor: BigNumber;
    oraclePrice: BigNumber;
    decimals: number;
    fromDecimal: (decimalValue: any) => BigNumber;
    fromFixedPoint: (fixedPointValue: BigNumber) => BigNumber;
    rebasingToken: RebasingToken | undefined;
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

export const setupTests = deployments.createFixture(async ({ deployments, ethers, deploy }) => {
    const deploymentTag = "kresko-sol";
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

export const setupTestsStaking = (stakingTokenAddr: string, uniFactoryAddr: string, uniRouterAddr: string) =>
    deployments.createFixture(async ({ deployments, ethers }) => {
        await deployments.fixture("staking-zap");
        const { admin, userOne, userTwo, userThree, nonadmin, operator } = await ethers.getNamedSigners();

        const [RewardTKN1] = await deploySimpleToken("RewardTKN1", 0);
        const [RewardTKN2] = await deploySimpleToken("RewardTKN2", 0);

        const KrStaking: KrStaking = await hre.run("deploy:staking", {
            stakingToken: stakingTokenAddr,
            rewardTokens: `${RewardTKN1.address},${RewardTKN2.address}`,
            rewardPerBlocks: "0.1,0.2",
        });

        const [Zapper] = await hre.deploy<KreskoZapperUniswap>("KreskoZapperUniswap", {
            from: admin.address,
            args: [uniFactoryAddr, uniRouterAddr, KrStaking.address],
        });

        const OPERATOR_ROLE = await KrStaking.OPERATOR_ROLE();

        // Give zapper operator role in the staking contract.
        await KrStaking.grantRole(OPERATOR_ROLE, Zapper.address);

        return {
            Zapper,
            KrStaking,
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
    let rebasingToken: RebasingToken | undefined;

    if (isNonRebasingWrapperToken) {
        const nwrtInfo = await deployNonRebasingWrapperToken(kresko.signer);
        collateralAsset = nwrtInfo.nonRebasingWrapperToken;
        rebasingToken = nwrtInfo.rebasingToken;
    } else {
        const mockTokenArtifact: Artifact = await hre.artifacts.readArtifact("MockToken");
        collateralAsset = <MockToken>await deployContract(kresko.signer, mockTokenArtifact, [decimals]);
    }

    const signerAddress = await kresko.signer.getAddress();
    const description = "TEST/USD";
    const fluxPriceFeedArtifact: Artifact = await hre.artifacts.readArtifact("FluxPriceFeed");
    const oracle = <FluxPriceFeed>(
        await deployContract(kresko.signer, fluxPriceFeedArtifact, [signerAddress, decimals, description])
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

    await kresko.addKreskoAsset(kreskoAsset.address, symbol, fixedPointKFactor, oracle.address);

    return {
        kreskoAsset,
        oracle,
        oraclePrice: fixedPointOraclePrice,
        kFactor: fixedPointKFactor,
    };
}

export async function deployNonRebasingWrapperToken(signer: Signer) {
    const rebasingTokenArtifact: Artifact = await hre.artifacts.readArtifact("RebasingToken");
    const rebasingToken = <RebasingToken>await deployContract(signer, rebasingTokenArtifact, [toFixedPoint(1)]);

    const nonRebasingWrapperTokenFactory = await hre.ethers.getContractFactory("NonRebasingWrapperToken");
    const nonRebasingWrapperToken = <NonRebasingWrapperToken>await (
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

    const token = await hre.deploy<Token>("Token", {
        from: admin,
        args: [name, name, toBig(amountToDeployer)],
    });

    return token;
}

export async function deployOracle(description: string, oraclePrice: number, params?: DeployOptions) {
    const Oracle: FluxPriceFeed = await hre.run("deploy:FluxPriceFeed", {
        decimals: 8,
        description,
    });

    await Oracle.transmit(toFixedPoint(oraclePrice));

    return Oracle;
}

export async function deployKreskoAsset(name: string, amountToDeployer: number, params?: DeployOptions) {
    const { admin } = await hre.getNamedAccounts();

    const token = await hre.deploy<Token>("Token", {
        from: admin,
        args: [name, name, toBig(amountToDeployer)],
    });

    return token;
}

export const deployUniswap = deployments.createFixture(async ({ deployments, deploy }) => {
    await deployments.fixture("test"); // ensure you start from a fresh deployments
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
