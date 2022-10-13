import { getLogger } from "@kreskolabs/lib/dist/utils";
import { fromBig } from "@kreskolabs/lib";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("initialize-viewer")
    .addOptionalParam("stakingAddr", "Address of Staking")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        const { stakingAddr, log } = taskArgs;
        const logger = getLogger("deployViewer", log);

        const Staking = stakingAddr
            ? await ethers.getContractAt<Kresko>("KrStaking", stakingAddr)
            : await ethers.getContract<Kresko>("KrStaking");

        if (log) {
            const [krAssets, collaterals, healthFactor, debtUSD, collateralUSD, minCollateralUSD] = (
                await hre.Diamond.getAccountData(deployer, [], Staking.address)
            ).user;

            logger.log({
                collaterals: collaterals.map(collateral => ({
                    index: Number(collateral.index),
                    cFactor: fromBig(collateral.cFactor.rawValue),
                    address: collateral.assetAddress,
                    tokenId: collateral.symbol,
                    decimals: Number(collateral.decimals),
                    price: fromBig(collateral.price, 8),
                    amount: fromBig(collateral.amount, collateral.decimals),
                    amountUSD: fromBig(collateral.amountUSD.rawValue, 8),
                })),
                krAssets: krAssets.map(collateral => ({
                    index: Number(collateral.index),
                    kFactor: fromBig(collateral.kFactor.rawValue),
                    address: collateral.assetAddress,
                    tokenId: collateral.symbol,
                    price: fromBig(collateral.price, 8),
                    amount: fromBig(collateral.amount),
                    amountUSD: fromBig(collateral.amountUSD.rawValue, 8),
                })),
                healthFactor: fromBig(healthFactor.rawValue),
                minCollateralUSD: fromBig(minCollateralUSD.rawValue, 8),
                collateralUSD: fromBig(collateralUSD.rawValue, 8),
                debtUSD: fromBig(debtUSD.rawValue, 8),
            });

            const assetInfos = await hre.Diamond.getGlobalData(
                collaterals.map(coll => coll.assetAddress),
                krAssets.map(kr => kr.assetAddress),
            );

            logger.log({
                collateralInfo: assetInfos.collateralAssets.map(coll => ({
                    cFactor: fromBig(coll.cFactor.rawValue),
                    address: coll.assetAddress,
                    oracleAddress: coll.oracleAddress,
                    price: fromBig(coll.price, 8),
                    value: fromBig(coll.value, 8),
                    symbol: coll.symbol,
                    name: coll.name,
                    decimals: coll.decimals,
                })),
                krAssets: assetInfos.krAssets.map(kr => ({
                    kFactor: fromBig(kr.kFactor.rawValue),
                    address: kr.assetAddress,
                    oracleAddress: kr.oracleAddress,
                    price: fromBig(kr.price, 8),
                    value: fromBig(kr.value, 8),
                    name: kr.name,
                    symbol: kr.symbol,
                })),
            });

            logger.success("Viewer initialized");
        }

        return;
    });
