// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {IKrMulticall} from "periphery/KrMulticall.sol";
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract MulticallTest is Deploy {
    using ShortAssert for *;
    using Help for *;
    using Log for *;
    using WadRay for *;
    using PercentageMath for *;
    uint256 constant ETH_PRICE = 2000;

    string internal rs_price_eth = "ETH:2000:8,";
    string internal rs_prices_rest = "BTC:35159:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,XAU:1977:8,WTI:77.5:8,USDT:1:8,JPY:0.0067:8";

    KreskoAsset krETH;
    KreskoAsset krJPY;
    address krETHAddr;
    address krJPYAddr;
    MockOracle ethFeed;
    MockERC20 usdc;
    MockERC20 usdt;

    struct FeeTestRebaseConfig {
        uint248 rebaseMultiplier;
        bool positive;
        uint256 ethPrice;
        uint256 firstLiquidationPrice;
        uint256 secondLiquidationPrice;
    }

    function setUp() public {
        Deploy.localtest("MNEMONIC_DEVNET", 0);

        usdc = MockERC20(Deployed.addr("usdc"));
        usdt = MockERC20(Deployed.addr("USDT"));
        krETHAddr = Deployed.addr("krETH");
        krJPYAddr = Deployed.addr("krJPY");
        ethFeed = MockOracle(Deployed.addr("ETH.feed"));
        krETH = KreskoAsset(payable(krETHAddr));
        krJPY = KreskoAsset(payable(krJPYAddr));

        // enableLogger();
        prank(getAddr(0));
        usdc.approve(address(kresko), type(uint256).max);
        krETH.approve(address(kresko), type(uint256).max);
        _setETHPrice(ETH_PRICE);
        // 1000 KISS -> 0.48 ETH
        rsCall(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETHAddr, 1000e18, 0);
        vault.setDepositFee(address(usdt), 10e2);
        vault.setWithdrawFee(address(usdt), 10e2);

        usdc.mint(getAddr(100), 10_000e6);
    }

    function testMulticallDepositBorrow() public {
        address user = getAddr(100);
        prank(user);
        usdc.approve(address(multicall), type(uint256).max);

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: address(usdc),
                amountIn: 10_000e6,
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPYAddr,
                amountOut: 10000e18,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = multicall.execute(ops, rsPayload);
        usdc.balanceOf(user).eq(0, "usdc-balance");
        krJPY.balanceOf(user).eq(10000e18, "jpy-borrow-balance");
        results[0].amountIn.eq(10_000e6, "usdc-deposit-amount");
        results[0].tokenIn.eq(address(usdc), "usdc-deposit-addr");
        results[1].tokenOut.eq(krJPYAddr, "jpy-borrow-addr");
        results[1].amountOut.eq(10000e18, "jpy-borrow-amount");
    }

    function testNativeDeposit() public {
        address user = getAddr(100);
        uint256 amount = 5 ether;
        vm.deal(user, amount * 2);
        prank(user);
        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](1);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: address(weth),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.Native,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = multicall.execute{value: 5 ether}(ops, rsPayload);
        results[0].amountIn.eq(5 ether, "native-deposit-amount");
        results[0].tokenIn.eq(address(weth), "native-deposit-addr");
        uint256 depositsAfter = kresko.getAccountCollateralAmount(user, address(weth));
        address(multicall).balance.eq(0 ether, "native-contract-balance-after");

        user.balance.eq(5 ether, "native-user-balance-after");
        depositsAfter.eq(5 ether, "native-deposit-amount-after");
    }

    function testNativeDepositRevert() public {
        address user = getAddr(100);
        uint256 amount = 5 ether;
        vm.deal(user, amount * 2);
        prank(user);
        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](1);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: address(usdt),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.Native,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        vm.expectRevert();
        multicall.execute{value: 5 ether}(ops, rsPayload);
    }

    function testNativeDepositWithdraw() public {
        address user = getAddr(100);
        uint256 amount = 5 ether;
        vm.deal(user, amount * 2);
        prank(user);
        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: address(weth),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.Native,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterWithdraw,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: address(weth),
                amountOut: 5 ether,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSenderNative,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = multicall.execute{value: 5 ether}(ops, rsPayload);
        results[0].amountIn.eq(5 ether, "native-deposit-amount");
        results[0].tokenIn.eq(address(weth), "native-deposit-addr");
        results[1].amountOut.eq(5 ether, "native-deposit-amount");
        results[1].tokenOut.eq(address(weth), "native-deposit-addr");
        uint256 depositsAfter = kresko.getAccountCollateralAmount(user, address(weth));
        address(multicall).balance.eq(0 ether, "native-contract-balance-after");

        user.balance.eq(10 ether, "native-user-balance-after");
        depositsAfter.eq(0 ether, "native-deposit-amount-after");
    }

    function testMulticallDepositBorrowRepay() public {
        address user = getAddr(100);
        prank(user);
        usdc.approve(address(multicall), type(uint256).max);

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](3);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: address(usdc),
                amountIn: 10_000e6,
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPYAddr,
                amountOut: 10000e18,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[2] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterRepay,
            data: IKrMulticall.Data({
                tokenIn: krJPYAddr,
                amountIn: 10000e18,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = multicall.execute(ops, rsPayload);
        usdc.balanceOf(user).eq(0, "usdc-balance");
        krJPY.balanceOf(user).eq(0, "jpy-borrow-balance");
        results[0].amountIn.eq(10_000e6, "usdc-deposit-amount");
        results[0].tokenIn.eq(address(usdc), "usdc-deposit-addr");
        results[1].tokenOut.eq(krJPYAddr, "jpy-borrow-addr");
        results[1].amountOut.eq(10000e18, "jpy-borrow-amount");
        results[2].tokenIn.eq(krJPYAddr, "jpy-repay-addr");
        results[2].amountIn.eq(10000e18, "jpy-repay-amount");
    }

    function testMulticallVaultDepositSCDPDeposit() public {
        address user = getAddr(100);
        prank(user);
        usdc.approve(address(multicall), type(uint256).max);

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.VaultDeposit,
            data: IKrMulticall.Data({
                tokenIn: address(usdc),
                amountIn: 10_000e6,
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: address(kiss),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPDeposit,
            data: IKrMulticall.Data({
                tokenIn: address(kiss),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = multicall.execute(ops, rsPayload);
        usdc.balanceOf(user).eq(0, "usdc-balance");
        kresko.getAccountDepositSCDP(user, address(kiss)).eq(9998e18, "kiss-deposit-amount");
        kiss.balanceOf(user).eq(0, "jpy-borrow-balance");

        results[0].tokenIn.eq(address(usdc), "results-usdc-deposit-addr");
        results[0].amountIn.eq(10_000e6, "results-usdc-deposit-amount");
        results[1].tokenIn.eq(address(kiss), "results-kiss-deposit-addr");
        results[1].amountIn.eq(9998e18, "results-kiss-deposit-amount");
    }

    function testMulticallVaultWithdrawSCDPWithdraw() public {
        address user = getAddr(100);
        prank(user);
        usdc.approve(address(multicall), type(uint256).max);

        IKrMulticall.Operation[] memory opsDeposit = new IKrMulticall.Operation[](2);
        opsDeposit[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.VaultDeposit,
            data: IKrMulticall.Data({
                tokenIn: address(usdc),
                amountIn: 10_000e6,
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: address(kiss),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        opsDeposit[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPDeposit,
            data: IKrMulticall.Data({
                tokenIn: address(kiss),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        multicall.execute(opsDeposit, rsPayload);

        IKrMulticall.Operation[] memory opsWithdraw = new IKrMulticall.Operation[](2);
        opsWithdraw[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPWithdraw,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: address(kiss),
                amountOut: 9998e18,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        opsWithdraw[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.VaultRedeem,
            data: IKrMulticall.Data({
                tokenIn: address(kiss),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: address(usdc),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = multicall.execute(opsWithdraw, rsPayload);

        usdc.balanceOf(user).eq(9996000400, "usdc-balance");
        kresko.getAccountDepositSCDP(user, address(kiss)).eq(0, "kiss-deposit-amount");
        kiss.balanceOf(user).eq(0, "jpy-borrow-balance");

        results[0].tokenIn.eq(address(0), "results-tokenin-addr");
        results[0].amountIn.eq(0, "results-tokenin-amount");
        results[0].tokenOut.eq(address(kiss), "results-kiss-deposit-addr");
        results[0].amountOut.eq(9998e18, "results-kiss-deposit-amount");
        results[1].tokenIn.eq(address(kiss), "results-kiss-vault-withdraw-addr");
        results[1].amountIn.eq(9998e18, "result-kiss-vault-withdraw-amount");
        results[1].tokenOut.eq(address(usdc), "results-usdc-vault-withdraw-addr");
        results[1].amountOut.eq(9996000400, "results-usdc-vault-withdraw-amount");
    }

    function testMulticallShort() public {
        address user = getAddr(100);
        prank(user);
        usdc.approve(address(multicall), type(uint256).max);
        usdc.approve(address(kresko), type(uint256).max);

        kresko.depositCollateral(user, address(usdc), 10_000e6);

        IKrMulticall.Operation[] memory opsShort = new IKrMulticall.Operation[](2);
        opsShort[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPYAddr,
                amountOut: 10_000e18,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        opsShort[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPTrade,
            data: IKrMulticall.Data({
                tokenIn: krJPYAddr,
                amountIn: 10_000e18,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: address(kiss),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        IKrMulticall.Result[] memory results = multicall.execute(opsShort, rsPayload);

        krJPY.balanceOf(address(multicall)).eq(0, "jpy-balance-multicall-after");
        kiss.balanceOf(address(multicall)).eq(0, "kiss-balance-multicall-after");
        usdc.balanceOf(user).eq(0, "usdc-balance-after");
        kresko.getAccountCollateralAmount(user, address(usdc)).eq(9998660000, "usdc-deposit-amount");
        kiss.balanceOf(user).eq(66.7655e18, "kiss-balance-after");
        kresko.getAccountDebtAmount(user, krJPYAddr).eq(10_000e18, "jpy-borrow-balance-after");

        results[0].tokenIn.eq(address(0), "results-0-tokenin-addr");
        results[0].amountIn.eq(0, "results-0-tokenin-amount");
        results[0].tokenOut.eq(krJPYAddr, "results-krjpy-borrow-addr");
        results[0].amountOut.eq(10_000e18, "results-krjpy-borrow-amount");
        results[1].tokenIn.eq(krJPYAddr, "results-krjpy-trade-in-addr");
        results[1].amountIn.eq(10_000e18, "result-krjpy-trade-in-amount");
        results[1].tokenOut.eq(address(kiss), "results-kiss-trade-out-addr");
        results[1].amountOut.eq(66.7655e18, "results-usdc-vault-withdraw-amount");
    }

    function testMulticallShortClose() public {
        address user = getAddr(100);
        prank(user);
        krJPY.balanceOf(user).eq(0, "jpy-balance-before");
        usdc.approve(address(multicall), type(uint256).max);
        usdc.approve(address(kresko), type(uint256).max);
        kiss.approve(address(multicall), type(uint256).max);

        kresko.depositCollateral(user, address(usdc), 10_000e6);
        IKrMulticall.Operation[] memory opsShort = new IKrMulticall.Operation[](2);
        opsShort[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPYAddr,
                amountOut: 10_000e18,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        opsShort[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPTrade,
            data: IKrMulticall.Data({
                tokenIn: krJPYAddr,
                amountIn: 10_000e18,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: address(kiss),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        multicall.execute(opsShort, rsPayload);

        IKrMulticall.Operation[] memory opsShortClose = new IKrMulticall.Operation[](2);

        opsShortClose[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPTrade,
            data: IKrMulticall.Data({
                tokenIn: address(kiss),
                amountIn: 66.7655e18,
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: krJPYAddr,
                amountOut: 9930.1225e18,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        opsShortClose[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterRepay,
            data: IKrMulticall.Data({
                tokenIn: krJPYAddr,
                amountIn: 9930.1225e18,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        IKrMulticall.Result[] memory results = multicall.execute(opsShortClose, rsPayload);

        usdc.balanceOf(user).eq(0, "usdc-balance");
        kresko.getAccountCollateralAmount(user, address(usdc)).eq(9997520000, "usdc-deposit-amount");
        kiss.balanceOf(user).eq(0, "kiss-balance-after");
        krJPY.balanceOf(address(multicall)).eq(0, "jpy-balance-multicall-after");

        // min debt value
        kresko.getAccountDebtAmount(user, krJPYAddr).eq(1492537313432835820896, "jpy-borrow-balance-after");
        krJPY.balanceOf(user).eq(1422659813432835820896, "jpy-balance-after");

        results[0].tokenIn.eq(address(kiss), "results-kiss-trade-in-addr");
        results[0].amountIn.eq(66.7655e18, "results-kiss-trade-in-amount");
        results[0].tokenOut.eq(krJPYAddr, "results-krjpy-trade-out-addr");
        results[0].amountOut.eq(9930.1225e18, "results-krjpy-trade-out-amount");
        results[1].tokenIn.eq(krJPYAddr, "results-krjpy-repay-addr");
        results[1].amountIn.eq(8507462686567164179104, "result-krjpy-repay-amount");
        results[1].tokenOut.eq(address(0), "results-repay-addr");
        results[1].amountOut.eq(0, "results-usdc-vault-withdraw-amount");
    }

    function testMulticallComplex() public {
        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](9);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPYAddr,
                amountOut: 10000e18,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPYAddr,
                amountOut: 10000e18,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[2] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPYAddr,
                amountOut: 10000e18,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[3] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: krJPYAddr,
                amountIn: 10000e18,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalanceExactAmountIn,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[4] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: krJPYAddr,
                amountIn: 10000e18,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalanceExactAmountIn,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[5] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: krJPYAddr,
                amountIn: 10000e18,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalanceExactAmountIn,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[6] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: krJPYAddr,
                amountIn: 10000e18,
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[7] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPYAddr,
                amountOut: 10000e18,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[8] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPTrade,
            data: IKrMulticall.Data({
                tokenIn: krJPYAddr,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                amountIn: 10000e18,
                tokenOut: krETHAddr,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOut: 0,
                amountOutMin: 0,
                index: 0,
                path: ""
            })
        });

        prank(getAddr(0));
        krJPY.approve(address(multicall), type(uint256).max);
        IKrMulticall.Result[] memory results = multicall.execute(ops, rsPayload);
        for (uint256 i; i < results.length; i++) {
            results[i].tokenIn.clg("tokenIn");
            results[i].amountIn.clg("amountIn");
            results[i].tokenOut.clg("tokenOut");
            results[i].amountOut.clg("amountOut");
        }
    }

    /* -------------------------------- Util -------------------------------- */

    function _trades(uint256 count) internal {
        address trader = getAddr(777);
        uint256 mintAmount = 20000e6;
        usdc.mint(trader, mintAmount * count);

        prank(trader);
        usdc.approve(address(kiss), type(uint256).max);
        kiss.approve(address(kresko), type(uint256).max);
        krETH.approve(address(kresko), type(uint256).max);
        (uint256 tradeAmount, ) = kiss.vaultDeposit(address(usdc), mintAmount * count, trader);
        for (uint256 i = 0; i < count; i++) {
            rsCall(kresko.swapSCDP.selector, trader, address(kiss), krETHAddr, tradeAmount / count, 0);
            rsCall(kresko.swapSCDP.selector, trader, krETHAddr, address(kiss), krETH.balanceOf(trader), 0);
        }
    }

    function _cover(uint256 _coverAmount) internal returns (uint256 crAfter, uint256 debtValAfter) {
        rsCall(kresko.coverSCDP.selector, address(kiss), _coverAmount);
        return (rsStatic(kresko.getCollateralRatioSCDP.selector), rsStatic(kresko.getTotalDebtValueSCDP.selector, true));
    }

    function _liquidate(
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset
    ) internal returns (uint256 crAfter, uint256 debtValAfter, uint256 debtAmountAfter) {
        rsCall(kresko.liquidateSCDP.selector, _repayAsset, _repayAmount, _seizeAsset);
        return (
            rsStatic(kresko.getCollateralRatioSCDP.selector),
            rsStatic(kresko.getDebtValueSCDP.selector, _repayAsset, true),
            kresko.getDebtSCDP(_repayAsset)
        );
    }

    function _setETHPrice(uint256 _pushPrice) internal {
        ethFeed.setPrice(_pushPrice * 1e8);
        rs_price_eth = ("ETH:").and(_pushPrice.str()).and(":8");
        rsInit(rs_price_eth.and(rs_prices_rest));
    }

    function _getPrice(address _asset) internal view returns (uint256) {
        return rsStatic(kresko.getPrice.selector, _asset);
    }

    function _previewSwap(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) internal view returns (uint256 amountOut_) {
        return rsStatic(kresko.previewSwapSCDP.selector, _assetIn, _assetOut, _amountIn, _minAmountOut);
    }
}
