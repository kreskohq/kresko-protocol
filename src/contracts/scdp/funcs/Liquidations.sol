// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {MaxLiqVars} from "common/Types.sol";
import {calcMaxLiquidationValue} from "common/funcs/Math.sol";

import {ms} from "minter/State.sol";
import {CollateralAsset, KrAsset} from "minter/Types.sol";

import {PoolKrAsset} from "scdp/Types.sol";
import {scdp, SCDPState} from "scdp/State.sol";

using WadRay for uint256;

function maxLiquidatableValueSCDP(
    PoolKrAsset memory _repayAssetConfig,
    KrAsset memory _repayKreskoAsset,
    address _seizedCollateral
) view returns (uint256 maxLiquidatableUSD) {
    MaxLiqVars memory vars = _getMaxLiquidationVarsSCDP(_repayKreskoAsset, _seizedCollateral);
    // Account is not liquidatable
    if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
        return 0;
    }

    maxLiquidatableUSD = calcMaxLiquidationValue(vars, _repayAssetConfig);

    if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
        return vars.seizeCollateralAccountValue;
    } else if (maxLiquidatableUSD < vars.minDebtValue) {
        return vars.minDebtValue;
    } else {
        return maxLiquidatableUSD;
    }
}

function _getMaxLiquidationVarsSCDP(
    KrAsset memory _repayKreskoAsset,
    address _seizedCollateral
) view returns (MaxLiqVars memory) {
    SCDPState storage s = scdp();
    uint256 liquidationThreshold = s.liquidationThreshold;
    uint256 minCollateralValue = s.effectiveDebtValue().wadMul(liquidationThreshold);

    (uint256 totalCollateralValue, uint256 seizeCollateralValue) = s.collateralValueSCDP(
        _seizedCollateral,
        s.totalDeposits[_seizedCollateral],
        false
    );

    CollateralAsset memory collateral = ms().collateralAssets[_seizedCollateral];

    return
        MaxLiqVars({
            collateral: collateral,
            accountCollateralValue: totalCollateralValue,
            debtFactor: _repayKreskoAsset.kFactor.wadMul(liquidationThreshold).wadDiv(collateral.factor),
            minCollateralValue: minCollateralValue,
            minDebtValue: ms().minDebtValue,
            seizeCollateralAccountValue: seizeCollateralValue,
            liquidationThreshold: liquidationThreshold,
            maxLiquidationMultiplier: ms().maxLiquidationMultiplier
        });
}
