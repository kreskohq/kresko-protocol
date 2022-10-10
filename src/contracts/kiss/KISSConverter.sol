// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {Error} from "../libs/Errors.sol";
import "./interfaces/IKISS.sol";

/* solhint-disable var-name-mixedcase */
/* solhint-disable contract-name-camelcase */

/**
 * @title KISSConverter (TEST VERSION)
 * @author Kresko
 */
contract KISSConverter is Ownable, ReentrancyGuard {
    /* -------------------------------------------------------------------------- */
    /*                                    Types                                   */
    /* -------------------------------------------------------------------------- */
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;

    /* -------------------------------------------------------------------------- */
    /*                                   Layout                                   */
    /* -------------------------------------------------------------------------- */
    IKISS public immutable KISS;
    mapping(address => bool) public underlyings;
    mapping(address => mapping(address => uint256)) public balances;

    /* -------------------------------------------------------------------------- */
    /*                                   Events                                   */
    /* -------------------------------------------------------------------------- */

    event Issue(uint256 underlyingIn, uint256 kissIssued, address indexed to, address indexed underlying);
    event Redeem(uint256 kissDestroyed, uint256 underlyingOut, address indexed to, address indexed underlying);
    event UnderlyingEnabled(address indexed underlying);
    event UnderlyingDisabled(address indexed underlying);

    constructor(IKISS _KISS, address[] memory _underlyings) {
        KISS = _KISS;
        for (uint256 i; i < _underlyings.length; i++) {
            underlyings[_underlyings[i]] = true;
        }
    }

    function toggleUnderlying(address _underlying) external onlyOwner {
        bool enabled = !underlyings[_underlying];

        underlyings[_underlying] = enabled;
        if (enabled) {
            emit UnderlyingEnabled(_underlying);
        } else {
            emit UnderlyingDisabled(_underlying);
        }
    }

    /**
     * @notice Issue KISS for amount of underlying
     *
     * @param _to KISS recipient
     * @notice address(0) == _msgSender()
     *
     * @param _underlying underlying asset
     * @param _underlyingIn amount of underlying to convert into KISS
     *
     */
    function issue(
        address _to,
        address _underlying,
        uint256 _underlyingIn
    ) external nonReentrant {
        require(underlyings[_underlying], "ISSUE: !underlying");

        address sender = _msgSender();
        address to = _to == address(0) ? sender : _to;
        balances[to][_underlying] += _underlyingIn;

        IERC20MetadataUpgradeable(_underlying).safeTransferFrom(sender, address(this), _underlyingIn);

        uint256 kissOut = toKISS(_underlying, _underlyingIn);
        KISS.mint(to, kissOut);

        emit Issue(_underlyingIn, kissOut, to, _underlying);
    }

    /**
     * @notice Redeem underlying, destroy KISS
     *
     * @param _to address to send underlying
     * @notice address(0) == _msgSender()
     *
     * @param _underlying underlying asset
     * @param _underlyingOut amount of underlying to redeem
     * @notice amount of KISS destroyed likely differs
     *
     */
    function redeem(
        address _to,
        address _underlying,
        uint256 _underlyingOut
    ) external nonReentrant {
        require(underlyings[_underlying], "REDEEM: !underlying");

        address sender = _msgSender();
        require(balances[sender][_underlying] >= _underlyingOut, "REDEEM: !balance");

        address to = _to == address(0) ? sender : _to;
        balances[to][_underlying] -= _underlyingOut;

        uint256 kissOut = toKISS(_underlying, _underlyingOut);
        KISS.burn(sender, kissOut);

        IERC20MetadataUpgradeable(_underlying).safeTransfer(to, _underlyingOut);
        emit Redeem(kissOut, _underlyingOut, to, _underlying);
    }

    /**
     * @notice Get equal amount of KISS for an amount of underlying
     * @param _underlying underlying asset
     * @param _underlyingIn underlying asset amount
     * @return kissOut amount of KISS for `_underlyingIn`
     * @dev TEST - no oracles - 1-1 ratio
     */
    function toKISS(address _underlying, uint256 _underlyingIn) public pure returns (uint256 kissOut) {
        require(_underlying != address(0), Error.ZERO_ADDRESS);
        return _underlyingIn;
    }

    /**
     * @notice Get equal amount of underlying for an amount of KISS
     * @param _underlying underlying asset
     * @param _kissIn amount of KISS
     * @return underlyingOut amount of underlying for `_kissIn`
     * @dev TEST - no oracles - 1-1 ratio
     */
    function fromKISS(address _underlying, uint256 _kissIn) public pure returns (uint256 underlyingOut) {
        require(_underlying != address(0), Error.ZERO_ADDRESS);
        return _kissIn;
    }
}
