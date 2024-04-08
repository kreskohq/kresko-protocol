// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Asset} from "scripts/utils/ArbScript.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Task0005} from "scripts/Task0005.s.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {BurnArgs, MintArgs, SwapArgs} from "common/Args.sol";
import {JSON} from "scripts/deploy/libs/LibJSON.s.sol";
import {toWad} from "common/funcs/Math.sol";
import {Vault} from "vault/Vault.sol";
import {Errors} from "common/Errors.sol";
import {console} from "forge-std/console.sol";
import {PercentageMath} from "libs/PercentageMath.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0005Test is Tested, Task0005 {
    using Log for *;
    using Help for *;
    using ShortAssert for *;
    using PercentageMath for *;

    address constant binance = 0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D;

    function setUp() public {
        currentForkId = vm.createSelectFork("arbitrum");

        prank(safe);
        manager.whitelist(binance, true);

        prank(binance);
        approvals();
        kiss.approve(address(kresko), type(uint256).max);

        fetchPythAndUpdate();
        syncTimeLocal();
    }

    function test_executePayload0005() public {
        Asset memory kissAsset = kresko.getAsset(kissAddr);

        kresko.getAsset(krETHAddr).maxDebtSCDP.eq(16.5 ether, "krETH max debt before");
        kissAsset.maxDebtMinter.eq(0, "kiss max debt minter before");
        kissAsset.isMinterMintable.eq(false, "kiss is minter mintable before");
        kissAsset.openFee.eq(0, "kiss open fee before");
        kissAsset.closeFee.eq(0, "kiss close fee before");

        payload0005();

        kissAsset = kresko.getAsset(kissAddr);
        kissAsset.maxDebtMinter.eq(40000 ether, "kiss max debt minter after");
        kissAsset.isMinterMintable.eq(true, "kiss is minter mintable after");
        kissAsset.openFee.eq(5, "kiss open fee after");
        kissAsset.closeFee.eq(50, "kiss close fee after");
        kresko.getAsset(krETHAddr).maxDebtSCDP.eq(40 ether, "krETH max debt after");
    }

    function test_ICDP_mint_KISS_and_fees() public {
        bytes[] memory updateData;
        prank(binance);

        uint usdcAmount = 1000e6;
        uint kissAmount = 200e18;

        kresko.depositCollateral(binance, USDCAddr, usdcAmount);
        vm.expectRevert( // Exceeds max deposit
                abi.encodeWithSelector(
                    Errors.ASSET_NOT_MINTABLE_FROM_MINTER.selector,
                    Errors.ID({symbol: "KISS", addr: kissAddr})
                )
            );
        kresko.mintKreskoAsset(MintArgs(binance, address(kissAddr), kissAmount, address(this)), updateData);

        payload0005();

        prank(safe);
        manager.whitelist(binance, true);

        prank(binance);
        approvals();

        fetchPythAndUpdate();
        syncTimeLocal();

        Asset memory kissConfig = kresko.getAsset(kissAddr);

        kresko.depositCollateral(binance, USDCAddr, usdcAmount);
        uint256 totalCollateralValue = kresko.getAccountTotalCollateralValue(binance);
        uint256 feeValue = kresko.getValue(kissAddr, kissAmount.percentMul(kissConfig.openFee));
        kresko.mintKreskoAsset(MintArgs(binance, address(kissAddr), kissAmount, binance), updateData);

        uint256 collateralAfterMint = kresko.getAccountTotalCollateralValue(binance);
        collateralAfterMint.closeTo(totalCollateralValue - feeValue, 100, "total-collateral-value-after-mint");

        kresko.burnKreskoAsset(BurnArgs(binance, kissAddr, kissAmount, 0, binance), updateData);

        uint256 collateralAfterBurn = kresko.getAccountTotalCollateralValue(binance);

        feeValue = kresko.getValue(kissAddr, kissAmount.percentMul(kissConfig.closeFee));
        collateralAfterBurn.closeTo(collateralAfterMint - feeValue, 100, "total-collateral-value-after-burn");
    }

    function test_SCDP_SWAPS_krETH() public {
        uint256 amount = 42000 ether;
        getKISSM(binance, amount);
        kresko.depositSCDP(binance, address(kiss), amount);

        uint256 swapAmountKISS = 70000 ether;
        getKISSM(binance, swapAmountKISS);
        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: kissAddr,
                assetOut: krETHAddr,
                amountIn: swapAmountKISS,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        payload0005();

        prank(safe);
        manager.whitelist(binance, true);

        prank(binance);
        approvals();

        fetchPythAndUpdate();
        syncTimeLocal();

        krETH.balanceOf(binance).eq(0, "krETH balance before swap");

        getKISSM(binance, swapAmountKISS + amount);
        kresko.depositSCDP(binance, address(kiss), amount);
        // Swap KISS for krETH
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: kissAddr,
                assetOut: krETHAddr,
                amountIn: swapAmountKISS,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        krETH.balanceOf(binance).gt(0, "krETH balance after swap");
    }
}
