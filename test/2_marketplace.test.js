// import the contracts you are going to use
const Kittycontract = artifacts.require("Kittycontract");
const Marketplace = artifacts.require("KittyMarketPlace");
const Imarketplace = artifacts.require("IKittyMarketPlace");


const {
    BN,           // Big Number support 
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
  } = require('@openzeppelin/test-helpers');
const balance = require('@openzeppelin/test-helpers/src/balance');

// Main function that is executed during the test
contract("Marketplace", ([owner, alice, bob, charlie]) => {
    // Global variable declarations
    let kittycontract;
    let marketplace;
    const genes1 = "5368298526545211";
    const genes2 = "5289121556575841";
    const genes3 = "7884733212593141";
    const genes4 = "6942691265662311";
    const genes5 = "2421358865879841";
    const genes6 = "4657296345892231";
    const genes7 = "3438487942159421";
    const genes8 = "9791601525815211";

    const price = web3.utils.toWei("0.1");

    before(async function() {
        // Deploy Kittycontract to testnet
        kittycontract = await Kittycontract.new();

        // Deploy Marketplace to testnet
        marketplace = await Marketplace.new(kittycontract.address);
    });
    describe("Initial Values", () => {
        it("should set a new offer to sell a kitty", async () => {
            // create a new gen0 cat
            await kittycontract.createKittyGen0(genes1);

            // set marketplace address to approve for all
            await kittycontract.setApprovalForAll(marketplace.address, true);

            // set a new offer for token ID = 1
            await marketplace.setOffer(price, "1");

            // fetch the offer object for token ID = 1
            const newOffer = await marketplace.getOffer(1);
            assert.equal(newOffer.price, price);
        })
        
        it("should revert when offer set by not approved", async () => {
            // create a new gen0 cat
            await kittycontract.createKittyGen0(genes2);
            
            // expect revert when setting a new offer for token ID = 2 from account bob
            await expectRevert.unspecified(marketplace.setOffer(price, 2, { from: bob }));
        })

        it("should emit a 'MarketTransaction' event", async () => {
            // create a new gen0 cat
            await kittycontract.createKittyGen0(genes3);

            // set offer for new cat from owner account
            const newCat = await marketplace.setOffer(price, "3");

            expectEvent(newCat, "MarketTransaction", {
                TxType: "Create offer",
                owner: owner,
                tokenId: "3"
            });
        })

        it("should fetch the total number of kitty's that are for sale", async () => {
            // create 1 more new cat
            await kittycontract.createKittyGen0(genes4);

            // now setOffers for cats 2 and 4
            await marketplace.setOffer(price, "2");
            await marketplace.setOffer(price, "4");

            const catsForSale = await marketplace.getAllTokenOnSale();
            const numOffers = await marketplace.totalOffers();

            // 4 cats have offers (from above tests), 
            assert.equal(catsForSale.length, numOffers);
        })

        it("should get the offer data for kitty with tokenId ID", async () => {
            const offer = await marketplace.getOffer(1);

            assert.equal(offer.seller, owner);
            assert.equal(offer.price, price);
            assert.equal(offer.index, 0);
            assert.equal(offer.tokenId, "1");
            assert.equal(offer.active, true);
        })

        it("should fail for a kitty with no active offer", async () => {
            // create a new kitty
            await kittycontract.createKittyGen0(genes5);
            
            // getting an offer that doesn't exist, should return 0 values
            let offer = await marketplace.getOffer(5);

            // testing that in fact we get 0 values from the getter function
            assert.equal(offer.tokenId, 0, "there is an offer already");
        })
    
        it("should remove an offer, returning active == false", async () => {
            // fetch the existing active offer
            let offerActive = await marketplace.getOffer(2);

            // changes the offer's active status to "false"
            await marketplace.removeOffer(2);

            // fetch the offer from the offers array
            let offerUnactive = await marketplace.getOffer(2);

            // checks that the original offer status before removeOffer is active == true
            assert(offerActive.active);

            // checks that the new offer status should now be active == false
            assert(!offerUnactive.active);
        })

        it("should buy a kitty, transfer ownership, and verify ETH value and ownership transfered", async () => {
            // fetch the offer for cat ID = 1
            const offerBefore = await marketplace.getOffer("1");

            // assert that the offer is currently active (active == true)
            assert(offerBefore.active);

            // check the ETH balances prior to the buyKitty function
            const ownerBalBefore = await balance.current(owner);
            const buyerBalBefore = await balance.current(bob);

            // bob account buys the kitty from owner account
            const buyTx = await marketplace.buyKitty(1, { from: bob, value: price, gasPrice:10e09 });
            const gas = buyTx.receipt.gasUsed*10e9;

            // calculate the total spent (price + fees)
            const spent = Number(price) + Number(gas);

            // check the new ETH balances after the above transaction
            const ownerBalAfter = await balance.current(owner);
            const buyerBalAfter = await balance.current(bob);

            // now fetch the offer again so we can check active status
            const offerAfter = await marketplace.getOffer("1");

            // assert that the offer is currently inactive (active == false)
            assert(!offerAfter.active);

            const newOwner = await kittycontract.ownerOf("1");

            // make sure the owner's and buyer's ETH balances reflect the tx price
            assert.equal(Number(ownerBalBefore), (Number(ownerBalAfter) - price));
            assert((Number(buyerBalBefore) - spent) >= Number(buyerBalAfter));

            // make sure the new owner is bob
            assert.equal(newOwner, bob);
        })

        it("should revert for an offer with price 0 ETH", async () => {
            expectRevert.unspecified(marketplace.setOffer(0, "5"));
        })

        it("should set offers, buy them from different address, then breed two, then show ownership of all", async () => {
            // gen0 cat ID 6
            await kittycontract.createKittyGen0(genes6);
            // gen0 cat ID 7
            await kittycontract.createKittyGen0(genes7);
            // gen0 cat ID 8
            await kittycontract.createKittyGen0(genes8);
            
            // set marketplace address to approve for all
            await kittycontract.setApprovalForAll(marketplace.address, true);

            // set offers for all kitties 
            await marketplace.setOffer(price, "6"); 
            await marketplace.setOffer(price, "7"); 
            await marketplace.setOffer(price, "8"); 

            // alice buys these cats
            await marketplace.buyKitty(6, { from: alice, value: price});
            await marketplace.buyKitty(7, { from: alice, value: price});
            await marketplace.buyKitty(8, { from: alice, value: price});

            // now alice breeds two cats
            await kittycontract.breed(6, 7, { from: alice});

            const aliceCats = await kittycontract.getKittiesByUser(alice);

            assert.equal(Number(aliceCats[0]), "6");
            assert.equal(Number(aliceCats[1]), "7");
            assert.equal(Number(aliceCats[2]), "8");
            assert.equal(Number(aliceCats[3]), "9");
        })

        it("should verify alice owns 4 cats", async () => {
            // fetches the number of cats alice owns
            const aliceBal = await kittycontract.balanceOf(alice);

            // verify alice owns the 4 cats from above
            assert.equal(aliceBal, 4);
        })

        it("should set approval for Alice cats, then isApprovedForAll should confirm approval", async () => {
            // set marketplace approval for alice cats
            await kittycontract.setApprovalForAll(marketplace.address, true, { from: alice });

            // variable for isApprovedForAll boolean
            const aliceCats = await kittycontract.isApprovedForAll(alice, marketplace.address);

            // verify alice cats boolean is true
            assert(aliceCats);
        })
    })
})

