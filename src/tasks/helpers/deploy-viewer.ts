import { deployWithSignatures, getLogger } from "@utils/deployment";
import { fromBig } from "@utils/numbers";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { KreskoViewer } from "types";

task("deploy:kresko-viewer")
    .addOptionalParam("kreskoAddr", "Address of Kresko")
    .addOptionalParam("stakingAddr", "Address of Staking")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);
        const { kreskoAddr, stakingAddr, log } = taskArgs;
        const logger = getLogger("deployViewer", log);
        const Kresko = kreskoAddr
            ? await ethers.getContractAt<Kresko>("Kresko", kreskoAddr)
            : await ethers.getContract<Kresko>("Kresko");
        const Staking = stakingAddr
            ? await ethers.getContractAt<Kresko>("KrStaking", stakingAddr)
            : await ethers.getContract<Kresko>("KrStaking");

        // Deploy kresko viewer
        const [viewer] = await deploy<KreskoViewer>("KreskoViewer", {
            from: deployer,
            log,
            args: [Kresko.address, Staking.address],
        });

        if (log) {
            const [krAssets, collaterals, healthFactor, debtUSD, collateralUSD, minCollateralUSD] = (
                await viewer.getAccountData(deployer, [])
            ).user;

            logger.log({
                collaterals: collaterals.map(collateral => ({
                    index: Number(collateral.index),
                    cFactor: fromBig(collateral.cFactor),
                    address: collateral.assetAddress,
                    tokenId: collateral.symbol,
                    decimals: Number(collateral.decimals),
                    price: fromBig(collateral.price, 8),
                    amount: fromBig(collateral.amount, collateral.decimals),
                    amountUSD: fromBig(collateral.amountUSD, 8),
                })),
                krAssets: krAssets.map(collateral => ({
                    index: Number(collateral.index),
                    kFactor: fromBig(collateral.kFactor),
                    mintable: collateral.mintable,
                    address: collateral.assetAddress,
                    tokenId: collateral.symbol,
                    price: fromBig(collateral.price, 8),
                    amount: fromBig(collateral.amount),
                    amountUSD: fromBig(collateral.amountUSD, 8),
                })),
                healthFactor: fromBig(healthFactor),
                minCollateralUSD: fromBig(minCollateralUSD, 8),
                collateralUSD: fromBig(collateralUSD, 8),
                debtUSD: fromBig(debtUSD, 8),
            });

            const assetInfos = await viewer.getGlobalData(
                collaterals.map(coll => coll.assetAddress),
                krAssets.map(kr => kr.assetAddress),
            );

            logger.log({
                collateralInfo: assetInfos.collateralAssets.map(coll => ({
                    cFactor: fromBig(coll.cFactor),
                    address: coll.assetAddress,
                    oracleAddress: coll.oracleAddress,
                    price: fromBig(coll.price, 8),
                    value: fromBig(coll.value, 8),
                    symbol: coll.symbol,
                    name: coll.name,
                    decimals: coll.decimals,
                })),
                krAssets: assetInfos.krAssets.map(kr => ({
                    kFactor: fromBig(kr.kFactor),
                    address: kr.assetAddress,
                    oracleAddress: kr.oracleAddress,
                    price: fromBig(kr.price, 8),
                    value: fromBig(kr.value, 8),
                    name: kr.name,
                    symbol: kr.name,
                })),
            });

            logger.success("Viewer deployed @ ", viewer.address);
        }

        return;
    });
