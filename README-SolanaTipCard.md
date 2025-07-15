# SolanaTipCard: One-Click Crypto Payment Links

**Making crypto payments as simple as sharing a link - powered by Neon EVM's Solana composability**

## 🎯 Overview

SolanaTipCard enables users to create shareable payment links for the Solana ecosystem. Recipients can pay instantly with SOL directly on Solana, leveraging Neon EVM's composability features for ultra-low fees and native Solana integration.

### The Problem

- Sending crypto payments is complicated
- Users need wallet addresses and worry about gas fees
- Cross-chain payments require complex bridging
- Small tips aren't economically viable due to high fees

### The Solution

SolanaTipCard makes crypto payments as simple as sharing a link:

1. **Create**: Connect Solana wallet, set amount, generate link
2. **Share**: Copy link and share anywhere - social media, messaging, QR codes
3. **Pay**: Recipients click link, connect Solana wallet, pay instantly

## ⚡ Neon Composability Integration

### Precompiles Used

| Precompile | Address | Purpose |
|------------|---------|---------|
| **ISPLTokenProgram** | `0xFf00000000000000000000000000000000000004` | Direct SPL token transfers on Solana |
| **ISolanaNative** | `0xfF00000000000000000000000000000000000007` | Solana wallet address conversion |
| **ICallSolana** | `0xFF00000000000000000000000000000000000006` | Advanced Solana program interactions |

### How Composability Works

```solidity
// Convert EVM address to Solana address
bytes32 solanaAddr = SOLANA_NATIVE.solanaAddress(evmAddress);

// Transfer SPL tokens directly on Solana
SPLTOKEN_PROGRAM.transfer(fromAccount, toAccount, amount);

// Query SPL token information
ISPLTokenProgram.Mint memory tokenInfo = SPLTOKEN_PROGRAM.getMint(mintAddress);
```

## 🚀 Smart Contract Features

### Core Functionality

- **Solana-Native**: Direct SOL transfers without bridging
- **SOL-Only Support**: Simplified to only support SOL for ease of use
- **Flexible Amounts**: Fixed or user-determined payment amounts
- **Link Management**: Create, activate, deactivate payment links
- **Cross-Chain**: EVM contract orchestrating Solana operations

### Contract Architecture

```solidity
struct SolanaPaymentLink {
    address evmCreator;           // EVM address of creator
    bytes32 solanaCreator;        // Solana address of creator
    uint64 amount;                // Amount in SOL (lamports)
    bool isFlexible;              // Flexible amount allowed
    bool isActive;                // Link active status
    uint64 totalReceived;         // Total received in SOL (lamports)
    uint32 paymentCount;          // Number of payments
    string description;           // Payment description
}
```

## 📁 Project Structure

```
contracts/
├── SolanaTipCard.sol           # Main contract with Neon composability
├── TipCard.sol                 # Original NEON-only version
├── precompiles/                # Neon precompile interfaces
│   ├── ISPLTokenProgram.sol
│   ├── ISolanaNative.sol
│   └── ICallSolana.sol
└── ...

scripts/
├── deploy-solana-tipcard.js    # Deployment with composability testing
└── deploy-tipcard.js           # Original deployment script

test/
├── solana-tipcard.test.js      # Comprehensive Solana integration tests
└── tipcard.test.js             # Original NEON token tests
```

## 🛠 Deployment

### Prerequisites

```bash
npm install
```

### Deploy to Neon Devnet

```bash
# Deploy SolanaTipCard with composability
npx hardhat run scripts/deploy-solana-tipcard.js --network neondevnet

# Deploy original TipCard (NEON only)
npx hardhat run scripts/deploy-tipcard.js --network neondevnet
```

### Deployed Contracts

| Contract | Network | Address |
|----------|---------|---------|
| **SolanaTipCard** | Neon Devnet | `0x1F37A5e75B1df05e3CBf13e593CD637952EeD7dC` |
| **TipCard** | Neon Devnet | Various test deployments |

## 🧪 Testing

### Run Solana Composability Tests

```bash
npx hardhat test mocha ./test/solana-tipcard.test.js --network neondevnet
```

### Run Original NEON Tests

```bash
npx hardhat test mocha ./test/tipcard.test.js --network neondevnet
```

### Test Results

```
✅ Solana Integration Tests
✅ Payment Link Creation Tests  
✅ Cross-Chain Functionality Tests
✅ Neon Composability Integration Tests
```

## 💡 Usage Examples

### Creating Payment Links

