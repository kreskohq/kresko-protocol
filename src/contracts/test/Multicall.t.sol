// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.sol";
import {Help, Log} from "kresko-lib/utils/Libs.sol";
import {Role} from "common/Constants.sol";
import {Local} from "scripts/deploy/Run.s.sol";
import {Test} from "forge-std/Test.sol";
import {state} from "scripts/deploy/base/DeployState.s.sol";
import {PType} from "periphery/PTypes.sol";
import {DataV1} from "periphery/DataV1.sol";
import {IDataFacet} from "periphery/interfaces/IDataFacet.sol";
import {Errors} from "common/Errors.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {Asset} from "common/Types.sol";
import {SCDPAssetIndexes} from "scdp/STypes.sol";
import {WadRay} from "libs/WadRay.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract AuditTest is Local {
    using ShortAssert for *;
    using Help for *;
    using Log for *;
    using WadRay for *;
    using PercentageMath for *;

    bytes redstoneCallData;
    DataV1 internal dataV1;
    KrMulticall internal mc;
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

        dataV1 = new DataV1(IDataFacet(address(kresko)), address(vkiss), address(kiss));
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
    }

    function testMulticall() public {
        KrMulticall.Op[] memory ops = new KrMulticall.Op[](9);
        ops[0] = KrMulticall.Op({
            action: KrMulticall.OpAction.MinterBorrow,
            data: KrMulticall.OpData(address(0), krJPY.addr, 0, 10000e18, 0, 0, 0, "")
        });
        ops[1] = KrMulticall.Op({
            action: KrMulticall.OpAction.MinterBorrow,
            data: KrMulticall.OpData(address(0), krJPY.addr, 0, 10000e18, 0, 0, 0, "")
        });
        ops[2] = KrMulticall.Op({
            action: KrMulticall.OpAction.MinterBorrow,
            data: KrMulticall.OpData(address(0), krJPY.addr, 0, 10000e18, 0, 0, 0, "")
        });
        ops[3] = KrMulticall.Op({
            action: KrMulticall.OpAction.MinterDeposit,
            data: KrMulticall.OpData(krJPY.addr, address(0), 10000e18, 0, 0, 0, 0, "")
        });
        ops[4] = KrMulticall.Op({
            action: KrMulticall.OpAction.MinterDeposit,
            data: KrMulticall.OpData(krJPY.addr, address(0), 10000e18, 0, 0, 0, 0, "")
        });
        ops[5] = KrMulticall.Op({
            action: KrMulticall.OpAction.MinterDeposit,
            data: KrMulticall.OpData(krJPY.addr, address(0), 10000e18, 0, 0, 0, 0, "")
        });
        ops[6] = KrMulticall.Op({
            action: KrMulticall.OpAction.MinterDeposit,
            data: KrMulticall.OpData(krJPY.addr, address(0), 10000e18, 0, 0, 0, 0, "")
        });
        ops[7] = KrMulticall.Op({
            action: KrMulticall.OpAction.MinterBorrow,
            data: KrMulticall.OpData(address(0), krJPY.addr, 0, 10000e18, 0, 0, 0, "")
        });
        ops[8] = KrMulticall.Op({
            action: KrMulticall.OpAction.SCDPTrade,
            data: KrMulticall.OpData(krJPY.addr, krETH.addr, 10000e18, 0, 0, 0, 0, "")
        });

        prank(getAddr(0));
        krJPY.asToken.approve(address(mc), type(uint256).max);
        KrMulticall.OpResult[] memory results = mc.execute(ops, redstoneCallData);
        for (uint256 i; i < results.length; i++) {
            results[i].tokenIn.clg("tokenIn");
            results[i].amountIn.clg("amountIn");
            results[i].tokenOut.clg("tokenOut");
            results[i].amountOut.clg("amountOut");
        }
    }

    /* -------------------------------- Util -------------------------------- */

    function _feeTestRebaseConfig(uint248 multiplier, bool positive) internal pure returns (FeeTestRebaseConfig memory) {
        if (positive) {
            return
                FeeTestRebaseConfig({
                    positive: positive,
                    rebaseMultiplier: multiplier * 1e18,
                    ethPrice: ETH_PRICE / multiplier,
                    firstLiquidationPrice: 28000 / multiplier,
                    secondLiquidationPrice: 17500 / multiplier
                });
        }
        return
            FeeTestRebaseConfig({
                positive: positive,
                rebaseMultiplier: multiplier * 1e18,
                ethPrice: ETH_PRICE * multiplier,
                firstLiquidationPrice: 28000 * multiplier,
                secondLiquidationPrice: 17500 * multiplier
            });
    }

    function _setETHPriceAndSwap(uint256 price, uint256 swapAmount) internal {
        prank(getAddr(0));
        _setETHPrice(price);
        kresko.setAssetKFactor(krETH.addr, 1.2e4);
        call(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETH.addr, swapAmount, 0, rsPrices);
    }

    function _tradeSetEthPriceAndLiquidate(uint256 price, uint256 count) internal {
        prank(getAddr(0));
        uint256 debt = kresko.getDebtSCDP(krETH.addr);
        if (debt < krETH.asToken.balanceOf(getAddr(0))) {
            mockUSDC.mock.mint(getAddr(0), 100_000e18);
            call(kresko.depositCollateral.selector, getAddr(0), mockUSDC.addr, 100_000e18, rsPrices);
            call(kresko.mintKreskoAsset.selector, getAddr(0), krETH.addr, debt, rsPrices);
        }
        kresko.setAssetKFactor(krETH.addr, 1e4);
        for (uint256 i = 0; i < count; i++) {
            _setETHPrice(ETH_PRICE);
            _trades(1);
            prank(getAddr(0));
            _setETHPrice(price);
            staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices).pct("CR: before-liq");
            _liquidate(krETH.addr, 1e8, address(kiss));
        }
    }

    function _setETHPriceAndLiquidate(uint256 price) internal {
        prank(getAddr(0));
        uint256 debt = kresko.getDebtSCDP(krETH.addr);
        if (debt < krETH.asToken.balanceOf(getAddr(0))) {
            mockUSDC.mock.mint(getAddr(0), 100_000e18);
            call(kresko.depositCollateral.selector, getAddr(0), mockUSDC.addr, 100_000e18, rsPrices);
            call(kresko.mintKreskoAsset.selector, getAddr(0), krETH.addr, debt, rsPrices);
        }

        kresko.setAssetKFactor(krETH.addr, 1e4);
        _setETHPrice(price);
        staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices).pct("CR: before-liq");
        _liquidate(krETH.addr, debt, address(kiss));
        // staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices).pct("CR: after-liq");
    }

    function _setETHPriceAndLiquidate(uint256 price, uint256 amount) internal {
        prank(getAddr(0));
        if (amount < krETH.asToken.balanceOf(getAddr(0))) {
            mockUSDC.mock.mint(getAddr(0), 100_000e18);
            call(kresko.depositCollateral.selector, getAddr(0), mockUSDC.addr, 100_000e18, rsPrices);
            call(kresko.mintKreskoAsset.selector, getAddr(0), krETH.addr, amount, rsPrices);
        }

        kresko.setAssetKFactor(krETH.addr, 1e4);
        _setETHPrice(price);
        staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices).pct("CR: before-liq");
        _liquidate(krETH.addr, amount.wadDiv(price * 1e18), address(kiss));
        // staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices).pct("CR: after-liq");
    }

    function _setETHPriceAndCover(uint256 price, uint256 amount) internal {
        prank(getAddr(0));
        uint256 debt = kresko.getDebtSCDP(krETH.addr);
        mockUSDC.mock.mint(getAddr(0), 100_000e18);
        mockUSDC.asToken.approve(address(kiss), type(uint256).max);
        kiss.vaultMint(address(USDC), amount, getAddr(0));
        kiss.approve(address(kresko), type(uint256).max);

        kresko.setAssetKFactor(krETH.addr, 1e4);
        _setETHPrice(price);
        staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices).pct("CR: before-cover");
        _cover(amount, address(kiss));
        staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices).pct("CR: after-cover");
    }

    function _setETHPriceAndCoverIncentive(uint256 price, uint256 amount) internal {
        prank(getAddr(0));
        uint256 debt = kresko.getDebtSCDP(krETH.addr);
        mockUSDC.mock.mint(getAddr(0), 100_000e18);
        mockUSDC.asToken.approve(address(kiss), type(uint256).max);
        kiss.vaultMint(address(USDC), amount, getAddr(0));
        kiss.approve(address(kresko), type(uint256).max);

        kresko.setAssetKFactor(krETH.addr, 1e4);
        _setETHPrice(price);
        staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices).pct("CR: before-cover");
        _coverIncentive(amount, address(kiss));
        staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices).pct("CR: after-cover");
    }

    function _trades(uint256 count) internal {
        address trader = getAddr(777);
        prank(deployCfg.admin);
        uint256 mintAmount = 20000e18;

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

    function _cover(uint256 _coverAmount, address _seizeAsset) internal returns (uint256 crAfter, uint256 debtValAfter) {
        (bool success, bytes memory returndata) = address(kresko).call(
            abi.encodePacked(abi.encodeWithSelector(kresko.coverSCDP.selector, address(kiss), _coverAmount), redstoneCallData)
        );
        if (!success) _handleRevert(returndata);
        return (
            staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices),
            staticCall(kresko.getTotalDebtValueSCDP.selector, true, rsPrices)
        );
    }

    function _coverIncentive(
        uint256 _coverAmount,
        address _seizeAsset
    ) internal returns (uint256 crAfter, uint256 debtValAfter) {
        (bool success, bytes memory returndata) = address(kresko).call(
            abi.encodePacked(
                abi.encodeWithSelector(kresko.coverWithIncentiveSCDP.selector, address(kiss), _coverAmount, address(kiss)),
                redstoneCallData
            )
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

    function _setETHPrice(uint256 _pushPrice) internal returns (string memory) {
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
