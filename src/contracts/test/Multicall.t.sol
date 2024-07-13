// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/s/ShortAssert.t.sol";
import {Help, Utils, Log} from "kresko-lib/utils/s/LibVm.s.sol";
import {IKrMulticall} from "periphery/KrMulticall.sol";
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {SCDPLiquidationArgs, SwapArgs} from "common/Args.sol";
import "scripts/deploy/JSON.s.sol" as JSON;

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract MulticallTest is Deploy {
    using ShortAssert for *;
    using Help for *;
    using Log for *;
    using Utils for *;
    uint256 constant ETH_PRICE = 2000;

    KreskoAsset krETH;
    KreskoAsset krJPY;
    address krETHAddr;
    address krJPYAddr;
    MockOracle ethFeed;
    MockERC20 usdc;
    MockERC20 usdt;

    function setUp() public {
        Deploy.deployTest(0);

        // for price updates
        vm.deal(address(kresko), 1 ether);

        usdc = MockERC20(Deployed.addr("USDC"));
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
        kresko.swapSCDP(SwapArgs(getAddr(0), address(kiss), krETHAddr, 1000e18, 0, updateData));
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

        IKrMulticall.Result[] memory results = multicall.execute(ops, updateData);
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
        vm.deal(user, amount * 2 + updateFee);
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

        IKrMulticall.Result[] memory results = multicall.execute{value: 5 ether + updateFee}(ops, updateData);
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
        multicall.execute{value: 5 ether}(ops, updateData);
    }

    function testNativeDepositWithdraw() public {
        address user = getAddr(100);
        uint256 amount = 5 ether;
        vm.deal(user, amount * 2 + updateFee);
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
                amountOut: uint96(amount),
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSenderNative,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = multicall.execute{value: amount + updateFee}(ops, updateData);
        results[0].amountIn.eq(amount, "native-deposit-amount");
        results[0].tokenIn.eq(address(weth), "native-deposit-addr");
        results[1].amountOut.eq(amount, "native-deposit-amount");
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

        IKrMulticall.Result[] memory results = multicall.execute(ops, updateData);
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

        IKrMulticall.Result[] memory results = multicall.execute(ops, updateData);
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

        multicall.execute(opsDeposit, updateData);

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

        IKrMulticall.Result[] memory results = multicall.execute(opsWithdraw, updateData);

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
        IKrMulticall.Result[] memory results = multicall.execute(opsShort, updateData);

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
        multicall.execute(opsShort, updateData);

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
        IKrMulticall.Result[] memory results = multicall.execute(opsShortClose, updateData);

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
        IKrMulticall.Result[] memory results = multicall.execute(ops, updateData);
        for (uint256 i; i < results.length; i++) {
            results[i].tokenIn.clg("tokenIn");
            results[i].amountIn.clg("amountIn");
            results[i].tokenOut.clg("tokenOut");
            results[i].amountOut.clg("amountOut");
        }
    }

    /* -------------------------------- Util -------------------------------- */

    function _setETHPrice(uint256 _newPrice) internal {
        ethFeed.setPrice(_newPrice * 1e8);
        JSON.Config memory cfg = JSON.getConfig("test", "test-base");
        for (uint256 i = 0; i < cfg.assets.tickers.length; i++) {
            if (cfg.assets.tickers[i].ticker.equals("ETH")) {
                cfg.assets.tickers[i].mockPrice = _newPrice * 1e8;
            }
        }
        updatePythLocal(cfg.getMockPrices());
    }
}
