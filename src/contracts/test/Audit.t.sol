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

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract AuditTest is Local, Test {
    using ShortAssert for *;
    using Help for *;
    using Log for *;

    bytes redstoneCallData;
    DataV1 internal dataV1;
    string internal rsPrices;

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

        prank(getAddr(0));
        redstoneCallData = getRedstonePayload(rsPrices);
        _setETHPrice(2000);
        // 1000 KISS -> 0.48 ETH
        call(kresko.swapSCDP.selector, getAddr(0), address(state().kiss), krETH.addr, 1000e18, 0, rsPrices);
    }

    function testRebase() external {
        prank(getAddr(0));

        uint256 crBefore = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        uint256 amountDebtBefore = kresko.getDebtSCDP(krETH.addr);
        uint256 valDebtBefore = staticCall(kresko.getDebtValueSCDP.selector, krETH.addr, false, rsPrices);

        amountDebtBefore.gt(0, "debt-zero");
        crBefore.gt(0, "cr-zero");
        valDebtBefore.gt(0, "valDebt-zero");

        _setETHPrice(1000);
        krETH.krAsset.rebase(2e18, true, new address[](0));

        uint256 crAfter = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        uint256 amountDebtAfter = kresko.getDebtSCDP(krETH.addr);
        uint256 valDebtAfter = staticCall(kresko.getDebtValueSCDP.selector, krETH.addr, false, rsPrices);

        amountDebtBefore.eq(amountDebtAfter / 2, "debt-not-gt-after-rebase");
        crBefore.eq(crAfter, "cr-not-equal-after-rebase");
        valDebtBefore.eq(valDebtAfter, "valDebt-not-equal-after-rebase");
    }

    function testSharedLiquidationAfterRebaseOak1() external {
        prank(getAddr(0));

        uint256 crBefore = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        uint256 amountDebtBefore = kresko.getDebtSCDP(krETH.addr);
        amountDebtBefore.clg("amount-debt-before");

        // rebase up 2x and adjust price accordingly
        _setETHPrice(1000);
        krETH.krAsset.rebase(2e18, true, new address[](0));

        // 1000 KISS -> 0.96 ETH
        call(kresko.swapSCDP.selector, getAddr(0), address(state().kiss), krETH.addr, 1000e18, 0, rsPrices);

        // previous debt amount 0.48 ETH, doubled after rebase so 0.96 ETH
        uint256 amountDebtAfter = kresko.getDebtSCDP(krETH.addr);
        amountDebtAfter.eq(0.96e18 + (0.48e18 * 2), "amount-debt-after");

        // matches $1000 ETH valuation
        uint256 valueDebtAfter = staticCall(kresko.getDebtValueSCDP.selector, krETH.addr, true, rsPrices);
        valueDebtAfter.eq(1920e8, "value-debt-after");

        // make it liquidatable
        _setETHPrice(20000);
        uint256 crAfter = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        crAfter.lt(deployCfg.scdpLt); // cr-after: 112.65%

        // this fails without the fix as normalized debt amount is 0.96 krETH
        // vm.expectRevert();
        _liquidate(krETH.addr, 0.96e18 + 1, address(state().kiss));
    }

    /* -------------------------------- Util -------------------------------- */

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
        if (!success) _revert(returndata);
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
        if (!success) _revert(returndata);
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
}
