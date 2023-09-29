// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {MaxLiqVars} from "common/Types.sol";
import {calcMaxLiqValue} from "common/funcs/Math.sol";

import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {scdp, sdi} from "scdp/State.sol";
import {Asset} from "common/Types.sol";
import "hardhat/console.sol";
using WadRay for uint256;
using PercentageMath for uint256;
using PercentageMath for uint16;

function maxLiqValueSCDP(
    Asset memory _repayAsset,
    Asset memory _seizeAsset,
    address _seizeAssetAddr
) view returns (uint256 maxLiquidatableUSD) {
    MaxLiqVars memory vars = _createLiqVarsSCDP(_repayAsset, _seizeAsset, _seizeAssetAddr);
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

function _createLiqVarsSCDP(
    Asset memory _repayAsset,
    Asset memory _seizeAsset,
    address _seizeAssetAddr
) view returns (MaxLiqVars memory) {
    uint32 maxLiquidationRatio = scdp().maxLiquidationRatio;
    console.log("mlr", maxLiquidationRatio);
    uint256 minCollateralValue = sdi().effectiveDebtValue().percentMul(maxLiquidationRatio);

    (uint256 totalCollateralValue, uint256 seizeCollateralValue) = scdp().collateralValueSCDP(
        _seizeAssetAddr,
        scdp().assetData[_seizeAssetAddr].totalDeposits,
        false
    );

    return
        MaxLiqVars({
            collateral: _seizeAsset,
            accountCollateralValue: totalCollateralValue,
            debtFactor: uint32(_repayAsset.kFactor.percentMul(maxLiquidationRatio).percentDiv(_seizeAsset.factor)),
            minCollateralValue: minCollateralValue,
            minDebtValue: cs().minDebtValue,
            seizeCollateralAccountValue: seizeCollateralValue,
            maxLiquidationRatio: maxLiquidationRatio
        });
}
