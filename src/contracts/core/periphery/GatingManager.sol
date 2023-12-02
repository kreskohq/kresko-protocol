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
    uint256[] internal phase1NFTs;
    mapping(address => bool) internal whitelisted;
    mapping(address => bool) internal blacklisted;

    constructor(address _kreskian, address _questForKresk, uint8 _phase) Ownable(msg.sender) {
        kreskian = IERC1155(_kreskian);
        questForKresk = IERC1155(_questForKresk);
        phase = _phase;

        phase1NFTs.push(1);
        phase1NFTs.push(2);
        phase1NFTs.push(3);
    }

    function getPhase1NFTs() external view returns (uint256[] memory) {
        return phase1NFTs;
    }

    function isWhiteListed(address _account) external view returns (bool) {
        return whitelisted[_account];
    }

    function isBlackListed(address _account) external view returns (bool) {
        return blacklisted[_account];
    }

    function whitelist(address _account, bool _whitelisted) external onlyOwner {
        whitelisted[_account] = _whitelisted;
    }

    function blacklist(address _account, bool _blacklisted) external onlyOwner {
        blacklisted[_account] = _blacklisted;
    }

    function setPhase(uint8 newPhase) external onlyOwner {
        phase = newPhase;
    }

    function clearPhase1NFTs() external onlyOwner {
        delete phase1NFTs;
    }

    function setPhase1NFTs(uint256[] memory nftId) external onlyOwner {
        delete phase1NFTs;
        for (uint256 i = 0; i < nftId.length; i++) {
            phase1NFTs.push(nftId[i]);
        }
    }

    function isEligible(address _account) external view returns (bool) {
        uint256 currentPhase = phase;
        if (currentPhase == 0 || whitelisted[_account]) return true;

        if (currentPhase > 3) {
            return false;
        }

        if (blacklisted[_account]) return false;

        bool hasKreskian = kreskian.balanceOf(_account, 0) > 0;

        if (currentPhase == 3 && !hasKreskian) {
            return false;
        }

        bool hasAnalyzeThis = questForKresk.balanceOf(_account, 0) > 0;
        bool validPhaseTwo = hasKreskian && hasAnalyzeThis;

        if (currentPhase == 2 && !validPhaseTwo) {
            return false;
        }
        if (currentPhase == 1) {
            if (!validPhaseTwo) {
                return false;
            }

            for (uint256 i; i < phase1NFTs.length; i++) {
                if (questForKresk.balanceOf(_account, phase1NFTs[i]) == 0) {
                    return false;
                }
            }
        }

        return true;
    }

    function check(address _account) external view {
        uint256 currentPhase = phase;
        if (currentPhase == 0 || whitelisted[_account]) return;

        if (currentPhase > 3) {
            revert Errors.ONLY_WHITELISTED();
        }

        if (blacklisted[_account]) {
            revert Errors.BLACKLISTED();
        }

        bool hasKreskian = kreskian.balanceOf(_account, 0) > 0;

        if (currentPhase == 3 && !hasKreskian) {
            revert Errors.MISSING_PHASE_3_NFT();
        }

        bool hasAnalyzeThis = questForKresk.balanceOf(_account, 0) > 0;
        bool validPhaseTwo = hasKreskian && hasAnalyzeThis;

        if (currentPhase == 2 && !validPhaseTwo) {
            revert Errors.MISSING_PHASE_2_NFT();
        }
        if (currentPhase == 1) {
            if (!validPhaseTwo) {
                revert Errors.MISSING_PHASE_1_NFT();
            }

            for (uint256 i; i < phase1NFTs.length; i++) {
                if (questForKresk.balanceOf(_account, phase1NFTs[i]) == 0) {
                    revert Errors.MISSING_PHASE_1_NFT();
                }
            }
        }
    }
}
