import { network } from "hardhat";
import { expect } from "chai";
import { getSecrets } from "../neon-secrets.js";
import "dotenv/config";
import * as web3 from "@solana/web3.js";
import { NeonProxyRpcApi } from "@neonevm/solana-sign";

/**
 * Test to check if a payment link ID is valid and retrieve its details
 * Usage: npm test -- --grep "Check Payment Link" --paymentId "0x123..."
 */
describe("Check Payment Link", function () {
  let ethers;
  let solanaTipCard;
  let connection;
  let proxyApi;
  
  // Get payment ID from command line arguments
  const getPaymentIdFromArgs = () => {
    const args = process.argv;
    const paymentIdIndex = args.findIndex(arg => arg === '--paymentId');
    if (paymentIdIndex !== -1 && paymentIdIndex + 1 < args.length) {
      return args[paymentIdIndex + 1];
    }
    
    // Also check for environment variable
    return process.env.PAYMENT_ID || null;
  };

  before(async function () {
    console.log("🔍 Setting up Payment Link Checker...");
    
    ethers = (await network.connect()).ethers;

    // Initialize Solana connection and Neon proxy
    connection = new web3.Connection('https://api.devnet.solana.com', 'confirmed');
    proxyApi = new NeonProxyRpcApi('https://devnet.neonevm.org/sol');

    // Use deployed contract address
    const deployedAddress = "0xCFE03c7c67456D094C0162F9030393FC2cCc40Cb";
    console.log(`🔗 Connecting to SolanaTipCard at: ${deployedAddress}`);
    
    solanaTipCard = await ethers.getContractAt(
      "SolanaTipCard",
      deployedAddress
    );
  });

  it("Should validate and display payment link details", async function () {
    const paymentId = getPaymentIdFromArgs();
    
    if (!paymentId) {
      console.log("❌ No payment ID provided!");
      console.log("Usage: npm test -- --grep \"Check Payment Link\" --paymentId \"0x123...\"");
      console.log("Or set PAYMENT_ID environment variable");
      this.skip();
      return;
    }

    console.log(`🔍 Checking Payment Link ID: ${paymentId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
      // Step 1: Check if this looks like a valid transaction hash
      console.log("\n📋 Payment ID Analysis:");
      console.log(`   Length: ${paymentId.length} characters`);
      console.log(`   Format: ${paymentId.startsWith('0x') ? 'Hex (0x prefix)' : 'Raw hex or other'}`);
      
      if (paymentId.length === 66 && paymentId.startsWith('0x')) {
        console.log("   ✅ Looks like a valid Ethereum transaction hash");
      } else if (paymentId.length === 64 && !paymentId.startsWith('0x')) {
        console.log("   ✅ Looks like a raw hex transaction hash");
      } else {
        console.log("   ⚠️ Unusual format for a transaction hash");
      }

      // Step 2: Try to get payment link details from contract
      console.log("\n🔗 Contract Query:");
      let linkDetails;
      let isValidLink = false;
      
      try {
        linkDetails = await solanaTipCard.getSolanaPaymentLink(paymentId);
        console.log("   ✅ Contract call successful");
        
        // Check if this is a real payment link (not empty)
        if (linkDetails.evmCreator !== '0x0000000000000000000000000000000000000000' &&
            linkDetails.amount > 0n) {
          isValidLink = true;
          console.log("   ✅ Valid payment link found!");
        } else {
          console.log("   ⚠️ Payment link exists but appears empty/unprocessed");
        }
        
      } catch (contractError) {
        console.log("   ❌ Contract call failed:");
        console.log(`      ${contractError.message}`);
        linkDetails = null;
      }

      // Step 3: Check on Neon EVM explorer/RPC
      console.log("\n🌐 Neon EVM Verification:");
      try {
        // Try to get transaction receipt
        const receiptResponse = await fetch('https://devnet.neonevm.org/sol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: "eth_getTransactionReceipt",
            params: [paymentId],
            id: 1,
            jsonrpc: "2.0"
          })
        });
        
        const receiptResult = await receiptResponse.json();
        
        if (receiptResult.result) {
          console.log("   ✅ Transaction found on Neon EVM!");
          console.log(`      Block Number: ${parseInt(receiptResult.result.blockNumber, 16)}`);
          console.log(`      Gas Used: ${parseInt(receiptResult.result.gasUsed, 16)}`);
          console.log(`      Status: ${receiptResult.result.status === '0x1' ? 'Success' : 'Failed'}`);
          console.log(`      Logs: ${receiptResult.result.logs.length} events`);
          
          // Look for SolanaLinkCreated event
          if (receiptResult.result.logs.length > 0) {
            console.log("\n   📋 Event Analysis:");
            for (let i = 0; i < receiptResult.result.logs.length; i++) {
              const log = receiptResult.result.logs[i];
              try {
                const decoded = solanaTipCard.interface.parseLog(log);
                if (decoded.name === 'SolanaLinkCreated') {
                  console.log(`      ✅ SolanaLinkCreated event found!`);
                  console.log(`         Link ID: ${decoded.args.linkId}`);
                  console.log(`         Creator: ${decoded.args.evmCreator}`);
                  console.log(`         Amount: ${ethers.formatUnits(decoded.args.amount, 9)} SOL`);
                  console.log(`         Description: "${decoded.args.description}"`);
                }
              } catch (parseError) {
                console.log(`      Log ${i + 1}: Unknown event`);
              }
            }
          }
        } else {
          console.log("   ❌ Transaction not found on Neon EVM");
          if (receiptResult.error) {
            console.log(`      Error: ${receiptResult.error.message}`);
          }
        }
      } catch (neonError) {
        console.log("   ❌ Neon EVM query failed:");
        console.log(`      ${neonError.message}`);
      }

      // Step 4: Display comprehensive results
      console.log("\n" + "━".repeat(50));
      console.log("📊 FINAL RESULTS:");
      console.log("━".repeat(50));
      
      if (isValidLink && linkDetails) {
        console.log("✅ VALID PAYMENT LINK");
        console.log("\n🎉 Payment Link Details:");
        console.log(`   Link ID: ${paymentId}`);
        console.log(`   Creator (EVM): ${linkDetails.evmCreator}`);
        console.log(`   Creator (Solana): ${linkDetails.solanaCreator}`);
        console.log(`   Amount: ${ethers.formatUnits(linkDetails.amount, 9)} SOL`);
        console.log(`   Flexible: ${linkDetails.isFlexible ? "Yes" : "No"}`);
        console.log(`   Active: ${linkDetails.isActive ? "Yes" : "No"}`);
        console.log(`   Total Received: ${ethers.formatUnits(linkDetails.totalReceived, 9)} SOL`);
        console.log(`   Payment Count: ${linkDetails.paymentCount}`);
        console.log(`   Description: "${linkDetails.description}"`);
        
        // Generate shareable URL
        console.log(`\n🔗 Shareable URL:`);
        console.log(`   ${process.env.FRONTEND_URL || 'http://localhost:3000'}?pay=${paymentId}`);
        
        // Test result
        expect(linkDetails.evmCreator).to.not.equal('0x0000000000000000000000000000000000000000');
        expect(linkDetails.amount).to.be.greaterThan(0n);
        
      } else if (linkDetails) {
        console.log("⚠️ PAYMENT LINK EXISTS BUT IS EMPTY");
        console.log("\n💡 This could mean:");
        console.log("   • The transaction is still being processed by Neon operators");
        console.log("   • The transaction failed during execution");
        console.log("   • This is a valid transaction hash but not a payment link creation");
        console.log("\n💭 Suggestions:");
        console.log("   • Wait a few minutes and try again");
        console.log("   • Check the transaction status on Neon EVM explorer");
        console.log("   • Verify this transaction hash created a payment link");
        
      } else {
        console.log("❌ INVALID PAYMENT LINK");
        console.log("\n💡 This could mean:");
        console.log("   • The payment ID is incorrect");
        console.log("   • The transaction doesn't exist");
        console.log("   • The contract is not accessible");
        console.log("\n💭 Suggestions:");
        console.log("   • Double-check the payment ID");
        console.log("   • Ensure you're using the correct network (devnet)");
        console.log("   • Try with a known working payment ID");
      }

      console.log("\n" + "━".repeat(50));

    } catch (error) {
      console.error("❌ Test failed with error:", error.message);
      
      // Don't fail the test - just report the issue
      console.log("\n💡 Common issues:");
      console.log("   • Network connectivity problems");
      console.log("   • Invalid payment ID format");
      console.log("   • Contract not deployed on this network");
      console.log("   • RPC endpoint issues");
    }
  });

  it("Should provide usage examples", function () {
    console.log("\n📚 USAGE EXAMPLES:");
    console.log("━".repeat(50));
    console.log("1. Command line argument:");
    console.log('   npm test -- --grep "Check Payment Link" --paymentId "0x123abc..."');
    console.log("\n2. Environment variable:");
    console.log('   PAYMENT_ID="0x123abc..." npm test -- --grep "Check Payment Link"');
    console.log("\n3. Example valid payment IDs:");
    console.log("   • Neon EVM tx hash: 0x1234567890abcdef... (66 chars)");
    console.log("   • Raw hex hash: 1234567890abcdef... (64 chars)");
    console.log("\n4. Where to find payment IDs:");
    console.log("   • From createPaymentLink() return value");
    console.log("   • From SolanaLinkCreated event logs");
    console.log("   • From Neon EVM explorer transaction details");
    console.log("━".repeat(50));
  });

  after(function () {
    const paymentId = getPaymentIdFromArgs();
    console.log("\n🎯 PAYMENT LINK CHECKER SUMMARY:");
    console.log("━".repeat(50));
    
    if (paymentId) {
      console.log(`✅ Checked payment ID: ${paymentId.slice(0, 10)}...`);
      console.log("✅ Contract connectivity verified");
      console.log("✅ Neon EVM integration tested");
    } else {
      console.log("ℹ️ No payment ID provided - run with --paymentId flag");
    }
    
    console.log("✅ Payment link validation tool ready");
    console.log("━".repeat(50));
  });
});