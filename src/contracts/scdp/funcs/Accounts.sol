// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {collateralAmountRead, collateralAmountToValue} from "minter/funcs/Conversions.sol";
import {SCDPState} from "scdp/State.sol";

library SAccounts {
    using WadRay for uint256;

    /**
     * @notice Get accounts interested scaled debt amount for a KreskoAsset.
     * @param _asset The asset address
     * @param _account The account to get the amount for
     * @return Amount of scaled debt.
     */
    function accountDepositsWithFees(SCDPState storage self, address _account, address _asset) internal view returns (uint256) {
        uint256 deposits = collateralAmountRead(_asset, self.deposits[_account][_asset]);
        if (deposits == 0) {
            return 0;
        }
        return deposits.rayMul(self.poolCollateral[_asset].liquidityIndex).rayToWad();
    }

    /**
     * @notice Get accounts principle collateral deposits.
     * @param _account The account to get the amount for
     * @param _collateralAsset The collateral asset address
     * @return uint256 Amount of scaled debt.
     */
    function accountPrincipalDeposits(
        SCDPState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256) {
        uint256 deposits = self.accountDepositsWithFees(_account, _collateralAsset);
        uint256 depositsPrincipal = collateralAmountRead(_collateralAsset, self.depositsPrincipal[_account][_collateralAsset]);

        if (deposits == 0) {
            return 0;
        } else if (deposits < depositsPrincipal) {
            return deposits;
        }
        return depositsPrincipal;
    }

    /**
     * @notice Returns the value of the collateral assets in the pool for `_account`.
     * @param _account Account to get total deposit value for
     * @param _ignoreFactors Whether to ignore cFactor and kFactor
     */
    function accountTotalDepositValuePrincipal(
        SCDPState storage self,
        address _account,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = collateralAmountToValue(
                asset,
                self.accountPrincipalDeposits(_account, asset),
                _ignoreFactors
            );

            totalValue += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral assets in the pool for `_account` with fees.
     * @notice Ignores all factors.
     * @param _account account
     */
    function accountTotalDepositValueWithFees(
        SCDPState storage self,
        address _account
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = collateralAmountToValue(asset, self.accountDepositsWithFees(_account, asset), true);

            totalValue += assetValue;

            unchecked {
                i++;
            }
        }
    }
}
