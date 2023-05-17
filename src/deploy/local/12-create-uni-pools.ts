import { testnetConfigs } from "@deploy-config/opgoerli";
import { JStoFixed, fromBig, getLogger, toBig } from "@kreskolabs/lib";
import { TASK_UNIV2_ADD_LIQUIDITY } from "@tasks";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("create-uni-pools");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const pools = testnetConfigs[hre.network.name].pools;
    const Factory = await hre.getContractOrFork("UniswapV2Factory");

    for (const pool of pools) {
        const [assetA, assetB, amountB] = pool;
        logger.log(`Adding liquidity ${assetA.name}-${assetB.name}`);
        const amountA = JStoFixed((amountB * fromBig(await assetB.price!(), 8)) / fromBig(await assetA.price!(), 8), 2);
        if (assetB.symbol === "krTSLA") {
            continue;
        }
        const token0 = await hre.getContractOrFork("ERC20Upgradeable", assetA.symbol);
        const token1 = await hre.getContractOrFork("ERC20Upgradeable", assetB.symbol);
        const pairAddress = await Factory.getPair(token0.address, token1.address);

        if (assetB.symbol === "WETH") {
            await (await hre.getContractOrFork("WETH"))["deposit(uint256)"](toBig(amountB));
        } else if (assetA.symbol === "WETH") {
            await (await hre.getContractOrFork("WETH"))["deposit(uint256)"](toBig(amountA));
        }
        if (pairAddress === hre.ethers.constants.AddressZero) {
            await hre.run(TASK_UNIV2_ADD_LIQUIDITY, {
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

deploy.tags = ["local", "add-liquidity", "all", "staking-deployment"];
deploy.skip = async hre => hre.network.live || !!process.env.COVERAGE;

export default deploy;
