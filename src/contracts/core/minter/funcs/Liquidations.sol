// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {calcMaxLiqValue} from "common/funcs/Math.sol";
import {MaxLiqVars} from "common/Types.sol";
import {ms} from "minter/State.sol";
import {Asset} from "common/Types.sol";
import {cs} from "common/State.sol";

using WadRay for uint256;
using PercentageMath for uint256;
using PercentageMath for uint16;

/**
 * @dev Calculates the total value that can be liquidated for a liquidation pair
 * @param _account address to liquidate
 * @param _repayAsset Struct of the asset being repaid on behalf of the liquidatee
 * @param _seizeAsset Struct of the asset being seized from the liquidatee
 * @param _seizeAssetAddr The collateral asset being seized in the liquidation
 * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
 */
function maxLiquidatableValue(
    address _account,
    Asset memory _repayAsset,
    Asset memory _seizeAsset,
    address _seizeAssetAddr
) view returns (uint256 maxLiquidatableUSD) {
    MaxLiqVars memory vars = _createVars(_account, _repayAsset, _seizeAsset, _seizeAssetAddr);
    // Account is not liquidatable
    if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
        return 0;
    }

    maxLiquidatableUSD = calcMaxLiqValue(vars, _repayAsset.closeFee);

    if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
        return vars.seizeCollateralAccountValue;
    } else if (maxLiquidatableUSD < vars.minDebtValue) {
        return vars.minDebtValue;
    } else {
        return maxLiquidatableUSD;
    }
}

function _createVars(
    address _account,
    Asset memory _repayAsset,
    Asset memory _seizeAsset,
    address _seizeAssetAddr
) view returns (MaxLiqVars memory) {
    uint32 maxLiquidationRatio = ms().maxLiquidationRatio;
    uint256 minCollateralValue = ms().accountMinCollateralAtRatio(_account, maxLiquidationRatio);

    (uint256 accountCollateralValue, uint256 seizeCollateralAccountValue) = ms().accountCollateralAssetValue(
        _account,
        _seizeAssetAddr
    );

    return
        MaxLiqVars({
            collateral: _seizeAsset,
            accountCollateralValue: accountCollateralValue,
            debtFactor: uint32(_repayAsset.kFactor.percentMul(maxLiquidationRatio).percentDiv(_seizeAsset.factor)),
            minCollateralValue: minCollateralValue,
            minDebtValue: cs().minDebtValue,
            seizeCollateralAccountValue: seizeCollateralAccountValue,
            maxLiquidationRatio: maxLiquidationRatio
        });
}
