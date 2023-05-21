// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;
import {IONFT721Upgradeable} from "../interfaces/IONFT721Upgradeable.sol";
import {ERC721} from "../state/ERC721Storage.sol";

import {LibLZ} from "../state/LibLZ.sol";

contract ERC721Facet is IONFT721Upgradeable {
    function balanceOf(address _owner) external view override returns (uint256) {
        return ERC721().balances[_owner];
    }

    function ownerOf(uint256 _tokenId) external view override returns (address) {
        return ERC721().owners[_tokenId];
    }

    function safeTransferFrom(address _from, address _to, uint256 _tokenId) external override {
        ERC721().safeTransferFrom(_from, _to, _tokenId);
    }

    function transferFrom(address _from, address _to, uint256 _tokenId) external override {
        //solhint-disable-next-line max-line-length
        require(ERC721().isApprovedOrOwner(msg.sender, _tokenId), "ERC721: caller is not token owner or approved");

        ERC721().transfer(_from, _to, _tokenId);
    }

    function approve(address _approved, uint256 _tokenId) external override {}

    function getApproved(uint256 _tokenId) external view override returns (address) {
        return address(0);
    }

    function setApprovalForAll(address _operator, bool _approved) external override {}

    function isApprovedForAll(address _owner, address _operator) external view override returns (bool) {
        return false;
    }

    function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes memory _data) external override {}
}
