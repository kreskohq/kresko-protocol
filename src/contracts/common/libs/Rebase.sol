// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {ms} from "minter/libs/LibMinterBig.sol";

library Rebase {
    using FixedPointMathLib for uint256;

    /**
     * @notice Unrebase a value by a given rebase struct.
     * @param self The value to unrebase.
     * @param _rebase The rebase struct.
     * @return The unrebased value.
     */
    function unrebase(uint256 self, IKreskoAsset.Rebase memory _rebase) internal pure returns (uint256) {
        if (_rebase.denominator == 0) return self;
        return _rebase.positive ? self.divWadDown(_rebase.denominator) : self.mulWadDown(_rebase.denominator);
    }

    /**
     * @notice Rebase a value by a given rebase struct.
     * @param self The value to rebase.
     * @param _rebase The rebase struct.
     * @return The rebased value.
     */
    function rebase(uint256 self, IKreskoAsset.Rebase memory _rebase) internal pure returns (uint256) {
        if (_rebase.denominator == 0) return self;
        return _rebase.positive ? self.mulWadDown(_rebase.denominator) : self.divWadDown(_rebase.denominator);
    }

    function getCollateralAmountWrite(
        address _asset,
        uint256 _amount
    ) internal view returns (uint256 possiblyUnrebasedAmount) {
        return ms().collateralAssets[_asset].toNonRebasingAmount(_amount);
    }

    /**
     * @notice Get collateral asset amount for viewing, since if the asset is a KreskoAsset, it can be rebased.
     * @param _asset The asset address
     * @param _amount The asset amount
     * @return possiblyRebasedAmount amount of collateral for `_asset`
     */
    function getCollateralAmountRead(
        address _asset,
        uint256 _amount
    ) internal view returns (uint256 possiblyRebasedAmount) {
        return ms().collateralAssets[_asset].toRebasingAmount(_amount);
    }

    /**
     * @notice Get possibly rebased amount of kreskoAssets. Use when saving to storage.
     * @param _asset The asset address
     * @param _amount The account to query amount for
     * @return amount Amount of principal debt for `_asset`
     */
    function getKreskoAssetAmount(address _asset, uint256 _amount) internal view returns (uint256 amount) {
        return ms().kreskoAssets[_asset].toRebasingAmount(_amount);
    }
}
