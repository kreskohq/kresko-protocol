// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.19;

import {ERC20} from "vendor/ERC20.sol";
import {WadRay} from "libs/WadRay.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {VaultAsset} from "vault/Types.sol";

/**
 * @title LibVault
 * @author Kresko
 * @notice Helper library for KreskoVault
 */
library VAssets {
    using WadRay for uint256;
    using VAssets for VaultAsset;
    using VAssets for uint256;

    /// @notice get price of an asset from the oracle speficied.
    function price(VaultAsset memory self) internal view returns (uint256) {
        (, int256 answer, , , ) = self.oracle.latestRoundData();

        if (answer <= 0) {
            revert IVault.InvalidPrice(address(self.token), address(self.oracle), answer);
        }

        return uint256(answer);
    }

    /// @notice get price of an asset from the oracle speficied.
    function handleDepositFee(
        VaultAsset memory self,
        uint256 assets
    ) internal pure returns (uint256 assetsWithFee, uint256 fee) {
        if (self.depositFee == 0) {
            return (assets, 0);
        }

        fee = (assets * self.depositFee) / 1e18;
        assetsWithFee = assets - fee;
    }

    /// @notice get price of an asset from the oracle speficied.
    function handleMintFee(VaultAsset memory self, uint256 assets) internal pure returns (uint256 assetsWithFee, uint256 fee) {
        if (self.depositFee == 0) {
            return (assets, 0);
        }

        assetsWithFee = assets.wadDiv(1e18 - self.depositFee);
        fee = assetsWithFee - assets;
    }

    /// @notice get price of an asset from the oracle speficied.
    function handleWithdrawFee(
        VaultAsset memory self,
        uint256 assets
    ) internal pure returns (uint256 assetsWithFee, uint256 fee) {
        if (self.withdrawFee == 0) {
            return (assets, 0);
        }

        assetsWithFee = assets.wadDiv(1e18 - self.withdrawFee);
        fee = assetsWithFee - assets;
    }

    /// @notice get price of an asset from the oracle speficied.
    function handleRedeemFee(
        VaultAsset memory self,
        uint256 assets
    ) internal pure returns (uint256 assetsWithFee, uint256 fee) {
        if (self.withdrawFee == 0) {
            return (assets, 0);
        }

        fee = (assets * self.withdrawFee) / 1e18;
        assetsWithFee = assets - fee;
    }

    /// @notice convert oracle decimal precision value to wad.
    function oracleToWad(uint256 value, uint8 oracleDecimals) internal pure returns (uint256) {
        return value * 10 ** (18 - oracleDecimals);
    }

    /// @notice convert wad precision value to oracle precision.
    function wadToOracle(uint256 tokenPrice, uint8 oracleDecimals) internal pure returns (uint256) {
        return tokenPrice / 10 ** (18 - oracleDecimals);
    }

    /// @notice get oracle decimal precision USD value for `amount`.
    /// @param amount amount of tokens to get USD value for.
    function usdWad(VaultAsset memory self, uint256 amount, uint8 oracleDecimals) internal view returns (uint256) {
        return (amount * (10 ** (18 - oracleDecimals)) * self.price()) / 10 ** self.token.decimals();
    }

    /// @notice get oracle decimal precision USD value for `amount`.
    /// @param amount amount of tokens to get USD value for.
    function usdRay(VaultAsset memory self, uint256 amount, uint8 oracleDecimals) internal view returns (uint256) {
        return (amount * (10 ** (27 - oracleDecimals)) * self.price()) / 10 ** self.token.decimals();
    }

    /// @notice get oracle decimal precision USD value for `amount`.
    /// @param amount amount of tokens to get USD value for.
    function usd(VaultAsset memory self, uint256 amount) internal view returns (uint256) {
        return (amount * self.price()) / 10 ** self.token.decimals();
    }

    /// @notice get total deposit value of `self` in USD, oracle precision.
    function getDepositValue(VaultAsset memory self) internal view returns (uint256) {
        uint256 bal = self.token.balanceOf(address(this));
        if (bal == 0) return 0;
        return (bal * self.price()) / 10 ** self.token.decimals();
    }

    /// @notice get total deposit value of `self` in USD, oracle precision.
    function getDepositValueWad(VaultAsset memory self, uint8 oracleDecimals) internal view returns (uint256) {
        uint256 bal = self.token.balanceOf(address(this));
        if (bal == 0) return 0;
        return self.getDepositValue().oracleToWad(oracleDecimals);
    }

    /// @notice get a token amount for `value` USD, oracle precision.
    function getAmount(VaultAsset memory self, uint256 value, uint8 oracleDecimals) internal view returns (uint256) {
        uint256 valueScaled = (value * 1e18) / 10 ** ((36 - oracleDecimals) - self.token.decimals());

        return valueScaled / self.price();
    }

    /// @notice converts wad precision amount `wad` to token decimal precision.
    function wadToTokenAmount(address token, uint256 wad) internal view returns (uint256) {
        return wad / 10 ** (18 - ERC20(token).decimals());
    }

    /// @notice converts token decimal precision `amount` to wad precision.
    function tokenAmountToWad(address token, uint256 amount) internal view returns (uint256) {
        return amount * 10 ** (18 - ERC20(token).decimals());
    }
}
