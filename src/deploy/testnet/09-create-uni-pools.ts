import { AddressZero } from "@utils";
import { getLogger } from "@utils/deployment";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "src/deploy-config";
import { UniswapV2Factory } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { ethers } = hre;
    const pools = testnetConfigs[hre.network.name].pools;
    const logger = getLogger("create-uni-pools");
    const Factory = await ethers.getContract<UniswapV2Factory>("UniswapV2Factory");

    for (const pool of pools) {
        const [assetA, assetB, amountB] = pool;
        logger.log(`Adding liquidity ${assetA.name}-${assetB.name}`);
        const amountA = (amountB * hre.fromBig(await assetB.price(), 8)) / hre.fromBig(await assetA.price(), 8);

        const token0 = await hre.ethers.getContract(assetA.symbol);
        const token1 = await hre.ethers.getContract(assetB.symbol);

        console.log(hre.fromBig(await token1.balanceOf((await hre.getNamedAccounts()).deployer)));

        const pairAddress = await Factory.getPair(token0.address, token1.address);

        if (pairAddress === AddressZero) {
            const pair = await hre.run("uniswap:addliquidity", {
                tknA: {
                    address: token0.address,
                    amount: amountA,
                },
                tknB: {
                    address: token1.address,
                    amount: amountB,
                },
            });
            hre.uniPairs[`${token0.symbol}-${token1.symbol}`] = pair;
        } else {
            hre.uniPairs[`${token0.symbol}-${token1.symbol}`] = await ethers.getContractAt(
                "UniswapV2Pair",
                pairAddress,
            );
        }
    }

    logger.success("succesfully added liquidity for pools");
};

func.tags = ["testnet", "create-pools"];

export default func;
