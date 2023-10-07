import { smock } from '@defi-wonderland/smock';
import { addFacet } from '@scripts/add-facet';
import { removeFacet } from '@scripts/remove-facet';
import { expect } from '@test/chai';
import { diamondFixture } from '@utils/test/fixtures';
import { wrapContractWithSigner } from '@utils/test/helpers/general';
import { FacetCut, FacetCutAction } from 'hardhat-deploy/dist/types';
import { SmockFacet2__factory, SmockFacet__factory, SmockInit__factory } from 'types/typechain';

describe('Diamond', () => {
  beforeEach(async function () {
    await diamondFixture();
  });

  describe('#upgrades', () => {
    it('can add a new facet', async function () {
      const Factory = await smock.mock<SmockFacet__factory>('SmockFacet');
      const SmockFacet = await Factory.deploy();

      const [SmockInitializer] = await hre.deploy('SmockInit');

      const signatures = hre.getSignatures([...SmockFacet__factory.abi]);

      const Cut: FacetCut = {
        facetAddress: SmockFacet.address,
        functionSelectors: signatures,
        action: FacetCutAction.Add,
      };

      const initData = await SmockInitializer.populateTransaction.initialize(hre.addr.userOne);

      await hre.Diamond.diamondCut([Cut], initData.to!, initData.data!);
      const TEST_OPERATOR_ROLE = hre.ethers.utils.id('kresko.test.operator');
      const isTestOperator = await hre.Diamond.hasRole(TEST_OPERATOR_ROLE, hre.addr.userOne);

      // Succesfully added the new operator through the initialization contract
      expect(isTestOperator).to.equal(true);

      const Facet = await hre.ethers.getContractAt([...SmockFacet__factory.abi], hre.Diamond.address);

      // Ensure facet has it's own storage
      const operatorFromNewStorage = await Facet.operator(); // Retrieved from SmockStorage
      expect(operatorFromNewStorage).to.equal(hre.addr.userOne);
    });

    it('can remove a facet', async function () {
      const NewFacet = await addFacet({
        name: 'SmockFacet',
        initializerName: 'SmockInit',
        initializerArgs: hre.addr.userOne,
      });
      const facetsBefore = await hre.Diamond.facets();
      expect(facetsBefore.filter(f => f.facetAddress === NewFacet.address).length).to.equal(1);

      await removeFacet({ name: 'SmockFacet' });
      const facetsAfter = await hre.Diamond.facets();

      expect(facetsBefore.length - facetsAfter.length).to.equal(1);
      expect(facetsAfter).to.not.deep.contain(NewFacet.address);
    });

    it('can remove a function', async function () {
      // Delete acceptOwnership from DiamondOwnershipFacet

      // Check there is no pending owner
      let pendingOwner = await hre.Diamond.pendingOwner();
      expect(pendingOwner).to.equal(hre.ethers.constants.AddressZero);

      // Transfer to eg. wrong address
      const wrongOwner = hre.addr.nonadmin;
      await hre.Diamond.transferOwnership(wrongOwner);

      // Ensure
      pendingOwner = await hre.Diamond.pendingOwner();
      expect(pendingOwner).to.equal(wrongOwner);

      // Fragment and signature for acceptOwnersip
      const functionFragment = hre.Diamond.interface.functions['acceptOwnership()'];
      const signature = hre.ethers.utils.Interface.getSighash(functionFragment);

      const facetAddress = await hre.Diamond.facetAddress(signature);
      const functions = await hre.Diamond.facetFunctionSelectors(facetAddress);

      const Cut: FacetCut = {
        facetAddress: hre.ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [signature],
      };

      // We will set a correct owner with delegatecall into the Diamond itself with the cut transaction
      const correctOwner = hre.addr.userOne;
      const initData = await hre.Diamond.populateTransaction.transferOwnership(correctOwner);

      const tx = await hre.Diamond.diamondCut([Cut], initData.to!, initData.data!);
      await tx.wait();

      // Ensure rest of the functions remain
      const functionsAfterCut = await hre.Diamond.facetFunctionSelectors(facetAddress);
      expect(functionsAfterCut.length).to.equal(functions.length - 1);

      // Ensure delegatecall did set the correct pending owner with the cut

      const contract = await hre.ethers.getContractAt('AuthEvent', hre.Diamond.address);

      const filter = contract.filters.PendingOwnershipTransfer(hre.addr.deployer, correctOwner);
      const [event] = await contract.queryFilter(filter);
      const { previousOwner, newOwner } = event.args;
      expect(previousOwner).to.equal(hre.addr.deployer);
      expect(newOwner).to.equal(correctOwner);

      // Ensure there is no function to accept the ownership
      await expect(wrapContractWithSigner(hre.Diamond, hre.users.nonadmin).acceptOwnership()).to.be.reverted;
    });

    it('can replace a function', async function () {
      // Same as above but instead replace the function
      // Check there is no pending owner
      let pendingOwner = await hre.Diamond.pendingOwner();
      expect(pendingOwner).to.equal(hre.ethers.constants.AddressZero);

      // Transfer to eg. wrong address
      const wrongOwner = hre.addr.nonadmin;
      await hre.Diamond.transferOwnership(wrongOwner);

      // Ensure
      pendingOwner = await hre.Diamond.pendingOwner();
      expect(pendingOwner).to.equal(wrongOwner);

      // Fragment and signature for acceptOwnersip
      const functionFragment = hre.Diamond.interface.functions['acceptOwnership()'];
      const signature = hre.ethers.utils.Interface.getSighash(functionFragment);

      const OldOwnershipFacet = await hre.Diamond.facetAddress(signature);

      const [NewOwnershipFacet, allOwnershipFacetSignatures] = await hre.deploy('DiamondOwnershipFacet', {
        deploymentName: 'DiamondOwnershipFacet2',
      });

      // Only replace a single function, we could replace all of them
      const Cut: FacetCut = {
        facetAddress: NewOwnershipFacet.address,
        action: FacetCutAction.Replace,
        functionSelectors: [signature],
      };

      // We will set a correct owner with delegatecall into the Diamond itself with the cut transaction
      const correctOwner = hre.addr.userOne;
      const initData = await hre.Diamond.populateTransaction.transferOwnership(correctOwner);

      const tx = await hre.Diamond.diamondCut([Cut], initData.to!, initData.data!);
      await tx.wait();

      // Ensure function exists and revert is for invalid address instead of missing function
      await expect(wrapContractWithSigner(hre.Diamond, hre.users.nonadmin).acceptOwnership()).to.be.reverted;
      // Ensure one function is contained in the new facet
      const functionsNewFacet = await hre.Diamond.facetFunctionSelectors(NewOwnershipFacet.address);
      expect(functionsNewFacet.length).to.equal(1);
      expect(functionsNewFacet).to.have.members([signature]);

      // Ensure rest are in the previous one
      const functionsOldFacet = await hre.Diamond.facetFunctionSelectors(OldOwnershipFacet);
      expect(functionsOldFacet).to.not.have.members([signature]);
      expect(functionsOldFacet.length).to.equal(allOwnershipFacetSignatures.length - 1);

      // Ensure correct owner can now accept the ownership
      expect(wrapContractWithSigner(hre.Diamond, hre.users.userOne).acceptOwnership());
      const currentOwner = await hre.Diamond.owner();
      expect(currentOwner).to.equal(correctOwner);
    });

    it('can upgrade state', async function () {
      expect(await hre.Diamond.initialized()).to.equal(true);

      const Factory = await smock.mock<SmockInit__factory>('SmockInit');
      const SmockInit = await Factory.deploy();

      const tx = await SmockInit.populateTransaction.upgradeState();

      await hre.Diamond.upgradeState(tx.to!, tx.data!);
      expect(await hre.Diamond.initialized()).to.equal(false);
    });

    it('can preserve old state when extending storage layout', async function () {
      expect(await hre.Diamond.initialized()).to.equal(true);

      // Add the first facet
      const Factory = await smock.mock<SmockFacet__factory>('SmockFacet');
      const SmockFacet = await Factory.deploy();

      const [SmockInitializer] = await hre.deploy('SmockInit');

      const signatures = hre.getSignatures([...SmockFacet__factory.abi]);

      const Cut: FacetCut = {
        facetAddress: SmockFacet.address,
        functionSelectors: signatures,
        action: FacetCutAction.Add,
      };

      const initData = await SmockInitializer.populateTransaction.initialize(hre.addr.userOne);
      await hre.Diamond.diamondCut([Cut], initData.to!, initData.data!);

      const Diamond = await hre.ethers.getContractAt('SmockFacet', hre.Diamond.address);
      const isInitialized = await Diamond.smockInitialized();
      expect(isInitialized).to.equal(true);

      // Add facet with extended state
      // Add the first facet
      const Factory2 = await smock.mock<SmockFacet2__factory>('SmockFacet2');
      const SmockFacet2 = await Factory2.deploy();

      const signatures2 = hre.getSignatures([...SmockFacet2__factory.abi]);

      const Cut2: FacetCut = {
        facetAddress: SmockFacet2.address,
        functionSelectors: signatures2,
        action: FacetCutAction.Add,
      };

      // Initializer only sets the new extended value, does not touch old storage
      const initData2 = await SmockFacet2.populateTransaction.initialize();
      await hre.Diamond.diamondCut([Cut2], initData2.to!, initData2.data!);

      // Here we have appended the storage layout with the `extended` bool property.
      const DiamondExtended = await hre.ethers.getContractAt('SmockFacet2', hre.Diamond.address);

      const initializedAfterExtend = await DiamondExtended.getOldStructValueFromExtended();

      const extendedValue = await DiamondExtended.getNewStructValueFromExtended();

      // Old values remain
      expect(initializedAfterExtend).to.equal(true);
      // And we get new ones
      expect(extendedValue).to.equal(true);
    });
  });
});
