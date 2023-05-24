// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {ERC721, ERC721Storage} from "../state/ERC721Storage.sol";
import {LibLZ} from "./LibLZ.sol";
import {Meta} from "../../../../libs/Meta.sol";

library LibERC721 {
    using AddressUpgradeable for address;
    using StringsUpgradeable for uint256;
    using LibERC721 for ERC721Storage;

    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables or disables (`approved`) `operator` to manage all of its assets.
     */
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /**
     * @dev See {IERC721-isApprovedForAll}.
     */
    function isApprovedForAll(
        ERC721Storage storage self,
        address owner,
        address operator
    ) internal view returns (bool) {
        return self.operatorApprovals[owner][operator];
    }

    /**
     * @dev See {IERC721-setApprovalForAll}.
     */
    function setApprovalForAll(ERC721Storage storage self, address operator, bool approved) internal {
        require(msg.sender != operator, "ERC721: approve to caller");
        self.operatorApprovals[msg.sender][operator] = approved;
    }

    function isApprovedOrOwner(
        ERC721Storage storage self,
        address spender,
        uint256 tokenId
    ) internal view returns (bool) {
        address owner = self.ownerOf(tokenId);
        return (spender == owner || self.isApprovedForAll(owner, spender) || self.getApproved(tokenId) == spender);
    }

    function debitFrom(ERC721Storage storage self, address _from, uint16, bytes memory, uint _tokenId) internal {
        require(self.isApprovedOrOwner(Meta.msgSender(), _tokenId), LibLZ.INVALID_CALLER);
        require(self.ownerOf(_tokenId) == _from, LibLZ.INVALID_TOKEN_OWNER);
        self.transfer(_from, address(this), _tokenId);
    }

    function creditTo(ERC721Storage storage self, uint16, address _toAddress, uint _tokenId) internal {
        bool tokenExists = self.exists(_tokenId);
        require(!tokenExists || (tokenExists && self.ownerOf(_tokenId) == address(this)));
        if (!tokenExists) {
            self.safeMint(_toAddress, _tokenId, "");
        } else {
            self.transfer(address(this), _toAddress, _tokenId);
        }
    }

    /**
     * @dev See {IERC721-getApproved}.
     */
    function getApproved(ERC721Storage storage self, uint256 tokenId) internal view returns (address) {
        self.requireMinted(tokenId);

        return self.tokenApprovals[tokenId];
    }

    /**
     * @dev Same as {xref-ERC721-_safeMint-address-uint256-}[`_safeMint`], with an additional `data` parameter which is
     * forwarded in {IERC721Receiver-onERC721Received} to contract recipients.
     */
    function safeMint(ERC721Storage storage self, address to, uint256 tokenId, bytes memory data) internal {
        _mint(self, to, tokenId);
        require(
            _checkOnERC721Received(address(0), to, tokenId, data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    function _mint(ERC721Storage storage self, address to, uint256 tokenId) private {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!self.exists(tokenId), "ERC721: token already minted");

        self.beforeTokenTransfer(address(0), to, tokenId, 1);

        // Check that tokenId was not minted by `_beforeTokenTransfer` hook
        require(!self.exists(tokenId), "ERC721: token already minted");

        unchecked {
            // Will not overflow unless all 2**256 token ids are minted to the same owner.
            // Given that tokens are minted one by one, it is impossible in practice that
            // this ever happens. Might change if we allow batch minting.
            // The ERC fails to describe this case.
            self.balances[to] += 1;
        }

        self.owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);

        self.afterTokenTransfer(address(0), to, tokenId, 1);
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     * This is an internal function that does not check if the sender is authorized to operate on the token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function burn(ERC721Storage storage self, uint256 tokenId) internal {
        address owner = self.ownerOf(tokenId);

        self.beforeTokenTransfer(owner, address(0), tokenId, 1);

        // Update ownership in case tokenId was transferred by `_beforeTokenTransfer` hook
        owner = self.ownerOf(tokenId);

        // Clear approvals
        delete self.tokenApprovals[tokenId];

        unchecked {
            // Cannot overflow, as that would require more tokens to be burned/transferred
            // out than the owner initially received through minting and transferring in.
            self.balances[owner] -= 1;
        }
        delete self.owners[tokenId];

        emit Transfer(owner, address(0), tokenId);

        self.afterTokenTransfer(owner, address(0), tokenId, 1);
    }

    function ownerOf(ERC721Storage storage self, uint256 tokenId) internal view returns (address) {
        address owner = self.owners[tokenId];
        require(owner != address(0), "ERC721 :address zero is not a valid owner");
        return owner;
    }

    /**
     * @dev Reverts if the `tokenId` has not been minted yet.
     */
    function requireMinted(ERC721Storage storage self, uint256 tokenId) internal view {
        require(self.exists(tokenId), "ERC721: invalid token ID");
    }

    /** @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.isContract()) {
            try IERC721ReceiverUpgradeable(to).onERC721Received(msg.sender, from, tokenId, data) returns (
                bytes4 retval
            ) {
                return retval == IERC721ReceiverUpgradeable.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    /**
     * @dev Approve `to` to operate on `tokenId`
     *
     * Emits an {Approval} event.
     */
    function approve(ERC721Storage storage self, address to, uint256 tokenId) internal {
        self.tokenApprovals[tokenId] = to;
        emit Approval(self.ownerOf(tokenId), to, tokenId);
    }

    /**
     * @dev Approve `operator` to operate on all of `owner` tokens
     *
     * Emits an {ApprovalForAll} event.
     */
    function setApprovalForAll(ERC721Storage storage self, address owner, address operator, bool approved) internal {
        require(owner != operator, "ERC721: approve to caller");
        self.operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    function safeTransferFrom(ERC721Storage storage self, address from, address to, uint256 tokenId) internal {
        self.safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        ERC721Storage storage self,
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal {
        require(self.isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not token owner or approved");
        _safeTransfer(self, from, to, tokenId, data);
    }

    function _safeTransfer(
        ERC721Storage storage self,
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private {
        transfer(self, from, to, tokenId);
        _checkOnERC721Received(from, to, tokenId, data);
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *  As opposed to {transferFrom}, this imposes no restrictions on msg.sender.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     *
     * Emits a {Transfer} event.
     */
    function transfer(ERC721Storage storage self, address from, address to, uint256 tokenId) internal {
        require(self.ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to the zero address");

        self.beforeTokenTransfer(from, to, tokenId, 1);

        // Check that tokenId was not transferred by `_beforeTokenTransfer` hook
        require(self.ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");

        // Clear approvals from the previous owner
        delete self.tokenApprovals[tokenId];

        unchecked {
            // `_balances[from]` cannot overflow for the same reason as described in `_burn`:
            // `from`'s balance is the number of token held, which is at least one before the current
            // transfer.
            // `_balances[to]` could overflow in the conditions described in `_mint`. That would require
            // all 2**256 token ids to be minted, which in practice is impossible.
            self.balances[from] -= 1;
            self.balances[to] += 1;
        }
        self.owners[tokenId] = to;

        emit Transfer(from, to, tokenId);

        self.afterTokenTransfer(from, to, tokenId, 1);
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
     *
     * Tokens start existing when they are minted (`_mint`),
     * and stop existing when they are burned (`_burn`).
     */
    function exists(ERC721Storage storage self, uint256 tokenId) internal view returns (bool) {
        return self.owners[tokenId] != address(0);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting and burning. If {ERC721Consecutive} is
     * used, the hook may be called as part of a consecutive (batch) mint, as indicated by `batchSize` greater than 1.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s tokens will be transferred to `to`.
     * - When `from` is zero, the tokens will be minted for `to`.
     * - When `to` is zero, ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     * - `batchSize` is non-zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function beforeTokenTransfer(
        ERC721Storage storage self,
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal {}

    /**
     * @dev Hook that is called after any token transfer. This includes minting and burning. If {ERC721Consecutive} is
     * used, the hook may be called as part of a consecutive (batch) mint, as indicated by `batchSize` greater than 1.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s tokens were transferred to `to`.
     * - When `from` is zero, the tokens were minted for `to`.
     * - When `to` is zero, ``from``'s tokens were burned.
     * - `from` and `to` are never both zero.
     * - `batchSize` is non-zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function afterTokenTransfer(
        ERC721Storage storage self,
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal {}

    /**
     * @dev Unsafe write access to the balances, used by extensions that "mint" tokens using an {ownerOf} override.
     *
     * WARNING: Anyone calling this MUST ensure that the balances remain consistent with the ownership. The invariant
     * being that for any address `a` the value returned by `balanceOf(a)` must be equal to the number of tokens such
     * that `ownerOf(tokenId)` is `a`.
     */
    // solhint-disable-next-line func-name-mixedcase
    function __unsafe_increaseBalance(address account, uint256 amount) internal {
        ERC721().balances[account] += amount;
    }
}
