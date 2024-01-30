// solhint-disable avoid-low-level-calls
// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;
import {CommonConfigFacet} from "common/facets/CommonConfigFacet.sol";
import {IAssetConfigFacet} from "common/interfaces/IAssetConfigFacet.sol";
import {DSModifiers} from "diamond/DSModifiers.sol";
import {Modifiers} from "common/Modifiers.sol";

import {WadRay} from "libs/WadRay.sol";
import {Arrays} from "libs/Arrays.sol";
import {Strings} from "libs/Strings.sol";

import {scdp} from "scdp/SState.sol";
import {MEvent} from "minter/MEvent.sol";
import {ms} from "minter/MState.sol";

import {Errors} from "common/Errors.sol";
import {Role, Enums} from "common/Constants.sol";
import {Asset, FeedConfiguration} from "common/Types.sol";
import {cs} from "common/State.sol";
import {Validations} from "common/Validations.sol";
import {SCDPSeizeData} from "scdp/STypes.sol";

// solhint-disable code-complexity
contract AssetConfigFacet is IAssetConfigFacet, Modifiers, DSModifiers {
    using Strings for bytes32;
    using Arrays for address[];
    using Arrays for address[2];
    using Validations for Asset;
    using Validations for address;

    /// @inheritdoc IAssetConfigFacet
    function addAsset(
        address _assetAddr,
        Asset memory _config,
        FeedConfiguration memory _feedConfig
    ) external onlyRole(Role.ADMIN) returns (Asset memory) {
        (string memory symbol, string memory tickerStr, uint8 decimals) = _assetAddr.validateAddAssetArgs(_config);
        _config.decimals = decimals;
        _config.oracles = _feedConfig.oracleIds;

        if (Validations.validateMinterCollateral(_assetAddr, _config)) {
            ms().collaterals.push(_assetAddr);

            emit MEvent.CollateralAssetAdded(
                tickerStr,
                symbol,
                _assetAddr,
                _config.factor,
                _config.anchor,
                _config.liqIncentive
            );
        }
        if (Validations.validateMinterKrAsset(_assetAddr, _config)) {
            emit MEvent.KreskoAssetAdded(
                tickerStr,
                symbol,
                _assetAddr,
                _config.anchor,
                _config.kFactor,
                _config.maxDebtMinter,
                _config.closeFee,
                _config.openFee
            );
            ms().krAssets.push(_assetAddr);
        }
        if (Validations.validateSCDPDepositAsset(_assetAddr, _config)) {
            scdp().assetIndexes[_assetAddr].currFeeIndex = WadRay.RAY128;
        }
        if (Validations.validateSCDPKrAsset(_assetAddr, _config)) {
            scdp().krAssets.push(_assetAddr);
        }
        if (_config.isSwapMintable || _config.isSharedCollateral) {
            _config.isSharedOrSwappedCollateral = true;
            scdp().assetIndexes[_assetAddr].currLiqIndex = WadRay.RAY128;
            scdp().seizeEvents[_assetAddr][WadRay.RAY] = SCDPSeizeData({
                prevLiqIndex: 0,
                feeIndex: scdp().assetIndexes[_assetAddr].currFeeIndex,
                liqIndex: WadRay.RAY128
            });
            scdp().isEnabled[_assetAddr] = true;
            scdp().collaterals.push(_assetAddr);
        }

        /* ------------------------------- Save Asset ------------------------------- */
        cs().assets[_assetAddr] = _config;

        // possibly save feeds
        if (!_feedConfig.feeds.empty()) {
            (bool success, ) = address(this).delegatecall(
                abi.encodeWithSelector(CommonConfigFacet.setFeedsForTicker.selector, _config.ticker, _feedConfig)
            );
            if (!success) {
                revert Errors.ASSET_SET_FEEDS_FAILED(Errors.id(_assetAddr));
            }
        }
        Validations.validatePushPrice(_assetAddr);
        return _config;
    }

    /// @inheritdoc IAssetConfigFacet
    function updateAsset(address _assetAddr, Asset memory _config) external onlyRole(Role.ADMIN) returns (Asset memory) {
        (string memory symbol, string memory tickerStr, Asset storage asset) = _assetAddr.validateUpdateAssetArgs(_config);

        asset.ticker = _config.ticker;
        asset.oracles = _config.oracles;

        if (Validations.validateMinterCollateral(_assetAddr, _config)) {
            asset.factor = _config.factor;
            asset.liqIncentive = _config.liqIncentive;
            asset.isMinterCollateral = true;
            ms().collaterals.pushUnique(_assetAddr);
            emit MEvent.CollateralAssetUpdated(
                tickerStr,
                symbol,
                _assetAddr,
                _config.factor,
                _config.anchor,
                _config.liqIncentive
            );
        } else if (asset.isMinterCollateral) {
            asset.liqIncentive = 0;
            asset.isMinterCollateral = false;
            ms().collaterals.removeExisting(_assetAddr);
        }

        if (Validations.validateMinterKrAsset(_assetAddr, _config)) {
            asset.kFactor = _config.kFactor;
            asset.maxDebtMinter = _config.maxDebtMinter;
            asset.closeFee = _config.closeFee;
            asset.openFee = _config.openFee;
            asset.anchor = _config.anchor;
            asset.isMinterMintable = true;
            ms().krAssets.pushUnique(_assetAddr);

            emit MEvent.KreskoAssetUpdated(
                tickerStr,
                symbol,
                _assetAddr,
                _config.anchor,
                _config.kFactor,
                _config.maxDebtMinter,
                _config.closeFee,
                _config.openFee
            );
        } else if (asset.isMinterMintable) {
            asset.maxDebtMinter = 0;
            asset.isMinterMintable = false;
            ms().krAssets.removeExisting(_assetAddr);
        }

        if (Validations.validateSCDPDepositAsset(_assetAddr, _config)) {
            if (scdp().assetIndexes[_assetAddr].currFeeIndex == 0) {
                scdp().assetIndexes[_assetAddr].currFeeIndex = WadRay.RAY128;
            }
            asset.depositLimitSCDP = _config.depositLimitSCDP;
            asset.isSharedCollateral = true;
        } else if (asset.isSharedCollateral) {
            asset.depositLimitSCDP = 0;
            asset.isSharedCollateral = false;
        }

        if (Validations.validateSCDPKrAsset(_assetAddr, _config)) {
            asset.swapInFeeSCDP = _config.swapInFeeSCDP;
            asset.swapOutFeeSCDP = _config.swapOutFeeSCDP;
            asset.protocolFeeShareSCDP = _config.protocolFeeShareSCDP;
            asset.liqIncentiveSCDP = _config.liqIncentiveSCDP;
            asset.maxDebtSCDP = _config.maxDebtSCDP;
            asset.isSwapMintable = true;
            scdp().krAssets.pushUnique(_assetAddr);
        } else if (asset.isSwapMintable) {
            asset.isSwapMintable = false;
            asset.liqIncentiveSCDP = 0;
            scdp().krAssets.removeExisting(_assetAddr);
        }

        if (asset.isSharedCollateral || asset.isSwapMintable) {
            asset.isSharedOrSwappedCollateral = true;
            if (scdp().assetIndexes[_assetAddr].currLiqIndex == 0) {
                scdp().assetIndexes[_assetAddr].currLiqIndex = WadRay.RAY128;
                scdp().seizeEvents[_assetAddr][WadRay.RAY] = SCDPSeizeData({
                    prevLiqIndex: 0,
                    feeIndex: scdp().assetIndexes[_assetAddr].currFeeIndex,
                    liqIndex: WadRay.RAY128
                });
            }
            scdp().collaterals.pushUnique(_assetAddr);
        } else {
            asset.isSharedOrSwappedCollateral = false;
        }

        Validations.validatePushPrice(_assetAddr);

        return asset;
    }

    /// @inheritdoc IAssetConfigFacet
    function setAssetCFactor(address _assetAddr, uint16 _newFactor) public onlyRole(Role.ADMIN) {
        Asset storage asset = cs().onlyExistingAsset(_assetAddr);
        Validations.validateCFactor(_assetAddr, _newFactor);

        emit MEvent.CFactorUpdated(MEvent.symbol(_assetAddr), _assetAddr, asset.factor, _newFactor);
        asset.factor = _newFactor;
    }

    /// @inheritdoc IAssetConfigFacet
    function setAssetKFactor(address _assetAddr, uint16 _newFactor) public onlyRole(Role.ADMIN) {
        Asset storage asset = cs().onlyExistingAsset(_assetAddr);
        Validations.validateKFactor(_assetAddr, _newFactor);

        emit MEvent.KFactorUpdated(MEvent.symbol(_assetAddr), _assetAddr, asset.kFactor, _newFactor);
        asset.kFactor = _newFactor;
    }

    /// @inheritdoc IAssetConfigFacet
    function setAssetOracleOrder(address _assetAddr, Enums.OracleType[2] memory _newOracleOrder) external onlyRole(Role.ADMIN) {
        Asset storage asset = cs().assets[_assetAddr];
        if (!asset.exists()) revert Errors.ASSET_DOES_NOT_EXIST(Errors.id(_assetAddr));
        asset.oracles = _newOracleOrder;
        Validations.validatePushPrice(_assetAddr);
    }

    /// @inheritdoc IAssetConfigFacet
    function validateAssetConfig(address _assetAddr, Asset memory _config) external view returns (bool) {
        return Validations.validateAsset(_assetAddr, _config);
    }
}
