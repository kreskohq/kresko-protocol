// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {ms} from "minter/State.sol";
import {cs} from "common/State.sol";
import {IStateFacet} from "minter/interfaces/IStateFacet.sol";
import {MinterParams} from "minter/Types.sol";
import {collateralAmountToValues, debtAmountToValues} from "common/funcs/Helpers.sol";

/**
 * @author Kresko
 * @title View functions for protocol parameters and asset values
 * @dev As structs do not create views for members, we must expose most of the state values explicitly.
 */
contract StateFacet is IStateFacet {
    /* -------------------------------------------------------------------------- */
    /*                                Configurables                               */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IStateFacet
    function getMinCollateralRatio() external view returns (uint32) {
        return ms().minCollateralRatio;
    }

    /// @inheritdoc IStateFacet
    function getLiquidationThreshold() external view returns (uint32) {
        return ms().liquidationThreshold;
    }

    /// @inheritdoc IStateFacet
    function getMaxLiquidationRatio() external view returns (uint32) {
        return ms().maxLiquidationRatio;
    }

    /// @inheritdoc IStateFacet
    function getMinterParameters() external view returns (MinterParams memory) {
        return MinterParams(ms().minCollateralRatio, ms().liquidationThreshold, ms().maxLiquidationRatio);
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Assets                                   */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc IStateFacet
    function getKrAssetExists(address _kreskoAsset) external view returns (bool exists) {
        return cs().assets[_kreskoAsset].isKrAsset;
    }

    /// @inheritdoc IStateFacet
    function getCollateralExists(address _collateralAsset) external view returns (bool exists) {
        return cs().assets[_collateralAsset].isCollateral;
    }

    /// @inheritdoc IStateFacet
    function getCollateralValueWithPrice(
        address _collateralAsset,
        uint256 _amount
    ) external view returns (uint256 value, uint256 adjustedValue, uint256 price) {
        return collateralAmountToValues(cs().assets[_collateralAsset], _amount);
    }

    /// @inheritdoc IStateFacet
    function getDebtValueWithPrice(
        address _kreskoAsset,
        uint256 _amount
    ) external view returns (uint256 value, uint256 adjustedValue, uint256 price) {
        return debtAmountToValues(cs().assets[_kreskoAsset], _amount);
    }
}
