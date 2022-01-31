import { ethers } from "ethers";
import { task } from "hardhat/config";
import { formatUnits } from "@utils/numbers";

task("gastest", "Creates collaterals and krAssets, deposits and mints them", async (params, hre) => {
    const { admin } = await hre.getNamedAccounts();
    const { deploy, kresko } = hre;
    const depositAmount = ethers.utils.parseEther("1000");
    const withdrawAmount = ethers.utils.parseEther("10");

    const mintAmount = ethers.utils.parseEther("10");

    for (let i = 0; i <= 100; i++) {
        const [Dollar] = await deploy<Token>("Token" + i, {
            contract: "Token",
            from: admin,
            log: true,
            args: ["C", "C" + i, ethers.utils.parseEther("10000000")],
        });
        let tx = await Dollar.approve(kresko.address, hre.ethers.constants.MaxUint256);
        await tx.wait();

        const [Oracle] = await deploy<BasicOracle>("BasicOracle" + i, {
            contract: "Oracle",
            from: admin,
            log: true,
            args: [admin],
        });

        tx = await Oracle.setValue("100000");
        await tx.wait();
        tx = await kresko.addCollateralAsset(Dollar.address, 0.7, Oracle.address, false);
        await tx.wait();
        tx = await kresko.depositCollateral(Dollar.address, depositAmount);
        await tx.wait();

        const [CollateralOracle] = await deploy<BasicOracle>("BasicOracle", {
            contract: "Oracle" + i,
            from: admin,
            log: true,
            args: [admin],
        });

        tx = await CollateralOracle.setValue("10");
        await tx.wait();

        const [CR] = await deploy<KreskoAsset>("CR" + i, {
            from: admin,
            log: true,
            contract: "KrOil",
            proxy: {
                owner: admin,
                proxyContract: "OptimizedTransparentProxy",
                execute: {
                    methodName: "initialize",
                    args: ["CR" + i, "CR" + i, admin, kresko.address],
                },
            },
        });

        tx = await kresko.addCollateralAsset(CR.address, 1, CollateralOracle.address, false);
        await tx.wait();

        tx = await kresko.mintKreskoAsset(CR.address, mintAmount);
        const mintReceipt = await tx.wait();
        const gasUsedForMint = Number(formatUnits(mintReceipt.gasUsed, "wei"));

        tx = await kresko.withdrawCollateral(Dollar.address, withdrawAmount, 0);

        const withdrawReceipt = await tx.wait();
        const gasUsedWithdraw = Number(formatUnits(withdrawReceipt.gasUsed, "wei"));

        console.log("Iteration", i, "Gas used for withdraw", gasUsedWithdraw, "Gas used for mint", gasUsedForMint);
    }
});
