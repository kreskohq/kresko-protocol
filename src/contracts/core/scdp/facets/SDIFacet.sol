// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.21;

import {Strings} from "libs/Strings.sol";
import {SDIPrice} from "common/funcs/Prices.sol";
import {cs} from "common/State.sol";
import {Role} from "common/Constants.sol";
import {Modifiers} from "common/Modifiers.sol";
import {Errors} from "common/Errors.sol";
import {Validations} from "common/Validations.sol";
import {Asset} from "common/Types.sol";

import {DSModifiers} from "diamond/DSModifiers.sol";

import {sdi, scdp} from "scdp/SState.sol";
import {ISDIFacet} from "scdp/interfaces/ISDIFacet.sol";
import {fromWad, valueToAmount} from "common/funcs/Math.sol";
import {SEvent} from "scdp/SEvent.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {SafeTransfer} from "kresko-lib/token/SafeTransfer.sol";

contract SDIFacet is ISDIFacet, DSModifiers, Modifiers {
    using Strings for bytes32;
    using PercentageMath for uint256;
    using PercentageMath for uint16;
    using SafeTransfer for IERC20;

    function totalSDI() external view returns (uint256) {
        return sdi().totalSDI();
    }

    function getTotalSDIDebt() external view returns (uint256) {
        return sdi().totalDebt;
    }

    function getEffectiveSDIDebt() external view returns (uint256) {
        return sdi().effectiveDebt();
    }

    function getEffectiveSDIDebtUSD() external view returns (uint256) {
        return sdi().effectiveDebtValue();
    }

    function getSDICoverAmount() external view returns (uint256) {
        return sdi().totalCoverAmount();
    }

    function previewSCDPBurn(
        address _assetAddr,
        uint256 _burnAmount,
        bool _ignoreFactors
    ) external view returns (uint256 shares) {
        return cs().assets[_assetAddr].debtAmountToSDI(_burnAmount, _ignoreFactors);
    }

    function previewSCDPMint(
        address _assetAddr,
        uint256 _mintAmount,
        bool _ignoreFactors
    ) external view returns (uint256 shares) {
        return cs().assets[_assetAddr].debtAmountToSDI(_mintAmount, _ignoreFactors);
    }

    /// @notice Get the price of SDI in USD, oracle precision.
    function getSDIPrice() external view returns (uint256) {
        return SDIPrice();
    }

    function getCoverAssetsSDI() external view returns (address[] memory) {
        return sdi().coverAssets;
    }

    /* -------------------------------------------------------------------------- */
    /*                                Functionality                               */
    /* -------------------------------------------------------------------------- */

    function coverSCDP(address _assetAddr, uint256 _coverAmount) external returns (uint256 value) {
        value = cs().onlyCoverAsset(_assetAddr).assetUSD(_coverAmount);
        sdi().cover(_assetAddr, _coverAmount, value);
    }

    function coverWithIncentiveSCDP(
        address _assetAddr,
        uint256 _coverAmount,
        address _seizeAssetAddr
    ) external returns (uint256 value, uint256 seizedAmount) {
        Asset storage asset = cs().onlyCoverAsset(_assetAddr);
        Asset storage seizeAsset = cs().onlyFeeAccumulatingCollateral(_seizeAssetAddr);

        (value, _coverAmount) = asset.boundRepayValue(_getMaxCoverValue(asset, seizeAsset, _seizeAssetAddr), _coverAmount);
        sdi().cover(_assetAddr, _coverAmount, value);

        seizedAmount = fromWad(valueToAmount(value, seizeAsset.price(), uint16(sdi().coverIncentive)), seizeAsset.decimals);

        if (seizedAmount == 0) {
            revert Errors.ZERO_REPAY(Errors.id(_assetAddr), _coverAmount, seizedAmount);
        }

        scdp().handleSeizeSCDP(seizeAsset, _seizeAssetAddr, seizedAmount);
        IERC20(_seizeAssetAddr).safeTransfer(msg.sender, seizedAmount);
        emit SEvent.SCDPCoverOccured(
            // solhint-disable-next-line avoid-tx-origin
            tx.origin,
            _assetAddr,
            _coverAmount,
            _seizeAssetAddr,
            seizedAmount
        );
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Admin                                   */
    /* -------------------------------------------------------------------------- */

    function enableCoverAssetSDI(address _assetAddr) external onlyRole(Role.ADMIN) {
        Asset storage asset = Validations.validateSDICoverAsset(_assetAddr);

        asset.isCoverAsset = true;
        bool shouldPushToAssets = true;
        for (uint256 i; i < sdi().coverAssets.length; i++) {
            if (sdi().coverAssets[i] == _assetAddr) {
                shouldPushToAssets = false;
            }
        }
        if (shouldPushToAssets) {
            sdi().coverAssets.push(_assetAddr);
        }
    }

    function disableCoverAssetSDI(address _assetAddr) external onlyRole(Role.ADMIN) {
        if (!cs().assets[_assetAddr].isCoverAsset) {
            revert Errors.ASSET_ALREADY_DISABLED(Errors.id(_assetAddr));
        }

        cs().assets[_assetAddr].isCoverAsset = false;
    }

    function setCoverRecipientSDI(address _newCoverRecipient) external onlyRole(Role.ADMIN) {
        if (_newCoverRecipient == address(0)) revert Errors.ZERO_ADDRESS();
        sdi().coverRecipient = _newCoverRecipient;
    }

    function _getMaxCoverValue(
        Asset storage _repayAsset,
        Asset storage _seizeAsset,
        address _seizeAssetAddr
    ) internal view returns (uint256 maxLiquidatableUSD) {
        uint48 seizeThreshold = sdi().coverThreshold;
        (uint256 totalCollateralValue, uint256 seizeAssetValue) = scdp().totalCollateralValueSCDP(_seizeAssetAddr, false);
        return
            _calcMaxCoverValue(
                _repayAsset,
                _seizeAsset,
                sdi().effectiveDebtValue().percentMul(seizeThreshold),
                totalCollateralValue,
                seizeAssetValue,
                seizeThreshold
            );
    }

    function _calcMaxCoverValue(
        Asset storage _repayAsset,
        Asset storage _seizeAsset,
        uint256 _minCollateralValue,
        uint256 _totalCollateralValue,
        uint256 _seizeAssetValue,
        uint48 _seizeThreshold
    ) internal view returns (uint256) {
        if (!(_totalCollateralValue < _minCollateralValue)) return 0;
        // Calculate reduction percentage from seizing collateral
        uint256 seizeReductionPct = uint256(sdi().coverIncentive).percentMul(_seizeAsset.factor);
        // Calculate adjusted seized asset value
        _seizeAssetValue = _seizeAssetValue.percentDiv(seizeReductionPct);
        // Substract reductions from gains to get liquidation factor
        uint256 liquidationFactor = _repayAsset.kFactor.percentMul(_seizeThreshold) - seizeReductionPct;
        // Calculate maximum liquidation value
        uint256 maxLiquidationValue = (_minCollateralValue - _totalCollateralValue).percentDiv(liquidationFactor);
        // Maximum value possible for the seize asset
        return maxLiquidationValue < _seizeAssetValue ? maxLiquidationValue : _seizeAssetValue;
    }
}
