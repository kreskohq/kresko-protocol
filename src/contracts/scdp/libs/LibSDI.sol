// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {SafeERC20} from "common/SafeERC20.sol";
import {IERC20Permit} from "common/IERC20Permit.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {Shared} from "common/libs/Shared.sol";
import {usdWad} from "common/Functions.sol";

/**
 * @notice Asset struct for cover assets
 * @param oracle AggregatorV3Interface supporting oracle for the asset
 * @param enabled Enabled status of the asset
 */

struct Asset {
    AggregatorV3Interface oracle;
    bytes32 redstoneId;
    bool enabled;
    uint8 decimals;
}

struct SDIState {
    uint256 totalDebt;
    uint256 totalCover;
    address coverRecipient;
    mapping(address => Asset) coverAssets;
    address[] coverAssetList;
}

library LibSDI {
    using WadRay for uint256;
    using SafeERC20 for IERC20Permit;

    /// @notice Repay user global asset debt. Updates rates for regular market.
    /// @param _kreskoAsset the asset being repaid
    /// @param _burnAmount the asset amount being burned
    function repaySwap(
        SDIState storage self,
        address _kreskoAsset,
        uint256 _burnAmount,
        address _from
    ) internal returns (uint256 destroyed) {
        destroyed = Shared.burnAssets(_kreskoAsset, _burnAmount, _from);
        self.totalDebt -= Shared.previewSCDPBurn(_kreskoAsset, destroyed, false);
    }

    /// @notice Mint kresko assets for shared debt pool.
    /// @dev Updates general markets stability rates and debt index.
    /// @param _kreskoAsset the asset requested
    /// @param _amount the asset amount requested
    /// @param _to the account to mint the assets to
    function mintSwap(
        SDIState storage self,
        address _kreskoAsset,
        uint256 _amount,
        address _to
    ) internal returns (uint256 issued) {
        issued = Shared.mintAssets(_kreskoAsset, _amount, _to);
        self.totalDebt += Shared.previewSCDPMint(_kreskoAsset, issued, false);
    }

    /// @notice Cover by pulling assets.
    function cover(
        SDIState storage self,
        address coverAsset,
        uint256 amount
    ) internal returns (uint256 shares, uint256 value) {
        require(amount > 0, "NO_COVER_RECEIVED");
        Asset memory asset = self.coverAssets[coverAsset];
        value = usdWad(amount, asset.price(), asset.decimals);
        self.totalCover += (shares = Shared.valueToSDI(value));

        IERC20Permit(coverAsset).safeTransferFrom(msg.sender, self.coverRecipient, amount);
    }

    /// @notice Returns the total effective SDI debt for the SCDP.
    function effectiveDebt(SDIState storage self) internal view returns (uint256) {
        uint256 currentCover = self.totalCoverAmount();
        uint256 totalDebt = self.totalDebt;
        if (currentCover >= totalDebt) {
            return 0;
        }
        return (totalDebt - currentCover);
    }

    /// @notice Returns the total effective SDI debt for the SCDP.
    function effectiveDebtUSD(SDIState storage self) internal view returns (uint256) {
        uint256 sdiPrice = Shared.SDIPrice();
        uint256 coverAmount = self.totalCoverUSD().wadDiv(sdiPrice);
        uint256 totalDebt = self.totalDebt;
        if (coverAmount >= totalDebt) {
            return 0;
        }
        return (totalDebt - coverAmount).wadMul(sdiPrice);
    }

    function totalCoverAmount(SDIState storage self) internal view returns (uint256) {
        return self.totalCoverUSD().wadDiv(Shared.SDIPrice());
    }

    /// @notice Simply returns the total supply of SDI.
    function totalSDI(SDIState storage self) internal view returns (uint256) {
        return self.totalDebt + self.totalCoverAmount();
    }

    /// @notice Gets the total cover debt value, oracle precision
    function totalCoverUSD(SDIState storage self) internal view returns (uint256 result) {
        for (uint256 i; i < self.coverAssetList.length; ) {
            result += getDepositValue(self, self.coverAssetList[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice get total deposit value of `asset` in USD, oracle precision.
    function getDepositValue(SDIState storage self, address asset) internal view returns (uint256) {
        uint256 bal = IERC20Permit(asset).balanceOf(self.coverRecipient);
        if (bal == 0) return 0;

        Asset memory assetInfo = self.coverAssets[asset];
        return (bal * assetInfo.price()) / 10 ** assetInfo.decimals;
    }

    function price(Asset memory self) internal view returns (uint256) {
        (, int256 answer, , , ) = self.oracle.latestRoundData();

        if (answer <= 0) {
            revert("price");
        }

        return uint256(answer);
    }
}

using LibSDI for SDIState global;
using LibSDI for Asset global;

// Storage position
bytes32 constant SDI_STORAGE_POSITION = keccak256("kresko.sdi.storage");

// solhint-disable func-visibility
function sdi() pure returns (SDIState storage state) {
    bytes32 position = SDI_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
