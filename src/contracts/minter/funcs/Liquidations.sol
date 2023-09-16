// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {WadRay} from "libs/WadRay.sol";
import {calcMaxLiquidationValue} from "common/funcs/Math.sol";
import {MaxLiqVars} from "common/Types.sol";

import {CollateralAsset, KrAsset} from "minter/Types.sol";
import {ms} from "minter/State.sol";

using WadRay for uint256;

/**
 * @dev Calculates the total value that can be liquidated for a liquidation pair
 * @param _account address to liquidate
 * @param _repayKreskoAsset address of the kreskoAsset being repaid on behalf of the liquidatee
 * @param _seizedCollateral The collateral asset being seized in the liquidation
 * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
 */
function maxLiquidatableValue(
    address _account,
    KrAsset memory _repayKreskoAsset,
    address _seizedCollateral
) view returns (uint256 maxLiquidatableUSD) {
    MaxLiqVars memory vars = _createVars(_account, _repayKreskoAsset, _seizedCollateral);
    // Account is not liquidatable
    if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
        return 0;
    }

    maxLiquidatableUSD = calcMaxLiquidationValue(vars, _repayKreskoAsset.closeFee);

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
    KrAsset memory _repayKreskoAsset,
    address _seizedCollateral
) view returns (MaxLiqVars memory) {
    uint256 liquidationThreshold = ms().liquidationThreshold;

    uint256 minCollateralValue = ms().accountMinCollateralAtRatio(_account, liquidationThreshold);

    (uint256 accountCollateralValue, uint256 seizeCollateralAccountValue) = ms().accountCollateralAssetValue(
        _account,
        _seizedCollateral
    );

    CollateralAsset memory collateral = ms().collateralAssets[_seizedCollateral];

    return
        MaxLiqVars({
            collateral: collateral,
            accountCollateralValue: accountCollateralValue,
            debtFactor: _repayKreskoAsset.kFactor.wadMul(liquidationThreshold).wadDiv(collateral.factor),
            minCollateralValue: minCollateralValue,
            minDebtValue: ms().minDebtValue,
            seizeCollateralAccountValue: seizeCollateralAccountValue,
            liquidationThreshold: liquidationThreshold,
            maxLiquidationMultiplier: ms().maxLiquidationMultiplier
        });
}
