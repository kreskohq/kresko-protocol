// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {IERC1155} from "common/interfaces/IERC1155.sol";

interface IGatingManager {
    function phase() external view returns (uint8);

    function getPhase1NFTs() external view returns (uint256[] memory);

    function kreskian() external view returns (IERC1155);

    function questForKresk() external view returns (IERC1155);

    function isWhiteListed(address _account) external view returns (bool);

    function isBlackListed(address _account) external view returns (bool);

    function whitelist(address _account, bool _whitelisted) external;

    function blacklist(address _account, bool _blacklisted) external;

    function setPhase(uint8 newPhase) external;

    function clearPhase1NFTs() external;

    function setPhase1NFTs(uint256[] memory nftId) external;

    function isEligible(address _account) external view returns (bool);

    function check(address _account) external view;
}
