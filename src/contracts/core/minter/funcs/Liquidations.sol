// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {ms} from "minter/State.sol";
import {Asset} from "common/Types.sol";
import {cs} from "common/State.sol";
using PercentageMath for uint256;
using PercentageMath for uint32;
using PercentageMath for uint16;
using WadRay for uint256;
//@todo delete this if working
struct MaxLiqVars {
    Asset collateral;
    uint256 accountCollateralValue;
    uint32 debtFactor;
    uint256 minCollateralValue;
    uint256 minDebtValue;
    uint32 gainFactor;
    uint256 seizeCollateralAccountValue;
    uint32 maxLiquidationRatio;
}

/**
 * @dev Calculates the total value that can be liquidated for a liquidation pair
 * @param _account address to liquidate
 * @param _repayAsset Struct of the asset being repaid on behalf of the liquidatee
 * @param _seizeAsset Struct of the asset being seized from the liquidatee
 * @param _seizeAssetAddr The collateral asset being seized in the liquidation
 * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
 */
function oldMaxLiqValue(
    address _account,
    Asset storage _repayAsset,
    Asset storage _seizeAsset,
    address _seizeAssetAddr
) view returns (uint256 maxLiquidatableUSD) {
    MaxLiqVars memory vars = _createVars(_account, _repayAsset, _seizeAsset, _seizeAssetAddr);
    // Account is not liquidatable
    if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
        return 0;
    }

    maxLiquidatableUSD = getMLV(vars, _repayAsset.closeFee);

    if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
        return vars.seizeCollateralAccountValue;
    } else if (maxLiquidatableUSD < vars.minDebtValue) {
        return vars.minDebtValue;
    } else {
        return maxLiquidatableUSD;
    }
}

// @todo delete when tested without
/**
 * @notice Calculates the maximum USD value of a given kreskoAsset that can be liquidated given a liquidation pair
 * Calculates the value gained per USD repaid in liquidation for a given kreskoAsset
 * debtFactor = debtFactor = k * LT / cFactor;
 * valPerUSD = (DebtFactor - Asset closeFee - liqIncentive) / DebtFactor
 *
 * Calculates the maximum amount of USD value that can be liquidated given the account's collateral value
 * maxLiquidatableUSD = (MCV - ACV) / valPerUSD / debtFactor / cFactor * LOM
 * @dev This function is used by getMaxLiquidation and is factored out for readability
 * @param vars liquidation variables which includes above symbols
 */
import "hardhat/console.sol";

function calcMaxLiqValue(MaxLiqVars memory vars) pure returns (uint256) {
    uint256 valueGain = vars.gainFactor.percentMul(vars.debtFactor).percentMul(vars.collateral.factor);
    console.log("valueGainOld", valueGain);
    console.log("minColalteralVS", vars.minCollateralValue);
    console.log("accountCollateralValue", vars.accountCollateralValue);
    return (vars.minCollateralValue - vars.accountCollateralValue).percentDiv(valueGain);

    // return
    //     (vars.minCollateralValue - vars.accountCollateralValue)
    //         .percentDiv(vars.gainFactor)
    //         .percentDiv(vars.debtFactor)
    //         .percentDiv(vars.collateral.factor);
}

function getMLV(MaxLiqVars memory vars, uint16 _closeFee) pure returns (uint256) {
    return calcMaxLiqValue(vars);
}

function _createVars(
    address _account,
    Asset storage _repayAsset,
    Asset storage _seizeAsset,
    address _seizeAssetAddr
) view returns (MaxLiqVars memory) {
    uint32 maxLiquidationRatio = ms().maxLiquidationRatio;
    uint256 minCollateralValue = ms().accountMinCollateralAtRatio(_account, maxLiquidationRatio);

    (uint256 accountCollateralValue, uint256 seizeCollateralAccountValue) = ms().accountTotalCollateralValue(
        _account,
        _seizeAssetAddr
    );
    uint32 debtFactor = uint32(_repayAsset.kFactor.percentMul(maxLiquidationRatio).percentDiv(_seizeAsset.factor));
    return
        MaxLiqVars({
            collateral: _seizeAsset,
            accountCollateralValue: accountCollateralValue,
            debtFactor: debtFactor,
            minCollateralValue: minCollateralValue,
            minDebtValue: cs().minDebtValue,
            gainFactor: uint32((debtFactor - _seizeAsset.liqIncentive - _repayAsset.closeFee).percentDiv(debtFactor)),
            seizeCollateralAccountValue: seizeCollateralAccountValue,
            maxLiquidationRatio: maxLiquidationRatio
        });
}
