# TipCard: One-Click Crypto Payment Links

**Making crypto payments as simple as sharing a link - powered by Neon EVM's Solana composability**

![SolanaTipCard Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen) ![Solana](https://img.shields.io/badge/Powered%20by-Solana-purple) ![Neon EVM](https://img.shields.io/badge/Built%20on-Neon%20EVM-orange)

## 🎯 Overview

SolanaTipCard enables users to create shareable payment links for instant SOL payments on Solana. Built with Neon EVM's composability features and Solana Native SDK, it offers ultra-low fees, actual SOL transfers, and native Solana wallet integration while providing the familiar Ethereum development experience.

### ✨ What Makes This Special

- **Real SOL Transfers**: Actual SOL debiting/crediting using Solana's SystemProgram
- **Solana Native SDK**: Direct Solana wallet integration (Phantom, Solflare)
- **Two-Step Payment**: SOL transfer + contract recording for transparency
- **Ultra-Low Fees**: ~$0.0001 per transaction on Solana
- **Cross-Chain Architecture**: EVM smart contract orchestrating Solana operations

### The Problem

- Sending crypto payments requires complex wallet addresses
- High gas fees make small payments uneconomical  
- Cross-chain payments require complicated bridging
- Poor user experience for crypto newcomers

### The Solution

SolanaTipCard makes crypto payments as simple as sharing a link:

1. **Create**: Connect Solana wallet, set amount, generate payment link
2. **Share**: Copy link and share anywhere - social media, messaging, QR codes
3. **Pay**: Recipients click link, connect Solana wallet, pay instantly with SOL

## 🚀 Quick Start

### Prerequisites

```bash
npm install
```

### Deploy Contract

```bash
npx hardhat run scripts/deploy-solana-tipcard.js --network neondevnet
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to use the application.

### Run Tests

```bash
npx hardhat test test/solana-tipcard.test.js --network neondevnet
```

## ⚡ Neon Composability Integration

### Precompiles Used

The contract leverages Neon EVM's powerful precompiles for direct Solana integration:

| Precompile | Address | Purpose |
|------------|---------|---------|
| **ISPLTokenProgram** | `0xFf00000000000000000000000000000000000004` | Direct SPL token operations |
| **ISolanaNative** | `0xfF00000000000000000000000000000000000007` | Solana address conversion & user registration |
| **ICallSolana** | `0xFF00000000000000000000000000000000000006` | Advanced Solana program calls |

### How It Works

```solidity
// Convert EVM address to Solana address automatically
bytes32 creatorSolanaAddress = SOLANA_NATIVE.solanaAddress(msg.sender);
if (creatorSolanaAddress == bytes32(0)) revert SolanaUserNotRegistered();

// Note: SOL transfers handled by frontend + contract recording
// Frontend: Actual SOL transfer via Solana SystemProgram
// Contract: Records payment metadata for tracking
```

## 📁 Project Structure

```
├── contracts/
│   ├── SolanaTipCard.sol           # Main contract with Neon composability
│   ├── precompiles/                # Neon precompile interfaces
│   │   ├── ISPLTokenProgram.sol
│   │   ├── ISolanaNative.sol
│   │   └── ICallSolana.sol
│   └── utils/                      # Helper libraries
├── frontend/                       # Next.js frontend application
│   ├── app/                        # Next.js 14 app directory
│   ├── components/                 # React components
│   │   ├── SimplePaymentLink.tsx   # Payment link creation
│   │   ├── SimplePaymentProcessor.tsx # Payment processing
│   │   └── MyLinks.tsx             # Link management
│   ├── utils/                      # Utility functions
│   │   ├── solana-native-contract.ts # Solana Native SDK integration
│   │   └── simple-wallet-signer.ts  # Wallet utilities
│   └── package.json
├── scripts/
│   └── deploy-solana-tipcard.js    # Contract deployment
├── test/
│   └── solana-tipcard.test.js      # Comprehensive tests
└── types/                          # TypeScript contract types
```

## 🛠 Smart Contract Features

### Core Functionality

- **SOL-Only Payments**: Simplified to only support native SOL for better UX
- **Flexible Amounts**: Fixed or user-determined payment amounts
- **Link Management**: Create, activate, deactivate payment links
- **Cross-Chain Architecture**: EVM contract orchestrating Solana operations
- **Real-time Updates**: Track payments and statistics
- **User Registration**: Automatic Solana user registration via Neon Native SDK

### Contract Architecture

```solidity
struct SolanaPaymentLink {
    address evmCreator;           // EVM address of creator
    bytes32 solanaCreator;        // Solana address of creator (bytes32)
    uint64 amount;                // Amount in SOL lamports
    bool isFlexible;              // Allow flexible payment amounts
    bool isActive;                // Link activation status
    uint64 totalReceived;         // Total SOL received
    uint32 paymentCount;          // Number of payments
    string description;           // Payment description
}
```

### Payment Flow Architecture

```
1. Frontend: SOL Transfer (SystemProgram.transfer)
   ├── From: Payer's Solana wallet
   ├── To: Recipient's Solana address  
   └── Amount: Payment amount in lamports

2. Contract: Payment Recording (paySolanaLink)
   ├── Updates: totalReceived, paymentCount
   ├── Emits: SolanaPaymentReceived event
   └── Validates: Link exists and is active
```

## 🖥 Frontend Application

### Features

- **Modern UI**: Next.js 14 with Tailwind CSS and custom theming
- **Solana Wallet Integration**: Solana Wallet Adapter (Phantom, Solflare)
- **Solana Native SDK**: Direct Solana transaction handling
- **Real SOL Transfers**: Actual balance changes via SystemProgram
- **Payment Management**: Create, view, and process payment links
- **Real-time Updates**: Live payment status and balance updates
- **Responsive Design**: Works on desktop and mobile

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom theme
- **Blockchain**: Ethers.js for contract interaction
- **Solana**: @solana/web3.js + Solana Wallet Adapter
- **Neon Integration**: @neonevm/solana-sign (Solana Native SDK)
- **Wallets**: Phantom, Solflare, and other Solana wallets
- **Icons**: Lucide React

### Key Components

#### `SimplePaymentLink.tsx`

- Creates payment links using Solana Native SDK
- Handles user registration with Neon EVM
- Generates shareable payment URLs

#### `SimplePaymentProcessor.tsx`

- Processes payments with two-step approach
- Performs actual SOL transfers via SystemProgram
- Records payments in smart contract for tracking

#### `MyLinks.tsx`

- Displays user's created payment links
- Shows payment statistics and history
- Allows link deactivation

## 🧪 Testing

### Comprehensive Test Suite

```bash
# Run all tests
npx hardhat test test/solana-tipcard.test.js --network neondevnet

# Test coverage includes:
✅ Contract deployment and initialization
✅ Payment link creation with SOL
✅ Solana payment processing  
✅ Link management (activate/deactivate)
✅ Error handling and validation
✅ Neon composability integration
✅ User registration flow
✅ Two-step payment verification
```

### Deployed Contract

| Network | Address |
|---------|---------|
| **Neon Devnet** | `0x388Ed79FE1A0A05fa5adC14863EB153a31E4e469` |

## 💡 Usage Examples

### Creating Payment Links

```typescript
// Initialize Solana Native SDK
await solanaNativeContract.initWithSolanaWallet(wallet.adapter);

// Create fixed SOL payment link
const result = await solanaNativeContract.createPaymentLink(
    5.0,                    // 5 SOL
    false,                  // Fixed amount
    "Coffee tip"
);

console.log('Link ID:', result.linkId);
console.log('Transaction:', result.txHash);

// Create flexible payment link
const flexibleResult = await solanaNativeContract.createPaymentLink(
    1.0,                    // Suggested amount
    true,                   // Flexible
    "Support our project"
);
```

### Processing Payments

```typescript
// Pay a payment link (two-step process)
const paymentResult = await solanaNativeContract.payLink(
    linkId,                 // Payment link ID
    10.0                    // Amount in SOL
);

console.log('SOL Transfer:', paymentResult.transferSignature);
console.log('Contract Record:', paymentResult.txHash);
```

### Managing Links

```typescript
// Get payment link details
const linkData = await solanaNativeContract.getPaymentLink(linkId);

// Get user's links
const userLinks = await solanaNativeContract.getUserLinks(userEVMAddress);

// Deactivate a link
await solanaNativeContract.deactivateLink(linkId);
```

## 🎯 Use Cases

### Content Creators

- **Social Media Tips**: Share payment links on Twitter, Discord
- **Live Stream Donations**: QR codes for instant viewer tips
- **Content Monetization**: Direct supporter payments

### Businesses

- **Service Tips**: Restaurant, delivery, service industry
- **Freelancer Payments**: Quick invoice and payment collection
- **E-commerce**: Instant payment processing

### DeFi & Communities

- **DAO Contributions**: Member dues and donations
- **Group Expenses**: Split bills and shared costs
- **Yield Farming**: Collect management and performance fees

## ⚡ Benefits

### Ultra-Low Fees

- Solana transaction fees: ~$0.0001
- No bridging or wrapping costs
- Viable for micro-payments and tips

### Lightning Fast

- Solana's ~400ms block times
- Instant payment confirmation
- No cross-chain delays

### Real Value Transfer

- Actual SOL debiting/crediting
- Direct SystemProgram transfers
- No wrapped tokens or IOUs

### Developer Experience

- Familiar Ethereum/Solidity development
- Rich TypeScript support
- Comprehensive testing framework
- Solana Native SDK integration

### User Experience

- Simple link-based payments
- Works with any Solana wallet
- Real balance changes
- No technical knowledge required

## 🔐 Security Features

- **Input Validation**: SOL amount and address verification
- **Access Control**: Creator-only link management
- **State Management**: Proper active/inactive controls
- **Two-Step Payment**: SOL transfer + contract verification
- **Error Handling**: Custom errors with clear messages
- **Audit Trail**: Complete event logging for transparency
- **User Registration**: Automatic Solana user registration validation

## 🔧 Development Setup

### Environment Configuration

1. **Install Dependencies**:

   ```bash
   npm install
   cd frontend && npm install
   ```

2. **Configure Secrets**:

   ```bash
   # Set up Hardhat keystore (recommended)
   npx hardhat keystore set PRIVATE_KEY_OWNER
   npx hardhat keystore set PRIVATE_KEY_SOLANA
   ```

3. **Deploy Contract**:

   ```bash
   npx hardhat run scripts/deploy-solana-tipcard.js --network neondevnet
   ```

4. **Update Frontend Config**:

   ```bash
   # Update .env file with deployed contract address
   echo "NEXT_PUBLIC_TIPCARD_CONTRACT_ADDRESS=0x..." > frontend/.env
   echo "NEXT_PUBLIC_NEON_RPC_URL=https://devnet.neonevm.org" >> frontend/.env
   ```

5. **Run Frontend**:

   ```bash
   cd frontend
   npm run dev
   ```

### Neon EVM Configuration

The project is configured for Neon EVM Devnet:

```javascript
// hardhat.config.js
networks: {
  neondevnet: {
    url: "https://devnet.neonevm.org",
    accounts: [], // Uses keystore
    chainId: 245022926,
    allowUnlimitedContractSize: false,
    gasMultiplier: 2,
    maxFeePerGas: '10000000000000',
    maxPriorityFeePerGas: '5000000000000'
  }
}
```

## 🚀 Future Enhancements

### Planned Features

- **Multi-token Support**: Extend beyond SOL to SPL tokens
- **Subscription Payments**: Recurring payment links
- **Analytics Dashboard**: Payment insights and reporting
- **Mobile App**: React Native version
- **API Integration**: REST API for external integrations
- **Bulk Payments**: Pay multiple links at once

### Integration Opportunities

- **Social Platforms**: Twitter/Discord bot integration
- **E-commerce**: Shopify/WooCommerce plugins
- **Payment Processors**: Stripe-like API
- **DeFi Protocols**: Integration with lending/yield platforms

## 🔧 Technical Architecture

### Solana Native SDK Integration

```typescript
// Initialize with Solana wallet
const proxyApi = new NeonProxyRpcApi('https://devnet.neonevm.org/sol');
const initResult = await proxyApi.init(walletPublicKey);

// Automatic user registration
const solanaUser = initResult.solanaUser;
const isRegistered = await contract.isSolanaUser(solanaUser.neonWallet);
```

### Payment Processing Flow

```
1. User clicks payment link
   ↓
2. Frontend loads link details from contract
   ↓  
3. User connects Solana wallet
   ↓
4. Frontend creates SOL transfer transaction
   ↓
5. User signs transaction with wallet
   ↓
6. SOL transfer executes on Solana
   ↓
7. Frontend calls contract to record payment
   ↓
8. Contract updates statistics and emits event
```

### Event Parsing

```typescript
// Extract events from Neon EVM transaction structure
const allNeonLogs = receipt.result.solanaTransactions
  .flatMap(tx => tx.solanaInstructions)
  .flatMap(instruction => instruction.neonLogs || []);

// Parse SolanaLinkCreated events
const parsedLog = iface.parseLog(neonLog);
if (parsedLog?.name === 'SolanaLinkCreated') {
  linkId = parsedLog.args.linkId;
}
```

## 📚 Documentation

### Smart Contract Reference

- [SolanaTipCard.sol](./contracts/SolanaTipCard.sol) - Main contract
- [Precompiles](./contracts/precompiles/) - Neon EVM interfaces
- [Test Suite](./test/solana-tipcard.test.js) - Comprehensive tests

### Frontend Documentation

- [Components](./frontend/components/) - React components
- [Utils](./frontend/utils/) - Solana Native SDK integration
- [Configuration](./frontend/.env) - Environment variables

### API Reference

#### SolanaNativeContract Class

```typescript
class SolanaNativeContract {
  // Initialize with Solana wallet
  async initWithSolanaWallet(walletAdapter: any): Promise<void>
  
  // Create payment link
  async createPaymentLink(amountSOL: number, isFlexible: boolean, description: string): Promise<{linkId: string, txHash: string}>
  
  // Process payment (two-step: SOL transfer + contract recording)
  async payLink(linkId: string, amountSOL: number): Promise<{txHash: string, transferSignature?: string}>
  
  // Get payment link details
  async getPaymentLink(linkId: string): Promise<PaymentLink>
  
  // Get user's links
  async getUserLinks(userEVMAddress: string): Promise<string[]>
  
  // Deactivate link
  async deactivateLink(linkId: string): Promise<{txHash: string}>
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Ensure SOL transfers work correctly
- Test with multiple Solana wallets

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Neon EVM Team** - For composability precompiles and Solana Native SDK
- **Solana Foundation** - For the underlying blockchain technology
- **Next.js Team** - For the incredible React framework
- **Solana Wallet Adapter** - For seamless wallet integration

---

**Built with ❤️ for the Solana ecosystem using Neon EVM's composability features**

*Making crypto payments as simple as sharing a link - with real SOL transfers.*

## 🔗 Quick Links

- [Live Demo](https://tipcard.vercel.app/)
- [Contract on Neon Explorer](https://devnet.neonscan.org/address/0x388Ed79FE1A0A05fa5adC14863EB153a31E4e469)
- [Neon EVM Documentation](https://docs.neonevm.org/)
- [Solana Documentation](https://docs.solana.com/)
