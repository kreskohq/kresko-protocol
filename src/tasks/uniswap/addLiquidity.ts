import { fromBig, toBig } from "@utils/numbers";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { UniswapV2Factory, UniswapV2Router02 } from "types";

task("uniswap:addliquidity")
    .addParam("tkn0", "Token 0 address and value to provide", {}, types.json)
    .addParam("tkn1", "Token 1 address and value to provide", {}, types.json)
    .addOptionalParam("factoryAddr", "Factory address")
    .addOptionalParam("routerAddr", "Router address")
    .addOptionalParam("log", "Log balances", true, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();
        const { tkn0, tkn1, factoryAddr, routerAddr, log, wait } = taskArgs;

        const Tkn0 = await ethers.getContractAt<Token>("Token", tkn0.address);
        const Tkn1 = await ethers.getContractAt<Token>("Token", tkn1.address);

        let UniFactory: UniswapV2Factory;
        let UniRouter: UniswapV2Router02;
        if (factoryAddr && routerAddr) {
            UniFactory = await ethers.getContractAt<UniswapV2Factory>("UniswapV2Factory", factoryAddr);
            UniRouter = await ethers.getContractAt<UniswapV2Router02>("UniswapV2Router02", routerAddr);
        } else {
            UniFactory = await ethers.getContract<UniswapV2Factory>("UniswapV2Factory");
            UniRouter = await ethers.getContract<UniswapV2Router02>("UniswapV2Router02");
        }

        const approvalTkn0 = fromBig(await Tkn0.allowance(deployer, UniRouter.address), await Tkn0.decimals());
        const approvalTkn1 = fromBig(await Tkn1.allowance(deployer, UniRouter.address), await Tkn1.decimals());

        if (approvalTkn0 < tkn0.amount) {
            console.log("Tkn0 allowance too low, approving UniRouter..");
            const tx = await Tkn0.approve(UniRouter.address, ethers.constants.MaxUint256);
            await tx.wait(wait);
            console.log("Approval success");
        }

        if (approvalTkn1 < tkn1.amount) {
            console.log("Tkn1 allowance too low, approving UniRouter..");
            const tx = await Tkn1.approve(UniRouter.address, ethers.constants.MaxUint256);
            await tx.wait(wait);
            console.log("Approval success");
        }

        // Approve adding LP

        // Add initial LP (also creates the pair) according to oracle price
        const tx = await UniRouter.addLiquidity(
            Tkn0.address,
            Tkn1.address,
            toBig(tkn0.amount, await Tkn0.decimals()),
            toBig(tkn1.amount, await Tkn1.decimals()),
            "0",
            "0",
            deployer,
            (Date.now() / 1000 + 9000).toFixed(0),
        );
        await tx.wait(wait);

        const Pair = await ethers.getContractAt("UniswapV2Pair", await UniFactory.getPair(Tkn0.address, Tkn1.address));

        const LPBalanceOfDeployer = await Pair.balanceOf(deployer);
        if (log) {
            console.log("Deployer has", fromBig(LPBalanceOfDeployer).toFixed(2), "LP tokens");
            console.log("Unipair has", fromBig(await Tkn0.balanceOf(Pair.address)), await Tkn0.name());
            console.log("Unipair has", fromBig(await Tkn1.balanceOf(Pair.address)), await Tkn1.name());
        }

        return Pair;
    });
