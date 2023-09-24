import { smock } from "@defi-wonderland/smock";
import { allRedstoneAssets } from "@deploy-config/shared";
import { toBig } from "@kreskolabs/lib";
import { envCheck } from "@utils/general";
import { wrapKresko } from "@utils/redstone";
import hre from "hardhat";
import optimized from "./optimizations";
import { ERC20Upgradeable__factory } from "types/typechain";
import {
    CollateralAssetStruct,
    OracleConfigurationStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { InputArgs, TestCollateralAssetArgs, TestCollateralAssetUpdate, defaultCollateralArgs } from "../mocks";
import { OracleType } from "../oracles";
import { getFakeOracle, setPrice } from "./oracle";
import { getBalanceCollateralFunc, setBalanceCollateralFunc } from "./smock";

envCheck();

export const getCollateralConfig = async (
    asset: { symbol: Function; decimals: Function },
    anchor: string,
    cFactor: BigNumber,
    liquidationIncentive: BigNumber,
    pushOracle: string,
    customRedstoneId?: string,
    oracleIds: [OracleType, OracleType] = [OracleType.Redstone, OracleType.Chainlink],
): Promise<[OracleConfigurationStruct, CollateralAssetStruct]> => {
    if (cFactor.gt(toBig(1))) throw new Error("cFactor must be less than 1");
    if (liquidationIncentive.lt(toBig(1))) throw new Error("Liquidation incentive must be greater than 1");
    const [decimals, symbol] = await Promise.all([asset.decimals(), asset.symbol()]);
    const redstoneId = customRedstoneId
        ? hre.ethers.utils.formatBytes32String(customRedstoneId)
        : allRedstoneAssets[symbol as keyof typeof allRedstoneAssets];
    if (!redstoneId) {
        throw new Error(`redstoneId not found for ${symbol}`);
    }

    const oracleConfig: OracleConfigurationStruct = {
        oracleIds: oracleIds,
        feeds:
            oracleIds[0] === OracleType.Redstone
                ? [hre.ethers.constants.AddressZero, pushOracle]
                : [pushOracle, hre.ethers.constants.AddressZero],
    };
    const AssetConfig: CollateralAssetStruct = {
        anchor,
        factor: cFactor,
        liquidationIncentive,
        decimals,
        exists: true,
        id: redstoneId,
        oracles: oracleIds,
    };
    return [oracleConfig, AssetConfig];
};

export const addMockCollateralAsset = async (
    args: TestCollateralAssetArgs = defaultCollateralArgs,
): Promise<TestCollateral> => {
    const { deployer } = await hre.ethers.getNamedSigners();
    const { name, price, factor, symbol, decimals } = args;
    const cFactor = toBig(factor);
    const [fakeFeed, contract] = await Promise.all([
        getFakeOracle(price),
        (await smock.mock<ERC20Upgradeable__factory>("ERC20Upgradeable")).deploy(),
    ]);

    contract.name.returns(name);
    contract.symbol.returns(symbol);
    contract.decimals.returns(decimals);

    const [config] = await Promise.all([
        getCollateralConfig(
            contract,
            hre.ethers.constants.AddressZero,
            cFactor,
            toBig(process.env.LIQUIDATION_INCENTIVE!),
            args.pushOracle || fakeFeed.address,
            args.redstoneId,
            args.oracleIds,
        ),
        contract.setVariable("_initialized", 0),
    ]);
    await wrapKresko(hre.Diamond, deployer).addCollateralAsset(contract.address, ...config);

    const asset: TestCollateral = {
        address: contract.address,
        contract,
        kresko: () => hre.Diamond.getCollateralAsset(contract.address),
        priceFeed: fakeFeed,
        deployArgs: args,
        setPrice: price => setPrice(fakeFeed, price),
        setOracleOrder: order => hre.Diamond.updateCollateralOracleOrder(contract.address, order),
        getPrice: async () => (await fakeFeed.latestRoundData())[1],
        setBalance: setBalanceCollateralFunc(contract),
        balanceOf: getBalanceCollateralFunc(contract),
        update: update => updateCollateralAsset(contract.address, update),
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
    if (!collateral) throw new Error(`Collateral ${address} not found`);

    await wrapKresko(hre.Diamond, deployer).updateCollateralAsset(
        collateral!.address,
        ...(await getCollateralConfig(
            collateral!.contract,
            hre.ethers.constants.AddressZero,
            toBig(args.factor),
            toBig(process.env.LIQUIDATION_INCENTIVE!),
            args.pushOracle || collateral.priceFeed.address,
            args.redstoneId,
            args.oracleIds,
        )),
    );
    collateral.deployArgs = { ...collateral.deployArgs, ...args };
    const found = hre.collaterals.findIndex(c => c.address === collateral.address);
    if (found === -1) {
        hre.collaterals.push(collateral);
        hre.allAssets.push(collateral);
    } else {
        hre.collaterals = hre.collaterals.map(c => (c.address === collateral.address ? collateral : c));
        hre.allAssets = hre.allAssets.map(c => (c.address === collateral.address && c.collateral ? collateral : c));
    }
    return collateral;
};

export const depositMockCollateral = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const depositAmount = convert ? toBig(+amount, await asset.contract.decimals()) : amount;
    await asset.contract.setVariables({
        _balances: {
            [user.address]: depositAmount,
        },
        _allowances: {
            [user.address]: {
                [hre.Diamond.address]: depositAmount,
            },
        },
    });
    return wrapKresko(hre.Diamond, user).depositCollateral(user.address, asset.contract.address, depositAmount);
};

export const depositCollateral = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const depositAmount = convert ? toBig(+amount) : amount;
    if ((await asset.contract.allowance(user.address, hre.Diamond.address)).lt(depositAmount)) {
        await asset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    }
    return wrapKresko(hre.Diamond, user).depositCollateral(user.address, asset.address, depositAmount);
};

export const withdrawCollateral = async (args: InputArgs) => {
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    const { user, asset, amount } = args;
    const depositAmount = convert ? toBig(+amount) : amount;

    return wrapKresko(hre.Diamond, user).withdrawCollateral(
        user.address,
        asset.address,
        depositAmount,
        optimized.getAccountDepositIndex(user.address, asset.address),
    );
};

export const getMaxWithdrawal = async (user: string, collateral: any) => {
    const [[collateralValue], MCR, collateralPrice] = await Promise.all([
        hre.Diamond.getAccountCollateralValueOf(user, collateral.address),
        hre.Diamond.getMinCollateralRatio(),
        collateral.getPrice(),
    ]);

    const minCollateralRequired = await hre.Diamond.getAccountMinCollateralAtRatio(user, MCR.add((15e8).toString()));
    const maxWithdrawValue = collateralValue.sub(minCollateralRequired);
    const maxWithdrawAmount = maxWithdrawValue.wadDiv(collateralPrice);

    return { maxWithdrawValue, maxWithdrawAmount };
};
