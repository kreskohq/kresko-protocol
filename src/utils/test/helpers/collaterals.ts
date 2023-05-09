import hre from "hardhat";
import { smock } from "@defi-wonderland/smock";
import { toFixedPoint, toBig, fromBig } from "@kreskolabs/lib";
import { TestCollateralAssetArgs, defaultCollateralArgs, TestCollateralAssetUpdate, InputArgs } from "../mocks";
import { getMockOracleFor, setPrice } from "./general";
import { ERC20Upgradeable__factory, FluxPriceFeed__factory } from "types/typechain";

export const addMockCollateralAsset = async (
    args: TestCollateralAssetArgs = defaultCollateralArgs,
): Promise<TestCollateral> => {
    const { deployer } = await hre.ethers.getNamedSigners();
    const { name, price, factor, decimals } = args;
    const [MockOracle, FakeOracle] = await getMockOracleFor(name, price);

    const TestCollateral = await (await smock.mock<ERC20Upgradeable__factory>("ERC20Upgradeable")).deploy();
    await TestCollateral.setVariable("_initialized", 0);

    TestCollateral.name.returns(name);
    TestCollateral.symbol.returns(name);
    TestCollateral.decimals.returns(decimals);
    const cFactor = toFixedPoint(factor);

    await hre.Diamond.connect(deployer).addCollateralAsset(
        TestCollateral.address,
        hre.ethers.constants.AddressZero,
        cFactor,
        MockOracle.address,
        MockOracle.address,
    );
    const mocks = {
        contract: TestCollateral,
        mockFeed: MockOracle,
        priceFeed: FakeOracle,
    };
    const asset: TestCollateral = {
        address: TestCollateral.address,
        contract: ERC20Upgradeable__factory.connect(TestCollateral.address, deployer),
        kresko: () => hre.Diamond.collateralAsset(TestCollateral.address),
        priceFeed: FluxPriceFeed__factory.connect(FakeOracle.address, deployer),
        deployArgs: args,
        anchor: {} as any,
        mocks,
        setPrice: price => setPrice(mocks, price),
        getPrice: () => MockOracle.latestAnswer(),
        setBalance: async (user, amount) => {
            const totalSupply = await TestCollateral.totalSupply();
            await mocks.contract.setVariable("_totalSupply", totalSupply.add(amount));
            await mocks.contract.setVariable("_balances", {
                [user.address]: amount,
            });
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

    await hre.Diamond.connect(deployer).updateCollateralAsset(
        collateral!.address,
        hre.ethers.constants.AddressZero,
        toFixedPoint(args.factor),
        args.oracle || collateral!.priceFeed.address,
        args.oracle || collateral!.priceFeed.address,
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

    await asset.mocks.contract.setVariable("_balances", {
        [user.address]: depositAmount,
    });

    await asset.mocks.contract.setVariable("_allowances", {
        [user.address]: {
            [hre.Diamond.address]: depositAmount,
        },
    });
    return hre.Diamond.connect(user).depositCollateral(user.address, asset.contract.address, depositAmount);
};

export const depositCollateral = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const depositAmount = convert ? toBig(+amount) : amount;
    await asset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    return hre.Diamond.connect(user).depositCollateral(user.address, asset.address, depositAmount);
};

export const withdrawCollateral = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const depositAmount = convert ? toBig(+amount) : amount;
    await asset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    const cIndex = await hre.Diamond.getDepositedCollateralAssetIndex(user.address, asset.address);
    return hre.Diamond.connect(user).withdrawCollateral(user.address, asset.address, depositAmount, cIndex);
};

export const getMaxWithdrawal = async (user: string, collateral: any) => {
    const [collateralValue] = await hre.Diamond.getAccountSingleCollateralValueAndRealValue(user, collateral.address);

    const minCollateralRequired = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
        user,
        await hre.Diamond.minimumCollateralizationRatio(),
    );
    const maxWithdrawValue = fromBig(collateralValue.rawValue.sub(minCollateralRequired.rawValue.add(1427)), 8);
    const maxWithdrawAmount = maxWithdrawValue / fromBig(await collateral.getPrice(), 8);

    return { maxWithdrawValue, maxWithdrawAmount: toBig(maxWithdrawAmount, 18) };
};
