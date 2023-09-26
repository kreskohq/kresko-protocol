// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {MaxLiqVars} from "common/Types.sol";
import {calcMaxLiqValue} from "common/funcs/Math.sol";

import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {scdp, sdi} from "scdp/State.sol";
import {Asset} from "common/Types.sol";

using WadRay for uint256;

function maxLiqValueSCDP(
    Asset memory _repayAsset,
    Asset memory _seizeAsset,
    address _seizeAssetAddr
) view returns (uint256 maxLiquidatableUSD) {
    MaxLiqVars memory vars = _getMaxLiqVarsSCDP(_repayAsset, _seizeAsset, _seizeAssetAddr);
    // Account is not liquidatable
    if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
        return 0;
    }

    maxLiquidatableUSD = calcMaxLiqValue(vars, _repayAsset);

    if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
        return vars.seizeCollateralAccountValue;
    } else if (maxLiquidatableUSD < vars.minDebtValue) {
        return vars.minDebtValue;
    } else {
        return maxLiquidatableUSD;
    }
}

function _getMaxLiqVarsSCDP(
    Asset memory _repayAsset,
    Asset memory _seizeAsset,
    address _seizeAssetAddr
) view returns (MaxLiqVars memory) {
    uint256 maxLiquidationRatio = scdp().maxLiquidationRatio;
    uint256 minCollateralValue = sdi().effectiveDebtValue().wadMul(maxLiquidationRatio);

    (uint256 totalCollateralValue, uint256 seizeCollateralValue) = scdp().collateralValueSCDP(
        _seizeAssetAddr,
        scdp().sDeposits[_seizeAssetAddr].totalDeposits,
        false
    );

    return
        MaxLiqVars({
            collateral: _seizeAsset,
            accountCollateralValue: totalCollateralValue,
            debtFactor: uint128(_repayAsset.kFactor.wadMul(maxLiquidationRatio).wadDiv(_seizeAsset.factor)),
            minCollateralValue: minCollateralValue,
            minDebtValue: cs().minDebtValue,
            seizeCollateralAccountValue: seizeCollateralValue,
            maxLiquidationRatio: maxLiquidationRatio
        });
}
