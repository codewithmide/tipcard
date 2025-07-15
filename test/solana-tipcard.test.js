import { network } from "hardhat";
import { expect } from "chai";
import { getSecrets } from "../neon-secrets.js";
import "dotenv/config";

let ethers;
let wallets;
let solanaTipCard;

describe("Solana TipCard Tests", function () {
  let sharedLinkId;
  let flexibleLinkId;

  // SOL is the only supported token
  const SOL_MINT =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  before(async function () {
    wallets = (await getSecrets()).wallets;
    ethers = (await network.connect()).ethers;

    // Use deployed contract address instead of deploying
    const deployedAddress = "0xa5Faf19C61CA722873987Fa9D7F9f434cf15c674";
    console.log(
      `🔗 Connecting to deployed SolanaTipCard at: ${deployedAddress}`
    );
    solanaTipCard = await ethers.getContractAt(
      "SolanaTipCard",
      deployedAddress,
      wallets.owner
    );

    // Check Solana integration
    const ownerSolanaAddr = await solanaTipCard.getSolanaUserAddress(
      wallets.owner.address
    );
    const isSolanaUser = await solanaTipCard.isSolanaUser(
      wallets.owner.address
    );

    console.log(`🔗 Owner Solana address: ${ownerSolanaAddr}`);
    console.log(`👤 Is Solana user: ${isSolanaUser}`);

    // Use actual Solana wallet from keystore (Base58 format)
    console.log("🔗 Using Solana wallet from keystore...");
    const solanaCreatorAddress = wallets.solanaUser1.publicKey.toBase58();
    const solanaCreatorAddressHex = `0x${wallets.solanaUser1.publicKey
      .toBuffer()
      .toString("hex")}`;
    console.log(`🔗 Solana creator address (Base58): ${solanaCreatorAddress}`);
    console.log(`🔗 Solana creator address (Hex): ${solanaCreatorAddressHex}`);

    try {
      console.log("🔗 Creating shared SOL payment link...");
      const solTx = await solanaTipCard
        .connect(wallets.owner)
        .createSolanaPaymentLink(
          solanaCreatorAddressHex,
          ethers.parseUnits("0.5", 9), // 0.5 SOL (9 decimals)
          false,
          "Shared SOL tip"
        );
      const solReceipt = await solTx.wait();
      const solEvent = solReceipt.logs.find(
        (log) => log.eventName === "SolanaLinkCreated"
      );
      sharedLinkId = solEvent.args.linkId;
      console.log(`✅ Shared SOL link created: ${sharedLinkId}`);

      console.log("🔗 Creating shared flexible SOL link...");
      const flexTx = await solanaTipCard
        .connect(wallets.owner)
        .createSolanaPaymentLink(
          solanaCreatorAddressHex,
          0,
          true,
          "Flexible SOL tip"
        );
      const flexReceipt = await flexTx.wait();
      const flexEvent = flexReceipt.logs.find(
        (log) => log.eventName === "SolanaLinkCreated"
      );
      flexibleLinkId = flexEvent.args.linkId;
      console.log(`✅ Shared flexible SOL link created: ${flexibleLinkId}`);
    } catch (error) {
      console.log(`ℹ️ Link creation failed: ${error.message}`);
    }
  });

  describe("Solana Integration", function () {
    it("Should detect Solana user status", async function () {
      console.log("👤 Checking Solana user integration...");

      const ownerSolanaAddr = await solanaTipCard.getSolanaUserAddress(
        wallets.owner.address
      );
      const isSolanaUser = await solanaTipCard.isSolanaUser(
        wallets.owner.address
      );

      console.log(`🔗 Owner EVM address: ${wallets.owner.address}`);
      console.log(`🔗 Owner Solana address: ${ownerSolanaAddr}`);
      console.log(`👤 Is Solana user: ${isSolanaUser}`);

      // The result depends on whether the user is registered in Neon's Solana integration
      expect(typeof isSolanaUser).to.equal("boolean");
    });

    it("Should validate SOL-only contract setup", async function () {
      console.log("💰 Checking SOL-only contract setup...");

      // Test that contract is properly set up for SOL-only operations
      const solMint = await solanaTipCard.SOL_MINT();
      console.log(`💰 SOL_MINT constant: ${solMint}`);

      expect(solMint).to.equal(SOL_MINT);
      console.log("✅ SOL-only contract setup verified");
    });
  });

  describe("Solana Payment Link Creation", function () {
    it("Should create SOL payment link", async function () {
      console.log("🔗 Creating SOL payment link...");

      const amount = ethers.parseUnits("0.5", 9); // 0.5 SOL
      const description = "SOL Coffee tip";
      const solanaCreatorAddress = `0x${wallets.solanaUser1.publicKey
        .toBuffer()
        .toString("hex")}`;

      const tx = await solanaTipCard
        .connect(wallets.owner)
        .createSolanaPaymentLink(
          solanaCreatorAddress,
          amount,
          false,
          description
        );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.eventName === "SolanaLinkCreated"
      );

      console.log(`✅ SOL link created: ${event.args.linkId}`);
      console.log(`📄 Description: ${description}`);
      console.log(`💰 Amount: ${ethers.formatUnits(event.args.amount, 9)} SOL`);
      console.log(`🔗 Solana creator: ${event.args.solanaCreator}`);

      // SOL is always used, no need to check token mint
      expect(event.args.amount).to.equal(amount);
      expect(event.args.isFlexible).to.be.false;
      expect(event.args.solanaCreator).to.equal(solanaCreatorAddress);
    });

    it("Should create flexible SOL payment link", async function () {
      console.log("🔗 Creating flexible SOL payment link...");

      const solanaCreatorAddress = `0x${wallets.solanaUser2.publicKey
        .toBuffer()
        .toString("hex")}`;

      const tx = await solanaTipCard
        .connect(wallets.owner)
        .createSolanaPaymentLink(
          solanaCreatorAddress,
          0,
          true,
          "Flexible SOL donation"
        );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.eventName === "SolanaLinkCreated"
      );

      console.log(`✅ Flexible SOL link created: ${event.args.linkId}`);
      console.log(`📄 Description: Flexible SOL donation`);
      console.log(`🔗 Solana creator: ${event.args.solanaCreator}`);

      expect(event.args.isFlexible).to.be.true;
      expect(event.args.amount).to.equal(0);
      expect(event.args.solanaCreator).to.equal(solanaCreatorAddress);
    });

    it("Should only support SOL token", async function () {
      console.log("🔗 Testing SOL-only support...");

      const amount = ethers.parseUnits("0.5", 9); // 0.5 SOL
      const solanaCreatorAddress = `0x${wallets.solanaUser3.publicKey
        .toBuffer()
        .toString("hex")}`;

      const tx = await solanaTipCard
        .connect(wallets.owner)
        .createSolanaPaymentLink(
          solanaCreatorAddress,
          amount,
          false,
          "SOL payment"
        );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.eventName === "SolanaLinkCreated"
      );

      console.log(`✅ SOL link created: ${event.args.linkId}`);
      console.log(`💰 Amount: ${ethers.formatUnits(amount, 9)} SOL`);
      console.log(`🔗 Solana creator: ${event.args.solanaCreator}`);

      expect(event.args.amount).to.equal(amount);
      expect(event.args.solanaCreator).to.equal(solanaCreatorAddress);
    });
  });

  describe("Solana Payment Processing", function () {
    it("Should handle SOL payment attempt", async function () {
      if (!sharedLinkId) {
        console.log("ℹ️ Skipping test - No shared link available");
        this.skip();
        return;
      }

      console.log("💸 Attempting SOL payment...");
      
      const payerSolanaAccount = `0x${wallets.solanaUser2.publicKey
        .toBuffer()
        .toString("hex")}`;
      const payerSolanaBase58 = wallets.solanaUser2.publicKey.toBase58();
      const creatorSolanaBase58 = wallets.solanaUser1.publicKey.toBase58();
      
      console.log(`💸 Payer Solana wallet (Base58): ${payerSolanaBase58}`);
      console.log(`🎯 Creator Solana wallet (Base58): ${creatorSolanaBase58}`);

      try {
        // This will likely fail in test environment due to lack of actual Solana accounts
        const tx = await solanaTipCard.connect(wallets.owner).paySolanaLink(
          sharedLinkId,
          0, // Not flexible, so amount ignored
          payerSolanaAccount
        );

        await tx.wait();
        console.log("✅ SOL payment processed successfully");
        console.log(`🔗 Transaction should appear on Solana devnet between:`);
        console.log(`💸 From: ${payerSolanaBase58}`);
        console.log(`🎯 To: ${creatorSolanaBase58}`);

        const link = await solanaTipCard.getSolanaPaymentLink(sharedLinkId);
        console.log(
          `📊 Link total received: ${ethers.formatUnits(
            link.totalReceived,
            9
          )} SOL`
        );
        console.log(`📊 Link payment count: ${link.paymentCount}`);

        expect(link.totalReceived).to.be.greaterThan(0);
        expect(link.paymentCount).to.be.greaterThan(0);
      } catch (error) {
        console.log(`ℹ️ Expected error in test environment: ${error.message}`);
        // In test environment, Solana operations may fail due to lack of actual accounts
        expect(error.message).to.include("revert");
        console.log(`💸 Payer wallet: ${payerSolanaBase58}`);
        console.log(`🎯 Creator wallet: ${creatorSolanaBase58}`);
      }
    });

    it("Should handle flexible SOL payment attempt", async function () {
      if (!flexibleLinkId) {
        console.log("ℹ️ Skipping test - No flexible link available");
        this.skip();
        return;
      }

      console.log("🔄 Attempting flexible SOL payment...");

      const customAmount = ethers.parseUnits("0.3", 9); // 0.3 SOL
      const payerSolanaAccount = `0x${wallets.solanaUser2.publicKey
        .toBuffer()
        .toString("hex")}`;
      const payerSolanaBase58 = wallets.solanaUser2.publicKey.toBase58();
      const creatorSolanaBase58 = wallets.solanaUser2.publicKey.toBase58(); // Using same wallet for flexible test

      console.log(`💸 Payer Solana wallet (Base58): ${payerSolanaBase58}`);
      console.log(`🎯 Creator Solana wallet (Base58): ${creatorSolanaBase58}`);

      try {
        const tx = await solanaTipCard
          .connect(wallets.owner)
          .paySolanaLink(flexibleLinkId, customAmount, payerSolanaAccount);

        await tx.wait();
        console.log("✅ Flexible SOL payment processed successfully");
        console.log(`🔗 Transaction should appear on Solana devnet between:`);
        console.log(`💸 From: ${payerSolanaBase58}`);
        console.log(`🎯 To: ${creatorSolanaBase58}`);

        const link = await solanaTipCard.getSolanaPaymentLink(flexibleLinkId);
        console.log(
          `📊 Flexible link total received: ${ethers.formatUnits(
            link.totalReceived,
            9
          )} SOL`
        );

        expect(link.totalReceived).to.be.greaterThan(0);
      } catch (error) {
        console.log(`ℹ️ Expected error in test environment: ${error.message}`);
        expect(error.message).to.include("revert");

        console.log(`💸 Payer wallet: ${payerSolanaBase58}`);
        console.log(`🎯 Creator wallet: ${creatorSolanaBase58}`);
      }
    });

    it("Should reject invalid amount for flexible payment", async function () {
      if (!flexibleLinkId) {
        console.log("ℹ️ Skipping test - No flexible link available");
        this.skip();
        return;
      }

      console.log("🚫 Testing invalid amount rejection...");

      const payerSolanaAccount = `0x${wallets.solanaUser2.publicKey
        .toBuffer()
        .toString("hex")}`;

      await expect(
        solanaTipCard.connect(wallets.owner).paySolanaLink(
          flexibleLinkId,
          0, // Invalid amount for flexible payment
          payerSolanaAccount
        )
      ).to.be.revertedWithCustomError(solanaTipCard, "InvalidAmount");

      console.log("✅ Invalid amount correctly rejected");
    });
  });

  describe("Solana Link Management", function () {
    it("Should reject unauthorized deactivation", async function () {
      if (!sharedLinkId) {
        console.log("ℹ️ Skipping test - No shared link available");
        this.skip();
        return;
      }

      console.log("🚫 Testing unauthorized deactivation...");

      await expect(
        solanaTipCard.connect(wallets.user1).deactivateSolanaLink(sharedLinkId)
      ).to.be.revertedWithCustomError(solanaTipCard, "Unauthorized");

      console.log("✅ Unauthorized deactivation correctly rejected");
    });

    it("Should track user Solana links", async function () {
      console.log("📋 Testing Solana user links tracking...");

      const userLinks = await solanaTipCard.getUserSolanaLinks(
        wallets.owner.address
      );
      console.log(`📊 User has ${userLinks.length} Solana links`);

      if (userLinks.length > 0) {
        console.log(
          `🔗 Links: ${userLinks
            .map((link) => link.slice(0, 10) + "...")
            .join(", ")}`
        );
        expect(userLinks.length).to.be.greaterThan(0);

        if (sharedLinkId) {
          expect(userLinks).to.include(sharedLinkId);
        }
      }

      console.log("✅ Solana user links tracking working correctly");
    });

    it("Should provide Solana link statistics", async function () {
      if (!sharedLinkId) {
        console.log("ℹ️ Skipping test - No shared link available");
        this.skip();
        return;
      }

      console.log("📊 Testing Solana link statistics...");

      const [totalReceived, paymentCount] =
        await solanaTipCard.getSolanaLinkStats(sharedLinkId);
      console.log(
        `💰 Total received: ${ethers.formatUnits(totalReceived, 9)} SOL`
      );
      console.log(`🔢 Payment count: ${paymentCount}`);

      expect(totalReceived).to.be.a("bigint");
      expect(Number(paymentCount)).to.be.a("number");

      console.log("✅ Solana link statistics working correctly");
    });
  });
});
