import hre from "hardhat"
import { getSecrets } from "../neon-secrets.js";

async function main() {
    const { wallets } = await getSecrets()
    const ethers = (await hre.network.connect()).ethers
    
    console.log("🚀 Deploying SolanaTipCard contract with Neon composability...");
    console.log(`📍 Network: ${hre.network.name}`);
    console.log(`👤 Deployer: ${wallets.owner.address}`);
    
    // Check deployer balance
    const balance = await ethers.provider.getBalance(wallets.owner.address);
    console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} NEON`);
    
    if (balance < ethers.parseEther("0.1")) {
        console.log("⚠️ Warning: Low balance for deployment");
    }
    
    // Deploy SolanaTipCard
    const SolanaTipCardFactory = await ethers.getContractFactory("SolanaTipCard", wallets.owner);
    const solanaTipCard = await SolanaTipCardFactory.deploy();
    
    await solanaTipCard.waitForDeployment();
    const contractAddress = await solanaTipCard.getAddress();
    
    console.log(`✅ SolanaTipCard deployed at: ${contractAddress}`);
    
    // Test Neon composability integration
    console.log("\n🔗 Testing Neon composability integration...");
    
    try {
        // Test Solana user detection
        const deployerSolanaAddr = await solanaTipCard.getSolanaUserAddress(wallets.owner.address);
        const isSolanaUser = await solanaTipCard.isSolanaUser(wallets.owner.address);
        
        console.log(`🔗 Deployer Solana address: ${deployerSolanaAddr}`);
        console.log(`👤 Is Solana user: ${isSolanaUser}`);
        
        // Test SOL-only contract setup
        const SOL_MINT = "0x0000000000000000000000000000000000000000000000000000000000000000";
        
        try {
            const solMint = await solanaTipCard.SOL_MINT();
            console.log(`💰 SOL_MINT constant: ${solMint}`);
            console.log(`✅ SOL-only contract setup verified`);
        } catch (error) {
            console.log(`ℹ️ SOL setup check: ${error.message.split('(')[0]}`);
        }
        
        // Test precompile addresses
        const splTokenAddr = await solanaTipCard.SPLTOKEN_PROGRAM();
        const solanaNativeAddr = await solanaTipCard.SOLANA_NATIVE();
        const callSolanaAddr = await solanaTipCard.CALL_SOLANA();
        
        console.log(`🔧 SPL Token precompile: ${splTokenAddr}`);
        console.log(`🔧 Solana Native precompile: ${solanaNativeAddr}`);
        console.log(`🔧 Call Solana precompile: ${callSolanaAddr}`);
        
        console.log("\n✅ Neon composability integration working!");
        
    } catch (error) {
        console.log(`⚠️ Composability test error: ${error.message}`);
    }
    
    // Create a test payment link if user is registered
    console.log("\n🔗 Testing payment link creation...");
    
    try {
        const SOL_MINT = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const amount = ethers.parseUnits("1", 9); // 1 SOL
        const solanaCreatorAddress = `0x${wallets.solanaUser1.publicKey.toBuffer().toString('hex')}`;
        
        const tx = await solanaTipCard.connect(wallets.owner).createSolanaPaymentLink(
            solanaCreatorAddress,
            amount,
            false,
            "Test SOL payment link"
        );
        
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => log.eventName === 'SolanaLinkCreated');
        
        if (event) {
            console.log(`✅ Test payment link created: ${event.args.linkId}`);
            console.log(`💰 Amount: ${ethers.formatUnits(event.args.amount, 9)} SOL`);
            console.log(`📄 Description: ${event.args.description}`);
        }
        
    } catch (error) {
        if (error.message.includes('SolanaUserNotRegistered')) {
            console.log("ℹ️ Note: Deployer not registered as Solana user");
            console.log("ℹ️ Users need to register their Solana wallet with Neon to create links");
        } else {
            console.log(`⚠️ Payment link creation error: ${error.message}`);
        }
    }
    
    console.log("\n🎉 Deployment Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📍 Network: ${hre.network.name}`);
    console.log(`📝 Contract: SolanaTipCard`);
    console.log(`📍 Address: ${contractAddress}`);
    console.log(`⛽ Gas Used: ${await solanaTipCard.deploymentTransaction().gasUsed || 'N/A'}`);
    console.log("\n🚀 Contract Features:");
    console.log("• Direct Solana SOL transfers");
    console.log("• SOL-only support for simplicity");
    console.log("• Cross-chain EVM ↔ Solana composability");
    console.log("• Native Solana wallet integration");
    console.log("• Ultra-low fees via Neon EVM");
    console.log("\n📖 Next Steps:");
    console.log("1. Verify contract on block explorer");
    console.log("2. Set up frontend integration");
    console.log("3. Test with real Solana wallets");
    console.log("4. Register users' Solana addresses");
    console.log("\n✨ Ready for Solana ecosystem integration!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});