```javascript
// Create SOL payment link
const solanaCreatorAddress = "0x..."; // 32-byte Solana address

const linkId = await solanaTipCard.createSolanaPaymentLink(
    solanaCreatorAddress,
    ethers.parseUnits("5", 9), // 5 SOL
    false, // Fixed amount
    "Coffee tip"
);

// Create flexible SOL link
const flexibleLink = await solanaTipCard.createSolanaPaymentLink(
    solanaCreatorAddress,
    0, // No fixed amount
    true, // Flexible
    "Support our project"
);
```

### Processing Payments

```javascript
// Pay with SOL (fixed amount)
await solanaTipCard.paySolanaLink(
    linkId,
    0, // Amount (ignored for fixed links)
    payerSolanaAccount
);

// Pay flexible amount with SOL
await solanaTipCard.paySolanaLink(
    flexibleLinkId,
    ethers.parseUnits("10", 9), // 10 SOL
    payerSolanaAccount
);
```

### Query Functions

```javascript
// Get payment link details
const link = await solanaTipCard.getSolanaPaymentLink(linkId);

// Get user's links
const userLinks = await solanaTipCard.getUserSolanaLinks(userAddress);

// Get link statistics
const [totalReceived, paymentCount] = await solanaTipCard.getSolanaLinkStats(linkId);

// Get SOL balance
const solBalance = await solanaTipCard.getSOLBalance(solanaAccount);
```

## 🎯 Use Cases

### For Content Creators

- **Social Media Tips**: Share payment links on Twitter, Discord
- **Live Stream Donations**: QR codes for instant tips
- **Patreon Alternative**: Direct supporter payments

### For Businesses

- **Coffee Shop Tips**: QR codes at point of sale
- **Freelancer Payments**: Quick payment requests
- **Service Charges**: Instant payment collection

### For DeFi Users

- **Splitting Bills**: Easy group expense sharing
- **Yield Farming Fees**: Collect management fees
- **DAO Contributions**: Member payment collection

## ⚡ Benefits

### Ultra-Low Fees

- Solana transaction fees: ~$0.0001
- No bridging costs required
- Viable for micro-payments

### Lightning Fast

- Solana's 400ms finality
- No cross-chain delays
- Instant payment confirmation

### Solana Ecosystem Native

- Works with any Solana wallet
- Direct SPL token support
- No wrapped tokens needed

### Neon EVM Powered

- Smart contract orchestration
- Cross-chain compatibility
- Ethereum developer experience

## 🔧 Technical Architecture

### Composability Flow

```
Phantom Wallet User → Creates Payment Link → Smart Contract on Neon EVM
                                                ↓
                                        Calls Solana Precompiles
                                                ↓
                                        Direct SOL Transfer on Solana
                                                ↓
                                        Recipient Receives SOL
```

### Key Technical Features

1. **SOL-Only Design**: Simplified to only support native SOL transfers
2. **64-bit Amounts**: Solana-compatible `uint64` for SOL amounts in lamports
3. **Direct Transfers**: No bridging or wrapping required
4. **Event Logging**: Complete audit trail of all transactions
5. **Error Handling**: Custom errors for better UX

## 🔐 Security Features

- **Validation**: SOL amount verification
- **Authorization**: Creator-only link management
- **Balance Checks**: Sufficient SOL validation
- **State Management**: Active/inactive link controls
- **Audit Trail**: Complete transaction logging

## 🚀 Future Enhancements

### Phase 2 Features

- **Multi-Signature Links**: Require multiple approvals
- **Subscription Payments**: Recurring payment links
- **NFT Integration**: Token-gated payment links
- **Analytics Dashboard**: Payment tracking and insights

### Integration Opportunities

- **Wallet Integrations**: Direct Phantom/Solflare support
- **Social Platforms**: Twitter/Discord bot integration
- **E-commerce**: Shopify/WooCommerce plugins
- **Mobile Apps**: React Native SDK

## 📚 Documentation

### Smart Contract Docs

- [SolanaTipCard.sol](./contracts/SolanaTipCard.sol) - Main composability contract
- [ISPLTokenProgram.sol](./contracts/precompiles/ISPLTokenProgram.sol) - SPL token interface
- [ISolanaNative.sol](./contracts/precompiles/ISolanaNative.sol) - Solana native interface

### Test Documentation

- [solana-tipcard.test.js](./test/solana-tipcard.test.js) - Comprehensive test suite
- Coverage includes: Integration, payments, management, error handling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Neon EVM Team** - For composability precompiles and infrastructure
- **Solana Foundation** - For the underlying blockchain technology
- **OpenZeppelin** - For smart contract security patterns

---

**Built with ❤️ for the Solana ecosystem using Neon EVM's composability features**

*Making crypto payments as simple as sharing a photo.*
