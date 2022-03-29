import hre, { ethers } from "hardhat";
import { expect } from "chai";
import {
    addNewKreskoAssetWithOraclePrice,
    BigNumber,
    deployOracle,
    deploySimpleToken,
    deployUniswap,
    extractEventFromTxReceipt,
    extractEventsFromTxReceipt,
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
import { ClaimRewardsEvent, DepositEvent, WithdrawEvent } from "types/contracts/KrStaking";
import { LiquidityAndStakeAddedEvent, LiquidityAndStakeRemovedEvent } from "types/contracts/KrStakingUniHelper";
import { UniswapV2Pair } from "types";

describe.only("Staking", function () {
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

        // // Add Zapper as a trusted contract in Kresko
        // this.Zapper = Zapper;
        // await this.Kresko.toggleTrustedContract(Zapper.address);

        // Add Kresko to Zapper
        // await this.Zapper.setKresko(this.Kresko.address);

        // Approve zapper for assets
        // await this.USDC.approve(this.Zapper.address, ethers.constants.MaxUint256);
        // await this.krTSLA.approve(this.Zapper.address, ethers.constants.MaxUint256);

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
            const depositAmount = await this.KrStaking.getDepositAmount(0);

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
            await this.KrStaking.withdraw(0, 0, this.admin);
            let reward1Bal = await this.RewardTKN1.balanceOf(this.admin);
            let reward2Bal = await this.RewardTKN2.balanceOf(this.admin);

            // Should have rewards equal to one rewardPerBlock
            expect(reward1Bal).to.be.closeTo(rewardPerBlockTKN1, 1e12);
            expect(Number(reward1Bal)).to.not.be.greaterThan(Number(rewardPerBlockTKN1));

            expect(reward2Bal).to.be.closeTo(rewardPerBlockTKN2, 1e12);
            expect(Number(reward2Bal)).to.not.be.greaterThan(Number(rewardPerBlockTKN2));

            // Claim rewards again
            await this.KrStaking.withdraw(0, 0, this.admin);

            // Get total blocks spent earning
            const blocksSpentEarning = (await time.latestBlock()) - startBlock;

            // Get balances of rewards claimed
            reward1Bal = await this.RewardTKN1.balanceOf(this.admin);
            reward2Bal = await this.RewardTKN2.balanceOf(this.admin);

            // Reward balances should equal blocks spent earning * reward per block
            expect(reward1Bal).to.be.closeTo(rewardPerBlockTKN1.mul(blocksSpentEarning), 1e12);
            expect(reward2Bal).to.be.closeTo(rewardPerBlockTKN2.mul(blocksSpentEarning), 1e12);
        });

        it.skip("should give multiple users rewards and claim them", async function () {
            const USDCMintAmount = 100_000;
            const TSLAMintAmount = 10;
            const users = [this.signers.userOne, this.signers.userTwo, this.signers.userThree];

            // Mint USDCMintAmount for users
            await Promise.all(
                users.map(async user => this.USDC.connect(user).mint(user.address, toBig(USDCMintAmount))),
            );

            // Approve USDC usage on Kresko
            await Promise.all(
                users.map(async user => this.USDC.connect(user).approve(this.Kresko.address, MaxUint256)),
            );

            // Deposit USDC collateral for users
            await Promise.all(
                users.map(async user =>
                    this.Kresko.connect(user).depositCollateral(user.address, this.USDC.address, toBig(USDCMintAmount)),
                ),
            );

            // Mint krTSLA for users
            await Promise.all(
                users.map(async user =>
                    this.Kresko.connect(user).mintKreskoAsset(user.address, this.krTSLA.address, toBig(TSLAMintAmount)),
                ),
            );

            // Approve zapper
            // await Promise.all(
            //     users.map(async user => this.krTSLA.connect(user).approve(this.Zapper.address, MaxUint256)),
            // );

            // Zap LP into staking
            // await Promise.all(
            //     users.map(
            //         async user =>
            //             await this.Zapper.connect(user).zap(
            //                 this.krTSLA.address,
            //                 this.USDC.address,
            //                 toBig(TSLAMintAmount),
            //                 true,
            //             ),
            //     ),
            // );

            // Get deposit balances for each user
            const LPBalancesInStaking = await Promise.all(
                users.map(async user => this.KrStaking.connect(user).getDepositAmount(0)),
            );

            // Advance blocks for rewards gains
            await time.advanceBlockTo((await time.latestBlock()) + 10);

            // Get rewards for each user
            const pendingRewards = await Promise.all(
                users.map(async user => this.KrStaking.connect(user).allPendingRewards(user.address)),
            );

            // Ensure each user got pendingRewards
            users.map((_, i) => {
                // Filter pool results with no rewards (pool 0)
                const poolRewards = pendingRewards[i].filter(reward => !!reward.tokens.length);

                expect(poolRewards.length).to.equal(1);

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

                    // Ensure that users are actually gaining rewards
                    rewards.map(reward => {
                        expect(reward).to.be.greaterThan(0);
                    });
                });
            });

            // Claim rewards and all deposits (claiming more than user amount just sends the whole deposit balance)
            await Promise.all(
                users.map(async user => await this.KrStaking.connect(user).withdraw(0, MaxUint256, user.address)),
            );

            // Get reward balances for each user
            const rewardsClaimed = await Promise.all(
                users.map(async user => [
                    await this.RewardTKN1.balanceOf(user.address),
                    await this.RewardTKN2.balanceOf(user.address),
                ]),
            );

            // Ensure each user got rewards
            users.map((_, i) => {
                const [rewardsTKN1, rewardsTKN2] = rewardsClaimed[i].map(Number);
                expect(rewardsTKN1).to.be.greaterThan(0);
                expect(rewardsTKN2).to.be.greaterThan(0);
            });

            // Get reward balances for each user
            const LPBalancesAfterWithdraw = await Promise.all(
                users.map(async user => await this.lpPair.balanceOf(user.address)),
            );

            // Ensure users got their LP tokens in wallet
            LPBalancesAfterWithdraw.map((LPBalanceAfterWithdraw, i) => {
                const StakingBalanceBefore = LPBalancesInStaking[i];
                expect(StakingBalanceBefore).to.equal(LPBalanceAfterWithdraw);
            });
        });

        it("should be able to withdraw, claim rewards and not claim any extra after", async function () {
            // Reward per blocks per reward token
            const rewardPerBlockTKN1 = await this.KrStaking.rewardPerBlockFor(this.RewardTKN1.address);
            const rewardPerBlockTKN2 = await this.KrStaking.rewardPerBlockFor(this.RewardTKN2.address);

            // Approve the token usage for Staking contract
            const lpBalance = await this.lpPair.balanceOf(this.admin);
            await this.lpPair.approve(this.KrStaking.address, MaxUint256);

            // Deposit the whole balance
            await this.KrStaking.deposit(this.admin, 0, lpBalance);

            // Get the block of deposit
            const startBlock = await time.latestBlock();

            // Get deposited amount for poolId 0 (initial pool)
            const depositAmount = await this.KrStaking.getDepositAmount(0);

            // Ensure it equals the balance deposited
            expect(lpBalance).to.equal(depositAmount);

            // Advance one block
            await time.advanceBlock();

            // Get pending rewards for the user
            let [pendingRewards] = await this.KrStaking.allPendingRewards(this.admin);

            // Rewards should equal the drip per block (delta precision factor of 1e12)
            expect(pendingRewards.amounts[0]).to.be.closeTo(rewardPerBlockTKN1, 1e12);
            expect(pendingRewards.amounts[1]).to.be.closeTo(rewardPerBlockTKN2, 1e12);

            // Claim rewards
            await this.KrStaking.withdraw(0, 0, this.admin);

            // Get reward token balances
            const rewardTKN1Bal = await this.RewardTKN1.balanceOf(this.admin);
            const rewardTKN2Bal = await this.RewardTKN2.balanceOf(this.admin);

            // Get block difference
            let blocksSpentEarning = (await time.latestBlock()) - startBlock;

            // Rewards sent should equal the blocks spent in the contract
            expect(rewardTKN1Bal).to.be.closeTo(rewardPerBlockTKN1.mul(blocksSpentEarning), 1e12);
            expect(rewardTKN2Bal).to.be.closeTo(rewardPerBlockTKN2.mul(blocksSpentEarning), 1e12);

            // Withdraw whole deposit and rewards
            const res = await this.KrStaking.withdraw(0, lpBalance, this.admin);

            const { args } = await extractEventFromTxReceipt<WithdrawEvent>(res, "Withdraw");

            // Ensure withdraw emits correct values
            const [pid, found] = await this.KrStaking.getPidFor(this.lpPair.address);
            expect(found).to.be.true;
            expect(args.pid).to.equal(pid);
            expect(args.user).to.equal(this.admin);
            expect(args.amount).to.equal(lpBalance);
            const [{ args: argsRewardEvent1 }, { args: argsRewardEvent2 }] =
                await extractEventsFromTxReceipt<ClaimRewardsEvent>(res, "ClaimRewards");

            // Ensure events emit correct amounts
            expect(argsRewardEvent1.amount).to.be.closeTo(rewardPerBlockTKN1, 1e12);
            expect(argsRewardEvent2.amount).to.be.closeTo(rewardPerBlockTKN2, 1e12);

            // Withdraw advances rewards by a single block
            blocksSpentEarning = (await time.latestBlock()) - startBlock;

            // Advance two blocks to be sure we are not emitting rewards
            await time.advanceBlock();
            await time.advanceBlock();

            // Get pending rewards
            [pendingRewards] = await this.KrStaking.allPendingRewards(this.admin);

            // None should be available because all deposits are withdrawn
            expect(pendingRewards.amounts[0]).to.equal(0);
            expect(pendingRewards.amounts[1]).to.equal(0);

            // Check reward token balances again
            const rewardTKN1BalanceAfterFullWithdraw = await this.RewardTKN1.balanceOf(this.admin);
            const rewardTKN2BalanceAfterFullWithdraw = await this.RewardTKN2.balanceOf(this.admin);

            // Should equal time spent earning
            expect(rewardTKN1BalanceAfterFullWithdraw).to.be.closeTo(rewardPerBlockTKN1.mul(blocksSpentEarning), 1e12);
            expect(rewardTKN2BalanceAfterFullWithdraw).to.be.closeTo(rewardPerBlockTKN2.mul(blocksSpentEarning), 1e12);

            // Withdraw and claim everything again
            await this.KrStaking.withdraw(0, lpBalance, this.admin);

            const rewardTKN1BalAfterRepeatFullWithdraw = await this.RewardTKN1.balanceOf(this.admin);
            const rewardTKN2BalAfterRepeatFullWithdraw = await this.RewardTKN2.balanceOf(this.admin);

            // No further rewards should be claimed
            expect(rewardTKN1BalAfterRepeatFullWithdraw).to.equal(rewardTKN1BalanceAfterFullWithdraw);
            expect(rewardTKN2BalAfterRepeatFullWithdraw).to.equal(rewardTKN2BalanceAfterFullWithdraw);
        });

        it("should be able to withdraw without claiming rewards", async function () {
            // Reward per blocks per reward token
            const rewardPerBlockTKN1 = await this.KrStaking.rewardPerBlockFor(this.RewardTKN1.address);
            const rewardPerBlockTKN2 = await this.KrStaking.rewardPerBlockFor(this.RewardTKN2.address);

            // Approve the token usage for Staking contract
            const lpBalance = await this.lpPair.balanceOf(this.admin);
            await this.lpPair.approve(this.KrStaking.address, MaxUint256);

            // Deposit the whole balance
            await this.KrStaking.deposit(this.admin, 0, lpBalance);

            // Get deposited amount for poolId 0 (initial pool)
            const depositAmount = await this.KrStaking.getDepositAmount(0);

            // Ensure it equals the balance deposited
            expect(lpBalance).to.equal(depositAmount);

            // Advance blocks
            await time.advanceBlock();

            const [pendingRewardsBeforeWithdraw] = await this.KrStaking.allPendingRewards(this.admin);

            // Rewards should equal the drip per block (delta precision factor of 1e12)
            expect(pendingRewardsBeforeWithdraw.amounts[0]).to.be.closeTo(rewardPerBlockTKN1, 1e12);
            expect(pendingRewardsBeforeWithdraw.amounts[1]).to.be.closeTo(rewardPerBlockTKN2, 1e12);
            // Withdraw tokens
            await this.KrStaking.withdraw(0, depositAmount.div(2), this.admin);

            // Advance one block
            await time.advanceBlock();

            // Get pending rewards for the user
            const [pendingRewardsAfterWithdraw] = await this.KrStaking.allPendingRewards(this.admin);

            expect(pendingRewardsAfterWithdraw.amounts[0]).to.be.closeTo(
                pendingRewardsBeforeWithdraw.amounts[0].add(rewardPerBlockTKN1),
                1e12,
            );
            expect(pendingRewardsAfterWithdraw.amounts[1]).to.be.closeTo(
                pendingRewardsBeforeWithdraw.amounts[1].add(rewardPerBlockTKN2),
                1e12,
            );

            // Withdraw rewards
            const claimTx = await this.KrStaking.withdraw(0, 0, this.admin);

            const claimEvents = await extractInternalIndexedEventsFromTxReceipt<ClaimRewardsEvent["args"]>(
                claimTx,
                this.KrStaking,
                "ClaimRewards",
            );
            const [pendingRewardsAfterClaim] = await this.KrStaking.allPendingRewards(this.admin);

            // No further rewards should be claimed
            expect(pendingRewardsAfterClaim.amounts[0]).to.equal(0);
            expect(pendingRewardsAfterClaim.amounts[1]).to.equal(0);

            const rewardTKN1Bal = await this.RewardTKN1.balanceOf(this.admin);
            const rewardTKN2Bal = await this.RewardTKN2.balanceOf(this.admin);

            // No further rewards should be available
            expect(claimEvents[0].amount).to.equal(rewardTKN1Bal);
            expect(claimEvents[1].amount).to.equal(rewardTKN2Bal);

            // Claim more than remaining balance to send whole balance + claim rewards
            const exitTx = await this.KrStaking.withdraw(0, lpBalance, this.admin);

            const exitEvents = await extractInternalIndexedEventsFromTxReceipt<ClaimRewardsEvent["args"]>(
                exitTx,
                this.KrStaking,
                "ClaimRewards",
            );

            const depositAfter = await this.KrStaking.getDepositAmount(0);

            expect(depositAfter).to.equal(0);
            // No further rewards should be available
            expect(exitEvents[0].amount).to.be.gt(0);
            expect(exitEvents[1].amount).to.be.gt(0);

            // Get pending rewards for the user
            const [pendingRewardsAfterExit] = await this.KrStaking.allPendingRewards(this.admin);
            expect(pendingRewardsAfterExit.amounts[0]).to.equal(0);
            expect(pendingRewardsAfterExit.amounts[1]).to.equal(0);
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
            const depositAmount = await this.KrStaking.getDepositAmount(0);
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
                wait: 0,
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
            await this.KrStaking.withdraw(0, 0, this.admin);
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
            await this.KrStaking.withdraw(0, 0, this.admin);
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
            await this.KrStaking.addPool([this.RewardTKN1.address, this.RewardTKN2.address], Token1.address, 500);
            // This one only rewards TKN1
            await this.KrStaking.addPool([this.RewardTKN2.address], Token2.address, 500);

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

            const deposited = await this.KrStaking.getDepositAmount(0);
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
            let deposited = await this.KrStaking.getDepositAmount(0);
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

            deposited = await this.KrStaking.getDepositAmount(0);
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
            );

            await this.KrStaking.addPool(
                [this.RewardTKN1.address, this.RewardTKN2.address],
                this.lpPairGOLD.address,
                75,
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
