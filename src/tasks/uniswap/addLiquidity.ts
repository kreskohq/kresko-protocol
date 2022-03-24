import { fromBig, toBig } from "@utils/numbers";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { UniswapV2Factory, UniswapV2Pair, UniswapV2Router02 } from "types";

task("uniswap:addliquidity")
    .addParam("tknA", "Token A address and value to provide", {}, types.json)
    .addParam("tknB", "Token B address and value to provide", {}, types.json)
    .addOptionalParam("factoryAddr", "Factory address")
    .addOptionalParam("routerAddr", "Router address")
    .addOptionalParam("log", "Log balances", true, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();
        const { tknA, tknB, factoryAddr, routerAddr, log, wait } = taskArgs;

        const TknA = await ethers.getContractAt<Token>("Token", tknA.address);
        const TknB = await ethers.getContractAt<Token>("Token", tknB.address);

        const tknADec = await TknA.decimals();
        const tknBDec = await TknB.decimals();

        let UniFactory: UniswapV2Factory;
        let UniRouter: UniswapV2Router02;
        if (factoryAddr && routerAddr) {
            UniFactory = await ethers.getContractAt<UniswapV2Factory>("UniswapV2Factory", factoryAddr);
            UniRouter = await ethers.getContractAt<UniswapV2Router02>("UniswapV2Router02", routerAddr);
        } else {
            UniFactory = await ethers.getContract<UniswapV2Factory>("UniswapV2Factory");
            UniRouter = await ethers.getContract<UniswapV2Router02>("UniswapV2Router02");
        }

        const approvalTknA = fromBig(await TknA.allowance(deployer, UniRouter.address), tknADec);
        const approvalTknB = fromBig(await TknB.allowance(deployer, UniRouter.address), tknBDec);

        if (approvalTknA < tknA.amount) {
            console.log("TknA allowance too low, approving UniRouter..");
            const tx = await TknA.approve(UniRouter.address, ethers.constants.MaxUint256);
            await tx.wait(wait);
            console.log("Approval success");
        }

        if (approvalTknB < tknB.amount) {
            console.log("TknB allowance too low, approving UniRouter..");
            const tx = await TknB.approve(UniRouter.address, ethers.constants.MaxUint256);
            await tx.wait(wait);
            console.log("Approval success");
        }

        const tknAName = await TknA.name();
        const tknBName = await TknB.name();
        console.log("Adding LP for", tknAName, tknBName);

        // Add initial LP (also creates the pair) according to oracle price
        const tx = await UniRouter.addLiquidity(
            TknA.address,
            TknB.address,
            toBig(tknA.amount, tknADec),
            toBig(tknB.amount, tknBDec),
            "0",
            "0",
            deployer,
            (Date.now() / 1000 + 9000).toFixed(0),
        );
        await tx.wait(wait);

        const Pair = await ethers.getContractAt<UniswapV2Pair>(
            "UniswapV2Pair",
            await UniFactory.getPair(TknA.address, TknB.address),
        );

        const LPBalanceOfDeployer = await Pair.balanceOf(deployer);
        if (log) {
            console.log("Deployer has", fromBig(LPBalanceOfDeployer).toFixed(2), "LP tokens");
            console.log("Unipair has", fromBig(await TknA.balanceOf(Pair.address), tknADec), tknAName);
            console.log("Unipair has", fromBig(await TknB.balanceOf(Pair.address), tknBDec), tknBName);
        }

        return Pair;
    });
