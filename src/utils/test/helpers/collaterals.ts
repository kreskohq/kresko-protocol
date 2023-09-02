import { smock } from "@defi-wonderland/smock";
import { redstoneMap } from "@deploy-config/arbitrumGoerli";
import { toBig } from "@kreskolabs/lib";
import { envCheck } from "@utils/general";
import { ERC20Upgradeable__factory, MockAggregatorV3__factory } from "types/typechain";
import { CollateralAssetStruct } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { InputArgs, TestCollateralAssetArgs, TestCollateralAssetUpdate, defaultCollateralArgs } from "../mocks";
import { wrapContractWithSigner } from "./general";
import { getMockOracles, setPrice } from "./oracle";

envCheck();

export const getCollateralConfig = async (
    asset: { symbol: Function; decimals: Function },
    anchor: string,
    cFactor: BigNumber,
    liquidationIncentive: BigNumber,
    oracle: string,
): Promise<CollateralAssetStruct> => {
    if (cFactor.gt(toBig(1))) throw new Error("cFactor must be less than 1");
    if (liquidationIncentive.lt(toBig(1))) throw new Error("Liquidation incentive must be greater than 1");
    const redstone = redstoneMap[(await asset.symbol()) as keyof typeof redstoneMap];
    if (!redstone) {
        throw new Error(`Redstone not found for ${await asset.symbol()}`);
    }
    return {
        anchor,
        factor: cFactor,
        liquidationIncentive,
        oracle,
        decimals: await asset.decimals(),
        exists: true,
        redstoneId: redstone,
    };
};

export const addMockCollateralAsset = async (
    args: TestCollateralAssetArgs = defaultCollateralArgs,
): Promise<TestCollateral> => {
    const { deployer } = await hre.ethers.getNamedSigners();
    const { name, price, factor, decimals } = args;
    const cFactor = toBig(factor);
    const [[MockFeed, FakeFeed], TestCollateral] = await Promise.all([
        getMockOracles(price),
        (await smock.mock<ERC20Upgradeable__factory>("ERC20Upgradeable")).deploy(),
    ]);

    TestCollateral.name.returns(name);
    TestCollateral.symbol.returns(name);
    TestCollateral.decimals.returns(decimals);

    const [collateralConfig] = await Promise.all([
        getCollateralConfig(
            TestCollateral,
            hre.ethers.constants.AddressZero,
            cFactor,
            toBig(process.env.LIQUIDATION_INCENTIVE!),
            MockFeed.address,
        ),
        TestCollateral.setVariable("_initialized", 0),
    ]);

    await wrapContractWithSigner(hre.Diamond, deployer).addCollateralAsset(TestCollateral.address, collateralConfig);
    const mocks = {
        contract: TestCollateral,
        mockFeed: MockFeed,
        fakeFeed: FakeFeed,
    };
    const asset: TestCollateral = {
        address: TestCollateral.address,
        contract: ERC20Upgradeable__factory.connect(TestCollateral.address, deployer),
        kresko: () => hre.Diamond.collateralAsset(TestCollateral.address),
        priceFeed: MockAggregatorV3__factory.connect(MockFeed.address, deployer),
        deployArgs: args,
        anchor: {} as any,
        mocks,
        setPrice: price => setPrice(mocks, price),
        getPrice: async () => (await MockFeed.latestRoundData())[1],
        setBalance: async (user, amount) => {
            await mocks.contract.setVariables({
                _totalSupply: (await TestCollateral.totalSupply()).add(amount),
                _balances: {
                    [user.address]: amount,
                },
            });
            return true;
        },
        update: update => updateCollateralAsset(TestCollateral.address, update),
    };
    const found = hre.collaterals.findIndex(c => c.address === asset.address);
    if (found === -1) {
        hre.collaterals.push(asset);
        hre.allAssets.push(asset);
    } else {
        hre.collaterals = hre.collaterals.map(c => (c.address === asset.address ? asset : c));
        hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
    }
    return asset;
};

export const updateCollateralAsset = async (address: string, args: TestCollateralAssetUpdate) => {
    const { deployer } = await hre.ethers.getNamedSigners();
    const collateral = hre.collaterals.find(c => c.address === address);

    await wrapContractWithSigner(hre.Diamond, deployer).updateCollateralAsset(
        collateral!.address,
        await getCollateralConfig(
            collateral!.contract,
            hre.ethers.constants.AddressZero,
            toBig(args.factor),
            toBig(process.env.LIQUIDATION_INCENTIVE!),
            args.oracle || collateral!.mocks!.mockFeed.address,
        ),
    );
    // @ts-expect-error
    const asset: TestCollateral = {
        deployArgs: { ...collateral!.deployArgs, ...args },
        ...collateral,
    };

    const found = hre.collaterals.findIndex(c => c.address === asset.address);
    if (found === -1) {
        hre.collaterals.push(asset);
        hre.allAssets.push(asset);
    } else {
        hre.collaterals = hre.collaterals.map(c => (c.address === asset.address ? asset : c));
        hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
    }
    return asset;
};

export const depositMockCollateral = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const depositAmount = convert ? toBig(+amount, await asset.contract.decimals()) : amount;
    await Promise.all([
        await asset.mocks.contract.setVariable("_balances", {
            [user.address]: depositAmount,
        }),
        await asset.mocks.contract.setVariable("_allowances", {
            [user.address]: {
                [hre.Diamond.address]: depositAmount,
            },
        }),
    ]);

    return wrapContractWithSigner(hre.Diamond, user).depositCollateral(
        user.address,
        asset.contract.address,
        depositAmount,
    );
};

export const depositCollateral = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const depositAmount = convert ? toBig(+amount) : amount;
    await asset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    return wrapContractWithSigner(hre.Diamond, user).depositCollateral(user.address, asset.address, depositAmount);
};

export const withdrawCollateral = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const depositAmount = convert ? toBig(+amount) : amount;
    await asset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    const cIndex = await hre.Diamond.getDepositedCollateralAssetIndex(user.address, asset.address);
    return wrapContractWithSigner(hre.Diamond, user).withdrawCollateral(
        user.address,
        asset.address,
        depositAmount,
        cIndex,
    );
};

export const getMaxWithdrawal = async (user: string, collateral: any) => {
    const [collateralValue] = await hre.Diamond.getCollateralAdjustedAndRealValue(user, collateral.address);

    const minCollateralRequired = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
        user,
        (await hre.Diamond.minimumCollateralizationRatio()).add((15e8).toString()),
    );
    const maxWithdrawValue = collateralValue.sub(minCollateralRequired);
    const maxWithdrawAmount = maxWithdrawValue.wadDiv(await collateral.getPrice());

    return { maxWithdrawValue, maxWithdrawAmount };
};
