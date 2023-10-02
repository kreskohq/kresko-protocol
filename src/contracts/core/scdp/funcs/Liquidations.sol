// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.8.19;

import {PercentageMath} from "libs/PercentageMath.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {scdp, sdi} from "scdp/State.sol";
import {Asset} from "common/Types.sol";

using PercentageMath for uint256;
using PercentageMath for uint16;

function maxLiqValueSCDPStorage(
    Asset storage _repayAsset,
    Asset storage _seizeAsset,
    address _seizeAssetAddr
) view returns (uint256 maxLiquidatableUSD) {
    uint32 mlr = scdp().maxLiquidationRatio;
    uint256 minCollateralValue = sdi().effectiveDebtValueStorage().percentMul(mlr);

    (uint256 totalCollateralValue, uint256 seizeCollateralValue) = scdp().collateralValueSCDPStorage(
        _seizeAssetAddr,
        scdp().assetData[_seizeAssetAddr].totalDeposits,
        false
    );

    bool belowMinValue = totalCollateralValue < minCollateralValue;
    if (!belowMinValue) {
        // Account is not liquidatable
        return 0;
    }

    maxLiquidatableUSD = calculateMLVStorage(_repayAsset, _seizeAsset, minCollateralValue, totalCollateralValue, mlr);
    uint96 minDebtValue = cs().minDebtValue;

    if (seizeCollateralValue < maxLiquidatableUSD) {
        return seizeCollateralValue;
    } else if (maxLiquidatableUSD < minDebtValue) {
        return minDebtValue;
    } else {
        return maxLiquidatableUSD;
    }
}

function maxLiqValueSCDP(
    Asset memory _repayAsset,
    Asset memory _seizeAsset,
    address _seizeAssetAddr
) view returns (uint256 maxLiquidatableUSD) {
    uint32 mlr = scdp().maxLiquidationRatio;
    uint256 minCollateralValue = sdi().effectiveDebtValue().percentMul(mlr);

    (uint256 totalCollateralValue, uint256 seizeCollateralValue) = scdp().collateralValueSCDP(
        _seizeAssetAddr,
        scdp().assetData[_seizeAssetAddr].totalDeposits,
        false
    );

    bool belowMinValue = totalCollateralValue < minCollateralValue;
    if (!belowMinValue) {
        // Account is not liquidatable
        return 0;
    }

    maxLiquidatableUSD = calculateMLV(_repayAsset, _seizeAsset, minCollateralValue, totalCollateralValue, mlr);
    uint96 minDebtValue = cs().minDebtValue;

    if (seizeCollateralValue < maxLiquidatableUSD) {
        return seizeCollateralValue;
    } else if (maxLiquidatableUSD < minDebtValue) {
        return minDebtValue;
    } else {
        return maxLiquidatableUSD;
    }
}

function calculateMLV(
    Asset memory _repayAsset,
    Asset memory _seizeAsset,
    uint256 _minCollateralValue,
    uint256 _totalCollateralValue,
    uint32 _maxLiquidationRatio
) view returns (uint256) {
    uint256 surplusPerUSDRepaid = _repayAsset.kFactor.percentMul(_maxLiquidationRatio) -
        _repayAsset.liqIncentiveSCDP.percentMul(_seizeAsset.factor);

    return (_minCollateralValue - _totalCollateralValue).percentDiv(surplusPerUSDRepaid);
}

function calculateMLVStorage(
    Asset storage _repayAsset,
    Asset storage _seizeAsset,
    uint256 _minCollateralValue,
    uint256 _totalCollateralValue,
    uint32 _maxLiquidationRatio
) view returns (uint256) {
    uint256 surplusPerUSDRepaid = _repayAsset.kFactor.percentMul(_maxLiquidationRatio) -
        _repayAsset.liqIncentiveSCDP.percentMul(_seizeAsset.factor);

    return (_minCollateralValue - _totalCollateralValue).percentDiv(surplusPerUSDRepaid);
}
