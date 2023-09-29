// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {IERC165} from "vendor/IERC165.sol";
import {WadRay} from "libs/WadRay.sol";
import {Arrays} from "libs/Arrays.sol";
import {Strings} from "libs/Strings.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";

import {scdp} from "scdp/State.sol";
import {MEvent} from "minter/Events.sol";

import {IAssetConfigurationFacet} from "common/interfaces/IAssetConfigurationFacet.sol";
import {AssetStateFacet} from "common/facets/AssetStateFacet.sol";
import {CModifiers} from "common/Modifiers.sol";
import {Percents, EMPTY_BYTES12} from "common/Constants.sol";
import {Asset, Role, Oracle, OracleType, FeedConfiguration} from "common/Types.sol";
import {CError} from "common/Errors.sol";
import {cs} from "common/State.sol";

// solhint-disable code-complexity
contract AssetConfigurationFacet is IAssetConfigurationFacet, CModifiers, DSModifiers {
    using WadRay for uint256;
    using Arrays for address[];
    using Strings for bytes12;
    using Strings for bytes32;

    /// @inheritdoc IAssetConfigurationFacet
    function addAsset(
        address _assetAddr,
        Asset memory _config,
        FeedConfiguration memory _feedConfig,
        bool _setFeeds
    ) external onlyRole(Role.ADMIN) {
        if (_assetAddr == address(0)) {
            revert CError.ZERO_ADDRESS();
        } else if (cs().assets[_assetAddr].underlyingId != EMPTY_BYTES12) {
            revert CError.ASSET_ALREADY_EXISTS(_assetAddr);
        }
        string memory underlyingIdStr = _config.underlyingId.toString();

        _config.decimals = IERC20Permit(_assetAddr).decimals();

        if (_config.isCollateral) {
            _validateMinterCollateral(_assetAddr, _config);
            emit MEvent.CollateralAssetAdded(underlyingIdStr, _assetAddr, _config.factor, _config.anchor, _config.liqIncentive);
        }
        if (_config.isKrAsset) {
            _validateMinterKrAsset(_assetAddr, _config);
            emit MEvent.KreskoAssetAdded(
                underlyingIdStr,
                _assetAddr,
                _config.anchor,
                _config.kFactor,
                _config.supplyLimit,
                _config.closeFee,
                _config.openFee
            );
        }
        if (_config.isSCDPDepositAsset) {
            _validateSCDPDepositAsset(_assetAddr, _config);
            _config.liquidityIndexSCDP = uint128(WadRay.RAY);
        }
        if (_config.isSCDPKrAsset) {
            _validateSCDPKrAsset(_assetAddr, _config);
            scdp().krAssets.push(_assetAddr);
        }
        if (_config.isSCDPKrAsset || _config.isSCDPDepositAsset) {
            scdp().isEnabled[_assetAddr] = true;
            scdp().collaterals.push(_assetAddr);
        }
        if (_setFeeds) {
            updateFeeds(_config.underlyingId, _feedConfig);
        }

        /* ---------------------------------- Save ---------------------------------- */
        cs().assets[_assetAddr] = _config;
        if (cs().assets[_assetAddr].pushedPrice().price == 0) {
            revert CError.NO_PUSH_PRICE(underlyingIdStr);
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function updateAsset(address _assetAddr, Asset memory _config) external onlyRole(Role.ADMIN) {
        if (_assetAddr == address(0)) {
            revert CError.ZERO_ADDRESS();
        } else if (cs().assets[_assetAddr].underlyingId == EMPTY_BYTES12) {
            revert CError.ASSET_DOES_NOT_EXIST(_assetAddr);
        } else if (_config.underlyingId == EMPTY_BYTES12) {
            revert CError.INVALID_ASSET_ID(_assetAddr);
        }

        Asset storage asset = cs().assets[_assetAddr];
        string memory underlyingIdStr = _config.underlyingId.toString();
        asset.underlyingId = _config.underlyingId;
        asset.oracles = _config.oracles;

        if (_config.isCollateral) {
            _validateMinterCollateral(_assetAddr, _config);
            asset.factor = _config.factor;
            asset.liqIncentive = _config.liqIncentive;
            emit MEvent.CollateralAssetUpdated(
                underlyingIdStr,
                _assetAddr,
                _config.factor,
                _config.anchor,
                _config.liqIncentive
            );
        }
        if (_config.isKrAsset) {
            _validateMinterKrAsset(_assetAddr, _config);
            asset.kFactor = _config.kFactor;
            asset.supplyLimit = _config.supplyLimit;
            asset.closeFee = _config.closeFee;
            asset.openFee = _config.openFee;
            asset.anchor = _config.anchor;
            emit MEvent.KreskoAssetUpdated(
                underlyingIdStr,
                _assetAddr,
                _config.anchor,
                _config.kFactor,
                _config.supplyLimit,
                _config.closeFee,
                _config.openFee
            );
        }

        if (_config.isSCDPDepositAsset) {
            _validateSCDPDepositAsset(_assetAddr, _config);
            if (asset.liquidityIndexSCDP == 0) {
                asset.liquidityIndexSCDP = uint128(WadRay.RAY);
            }
            asset.depositLimitSCDP = _config.depositLimitSCDP;
        }

        if (_config.isSCDPKrAsset) {
            _validateSCDPKrAsset(_assetAddr, _config);
            asset.swapInFeeSCDP = _config.swapInFeeSCDP;
            asset.swapOutFeeSCDP = _config.swapOutFeeSCDP;
            asset.protocolFeeShareSCDP = _config.protocolFeeShareSCDP;
            asset.liqIncentiveSCDP = _config.liqIncentiveSCDP;
            bool shouldAddToKrAssets = true;
            for (uint256 i; i < scdp().krAssets.length; i++) {
                if (scdp().krAssets[i] == _assetAddr) {
                    shouldAddToKrAssets = false;
                }
            }
            if (shouldAddToKrAssets) {
                scdp().krAssets.push(_assetAddr);
            }
        }

        if (asset.isKrAsset && !_config.isKrAsset) {
            asset.supplyLimit = 0;
            emit MEvent.KreskoAssetUpdated(
                underlyingIdStr,
                _assetAddr,
                _config.anchor,
                _config.kFactor,
                0,
                _config.closeFee,
                _config.openFee
            );
        }
        if (asset.isSCDPKrAsset && !_config.isSCDPKrAsset) {
            scdp().isEnabled[_assetAddr] = false;
            for (uint256 i; i < scdp().krAssets.length; i++) {
                if (scdp().krAssets[i] == _assetAddr) {
                    scdp().krAssets.removeAddress(_assetAddr, i);
                }
            }
        }

        if (asset.isSCDPDepositAsset && !_config.isSCDPDepositAsset) {
            asset.depositLimitSCDP = 0;
        }
        if (asset.isSCDPCollateral && !_config.isSCDPCollateral) {
            scdp().isEnabled[_assetAddr] = false;
        }

        asset.isCollateral = _config.isCollateral;
        asset.isKrAsset = _config.isKrAsset;
        asset.isSCDPDepositAsset = _config.isSCDPDepositAsset;
        asset.isSCDPKrAsset = _config.isSCDPKrAsset;

        if (cs().assets[_assetAddr].pushedPrice().price == 0) {
            revert CError.NO_PUSH_PRICE(underlyingIdStr);
        }

        if (asset.isSCDPDepositAsset || asset.isSCDPKrAsset) {
            bool shouldAddToCollaterals = true;
            for (uint256 i; i < scdp().collaterals.length; i++) {
                if (scdp().collaterals[i] == _assetAddr) {
                    shouldAddToCollaterals = false;
                }
            }
            if (shouldAddToCollaterals) {
                scdp().collaterals.push(_assetAddr);
            }
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function updateFeeds(bytes12 _assetId, FeedConfiguration memory _feedConfig) public onlyRole(Role.ADMIN) {
        if (_feedConfig.oracleIds.length != _feedConfig.feeds.length) {
            revert CError.ARRAY_LENGTH_MISMATCH(_assetId.toString(), _feedConfig.oracleIds.length, _feedConfig.feeds.length);
        }
        for (uint256 i; i < _feedConfig.oracleIds.length; i++) {
            if (_feedConfig.oracleIds[i] == OracleType.Chainlink) {
                setChainLinkFeed(_assetId, _feedConfig.feeds[i]);
            } else if (_feedConfig.oracleIds[i] == OracleType.API3) {
                setApi3Feed(_assetId, _feedConfig.feeds[i]);
            }
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setChainlinkFeeds(bytes12[] calldata _assetIds, address[] calldata _feeds) public onlyRole(Role.ADMIN) {
        if (_assetIds.length != _feeds.length) {
            revert CError.ARRAY_LENGTH_MISMATCH("", _assetIds.length, _feeds.length);
        }
        for (uint256 i; i < _assetIds.length; i++) {
            setChainLinkFeed(_assetIds[i], _feeds[i]);
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setApi3Feeds(bytes12[] calldata _assetIds, address[] calldata _feeds) public onlyRole(Role.ADMIN) {
        if (_assetIds.length != _feeds.length) {
            revert CError.ARRAY_LENGTH_MISMATCH("", _assetIds.length, _feeds.length);
        }
        for (uint256 i; i < _assetIds.length; i++) {
            setApi3Feed(_assetIds[i], _feeds[i]);
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setChainLinkFeed(bytes12 _assetId, address _feedAddr) public onlyRole(Role.ADMIN) {
        if (_feedAddr == address(0)) {
            revert CError.ORACLE_ZERO_ADDRESS(_assetId.toString());
        }
        cs().oracles[_assetId][OracleType.Chainlink] = Oracle(_feedAddr, AssetStateFacet(address(this)).getChainlinkPrice);
        if (AssetStateFacet(address(this)).getChainlinkPrice(_feedAddr) == 0) {
            revert CError.INVALID_CL_PRICE(_assetId.toString());
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setApi3Feed(bytes12 _assetId, address _feedAddr) public onlyRole(Role.ADMIN) {
        if (_feedAddr == address(0)) {
            revert CError.ZERO_ADDRESS();
        }
        cs().oracles[_assetId][OracleType.API3] = Oracle(_feedAddr, AssetStateFacet(address(this)).getAPI3Price);

        if (AssetStateFacet(address(this)).getAPI3Price(_feedAddr) == 0) {
            revert CError.INVALID_API3_PRICE(_assetId.toString());
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function updateOracleOrder(address _assetAddr, OracleType[2] memory _newOracleOrder) external onlyRole(Role.ADMIN) {
        if (cs().assets[_assetAddr].underlyingId == EMPTY_BYTES12) {
            revert CError.ASSET_DOES_NOT_EXIST(_assetAddr);
        }

        cs().assets[_assetAddr].oracles = _newOracleOrder;

        if (cs().assets[_assetAddr].pushedPrice().price == 0) {
            revert CError.NO_PUSH_PRICE(cs().assets[_assetAddr].underlyingId.toString());
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function validateAssetConfig(address _assetAddr, Asset memory _config) external view {
        if (_config.isCollateral) {
            _validateMinterCollateral(_assetAddr, _config);
        }
        if (_config.isKrAsset) {
            _validateMinterKrAsset(_assetAddr, _config);
        }
        if (_config.isSCDPDepositAsset) {
            _validateSCDPDepositAsset(_assetAddr, _config);
        }
        if (_config.isSCDPKrAsset) {
            _validateSCDPKrAsset(_assetAddr, _config);
        }

        if (_config.pushedPrice().price == 0) {
            revert CError.NO_PUSH_PRICE(_config.underlyingId.toString());
        }
    }

    function _validateMinterCollateral(address _assetAddr, Asset memory _config) internal pure {
        if (_config.factor > Percents.HUNDRED) {
            revert CError.INVALID_CFACTOR(_assetAddr, _config.factor, Percents.HUNDRED);
        } else if (_config.liqIncentive > Percents.MAX_LIQ_INCENTIVE) {
            revert CError.INVALID_LIQ_INCENTIVE(_assetAddr, _config.liqIncentive, Percents.MAX_LIQ_INCENTIVE);
        } else if (_config.liqIncentive < Percents.HUNDRED) {
            revert CError.INVALID_LIQ_INCENTIVE(_assetAddr, _config.liqIncentive, Percents.HUNDRED);
        } else if (_config.decimals == 0) {
            revert CError.INVALID_DECIMALS(_assetAddr, _config.decimals);
        }
    }

    function _validateMinterKrAsset(address _assetAddr, Asset memory _config) internal view {
        if (_config.kFactor < Percents.HUNDRED) {
            revert CError.INVALID_KFACTOR(_assetAddr, _config.kFactor, Percents.HUNDRED);
        } else if (_config.closeFee > Percents.TWENTY_FIVE) {
            revert CError.INVALID_MINTER_FEE(_assetAddr, _config.closeFee, Percents.TWENTY_FIVE);
        } else if (_config.openFee > Percents.TWENTY_FIVE) {
            revert CError.INVALID_MINTER_FEE(_assetAddr, _config.openFee, Percents.TWENTY_FIVE);
        }

        IERC165 asset = IERC165(_assetAddr);
        if (!asset.supportsInterface(type(IKISS).interfaceId) && !asset.supportsInterface(type(IKreskoAsset).interfaceId)) {
            revert CError.INVALID_KRASSET_CONTRACT(_assetAddr);
        } else if (!IERC165(_config.anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId)) {
            revert CError.INVALID_KRASSET_ANCHOR(_assetAddr);
        } else if (_config.supplyLimit > type(uint128).max) {
            revert CError.SUPPLY_LIMIT(_assetAddr, _config.supplyLimit, type(uint128).max);
        } else if (!IKreskoAsset(_assetAddr).hasRole(Role.OPERATOR, address(this))) {
            revert CError.INVALID_KRASSET_OPERATOR(_assetAddr);
        }
    }

    function _validateSCDPDepositAsset(address _assetAddr, Asset memory _config) internal pure {
        if (_config.factor > Percents.HUNDRED) {
            revert CError.INVALID_KFACTOR(_assetAddr, _config.factor, Percents.HUNDRED);
        } else if (_config.depositLimitSCDP > type(uint128).max) {
            revert CError.DEPOSIT_LIMIT(_assetAddr, _config.depositLimitSCDP, type(uint128).max);
        } else if (_config.decimals == 0) {
            revert CError.INVALID_DECIMALS(_assetAddr, _config.decimals);
        }
    }

    function _validateSCDPKrAsset(address _assetAddr, Asset memory _config) internal pure {
        if (_config.swapOutFeeSCDP > Percents.TWENTY_FIVE) {
            revert CError.INVALID_SCDP_FEE(_assetAddr, _config.swapOutFeeSCDP, Percents.TWENTY_FIVE);
        } else if (_config.swapInFeeSCDP > Percents.TWENTY_FIVE) {
            revert CError.INVALID_SCDP_FEE(_assetAddr, _config.swapInFeeSCDP, Percents.TWENTY_FIVE);
        } else if (_config.protocolFeeShareSCDP > Percents.FIFTY) {
            revert CError.INVALID_SCDP_FEE(_assetAddr, _config.protocolFeeShareSCDP, Percents.FIFTY);
        } else if (_config.liqIncentiveSCDP > Percents.MAX_LIQ_INCENTIVE) {
            revert CError.INVALID_LIQ_INCENTIVE(_assetAddr, _config.liqIncentiveSCDP, Percents.MAX_LIQ_INCENTIVE);
        } else if (_config.liqIncentiveSCDP < Percents.MIN_LIQ_INCENTIVE) {
            revert CError.INVALID_LIQ_INCENTIVE(_assetAddr, _config.liqIncentiveSCDP, Percents.MIN_LIQ_INCENTIVE);
        }
    }
}
