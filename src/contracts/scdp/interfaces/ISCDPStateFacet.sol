// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {SCDPCollateral, SCDPKrAsset} from "scdp/Types.sol";

interface ISCDPStateFacet {
    /**
     * @notice Get the collateral pool deposit balance of `_account`. Including fees.
     * @param _account The account.
     * @param _depositAsset The deposit asset.
     */
    function getAccountDepositsWithFeesSCDP(address _account, address _depositAsset) external view returns (uint256);

    /**
     * @notice Get the total collateral principal deposits for `_account`
     * @param _account The account.
     * @param _depositAsset The deposit asset
     */
    function getAccountPrincipalDepositsSCDP(address _account, address _depositAsset) external view returns (uint256);

    function getAccountDepositFeesGainedSCDP(address _account, address _depositAsset) external view returns (uint256);

    /**
     * @notice Get the deposit value for `_account`
     * @param _account The account.
     * @param _depositAsset The deposit asset
     * @param _ignoreFactors Ignore factors when calculating collateral value.
     */
    function getAccountDepositValueSCDP(
        address _account,
        address _depositAsset,
        bool _ignoreFactors
    ) external view returns (uint256);

    /**
     * @notice Get the full value of account and fees for `_account`
     * @param _account The account.
     * @param _depositAsset The collateral asset
     */
    function getAccountDepositValueWithFeesSCDP(address _account, address _depositAsset) external view returns (uint256);

    /**
     * @notice Get the total collateral deposit value for `_account`
     * @param _account The account.
     * @param _ignoreFactors Ignore factors when calculating collateral value.
     */
    function getAccountTotalDepositsValuePrincipalSCDP(address _account, bool _ignoreFactors) external view returns (uint256);

    /**
     * @notice Get the full value of account and fees for `_account`
     * @param _account The account.
     */
    function getAccountTotalDepositsValueWithFeesSCDP(address _account) external view returns (uint256);

    /**
     * @notice Get all pool CollateralAssets
     */
    function getDepositAssetsSCDP() external view returns (address[] memory);

    /**
     * @notice Get the deposit configuration for `_depositAsset`
     * @param _depositAsset The deposit asset
     */
    function getDepositAssetSCDP(address _depositAsset) external view returns (SCDPCollateral memory);

    /**
     * @notice Get the total collateral deposits for `_collateralAsset`
     * @param _collateralAsset The collateral asset
     */
    function getDepositsSCDP(address _collateralAsset) external view returns (uint256);

    /**
     * @notice Get the total collateral swap deposits for `_collateralAsset`
     * @param _collateralAsset The collateral asset
     */
    function getSwapDepositsSCDP(address _collateralAsset) external view returns (uint256);

    /**
     * @notice Get the total collateral deposit value for `_collateralAsset`
     * @param _depositAsset The collateral asset
     * @param _ignoreFactors Ignore factors when calculating collateral and debt value.
     */
    function getCollateralValueSCDP(address _depositAsset, bool _ignoreFactors) external view returns (uint256);

    /**
     * @notice Get the total collateral value, oracle precision
     * @param _ignoreFactors Ignore factors when calculating collateral value.
     */
    function getTotalCollateralValueSCDP(bool _ignoreFactors) external view returns (uint256);

    /**
     * @notice Get the collateral configuration for `_krAsset`
     * @param _krAsset The collateral asset
     */
    function getKreskoAssetSCDP(address _krAsset) external view returns (SCDPKrAsset memory);

    /**
     * @notice Get all pool KreskoAssets
     */
    function getKreskoAssetsSCDP() external view returns (address[] memory);

    /**
     * @notice Get the collateral debt amount for `_kreskoAsset`
     * @param _kreskoAsset The KreskoAsset
     */
    function getDebtSCDP(address _kreskoAsset) external view returns (uint256);

    /**
     * @notice Get the debt value for `_kreskoAsset`
     * @param _kreskoAsset The KreskoAsset
     * @param _ignoreFactors Ignore factors when calculating collateral and debt value.
     */
    function getDebtValueSCDP(address _kreskoAsset, bool _ignoreFactors) external view returns (uint256);

    /**
     * @notice Get the total debt value of krAssets in oracle precision
     * @param _ignoreFactors Ignore factors when calculating debt value.
     */
    function getTotalDebtValueSCDP(bool _ignoreFactors) external view returns (uint256);

    /**
     * @notice Get the swap fee recipient
     */
    function getFeeRecipientSCDP() external view returns (address);

    /**
     * @notice Get enabled state of asset
     */
    function getAssetEnabledSCDP(address _asset) external view returns (bool);

    /**
     * @notice Get whether swap is enabled from `_assetIn` to `_assetOut`
     * @param _assetIn The asset to swap from
     * @param _assetOut The asset to swap to
     */
    function getSwapEnabledSCDP(address _assetIn, address _assetOut) external view returns (bool);

    function getCollateralRatioSCDP() external view returns (uint256);

    /**
     * @notice Get pool collateral value, debt value and resulting CR.
     * @param _ignoreFactors Ignore factors when calculating collateral and debt value.
     */
    function getStatisticsSCDP(
        bool _ignoreFactors
    ) external view returns (uint256 collateralValue, uint256 debtValue, uint256 cr);
}
