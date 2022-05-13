/* eslint-disable @typescript-eslint/ban-ts-comment */
import hre, { ethers } from "hardhat";
import { expect } from "chai";
import {
    addNewKreskoAssetWithOraclePrice,
    BigNumber,
    deployOracle,
    deploySimpleToken,
    deployUniswap,
    extractEventFromTxReceipt,
    extractInternalIndexedEventFromTxReceipt,
    extractInternalIndexedEventsFromTxReceipt,
    fromBig,
    MaxUint256,
    setupTestsStaking,
    toBig,
    toFixedPoint,
} from "@utils";
//@ts-ignore
import { time } from "@openzeppelin/test-helpers";
import type { ClaimRewardsEvent, DepositEvent, WithdrawEvent } from "types/contracts/KrStaking";
import type { LiquidityAndStakeAddedEvent, LiquidityAndStakeRemovedEvent } from "types/contracts/KrStakingUniHelper";
import type { UniswapV2Pair } from "types";

describe("Staking", function () {
    before(async function () {
        const { admin, userOne, userTwo } = await hre.getNamedAccounts();
        this.admin = admin;
        this.userOne = userOne;
        this.userTwo = userTwo;

        const { UniFactory, UniRouter } = await deployUniswap();
        this.UniFactory = UniFactory;
        this.UniRouter = UniRouter;

        const Kresko: Kresko = await hre.run("deploy:kresko");
        this.Kresko = Kresko;

        this.mintAmount = 50000000;
        this.collateralDeposit = 10000000;

        this.deployerUSDCBalance = this.mintAmount - this.collateralDeposit;

        // Add mock USDC with oracle price of 1
        const [USDC] = await deploySimpleToken("USDC", this.mintAmount);
        const Oracle = await deployOracle("USD Oracle", "/USD", 1);

        // Whitelist it as collateral
        await Kresko.addCollateralAsset(USDC.address, toFixedPoint(0.9), Oracle.address, false);

        // Approve and deposit collateral
        await USDC.approve(Kresko.address, MaxUint256);
        await Kresko.depositCollateral(admin, USDC.address, toBig(this.collateralDeposit));

        // Create krTSLA with oracle
        const TSLAPrice = 902.5;
        const { kreskoAsset: krTSLA } = await addNewKreskoAssetWithOraclePrice(
            Kresko,
            "krTSLA",
            "krTSLA",
            1.2,
            TSLAPrice,
            toBig(10_000_000),
        );

        // Create krTSLA with oracle
        const BABAPrice = 115.5;
        const { kreskoAsset: krBABA } = await addNewKreskoAssetWithOraclePrice(
            Kresko,
            "krBABA",
            "krBABA",
            1.2,
            BABAPrice,
            toBig(10_000_000),
        );

        // Create krTSLA with oracle
        const GOLDPrice = 1800.9;
        const { kreskoAsset: krGOLD } = await addNewKreskoAssetWithOraclePrice(
            Kresko,
            "krGOLD",
            "krGOLD",
            1.2,
            GOLDPrice,
            toBig(10_000_000),
        );

        // Mint 2000 krTSLA to admin
        await Kresko.mintKreskoAsset(admin, krTSLA.address, toBig(2000));

        // Set variables
        this.USDC = USDC;
        this.krBABA = krBABA;
        this.krGOLD = krGOLD;
        this.krTSLA = krTSLA;

        this.TSLAUSDCLiquidity = 902500;
        this.TSLALiquidity = this.TSLAUSDCLiquidity / TSLAPrice;

        this.BABAUSDCLiquidity = 115500;
        this.BABALiquidity = this.BABAUSDCLiquidity / BABAPrice;

        // Mint 2000 krTSLA to admin
        await Kresko.mintKreskoAsset(admin, krBABA.address, toBig(this.BABALiquidity));

        this.GOLDUSDCLiquidity = 1800090;
        this.GOLDLiquidity = this.GOLDUSDCLiquidity / GOLDPrice;

        // Mint 2000 krTSLA to admin
        await Kresko.mintKreskoAsset(admin, krGOLD.address, toBig(this.GOLDLiquidity));

        this.lpPair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: this.USDC.address,
                amount: this.TSLAUSDCLiquidity,
            },
            tknB: {
                address: this.krTSLA.address,
                amount: this.TSLALiquidity,
            },
            factoryAddr: this.UniFactory.address,
            routerAddr: this.UniRouter.address,
            log: false,
        });

        this.lpPairBABA = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: this.USDC.address,
                amount: this.BABAUSDCLiquidity,
            },
            tknB: {
                address: this.krBABA.address,
                amount: this.BABALiquidity,
            },
            factoryAddr: this.UniFactory.address,
            routerAddr: this.UniRouter.address,
            log: false,
        });

        this.lpPairGOLD = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: this.USDC.address,
                amount: this.GOLDUSDCLiquidity,
            },
            tknB: {
                address: this.krGOLD.address,
                amount: this.GOLDLiquidity,
            },
            factoryAddr: this.UniFactory.address,
            routerAddr: this.UniRouter.address,
            log: false,
        });
    });

    beforeEach(async function () {
        // Create fresh contracts for each test
        const { KrStaking, KrStakingUniHelper, RewardTKN1, RewardTKN2, signers } = await setupTestsStaking(
            this.lpPair.address,
            this.UniRouter.address,
            this.UniFactory.address,
        )();

        this.signers = signers;
        // Setup some state
        this.RewardTKN1 = RewardTKN1;
        this.RewardTKN2 = RewardTKN2;
        this.KrStaking = KrStaking;
        this.KrStakingUniHelper = KrStakingUniHelper;

        // Send some rewards to staking pool
        await this.RewardTKN1.mint(KrStaking.address, toBig(1000000));
        await this.RewardTKN2.mint(KrStaking.address, toBig(2000000));
    });

    describe("#KrStaking", function () {
        it("should record user deposit", async function () {
            // Get LP balance
            const lpBalance = await this.lpPair.balanceOf(this.admin);

            // Approve it
            await this.lpPair.approve(this.KrStaking.address, MaxUint256);

            // Deposit
            const res = await this.KrStaking.deposit(this.admin, 0, lpBalance);
            const { args } = await extractEventFromTxReceipt<DepositEvent>(res, "Deposit");

            const [pid, found] = await this.KrStaking.getPidFor(this.lpPair.address);

            // Ensure it emits correct values
            expect(found).to.be.true;
            expect(args.pid).to.equal(pid);
            expect(args.user).to.equal(this.admin);
            expect(args.amount).to.equal(lpBalance);

            // Get the deposit amount in Staking
            const depositAmount = (await this.KrStaking.userInfo(0, this.admin)).amount;

            // Ensure it equals amount sent
            expect(lpBalance).to.equal(depositAmount);
        });

        it("should give user rewards", async function () {
            // Reward per blocks per reward token
            const rewardPerBlockTKN1 = await this.KrStaking.rewardPerBlockFor(this.RewardTKN1.address);
            const rewardPerBlockTKN2 = await this.KrStaking.rewardPerBlockFor(this.RewardTKN2.address);

            // Get LP balance of user
            const lpBalance = await this.lpPair.balanceOf(this.admin);

            // Approve LP token usage for Staking
            await this.lpPair.approve(this.KrStaking.address, MaxUint256);
            await this.KrStaking.deposit(this.admin, 0, lpBalance);

            // Get the start block of deposit
            const startBlock = await time.latestBlock();

            // Claim rewards
            await this.KrStaking.claim(0, this.admin);
            let reward1Bal = await this.RewardTKN1.balanceOf(this.admin);
            let reward2Bal = await this.RewardTKN2.balanceOf(this.admin);

            // Should have rewards equal to one rewardPerBlock
            expect(reward1Bal).to.be.closeTo(rewardPerBlockTKN1, 1e12);
            expect(Number(reward1Bal)).to.not.be.greaterThan(Number(rewardPerBlockTKN1));

            expect(reward2Bal).to.be.closeTo(rewardPerBlockTKN2, 1e12);
            expect(Number(reward2Bal)).to.not.be.greaterThan(Number(rewardPerBlockTKN2));

            // Claim rewards again
            await this.KrStaking.claim(0, this.admin);

            // Get total blocks spent earning
            const blocksSpentEarning = (await time.latestBlock()) - startBlock;

            // Get balances of rewards claimed
            reward1Bal = await this.RewardTKN1.balanceOf(this.admin);
            reward2Bal = await this.RewardTKN2.balanceOf(this.admin);

            // Reward balances should equal blocks spent earning * reward per block
            expect(reward1Bal).to.be.closeTo(rewardPerBlockTKN1.mul(blocksSpentEarning), 1e12);
            expect(reward2Bal).to.be.closeTo(rewardPerBlockTKN2.mul(blocksSpentEarning), 1e12);
        });

        it("should be able to deposit and claim without withdrawing any tokens", async function () {
            // Get reward per block per token
            const rewardPerBlockTKN1 = await this.KrStaking.rewardPerBlockFor(this.RewardTKN1.address);
            const rewardPerBlockTKN2 = await this.KrStaking.rewardPerBlockFor(this.RewardTKN2.address);

            // Get LP balance
            let lpBalance = await this.lpPair.balanceOf(this.admin);

            // Approve LP token usage for Staking contract
            await this.lpPair.approve(this.KrStaking.address, MaxUint256);
            await this.KrStaking.deposit(this.admin, 0, lpBalance);
            // Get the reward start block
            const startBlock = await time.latestBlock();

            // Advance one block
            await time.advanceBlock();

            // Ensure deposits are correct
            const depositAmount = (await this.KrStaking.userInfo(0, this.admin)).amount;
            expect(lpBalance).to.equal(depositAmount);

            // Get pending rewards
            let [pendingRewards] = await this.KrStaking.allPendingRewards(this.admin);

            // Rewards should equal one block we advanced
            expect(pendingRewards.amounts[0]).to.be.closeTo(rewardPerBlockTKN1, 1e12);
            expect(pendingRewards.amounts[1]).to.be.closeTo(rewardPerBlockTKN2, 1e12);

            await this.Kresko.mintKreskoAsset(this.admin, this.krTSLA.address, toBig(10));
            // Add more liquidity to the LP pair
            await hre.run("uniswap:addliquidity", {
                tknA: {
                    address: this.USDC.address,
                    amount: 9025,
                },
                tknB: {
                    address: this.krTSLA.address,
                    amount: 10,
                },
                factoryAddr: this.UniFactory.address,
                routerAddr: this.UniRouter.address,
                log: false,
            });

            // Reassign LP balance since we added more
            lpBalance = await this.lpPair.balanceOf(this.admin);

            // Deposit it
            await this.KrStaking.deposit(this.admin, 0, lpBalance);

            // Get blocks spent earning
            let blocksSpentEarning = (await time.latestBlock()) - startBlock;

            // Get pending rewards
            [pendingRewards] = await this.KrStaking.allPendingRewards(this.admin);

            // Ensure they match the blocks spent earning
            expect(pendingRewards.amounts[0]).to.be.closeTo(rewardPerBlockTKN1.mul(blocksSpentEarning), 1e12);
            expect(pendingRewards.amounts[1]).to.be.closeTo(rewardPerBlockTKN2.mul(blocksSpentEarning), 1e12);

            // Claim rewards
            await this.KrStaking.claim(0, this.admin);
            blocksSpentEarning = (await time.latestBlock()) - startBlock;

            // Get reward token balances
            const rewardTKN1Bal = await this.RewardTKN1.balanceOf(this.admin);
            const rewardTKN2Bal = await this.RewardTKN2.balanceOf(this.admin);

            // Ensure they match the time spent earning
            expect(rewardTKN1Bal).to.be.closeTo(rewardPerBlockTKN1.mul(blocksSpentEarning), 1e12);
            expect(rewardTKN2Bal).to.be.closeTo(rewardPerBlockTKN2.mul(blocksSpentEarning), 1e12);

            // Get pending rewards
            [pendingRewards] = await this.KrStaking.allPendingRewards(this.admin);

            // Should be none
            expect(pendingRewards.amounts[0]).to.equal(0);
            expect(pendingRewards.amounts[1]).to.equal(0);

            // Claim rewards
            await this.KrStaking.claim(0, this.admin);
            blocksSpentEarning = (await time.latestBlock()) - startBlock;

            // Get balances after second claim
            const rewardTKN1BalSecondClaim = await this.RewardTKN1.balanceOf(this.admin);
            const rewardTKN2BalSecondClaim = await this.RewardTKN2.balanceOf(this.admin);

            // Ensure rewards match time spent earning and rewards do not exceed the reward per block
            expect(rewardTKN1BalSecondClaim).to.be.closeTo(rewardPerBlockTKN1.mul(blocksSpentEarning), 1e12);
            expect(Number(rewardTKN1BalSecondClaim)).to.not.be.greaterThan(
                Number(rewardPerBlockTKN1.mul(blocksSpentEarning)),
            );
            expect(rewardTKN2BalSecondClaim).to.be.closeTo(rewardPerBlockTKN2.mul(blocksSpentEarning), 1e12);
            expect(Number(rewardTKN2BalSecondClaim)).to.not.be.greaterThan(
                Number(rewardPerBlockTKN2.mul(blocksSpentEarning)),
            );
        });

        it("should be able to add more pools and deposit / withdraw / claim from them with multiple users", async function () {
            // Generate few mock staking tokens
            const [Token1] = await deploySimpleToken("MockStakingToken", 1000);
            const [Token2] = await deploySimpleToken("MockStakingToken2", 2400);

            // Add pools for both
            await this.KrStaking.addPool([this.RewardTKN1.address, this.RewardTKN2.address], Token1.address, 500, 0);
            // This one only rewards TKN1
            await this.KrStaking.addPool([this.RewardTKN2.address], Token2.address, 500, 0);

            // Ensure pools are added
            expect(await this.KrStaking.poolLength()).to.equal(3);

            // Ensure allocation point is updated correctly (initial pool has 1000)
            expect(await this.KrStaking.totalAllocPoint()).to.equal(2000);

            // Approve staking for both tokens
            await Token1.approve(this.KrStaking.address, MaxUint256);
            await Token2.approve(this.KrStaking.address, MaxUint256);

            // Deposit for two users (from admin) and for the admin.
            const userOnePoolOneDepositAmount = 1000;
            const userOnePoolTwoDepositAmount = 400;
            const userTwoPoolTwoDepositAmount = 1000;
            const adminPoolTwoDepositAmount = 1000;

            await this.KrStaking.deposit(this.signers.userOne.address, 1, toBig(userOnePoolOneDepositAmount));
            await this.KrStaking.deposit(this.signers.userOne.address, 2, toBig(userOnePoolTwoDepositAmount));
            await this.KrStaking.deposit(this.signers.userTwo.address, 2, toBig(userTwoPoolTwoDepositAmount));
            await this.KrStaking.deposit(this.signers.admin.address, 2, toBig(adminPoolTwoDepositAmount));

            // Advance blocks for rewards gains
            await time.advanceBlockTo((await time.latestBlock()) + 10);

            const depositors = [this.signers.admin, this.signers.userOne, this.signers.userTwo];

            // Check that each user is earning rewards accordingly
            const pendingRewards = await Promise.all(
                depositors.map(async depositor => await this.KrStaking.allPendingRewards(depositor.address)),
            );

            depositors.map((depositor, i) => {
                // Filter pool results with no rewards (pool 0)
                const poolRewards = pendingRewards[i].filter(reward => reward.amounts.find(val => fromBig(val) > 0));

                // User one deposited into two pools so has two reward entries
                if (depositor.address === this.signers.userOne.address) {
                    expect(poolRewards.length).to.equal(2);
                    // Rest have only one since they entered only pool 2
                } else {
                    expect(poolRewards.length).to.equal(1);
                }

                // Check rewards per pool
                poolRewards.map(poolReward => {
                    const [pidBig, tokens, rewardsBig] = poolReward;
                    const pid = Number(pidBig);
                    const rewards = rewardsBig.map(val => fromBig(val));

                    // Ensure that poolId 1 distributes two tokens
                    if (pid === 1) {
                        expect(tokens.length).to.equal(2);
                        expect(rewards.length).to.equal(2);
                    }
                    // Ensure that poolId 2 distributes only one token
                    if (pid === 2) {
                        expect(tokens.length).to.equal(1);
                    }

                    // Ensure that users are actually gaining rewards
                    rewards.map(reward => {
                        expect(reward).to.be.greaterThan(0);
                    });
                });
            });

            // Claim all rewards
            await Promise.all(
                depositors.map(
                    async depositor =>
                        await this.KrStaking.connect(depositor).withdraw(2, MaxUint256, depositor.address),
                ),
            );
            await this.KrStaking.connect(this.signers.userOne).withdraw(1, MaxUint256, this.signers.userOne.address);

            // Advance block for ensure we are not gaining rewards
            await time.advanceBlock();

            const pendingRewardsAfter = await Promise.all(
                depositors.map(async depositor => await this.KrStaking.allPendingRewards(depositor.address)),
            );

            // Ensure no rewards are dripping
            depositors.map((_, i) => {
                const poolRewards = pendingRewardsAfter[i].filter(({ amounts }) =>
                    amounts.find(val => fromBig(val) > 0),
                );
                expect(poolRewards.length).to.equal(0);
            });

            // Get reward and deposit token balances for each depositor
            const [adminBalances, userOneBalances, userTwoBalances] = await Promise.all(
                depositors.map(async depositor => ({
                    reward1Bal: fromBig(await this.RewardTKN1.balanceOf(depositor.address)),
                    reward2Bal: fromBig(await this.RewardTKN2.balanceOf(depositor.address)),
                    token1Bal: fromBig(await Token1.balanceOf(depositor.address)),
                    token2Bal: fromBig(await Token2.balanceOf(depositor.address)),
                })),
            );

            // Ensure admin balances
            expect(adminBalances.reward1Bal).to.be.equal(0);
            expect(adminBalances.reward2Bal).to.be.greaterThan(0);
            expect(adminBalances.token1Bal).to.equal(0);
            expect(adminBalances.token2Bal).to.equal(1000);

            // Ensure userOne balances
            expect(userOneBalances.reward1Bal).to.be.greaterThan(0);
            expect(userOneBalances.reward2Bal).to.be.greaterThan(0);
            expect(userOneBalances.token1Bal).to.equal(1000);
            expect(userOneBalances.token2Bal).to.equal(400);

            // Ensure userTwo balances
            expect(userTwoBalances.reward1Bal).to.be.equal(0);
            expect(userTwoBalances.reward2Bal).to.be.greaterThan(0);
            expect(userTwoBalances.token1Bal).to.equal(0);
            expect(userTwoBalances.token2Bal).to.equal(1000);
        });

        it("should update reward debts correctly", async function () {
            const lpBalance = await this.lpPair.balanceOf(this.admin);
            await this.lpPair.approve(this.KrStaking.address, MaxUint256);

            // Deposit
            await this.KrStaking.deposit(this.admin, 0, lpBalance.div(5));
            let rewardDebts = (await this.KrStaking.userInfo(0, this.admin)).rewardDebts;

            // Initializes reward debts correctly
            expect(rewardDebts.length).to.equal(2);
            // No reward drip for first deposit
            expect(rewardDebts[0]).to.equal(0);
            expect(rewardDebts[1]).to.equal(0);

            // Second deposit
            await this.KrStaking.deposit(this.admin, 0, lpBalance.div(5));
            rewardDebts = (await this.KrStaking.userInfo(0, this.admin)).rewardDebts;

            // Should increase reward debts
            expect(rewardDebts[0].gt(0)).to.be.true;
            expect(rewardDebts[1].gt(0)).to.be.true;

            // Third deposit
            await this.KrStaking.deposit(this.admin, 0, lpBalance.div(5));
            const rewardDebtsFinal = (await this.KrStaking.userInfo(0, this.admin)).rewardDebts;

            // Should increase reward debts
            expect(rewardDebtsFinal[0].gt(rewardDebts[0])).to.be.true;
            expect(rewardDebtsFinal[1].gt(rewardDebts[1])).to.be.true;

            // Claim rewards
            await this.KrStaking.claim(0, this.admin);
            const rewardDebtsAfterClaim = (await this.KrStaking.userInfo(0, this.admin)).rewardDebts;

            // Should increase reward debts
            expect(rewardDebtsAfterClaim[0].gt(rewardDebtsFinal[0])).to.be.true;
            expect(rewardDebtsAfterClaim[1].gt(rewardDebtsFinal[1])).to.be.true;

            // Withdraw part of deposits
            await this.KrStaking.withdraw(0, lpBalance.div(5), this.admin);
            const rewardDebtsAfterPartialWithdraw = (await this.KrStaking.userInfo(0, this.admin)).rewardDebts;

            expect(rewardDebtsAfterPartialWithdraw[0].lt(rewardDebtsAfterClaim[0])).to.be.true;
            expect(rewardDebtsAfterPartialWithdraw[1].lt(rewardDebtsAfterClaim[1])).to.be.true;

            // Withdraw over balance (withdraws just the balance)
            await this.KrStaking.withdraw(0, lpBalance, this.admin);
            const rewardDebtsAfterExit = (await this.KrStaking.userInfo(0, this.admin)).rewardDebts;

            // Should reset
            expect(rewardDebtsAfterExit[0]).to.equal(0);
            expect(rewardDebtsAfterExit[1]).to.equal(0);
        });

        it("should be able to add new pool with more reward tokens", async function () {
            // Add user before
            const lpBalance = await this.lpPair.balanceOf(this.admin);
            await this.lpPair.approve(this.KrStaking.address, MaxUint256);

            // Deposit
            await this.KrStaking.deposit(this.admin, 0, lpBalance.div(5));
            const rewardDebts = (await this.KrStaking.userInfo(0, this.admin)).rewardDebts;

            // Initializes reward debts correctly
            expect(rewardDebts.length).to.equal(2);
            // No reward drip for first deposit
            expect(rewardDebts[0]).to.equal(0);
            expect(rewardDebts[1]).to.equal(0);

            const [StakingToken] = await deploySimpleToken("StakingToken", 100000);
            const [RewardToken3] = await deploySimpleToken("RewardToken3", 1000);

            // Add new pool
            await this.KrStaking.addPool(
                [this.RewardTKN1.address, this.RewardTKN2.address, RewardToken3.address],
                StakingToken.address,
                500,
                Number(await time.latestBlock()) + 5,
            );

            const rewardPerBlock = toBig(0.2);

            // 4 blocks remaining until rewards
            await this.KrStaking.setRewardPerBlockFor(RewardToken3.address, rewardPerBlock);

            // 3 blocks remaining until rewards
            await RewardToken3.transfer(this.KrStaking.address, toBig(1000));

            // 2 blocks remaining until rewards
            await StakingToken.approve(this.KrStaking.address, MaxUint256);

            // 1 blocks remaining until rewards
            await this.KrStaking.deposit(this.admin, 1, toBig(10));

            const rewardDebtsNew = (await this.KrStaking.userInfo(1, this.admin)).rewardDebts;

            // Initializes reward debts correctly
            expect(rewardDebtsNew.length).to.equal(3);
            // No reward drip yet
            expect(rewardDebtsNew[0]).to.equal(0);
            expect(rewardDebtsNew[1]).to.equal(0);
            expect(rewardDebtsNew[2]).to.equal(0);

            await this.KrStaking.massUpdatePools();

            const pendingRewards = await this.KrStaking.allPendingRewards(this.admin);
            for (const rewards of pendingRewards) {
                const amounts = rewards.amounts.reduce((a, c) => c.add(a), BigNumber.from(0));
                expect(amounts.gt(0)).to.be.true;
            }

            expect(await RewardToken3.balanceOf(this.admin)).to.equal(0);

            // Claim both
            await expect(this.KrStaking.claim(0, this.admin)).to.not.be.reverted;
            await expect(this.KrStaking.claim(1, this.admin)).to.not.be.reverted;

            expect((await RewardToken3.balanceOf(this.admin)).gt(0)).to.be.true;

            // Withdraw both
            await expect(this.KrStaking.withdraw(0, MaxUint256, this.admin)).to.not.be.reverted;
            await expect(this.KrStaking.withdraw(1, MaxUint256, this.admin)).to.not.be.reverted;

            const pendingRewardsAfter = await this.KrStaking.allPendingRewards(this.admin);
            for (const rewards of pendingRewardsAfter) {
                const amounts = rewards.amounts.reduce((a, c) => c.add(a), BigNumber.from(0));
                expect(amounts).to.equal(0);
            }
        });

        it("should be able to add a pool with less reward tokens", async function () {
            // Add user before
            const lpBalance = await this.lpPair.balanceOf(this.admin);
            await this.lpPair.approve(this.KrStaking.address, MaxUint256);

            // Deposit
            await this.KrStaking.deposit(this.admin, 0, lpBalance.div(5));
            const rewardDebts = (await this.KrStaking.userInfo(0, this.admin)).rewardDebts;

            // Initializes reward debts correctly
            expect(rewardDebts.length).to.equal(2);
            // No reward drip for first deposit
            expect(rewardDebts[0]).to.equal(0);
            expect(rewardDebts[1]).to.equal(0);

            const [StakingToken] = await deploySimpleToken("StakingToken", 100000);
            const [RewardToken3] = await deploySimpleToken("RewardToken3", 1000);

            // Add new pool
            await this.KrStaking.addPool(
                [RewardToken3.address],
                StakingToken.address,
                500,
                Number(await time.latestBlock()) + 5,
            );

            const rewardPerBlock = toBig(1);

            // 4 blocks remaining until rewards
            await this.KrStaking.setRewardPerBlockFor(RewardToken3.address, rewardPerBlock);

            // 3 blocks remaining until rewards
            await RewardToken3.transfer(this.KrStaking.address, toBig(1000));

            // 2 blocks remaining until rewards
            await StakingToken.approve(this.KrStaking.address, MaxUint256);

            // 1 blocks remaining until rewards
            await this.KrStaking.deposit(this.admin, 1, toBig(10));

            const rewardDebtsNew = (await this.KrStaking.userInfo(1, this.admin)).rewardDebts;

            // Initializes reward debts correctly
            expect(rewardDebtsNew.length).to.equal(1);
            // No reward drip yet
            expect(rewardDebtsNew[0]).to.equal(0);

            await this.KrStaking.massUpdatePools();

            const pendingRewards = await this.KrStaking.allPendingRewards(this.admin);
            for (const rewards of pendingRewards) {
                const amounts = rewards.amounts.reduce((a, c) => c.add(a), BigNumber.from(0));
                expect(amounts.gt(0)).to.be.true;
            }

            expect(await RewardToken3.balanceOf(this.admin)).to.equal(0);

            // Claim both
            await expect(this.KrStaking.claim(0, this.admin)).to.not.be.reverted;
            await expect(this.KrStaking.claim(1, this.admin)).to.not.be.reverted;

            expect((await RewardToken3.balanceOf(this.admin)).gt(0)).to.be.true;

            // Withdraw both
            await expect(this.KrStaking.withdraw(0, MaxUint256, this.admin)).to.not.be.reverted;
            await expect(this.KrStaking.withdraw(1, MaxUint256, this.admin)).to.not.be.reverted;

            const pendingRewardsAfter = await this.KrStaking.allPendingRewards(this.admin);
            for (const rewards of pendingRewardsAfter) {
                const amounts = rewards.amounts.reduce((a, c) => c.add(a), BigNumber.from(0));
                expect(amounts).to.equal(0);
            }
        });
    });

    describe("#KrStakingUniHelper", function () {
        beforeEach(async function () {
            this.calculateAmountB = async (amountA: BigNumber, tokenA: string, tokenB: string, pair: UniswapV2Pair) => {
                const reserves = await pair.getReserves();
                const [reserveA, reserveB] = tokenA < tokenB ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]];
                return await this.UniRouter.quote(amountA, reserveA, reserveB);
            };

            this.addLiquidityAndStake = async () => {
                return await this.KrStakingUniHelper.addLiquidityAndStake(
                    this.USDC.address,
                    this.krTSLA.address,
                    this.USDCAmt,
                    this.krTSLAAmt,
                    this.USDCAmt,
                    this.krTSLAAmt,
                    this.admin,
                    this.deadline,
                );
            };

            // Get LP balance
            this.USDCAmt = toBig(1000);

            const tkn0 = this.USDC.address < this.krTSLA.address ? this.USDC : this.krTSLA;

            const reserves = await this.lpPair.getReserves();

            const [usdcReserve, krTSLAreserve] =
                tkn0.address === this.USDC.address ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]];

            this.krTSLAReserve = krTSLAreserve;
            this.USDCReserve = usdcReserve;

            this.krTSLAAmt = await this.calculateAmountB(
                this.USDCAmt,
                this.USDC.address,
                this.krTSLA.address,
                this.lpPair,
            );

            this.expectedLiquidity = this.krTSLAAmt.mul(await this.lpPair.totalSupply()).div(krTSLAreserve);
            this.deadline = (Date.now() / 1000 + 6000).toFixed(0);

            await this.USDC.approve(this.KrStakingUniHelper.address, this.USDCAmt);
            await this.krTSLA.approve(this.KrStakingUniHelper.address, this.krTSLAAmt);
            await this.krBABA.approve(this.KrStakingUniHelper.address, ethers.constants.MaxUint256);
            await this.krGOLD.approve(this.KrStakingUniHelper.address, ethers.constants.MaxUint256);
        });

        it("should add liquidity and deposit", async function () {
            const addTx = await this.addLiquidityAndStake();
            const addEvent = await extractEventFromTxReceipt<LiquidityAndStakeAddedEvent>(
                addTx,
                "LiquidityAndStakeAdded",
            );
            expect(this.expectedLiquidity).to.equal(addEvent.args.amount);
            expect(addEvent.args.to).to.equal(this.admin);
            expect(addEvent.args.pid).to.equal(0);

            const depositEvent = await extractInternalIndexedEventFromTxReceipt<DepositEvent["args"]>(
                addTx,
                this.KrStaking,
                "Deposit",
            );

            expect(depositEvent.amount).to.equal(addEvent.args.amount);
            expect(depositEvent.user).to.equal(this.admin);
            expect(depositEvent.pid).to.equal(addEvent.args.pid);

            const deposited = (await this.KrStaking.userInfo(0, this.admin)).amount;
            expect(deposited).to.equal(addEvent.args.amount);
        });

        it("should remove liquidity and withdraw", async function () {
            const addTx = await this.addLiquidityAndStake();

            await this.USDC.burn(await this.USDC.balanceOf(this.admin));
            await this.krTSLA.transfer(this.userTwo, await this.krTSLA.balanceOf(this.admin));
            const addEvent = await extractEventFromTxReceipt<LiquidityAndStakeAddedEvent>(
                addTx,
                "LiquidityAndStakeAdded",
            );
            let deposited = (await this.KrStaking.userInfo(0, this.admin)).amount;
            expect(deposited).to.equal(addEvent.args.amount);
            // clear tokens

            const USDCAmt = addEvent.args.amount
                .mul(await this.USDC.balanceOf(this.lpPair.address))
                .div(await this.lpPair.totalSupply());
            const krTSLAAmt = addEvent.args.amount
                .mul(await this.krTSLA.balanceOf(this.lpPair.address))
                .div(await this.lpPair.totalSupply());

            const removeTx = await this.KrStakingUniHelper.withdrawAndRemoveLiquidity(
                this.USDC.address,
                this.krTSLA.address,
                addEvent.args.amount,
                USDCAmt,
                krTSLAAmt,
                this.admin,
                this.deadline,
            );

            const removeEvent = await extractEventFromTxReceipt<LiquidityAndStakeRemovedEvent>(
                removeTx,
                "LiquidityAndStakeRemoved",
            );

            expect(removeEvent.args.amount).to.equal(addEvent.args.amount);
            expect(removeEvent.args.pid).to.equal(0);
            expect(removeEvent.args.to).to.equal(this.admin);

            const withdrawEvent = (await extractInternalIndexedEventFromTxReceipt<WithdrawEvent["args"]>(
                removeTx,
                this.KrStaking,
                "Withdraw",
            )) as WithdrawEvent["args"];

            expect(withdrawEvent.amount).to.equal(removeEvent.args.amount);
            expect(withdrawEvent.pid).to.equal(removeEvent.args.pid);
            expect(withdrawEvent.user).to.equal(removeEvent.args.to);

            deposited = (await this.KrStaking.userInfo(0, this.admin)).amount;
            expect(deposited).to.equal(0);

            const USDCbalance = await this.USDC.balanceOf(this.admin);
            const krTSLAbalance = await this.krTSLA.balanceOf(this.admin);

            expect(USDCbalance).to.equal(USDCAmt);
            expect(krTSLAbalance).to.equal(krTSLAAmt);
        });

        it("should be able to claim all rewards in a single tx", async function () {
            await this.KrStaking.addPool(
                [this.RewardTKN1.address, this.RewardTKN2.address],
                this.lpPairBABA.address,
                50,
                0,
            );

            await this.KrStaking.addPool(
                [this.RewardTKN1.address, this.RewardTKN2.address],
                this.lpPairGOLD.address,
                75,
                0,
            );

            const USDCMintAmount = toBig(10_000_000);
            const USDCDepositAmount = toBig(5_000_000);
            const krAssetMintAmount = toBig(10);
            const users = [this.signers.userOne, this.signers.userTwo, this.signers.userThree];

            // Mint USDCMintAmount
            await Promise.all(
                users.map(async user => await this.USDC.connect(user).mint(user.address, USDCMintAmount)),
            );

            // Approve USDC
            await Promise.all(
                users.map(async user => await this.USDC.connect(user).approve(this.Kresko.address, MaxUint256)),
            );

            // Deposit USDC collateral
            await Promise.all(
                users.map(
                    async user =>
                        await this.Kresko.connect(user).depositCollateral(
                            user.address,
                            this.USDC.address,
                            USDCDepositAmount,
                        ),
                ),
            );

            // Mint krAssets
            await Promise.all(
                users.map(async user => {
                    await this.Kresko.connect(user).mintKreskoAsset(
                        user.address,
                        this.krTSLA.address,
                        krAssetMintAmount,
                    );
                    await this.Kresko.connect(user).mintKreskoAsset(
                        user.address,
                        this.krBABA.address,
                        krAssetMintAmount,
                    );
                    await this.Kresko.connect(user).mintKreskoAsset(
                        user.address,
                        this.krGOLD.address,
                        krAssetMintAmount,
                    );
                }),
            );

            // Approve, provide liquidity and deposit through helper
            await Promise.all(
                users.map(async user => {
                    await this.USDC.connect(user).approve(this.KrStakingUniHelper.address, ethers.constants.MaxUint256);
                    await this.krTSLA
                        .connect(user)
                        .approve(this.KrStakingUniHelper.address, ethers.constants.MaxUint256);
                    await this.krBABA
                        .connect(user)
                        .approve(this.KrStakingUniHelper.address, ethers.constants.MaxUint256);
                    await this.krGOLD
                        .connect(user)
                        .approve(this.KrStakingUniHelper.address, ethers.constants.MaxUint256);

                    const amountTSLAUSDC = await this.calculateAmountB(
                        krAssetMintAmount,
                        this.krTSLA.address,
                        this.USDC.address,
                        this.lpPair,
                    );

                    const amountBABAUSDC = await this.calculateAmountB(
                        krAssetMintAmount,
                        this.krBABA.address,
                        this.USDC.address,
                        this.lpPairBABA,
                    );

                    const amountGOLDUSDC = await this.calculateAmountB(
                        krAssetMintAmount,
                        this.krGOLD.address,
                        this.USDC.address,
                        this.lpPairGOLD,
                    );

                    // const balUSDC = fromBig(await this.USDC.balanceOf(user.address));
                    // const balTSLA = fromBig(await this.krTSLA.balanceOf(user.address));
                    // const balBABA = fromBig(await this.krBABA.balanceOf(user.address));
                    // const balGOLD = fromBig(await this.krGOLD.balanceOf(user.address));
                    // console.log({
                    //     balUSDC,
                    //     balTSLA,
                    //     balBABA,
                    //     balGOLD,
                    //     amtGOLDUSDC: fromBig(amountGOLDUSDC),
                    //     amtTSLAUSDC: fromBig(amountTSLAUSDC),
                    //     amtBABAUSDC: fromBig(amountBABAUSDC),
                    // });

                    // tsla
                    await this.KrStakingUniHelper.connect(user).addLiquidityAndStake(
                        this.krTSLA.address,
                        this.USDC.address,
                        krAssetMintAmount,
                        amountTSLAUSDC,
                        krAssetMintAmount,
                        amountTSLAUSDC,
                        user.address,
                        this.deadline,
                    );

                    // baba
                    await this.KrStakingUniHelper.connect(user).addLiquidityAndStake(
                        this.krBABA.address,
                        this.USDC.address,
                        krAssetMintAmount,
                        amountBABAUSDC,
                        krAssetMintAmount,
                        amountBABAUSDC,
                        user.address,
                        this.deadline,
                    );

                    // gold
                    await this.KrStakingUniHelper.connect(user).addLiquidityAndStake(
                        this.krGOLD.address,
                        this.USDC.address,
                        krAssetMintAmount,
                        amountGOLDUSDC,
                        krAssetMintAmount,
                        amountGOLDUSDC,
                        user.address,
                        this.deadline,
                    );
                }),
            );

            // Accumulate rewards
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();

            // Checks
            for (const user of users) {
                const claimTx = await this.KrStakingUniHelper.connect(user).claimRewardsMulti(user.address);

                const events = await extractInternalIndexedEventsFromTxReceipt<ClaimRewardsEvent["args"]>(
                    claimTx,
                    this.KrStaking,
                    "ClaimRewards",
                );
                // 2 reward tokens * 3 pools
                expect(events.length).to.equal(6);

                // eslint-disable-next-line prefer-const
                let totalRewardsFromEvents = BigNumber.from(0);
                events.map(e => {
                    // got rewards
                    expect(e.amount.isZero()).to.be.false;
                    totalRewardsFromEvents = totalRewardsFromEvents.add(e.amount);
                    expect(e.user).to.equal(user.address);
                });

                const reward1Bal = await this.RewardTKN1.balanceOf(user.address);
                const reward2Bal = await this.RewardTKN2.balanceOf(user.address);

                const totalRewards = reward1Bal.add(reward2Bal);

                expect(totalRewardsFromEvents).to.equal(totalRewards);

                const [pendingRewards] = await this.KrStaking.allPendingRewards(user.address);

                const totalPending = pendingRewards.amounts.reduce((a, b) => fromBig(b) + a, 0);

                expect(totalPending).to.equal(0);
            }
        });
    });
});
