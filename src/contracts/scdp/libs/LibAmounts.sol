// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {SCDPState} from "../SCDPStorage.sol";
import {ms} from "minter/MinterStorage.sol";
import {WadRay} from "common/libs/WadRay.sol";

library LibAmounts {
    using WadRay for uint256;
    using WadRay for uint128;
    using LibAmounts for SCDPState;

    /**
     * @notice Get accounts interested scaled debt amount for a KreskoAsset.
     * @param _asset The asset address
     * @param _account The account to get the amount for
     * @return Amount of scaled debt.
     */
    function getAccountDepositsWithFees(
        SCDPState storage self,
        address _account,
        address _asset
    ) internal view returns (uint256) {
        uint256 deposits = getCollateralAmountRead(_asset, self.deposits[_account][_asset]);
        if (deposits == 0) {
            return 0;
        }
        return deposits.rayMul(self.poolCollateral[_asset].liquidityIndex).rayToWad();
    }

    /**
     * @notice Get accounts principle collateral deposits.
     * @param _account The account to get the amount for
     * @param _collateralAsset The collateral asset address
     * @return Amount of scaled debt.
     */
    function getAccountPrincipalDeposits(
        SCDPState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256) {
        uint256 deposits = self.getAccountDepositsWithFees(_account, _collateralAsset);
        uint256 depositsPrincipal = getCollateralAmountRead(
            _collateralAsset,
            self.depositsPrincipal[_account][_collateralAsset]
        );

        if (deposits == 0) {
            return 0;
        } else if (deposits < depositsPrincipal) {
            return deposits;
        }
        return depositsPrincipal;
    }

    /**
     * @notice Get pool collateral deposits of an asset.
     * @param _asset The asset address
     * @return Amount of scaled debt.
     */
    function getPoolDeposits(SCDPState storage self, address _asset) internal view returns (uint256) {
        return getCollateralAmountRead(_asset, self.totalDeposits[_asset]);
    }

    /**
     * @notice Get pool user collateral deposits of an asset.
     * @param _asset The asset address
     * @return Amount of scaled debt.
     */
    function getUserPoolDeposits(SCDPState storage self, address _asset) internal view returns (uint256) {
        return getCollateralAmountRead(_asset, self.totalDeposits[_asset] - self.swapDeposits[_asset]);
    }

    /**
     * @notice Get "swap" collateral deposits.
     * @param _asset The asset address
     * @return Amount of debt.
     */
    function getPoolSwapDeposits(SCDPState storage self, address _asset) internal view returns (uint256) {
        return getCollateralAmountRead(_asset, self.swapDeposits[_asset]);
    }

    /**
     * @notice Get collateral asset amount for saving, it will be unrebased if the asset is a KreskoAsset
     * @param _asset The asset address
     * @param _amount The asset amount
     * @return possiblyUnrebasedAmount The possibly unrebased amount
     */
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
}
