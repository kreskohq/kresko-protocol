// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {collateralAmountRead, collateralAmountToValue} from "minter/funcs/Conversions.sol";
import {SCDPState} from "scdp/State.sol";
import {UserAssetData} from "scdp/Types.sol";

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
        return deposits.rayMul(self.collateral[_asset].liquidityIndex).rayToWad();
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

    function accountDepositAmountsAndValues(
        SCDPState storage self,
        address _account,
        address _depositAsset
    ) internal view returns (UserAssetData memory result) {
        result.depositAmountWithFees = self.accountDepositsWithFees(_account, _depositAsset);
        result.depositAmount = collateralAmountRead(_depositAsset, self.depositsPrincipal[_account][_depositAsset]);
        if (result.depositAmountWithFees < result.depositAmount) {
            result.depositAmount = result.depositAmountWithFees;
        }
        (result.depositValue, result.assetPrice) = collateralAmountToValue(_depositAsset, result.depositAmount, true);
        (result.depositValueWithFees, ) = collateralAmountToValue(_depositAsset, result.depositAmountWithFees, true);
        result.asset = _depositAsset;
    }

    /**
     * @notice Returns the value of the collateral assets in the pool for `_account`.
     * @param _account Account to get total deposit value for
     * @param _ignoreFactors Whether to ignore cFactor and kFactor
     */
    function accountTotalDepositValue(
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

    function accountTotalDepositValues(
        SCDPState storage self,
        address _account,
        address[] memory _assetData
    ) internal view returns (uint256 totalValue, uint256 totalValueWithFees, UserAssetData[] memory datas) {
        address[] memory assets = self.collaterals;
        datas = new UserAssetData[](_assetData.length);
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            UserAssetData memory assetData = self.accountDepositAmountsAndValues(_account, asset);

            totalValue += assetData.depositValue;
            totalValueWithFees += assetData.depositValueWithFees;

            for (uint256 j; j < _assetData.length; ) {
                if (asset == _assetData[j]) {
                    datas[j] = assetData;
                }
                unchecked {
                    j++;
                }
            }

            unchecked {
                i++;
            }
        }
    }
}
