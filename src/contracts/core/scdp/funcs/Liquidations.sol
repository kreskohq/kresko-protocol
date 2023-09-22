// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {MaxLiqVars} from "common/Types.sol";
import {calcMaxLiqValue} from "common/funcs/Math.sol";

import {ms} from "minter/State.sol";
import {CollateralAsset, KrAsset} from "minter/Types.sol";

import {SCDPKrAsset} from "scdp/Types.sol";
import {scdp, SCDPState} from "scdp/State.sol";

using WadRay for uint256;

function maxLiqValueSCDP(
    SCDPKrAsset memory _repaySCDPKrAsset,
    KrAsset memory _repayKreskoAsset,
    address _seizedCollateral
) view returns (uint256 maxLiquidatableUSD) {
    MaxLiqVars memory vars = _getMaxLiqVarsSCDP(_repayKreskoAsset, _seizedCollateral);
    // Account is not liquidatable
    if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
        return 0;
    }

    maxLiquidatableUSD = calcMaxLiqValue(vars, _repaySCDPKrAsset);

    if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
        return vars.seizeCollateralAccountValue;
    } else if (maxLiquidatableUSD < vars.minDebtValue) {
        return vars.minDebtValue;
    } else {
        return maxLiquidatableUSD;
    }
}

function _getMaxLiqVarsSCDP(KrAsset memory _repayKreskoAsset, address _seizedCollateral) view returns (MaxLiqVars memory) {
    SCDPState storage s = scdp();
    uint256 maxLiquidationRatio = s.maxLiquidationRatio;
    uint256 minCollateralValue = s.effectiveDebtValue().wadMul(maxLiquidationRatio);

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
            debtFactor: _repayKreskoAsset.kFactor.wadMul(maxLiquidationRatio).wadDiv(collateral.factor),
            minCollateralValue: minCollateralValue,
            minDebtValue: ms().minDebtValue,
            seizeCollateralAccountValue: seizeCollateralValue,
            maxLiquidationRatio: maxLiquidationRatio
        });
}
