import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { UniswapV2Factory, WETH } from "types";
import { getLogger } from "@kreskolabs/lib";
import { testnetConfigs } from "@deploy-config/testnet-goerli";
import { JStoFixed } from "@kreskolabs/lib";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { ethers } = hre;
    const pools = testnetConfigs[hre.network.name].pools;
    const logger = getLogger("create-uni-pools");
    const Factory = await ethers.getContract<UniswapV2Factory>("UniswapV2Factory");

    for (const pool of pools) {
        const [assetA, assetB, amountB] = pool;
        logger.log(`Adding liquidity ${assetA.name}-${assetB.name}`);
        const amountA = JStoFixed(
            (amountB * hre.fromBig(await assetB.price!(), 8)) / hre.fromBig(await assetA.price!(), 8),
            2,
        );
        if (assetB.symbol === "krTSLA") {
            continue;
        }
        const token0 = await hre.ethers.getContract(assetA.symbol);
        const token1 = await hre.ethers.getContract(assetB.symbol);
        const pairAddress = await Factory.getPair(token0.address, token1.address);

        if (assetB.symbol === "WETH") {
            await (await hre.ethers.getContract<WETH>("WETH"))["deposit(uint256)"](hre.toBig(amountB));
        } else if (assetA.symbol === "WETH") {
            await (await hre.ethers.getContract<WETH>("WETH"))["deposit(uint256)"](hre.toBig(amountA));
        }
        if (pairAddress === ethers.constants.AddressZero) {
            await hre.run("add-liquidity-v2", {
                tknA: {
                    address: token0.address,
                    amount: amountA,
                },
                tknB: {
                    address: token1.address,
                    amount: amountB,
                },
            });
        } else {
            console.log("Pair Found", `${assetA.symbol}- ${assetB.symbol}`);
        }
    }

    logger.success("succesfully added liquidity for pools");
};

func.tags = ["testnet", "add-liquidity", "all", "staking-deployment"];

export default func;
