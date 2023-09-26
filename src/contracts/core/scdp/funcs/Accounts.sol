// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {SCDPState} from "scdp/State.sol";
import {UserAssetData} from "scdp/Types.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";

library SAccounts {
    using WadRay for uint256;

    /**
     * @notice Get accounts interested scaled debt amount for a KreskoAsset.
     * @param _account The account to get the amount for
     * @param _assetAddr The asset address
     * @param _asset The asset struct
     * @return Amount of scaled debt.
     */
    function accountDepositsWithFees(
        SCDPState storage self,
        address _account,
        address _assetAddr,
        Asset memory _asset
    ) internal view returns (uint256) {
        uint256 deposits = _asset.amountRead(self.deposits[_account][_assetAddr]);
        if (deposits == 0) {
            return 0;
        }
        return deposits.rayMul(_asset.liquidityIndexSCDP).rayToWad();
    }

    /**
     * @notice Get accounts principle deposits.
     * @param _account The account to get the amount for
     * @param _assetAddr The deposit asset address
     * @param _asset The deposit asset struct
     * @return uint256 Amount of scaled debt.
     */
    function accountPrincipalDeposits(
        SCDPState storage self,
        address _account,
        address _assetAddr,
        Asset memory _asset
    ) internal view returns (uint256) {
        uint256 deposits = self.accountDepositsWithFees(_account, _assetAddr, _asset);
        uint256 depositsPrincipal = _asset.amountRead(self.depositsPrincipal[_account][_assetAddr]);

        if (deposits == 0) {
            return 0;
        } else if (deposits < depositsPrincipal) {
            return deposits;
        }
        return depositsPrincipal;
    }

    /// @notice Periphery
    function accountDepositAmountsAndValues(
        SCDPState storage self,
        address _account,
        address _assetAddr
    ) internal view returns (UserAssetData memory result) {
        Asset memory asset = cs().assets[_assetAddr];
        result.depositAmountWithFees = self.accountDepositsWithFees(_account, _assetAddr, asset);
        result.depositAmount = asset.amountRead(self.depositsPrincipal[_account][_assetAddr]);
        if (result.depositAmountWithFees < result.depositAmount) {
            result.depositAmount = result.depositAmountWithFees;
        }
        (result.depositValue, result.assetPrice) = asset.collateralAmountToValue(result.depositAmount, true);
        (result.depositValueWithFees, ) = asset.collateralAmountToValue(result.depositAmountWithFees, true);
        result.asset = _assetAddr;
    }

    /**
     * @notice Returns the value of the deposits for `_account`.
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
            Asset memory asset = cs().assets[assets[i]];
            (uint256 assetValue, ) = asset.collateralAmountToValue(
                self.accountPrincipalDeposits(_account, assets[i], asset),
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
            Asset memory asset = cs().assets[assets[i]];
            (uint256 assetValue, ) = asset.collateralAmountToValue(
                self.accountDepositsWithFees(_account, assets[i], asset),
                true
            );

            totalValue += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /// @notice Periphery
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
