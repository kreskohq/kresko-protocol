// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.sol";
import {Help, Log} from "kresko-lib/utils/Libs.sol";
import {Localnet} from "scripts/deploy/run/Localnet.s.sol";
import {state} from "scripts/deploy/base/IDeployState.sol";
import {DataV1} from "periphery/DataV1.sol";
import {IDataFacet} from "periphery/interfaces/IDataFacet.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {IKrMulticall, KrMulticall} from "periphery/KrMulticall.sol";

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract MulticallTest is Localnet {
    using ShortAssert for *;
    using Help for *;
    using Log for *;
    using WadRay for *;
    using PercentageMath for *;

    bytes redstoneCallData;
    KrMulticall internal mc;
    DataV1 internal dataV1;
    string internal rsPrices;
    uint256 constant ETH_PRICE = 2000;

    struct FeeTestRebaseConfig {
        uint248 rebaseMultiplier;
        bool positive;
        uint256 ethPrice;
        uint256 firstLiquidationPrice;
        uint256 secondLiquidationPrice;
    }

    function setUp() public {
        rsPrices = initialPrices;

        // enableLogger();
        address deployer = getAddr(0);
        address admin = getAddr(0);
        address treasury = getAddr(10);
        vm.deal(deployer, 100 ether);

        UserCfg[] memory userCfg = super.createUserConfig(testUsers);
        AssetsOnChain memory assets = deploy(deployer, admin, treasury);
        setupUsers(userCfg, assets);

        dataV1 = new DataV1(IDataFacet(address(kresko)), address(vkiss), address(kiss), address(0), address(0));
        kiss = state().kiss;
        mc = state().multicall;

        prank(getAddr(0));
        redstoneCallData = getRedstonePayload(rsPrices);
        mockUSDC.asToken.approve(address(kresko), type(uint256).max);
        krETH.asToken.approve(address(kresko), type(uint256).max);
        _setETHPrice(ETH_PRICE);
        // 1000 KISS -> 0.48 ETH
        call(kresko.swapSCDP.selector, getAddr(0), address(state().kiss), krETH.addr, 1000e18, 0, rsPrices);
        vkiss.setDepositFee(address(USDT), 10e2);
        vkiss.setWithdrawFee(address(USDT), 10e2);

        mockUSDC.mock.mint(getAddr(100), 10_000e6);
    }

    function testMulticallDepositBorrow() public {
        address user = getAddr(100);
        prank(user);
        mockUSDC.asToken.approve(address(mc), type(uint256).max);

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: mockUSDC.addr,
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
                tokenOut: krJPY.addr,
                amountOut: 10000e18,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = mc.execute(ops, redstoneCallData);
        mockUSDC.asToken.balanceOf(user).eq(0, "usdc-balance");
        krJPY.asToken.balanceOf(user).eq(10000e18, "jpy-borrow-balance");
        results[0].amountIn.eq(10_000e6, "usdc-deposit-amount");
        results[0].tokenIn.eq(mockUSDC.addr, "usdc-deposit-addr");
        results[1].tokenOut.eq(krJPY.addr, "jpy-borrow-addr");
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
                tokenIn: address(WETH),
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

        IKrMulticall.Result[] memory results = mc.execute{value: 5 ether}(ops, redstoneCallData);
        results[0].amountIn.eq(5 ether, "native-deposit-amount");
        results[0].tokenIn.eq(address(WETH), "native-deposit-addr");
        uint256 depositsAfter = kresko.getAccountCollateralAmount(user, address(WETH));
        address(mc).balance.eq(0 ether, "native-contract-balance-after");

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
                tokenIn: address(USDT),
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
        IKrMulticall.Result[] memory results = mc.execute{value: 5 ether}(ops, redstoneCallData);
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
                tokenIn: address(WETH),
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
                tokenOut: address(WETH),
                amountOut: 5 ether,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSenderNative,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = mc.execute{value: 5 ether}(ops, redstoneCallData);
        results[0].amountIn.eq(5 ether, "native-deposit-amount");
        results[0].tokenIn.eq(address(WETH), "native-deposit-addr");
        results[1].amountOut.eq(5 ether, "native-deposit-amount");
        results[1].tokenOut.eq(address(WETH), "native-deposit-addr");
        uint256 depositsAfter = kresko.getAccountCollateralAmount(user, address(WETH));
        address(mc).balance.eq(0 ether, "native-contract-balance-after");

        user.balance.eq(10 ether, "native-user-balance-after");
        depositsAfter.eq(0 ether, "native-deposit-amount-after");
    }

    function testMulticallDepositBorrowRepay() public {
        address user = getAddr(100);
        prank(user);
        mockUSDC.asToken.approve(address(mc), type(uint256).max);

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](3);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterDeposit,
            data: IKrMulticall.Data({
                tokenIn: mockUSDC.addr,
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
                tokenOut: krJPY.addr,
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
                tokenIn: krJPY.addr,
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

        IKrMulticall.Result[] memory results = mc.execute(ops, redstoneCallData);
        mockUSDC.asToken.balanceOf(user).eq(0, "usdc-balance");
        krJPY.asToken.balanceOf(user).eq(0, "jpy-borrow-balance");
        results[0].amountIn.eq(10_000e6, "usdc-deposit-amount");
        results[0].tokenIn.eq(mockUSDC.addr, "usdc-deposit-addr");
        results[1].tokenOut.eq(krJPY.addr, "jpy-borrow-addr");
        results[1].amountOut.eq(10000e18, "jpy-borrow-amount");
        results[2].tokenIn.eq(krJPY.addr, "jpy-repay-addr");
        results[2].amountIn.eq(10000e18, "jpy-repay-amount");
    }

    function testMulticallVaultDepositSCDPDeposit() public {
        address user = getAddr(100);
        prank(user);
        mockUSDC.asToken.approve(address(mc), type(uint256).max);

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.VaultDeposit,
            data: IKrMulticall.Data({
                tokenIn: mockUSDC.addr,
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

        IKrMulticall.Result[] memory results = mc.execute(ops, redstoneCallData);
        mockUSDC.asToken.balanceOf(user).eq(0, "usdc-balance");
        kresko.getAccountDepositSCDP(user, address(kiss)).eq(9998e18, "kiss-deposit-amount");
        kiss.balanceOf(user).eq(0, "jpy-borrow-balance");

        results[0].tokenIn.eq(mockUSDC.addr, "results-usdc-deposit-addr");
        results[0].amountIn.eq(10_000e6, "results-usdc-deposit-amount");
        results[1].tokenIn.eq(address(kiss), "results-kiss-deposit-addr");
        results[1].amountIn.eq(9998e18, "results-kiss-deposit-amount");
    }

    function testMulticallVaultWithdrawSCDPWithdraw() public {
        address user = getAddr(100);
        prank(user);
        mockUSDC.asToken.approve(address(mc), type(uint256).max);

        IKrMulticall.Operation[] memory opsDeposit = new IKrMulticall.Operation[](2);
        opsDeposit[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.VaultDeposit,
            data: IKrMulticall.Data({
                tokenIn: mockUSDC.addr,
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

        mc.execute(opsDeposit, redstoneCallData);

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
                tokenOut: mockUSDC.addr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        IKrMulticall.Result[] memory results = mc.execute(opsWithdraw, redstoneCallData);

        mockUSDC.asToken.balanceOf(user).eq(9996000400, "usdc-balance");
        kresko.getAccountDepositSCDP(user, address(kiss)).eq(0, "kiss-deposit-amount");
        kiss.balanceOf(user).eq(0, "jpy-borrow-balance");

        results[0].tokenIn.eq(address(0), "results-tokenin-addr");
        results[0].amountIn.eq(0, "results-tokenin-amount");
        results[0].tokenOut.eq(address(kiss), "results-kiss-deposit-addr");
        results[0].amountOut.eq(9998e18, "results-kiss-deposit-amount");
        results[1].tokenIn.eq(address(kiss), "results-kiss-vault-withdraw-addr");
        results[1].amountIn.eq(9998e18, "result-kiss-vault-withdraw-amount");
        results[1].tokenOut.eq(mockUSDC.addr, "results-usdc-vault-withdraw-addr");
        results[1].amountOut.eq(9996000400, "results-usdc-vault-withdraw-amount");
    }

    function testMulticallShort() public {
        address user = getAddr(100);
        prank(user);
        mockUSDC.asToken.approve(address(mc), type(uint256).max);
        mockUSDC.asToken.approve(address(kresko), type(uint256).max);

        kresko.depositCollateral(user, mockUSDC.addr, 10_000e6);

        IKrMulticall.Operation[] memory opsShort = new IKrMulticall.Operation[](2);
        opsShort[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPY.addr,
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
                tokenIn: krJPY.addr,
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
        IKrMulticall.Result[] memory results = mc.execute(opsShort, redstoneCallData);

        krJPY.asToken.balanceOf(address(mc)).eq(0, "jpy-balance-mc-after");
        kiss.balanceOf(address(mc)).eq(0, "kiss-balance-mc-after");
        mockUSDC.asToken.balanceOf(user).eq(0, "usdc-balance-after");
        kresko.getAccountCollateralAmount(user, mockUSDC.addr).eq(9998660000, "usdc-deposit-amount");
        kiss.balanceOf(user).eq(66.7655e18, "kiss-balance-after");
        kresko.getAccountDebtAmount(user, krJPY.addr).eq(10_000e18, "jpy-borrow-balance-after");

        results[0].tokenIn.eq(address(0), "results-0-tokenin-addr");
        results[0].amountIn.eq(0, "results-0-tokenin-amount");
        results[0].tokenOut.eq(krJPY.addr, "results-krjpy-borrow-addr");
        results[0].amountOut.eq(10_000e18, "results-krjpy-borrow-amount");
        results[1].tokenIn.eq(krJPY.addr, "results-krjpy-trade-in-addr");
        results[1].amountIn.eq(10_000e18, "result-krjpy-trade-in-amount");
        results[1].tokenOut.eq(address(kiss), "results-kiss-trade-out-addr");
        results[1].amountOut.eq(66.7655e18, "results-usdc-vault-withdraw-amount");
    }

    function testMulticallShortClose() public {
        address user = getAddr(100);
        prank(user);
        krJPY.asToken.balanceOf(user).eq(0, "jpy-balance-before");
        mockUSDC.asToken.approve(address(mc), type(uint256).max);
        mockUSDC.asToken.approve(address(kresko), type(uint256).max);
        kiss.approve(address(mc), type(uint256).max);

        kresko.depositCollateral(user, mockUSDC.addr, 10_000e6);
        IKrMulticall.Operation[] memory opsShort = new IKrMulticall.Operation[](2);
        opsShort[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.MinterBorrow,
            data: IKrMulticall.Data({
                tokenIn: address(0),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.None,
                tokenOut: krJPY.addr,
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
                tokenIn: krJPY.addr,
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
        mc.execute(opsShort, redstoneCallData);

        IKrMulticall.Operation[] memory opsShortClose = new IKrMulticall.Operation[](2);

        opsShortClose[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPTrade,
            data: IKrMulticall.Data({
                tokenIn: address(kiss),
                amountIn: 66.7655e18,
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: krJPY.addr,
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
                tokenIn: krJPY.addr,
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
        IKrMulticall.Result[] memory results = mc.execute(opsShortClose, redstoneCallData);

        mockUSDC.asToken.balanceOf(user).eq(0, "usdc-balance");
        kresko.getAccountCollateralAmount(user, mockUSDC.addr).eq(9997520000, "usdc-deposit-amount");
        kiss.balanceOf(user).eq(0, "kiss-balance-after");
        krJPY.asToken.balanceOf(address(mc)).eq(0, "jpy-balance-mc-after");

        // min debt value
        kresko.getAccountDebtAmount(user, krJPY.addr).eq(1492537313432835820896, "jpy-borrow-balance-after");
        krJPY.asToken.balanceOf(user).eq(1422659813432835820896, "jpy-balance-after");

        results[0].tokenIn.eq(address(kiss), "results-kiss-trade-in-addr");
        results[0].amountIn.eq(66.7655e18, "results-kiss-trade-in-amount");
        results[0].tokenOut.eq(krJPY.addr, "results-krjpy-trade-out-addr");
        results[0].amountOut.eq(9930.1225e18, "results-krjpy-trade-out-amount");
        results[1].tokenIn.eq(krJPY.addr, "results-krjpy-repay-addr");
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
                tokenOut: krJPY.addr,
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
                tokenOut: krJPY.addr,
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
                tokenOut: krJPY.addr,
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
                tokenIn: krJPY.addr,
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
                tokenIn: krJPY.addr,
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
                tokenIn: krJPY.addr,
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
                tokenIn: krJPY.addr,
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
                tokenOut: krJPY.addr,
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
                tokenIn: krJPY.addr,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                amountIn: 10000e18,
                tokenOut: krETH.addr,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOut: 0,
                amountOutMin: 0,
                index: 0,
                path: ""
            })
        });

        prank(getAddr(0));
        krJPY.asToken.approve(address(mc), type(uint256).max);
        IKrMulticall.Result[] memory results = mc.execute(ops, redstoneCallData);
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
        prank(deployCfg.admin);
        uint256 mintAmount = 20000e6;

        kresko.setFeeAssetSCDP(address(kiss));
        mockUSDC.mock.mint(trader, mintAmount * count);

        prank(trader);
        mockUSDC.mock.approve(address(kiss), type(uint256).max);
        kiss.approve(address(kresko), type(uint256).max);
        krETH.asToken.approve(address(kresko), type(uint256).max);
        (uint256 tradeAmount, ) = kiss.vaultDeposit(address(USDC), mintAmount * count, trader);

        for (uint256 i = 0; i < count; i++) {
            call(kresko.swapSCDP.selector, trader, address(kiss), krETH.addr, tradeAmount / count, 0, rsPrices);
            call(kresko.swapSCDP.selector, trader, krETH.addr, address(kiss), krETH.asToken.balanceOf(trader), 0, rsPrices);
        }
    }

    function _cover(uint256 _coverAmount) internal returns (uint256 crAfter, uint256 debtValAfter) {
        (bool success, bytes memory returndata) = address(kresko).call(
            abi.encodePacked(abi.encodeWithSelector(kresko.coverSCDP.selector, address(kiss), _coverAmount), redstoneCallData)
        );
        if (!success) _handleRevert(returndata);
        return (
            staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices),
            staticCall(kresko.getTotalDebtValueSCDP.selector, true, rsPrices)
        );
    }

    function _liquidate(
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset
    ) internal returns (uint256 crAfter, uint256 debtValAfter, uint256 debtAmountAfter) {
        (bool success, bytes memory returndata) = address(kresko).call(
            abi.encodePacked(
                abi.encodeWithSelector(kresko.liquidateSCDP.selector, _repayAsset, _repayAmount, _seizeAsset),
                redstoneCallData
            )
        );
        if (!success) _handleRevert(returndata);
        return (
            staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices),
            staticCall(kresko.getDebtValueSCDP.selector, _repayAsset, true, rsPrices),
            kresko.getDebtSCDP(_repayAsset)
        );
    }

    function _previewSwap(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) internal view returns (uint256 amountOut_) {
        (bool success, bytes memory returndata) = address(kresko).staticcall(
            abi.encodePacked(
                abi.encodeWithSelector(kresko.previewSwapSCDP.selector, _assetIn, _assetOut, _amountIn, _minAmountOut),
                redstoneCallData
            )
        );
        if (!success) _handleRevert(returndata);
        amountOut_ = abi.decode(returndata, (uint256));
    }

    function _setETHPrice(uint256 _pushPrice) internal {
        mockFeedETH.setPrice(_pushPrice * 1e8);
        price_eth_rs = ("ETH:").and(_pushPrice.str()).and(":8");
        _updateRsPrices();
    }

    function _getPrice(address _asset) internal view returns (uint256 price_) {
        (bool success, bytes memory returndata) = address(kresko).staticcall(
            abi.encodePacked(abi.encodeWithSelector(kresko.getPrice.selector, _asset), redstoneCallData)
        );
        require(success, "getPrice-failed");
        price_ = abi.decode(returndata, (uint256));
    }

    function _updateRsPrices() internal {
        rsPrices = createPriceString();
        redstoneCallData = getRedstonePayload(rsPrices);
    }

    function _handleRevert(bytes memory data) internal pure {
        assembly {
            revert(add(32, data), mload(data))
        }
    }
}
