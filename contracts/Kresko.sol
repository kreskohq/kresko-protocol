// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Kresko is Ownable {
    /**
     * Whitelist of assets that can be used as collateral
     * with their respective collateral factor and oracle address
     */
    struct CollateralAsset {
        uint256 factor;
        address oracle;
    }
    mapping(address => CollateralAsset) public collateralAssets;

    event AddCollateralAsset(address assetAddress, uint256 factor, address oracle);
    event UpdateCollateralAssetFactor(address assetAddress, uint256 factor);
    event UpdateCollateralAssetOracle(address assetAddress, address oracle);

    modifier assetExists(address assetAddress) {
        require(collateralAssets[assetAddress].factor != 0, "ASSET_NOT_VALID");
        require(collateralAssets[assetAddress].oracle != address(0), "ASSET_NOT_VALID");
        _;
    }

    modifier assetDoesNotExist(address assetAddress) {
        require(collateralAssets[assetAddress].factor == 0, "ASSET_EXISTS");
        require(collateralAssets[assetAddress].oracle == address(0), "ASSET_EXISTS");
        _;
    }

    constructor() {
        // Intentionally left blank
    }

    /**
     * @dev Whitelists a collateral asset
     * @param assetAddress The on chain address of the asset
     * @param factor The collateral factor of the asset
     * @param oracle The oracle address for this asset
     */
    function addCollateralAsset(
        address assetAddress,
        uint256 factor,
        address oracle
    ) public onlyOwner assetDoesNotExist(assetAddress) {
        require(assetAddress != address(0), "ZERO_ADDRESS");
        require(factor != 0, "INVALID_FACTOR");
        require(oracle != address(0), "ZERO_ADDRESS");

        collateralAssets[assetAddress] = CollateralAsset({ factor: factor, oracle: oracle });
        emit AddCollateralAsset(assetAddress, factor, oracle);
    }

    /**
     * @dev Updates the collateral factor of a previously whitelisted asset
     * @param assetAddress The on chain address of the asset
     * @param factor The new collateral factor of the asset
     */
    function updateCollateralFactor(address assetAddress, uint256 factor) public onlyOwner assetExists(assetAddress) {
        require(factor != 0, "INVALID_FACTOR");

        collateralAssets[assetAddress].factor = factor;
        emit UpdateCollateralAssetFactor(assetAddress, factor);
    }

    /**
     * @dev Updates the oracle address of a previously whitelisted asset
     * @param assetAddress The on chain address of the asset
     * @param oracle The new oracle address for this asset
     */
    function updateCollateralOracle(address assetAddress, address oracle) public onlyOwner assetExists(assetAddress) {
        require(oracle != address(0), "ZERO_ADDRESS");

        collateralAssets[assetAddress].oracle = oracle;
        emit UpdateCollateralAssetOracle(assetAddress, oracle);
    }
}
