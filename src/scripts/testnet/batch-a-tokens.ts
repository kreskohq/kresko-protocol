import { assets, batchALiquidity, batchAStakingPools, testnetConfigs } from "@deploy-config/testnet-goerli";
import { JStoFixed, getLogger } from "@kreskolabs/lib";
import { getOracle } from "@utils/general";

async function run() {
    const logger = getLogger("batch-a");

    const { getNamedAccounts } = hre;
    const { deployer, testnetFunder } = await getNamedAccounts();
    const config = testnetConfigs[hre.network.name];
    const [rewardToken1] = config.rewardTokens;
    const Reward1 = await hre.getContractOrFork("ERC20PresetMinterPauser", rewardToken1.symbol);
    const RewardTokens = [Reward1.address];

    hre.Diamond = await hre.getContractOrFork("Kresko");
    const Diamond = hre.Diamond;
    const Factory = await hre.getContractOrFork("UniswapV2Factory");
    const Staking = await hre.getContractOrFork("KrStaking");

    await hre.deploy("WBTC", {
        from: deployer,
        deploymentName: "wBTC",
        args: ["Wrapped Bitcoin", "wBTC", 8],
    });

    const [Funder] = await hre.deploy("Funder", {
        from: deployer,
        args: [Diamond.address],
        deploymentName: "Funder",
    });
    const isOwner = await Funder.owners(testnetFunder);
    if (!isOwner) {
        await Funder.toggleOwners([testnetFunder]);
    }

    // await Funder.toggleOwners([testnetFunder]);
    // await wBTC["deposit(uint256)"](hre.toBig(assets.wBTC.mintAmount!, 8));
    // logger.log(`Funder deployed at ${Funder.address}`);
    /* -------------------------------------------------------------------------- */

    const batchKrAsset = [assets.krBABA, assets.krGME, assets.krQQQ, assets.krMSTR];
    const batchCollateral = [assets.krBABA, assets.krGME, assets.krQQQ, assets.krMSTR, assets.OP, assets.wBTC];

    /* -------------------------------------------------------------------------- */
    /*                                ADD KRASSETS                                */
    /* -------------------------------------------------------------------------- */
    logger.log(`Adding krAssets`);

    for (const asset of batchKrAsset) {
        logger.log(`Adding KrAsset ${asset.symbol}`);

        const oracleAddr = await getOracle(asset.oracle!.description, hre);
        const contract = await hre.getContractOrFork("KreskoAsset", asset.symbol);
        if (!oracleAddr || oracleAddr === hre.ethers.constants.AddressZero || !contract) {
            throw new Error(`Oracle ${asset.oracle!.description} address is 0`);
        }
        if (!asset.kFactor || asset.kFactor === 0) {
            throw new Error(`K factor for ${asset.symbol} is 0`);
        }

        await hre.run("add-krasset", {
            symbol: await contract.symbol(),
            kFactor: asset.kFactor,
            supplyLimit: 2_000_000,
            oracleAddr: oracleAddr,
            marketStatusOracleAddr: oracleAddr,
        });
        logger.success(`Added KrAsset ${asset.symbol}`);

        logger.log(`Minting KrAsset to deployer ${asset.symbol}`);
        await Diamond.mintKreskoAsset(deployer, contract.address, hre.toBig(asset.mintAmount!));
        logger.log(`Minted KrAsset to deployer ${asset.symbol}`);
    }
    logger.log(`Added krAssets`);

    /* -------------------------------------------------------------------------- */
    /*                               ADD COLLATERALS                              */
    /* -------------------------------------------------------------------------- */
    logger.log(`Adding collaterals`);

    for (const asset of batchCollateral) {
        logger.log(`Adding Collateral ${asset.symbol}`);
        const oracleAddr = await getOracle(asset.oracle!.description, hre);
        const contract = await hre.getContractOrFork("ERC20Upgradeable", asset.symbol);
        if (!oracleAddr || oracleAddr === hre.ethers.constants.AddressZero || !contract) {
            throw new Error(`Oracle ${asset.oracle!.description} address is 0`);
        }

        if (!asset.cFactor || asset.cFactor === 0) {
            throw new Error(`K factor for ${asset.symbol} is 0`);
        }
        await hre.run("add-collateral", {
            symbol: await contract.symbol(),
            cFactor: asset.cFactor,
            oracleAddr: oracleAddr,
            marketStatusOracleAddr: oracleAddr,
            log: !process.env.TEST,
        });
        logger.success(`Added Collateral ${asset.symbol}`);
    }

    // logger.log(`Added collaterals`);

    /* -------------------------------------------------------------------------- */
    /*                                ADD LIQUIDITY                               */
    /* -------------------------------------------------------------------------- */
    logger.log(`Adding liquidity`);

    for (const pool of batchALiquidity) {
        const [assetA, assetB, amountB] = pool;

        logger.log(`Adding liquidity ${assetA.name}-${assetB.name}`);

        const amountA = JStoFixed(
            (amountB * hre.fromBig(await assetB.price!(), 8)) / hre.fromBig(await assetA.price!(), 8),
            2,
        );

        const token0 = await hre.getContractOrFork("ERC20Upgradeable", assetA.symbol);
        const token1 = await hre.getContractOrFork("ERC20Upgradeable", assetB.symbol);
        const pairAddress = await Factory.getPair(token0.address, token1.address);
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

        if (pairAddress === hre.ethers.constants.AddressZero) {
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

            logger.success(`Added liquidity ${assetA.name}-${assetB.name}`);
        } else {
            console.log("Pair Found", `${assetA.symbol}- ${assetB.symbol}`);
        }
    }

    logger.log(`Added liquidity`);

    /* -------------------------------------------------------------------------- */
    /*                              ADD STAKING POOLS                             */
    /* -------------------------------------------------------------------------- */

    logger.log(`Adding staking pools`);

    for (const stakingPool of batchAStakingPools) {
        const [token0, token1] = stakingPool.lpToken;

        const Token0 = await hre.getContractOrFork("ERC20Upgradeable", token0.symbol);
        const Token1 = await hre.getContractOrFork("ERC20Upgradeable", token1.symbol);
        const lpToken = await Factory.getPair(Token0.address, Token1.address);

        const result0 = await Staking.getPidFor(lpToken);
        if (!result0.found) {
            logger.log(`Adding staking pool ${token0.symbol}-${token1.symbol}`);
            const tx = await Staking.addPool(RewardTokens, lpToken, stakingPool.allocPoint, 6098000);
            await tx.wait();
            logger.success(`Added staking pool ${token0.symbol}-${token1.symbol}`);
        }
    }
    logger.log(`Added staking pools`);
    logger.success(`Added all assets and pools`);
}

run()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
