// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

import {IERC1155} from "common/interfaces/IERC1155.sol";
import {Ownable} from "@oz/access/Ownable.sol";
import {Errors} from "common/Errors.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";

// solhint-disable code-complexity

contract GatingManager is IGatingManager, Ownable {
    IERC1155 public kreskian;
    IERC1155 public questForKresk;
    uint8 public phase;
    uint256[] internal _qfkNFTs;

    mapping(address => bool) internal whitelisted;

    constructor(address _admin, address _kreskian, address _questForKresk, uint8 _phase) Ownable(_admin) {
        kreskian = IERC1155(_kreskian);
        questForKresk = IERC1155(_questForKresk);
        phase = _phase;

        _qfkNFTs.push(0);
        _qfkNFTs.push(1);
        _qfkNFTs.push(2);
        _qfkNFTs.push(3);
        _qfkNFTs.push(4);
        _qfkNFTs.push(5);
        _qfkNFTs.push(6);
        _qfkNFTs.push(7);
    }

    function transferOwnership(address newOwner) public override(IGatingManager, Ownable) onlyOwner {
        Ownable.transferOwnership(newOwner);
    }

    function qfkNFTs() external view returns (uint256[] memory) {
        return _qfkNFTs;
    }

    function isWhiteListed(address _account) external view returns (bool) {
        return whitelisted[_account];
    }

    function whitelist(address _account, bool _whitelisted) external onlyOwner {
        whitelisted[_account] = _whitelisted;
    }

    function setPhase(uint8 newPhase) external onlyOwner {
        phase = newPhase;
    }

    function isEligible(address _account) external view returns (bool) {
        uint256 currentPhase = phase;
        if (currentPhase == 0) return true;

        bool hasKreskian = kreskian.balanceOf(_account, 0) != 0;

        if (currentPhase == 3) {
            return hasKreskian || whitelisted[_account];
        }

        uint256[] memory qfkBals = questForKresk.balanceOfBatch(_toArray(_account), _qfkNFTs);
        bool validPhaseTwo = qfkBals[0] != 0;

        if (currentPhase == 2) {
            return validPhaseTwo || whitelisted[_account];
        }

        if (currentPhase == 1 && validPhaseTwo) {
            for (uint256 i = 1; i < qfkBals.length; i++) {
                if (qfkBals[i] != 0) return true;
            }
        }

        return whitelisted[_account];
    }

    function check(address _account) external view {
        uint256 currentPhase = phase;
        if (currentPhase == 0) return;

        bool hasKreskian = kreskian.balanceOf(_account, 0) != 0;

        if (currentPhase == 3) {
            if (!hasKreskian && !whitelisted[_account]) revert Errors.MISSING_PHASE_3_NFT();
            return;
        }

        uint256[] memory qfkBals = questForKresk.balanceOfBatch(_toArray(_account), _qfkNFTs);

        bool validPhaseTwo = qfkBals[0] != 0;

        if (currentPhase == 2) {
            if (!validPhaseTwo && !whitelisted[_account]) revert Errors.MISSING_PHASE_2_NFT();
            return;
        }

        if (currentPhase == 1 && validPhaseTwo) {
            for (uint256 i = 1; i < qfkBals.length; i++) {
                if (qfkBals[i] != 0) return;
            }
        }

        if (!whitelisted[_account]) revert Errors.MISSING_PHASE_1_NFT();
    }

    function _toArray(address _acc) internal pure returns (address[] memory array) {
        array = new address[](8);
        array[0] = _acc;
        array[1] = _acc;
        array[2] = _acc;
        array[3] = _acc;
        array[4] = _acc;
        array[5] = _acc;
        array[6] = _acc;
        array[7] = _acc;
    }
}
