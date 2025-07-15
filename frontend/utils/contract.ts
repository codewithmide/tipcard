import { ethers } from 'ethers'
import { PublicKey } from '@solana/web3.js'

// Contract ABI - only the functions we need
const SOLANA_TIPCARD_ABI = [
  "function createSolanaPaymentLink(uint64 _suggestedAmount, bool _isFlexible, string memory _description) external returns (bytes32)",
  "function getSolanaPaymentLink(bytes32 _linkId) external view returns (tuple(address evmCreator, bytes32 solanaCreator, uint64 amount, bool isFlexible, bool isActive, uint64 totalReceived, uint32 paymentCount, string description))",
  "function getUserSolanaLinks(address _user) external view returns (bytes32[] memory)",
  "function paySolanaLink(bytes32 _linkId, uint64 _amount, bytes32 _payerSolanaAccount) external",
  "function deactivateSolanaLink(bytes32 _linkId) external",
  "function getSolanaUserAddress(address _evmAddress) external view returns (bytes32)",
  "function isSolanaUser(address _evmAddress) external view returns (bool)",
  "event SolanaLinkCreated(bytes32 indexed linkId, address indexed evmCreator, bytes32 indexed solanaCreator, uint64 amount, bool isFlexible, string description)",
  "event SolanaPaymentReceived(bytes32 indexed linkId, bytes32 indexed payerSolana, bytes32 indexed recipientSolana, uint64 amount)"
]

// Replace with your deployed contract address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TIPCARD_CONTRACT_ADDRESS || '0x...' // TODO: Set this after deployment

// Neon EVM Devnet RPC
const NEON_RPC_URL = 'https://devnet.neonevm.org'

export interface PaymentLink {
  evmCreator: string
  solanaCreator: string
  amount: bigint
  isFlexible: boolean
  isActive: boolean
  totalReceived: bigint
  paymentCount: number
  description: string
}

export class SolanaTipCardContract {
  private contract: ethers.Contract
  private provider: ethers.JsonRpcProvider
  private signer?: ethers.Signer

  constructor() {
    this.provider = new ethers.JsonRpcProvider(NEON_RPC_URL)
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, SOLANA_TIPCARD_ABI, this.provider)
  }

  /**
   * Connect a wallet signer
   */
  async connectWallet(walletProvider: any): Promise<void> {
    const provider = new ethers.BrowserProvider(walletProvider)
    this.signer = await provider.getSigner()
    this.contract = this.contract.connect(this.signer)
  }

  /**
   * Create a payment link
   */
  async createPaymentLink(
    suggestedAmountSOL: number,
    isFlexible: boolean,
    description: string
  ): Promise<{ linkId: string; txHash: string }> {
    if (!this.signer) {
      throw new Error('Wallet not connected')
    }

    // Convert SOL to lamports (1 SOL = 1e9 lamports)
    const amountLamports = Math.floor(suggestedAmountSOL * 1e9)

    try {
      const tx = await this.contract.createSolanaPaymentLink(
        amountLamports,
        isFlexible,
        description
      )

      const receipt = await tx.wait()
      
      // Find the SolanaLinkCreated event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsedLog = this.contract.interface.parseLog(log)
          return parsedLog?.name === 'SolanaLinkCreated'
        } catch {
          return false
        }
      })

      if (!event) {
        throw new Error('Failed to find SolanaLinkCreated event')
      }

      const parsedEvent = this.contract.interface.parseLog(event)
      const linkId = parsedEvent?.args.linkId

      return {
        linkId,
        txHash: receipt.hash
      }
    } catch (error: any) {
      if (error.message.includes('SolanaUserNotRegistered')) {
        throw new Error('Your wallet is not registered with Neon. Please connect a Solana-compatible wallet.')
      }
      throw error
    }
  }

  /**
   * Get payment link details
   */
  async getPaymentLink(linkId: string): Promise<PaymentLink> {
    try {
      const result = await this.contract.getSolanaPaymentLink(linkId)
      
      return {
        evmCreator: result.evmCreator,
        solanaCreator: result.solanaCreator,
        amount: result.amount,
        isFlexible: result.isFlexible,
        isActive: result.isActive,
        totalReceived: result.totalReceived,
        paymentCount: Number(result.paymentCount),
        description: result.description
      }
    } catch (error) {
      throw new Error('Payment link not found or contract error')
    }
  }

  /**
   * Get user's payment links
   */
  async getUserLinks(userAddress: string): Promise<string[]> {
    try {
      return await this.contract.getUserSolanaLinks(userAddress)
    } catch (error) {
      console.error('Error getting user links:', error)
      return []
    }
  }

  /**
   * Pay a payment link
   */
  async payLink(
    linkId: string,
    amountSOL: number,
    payerSolanaPublicKey: PublicKey
  ): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Wallet not connected')
    }

    // Convert SOL to lamports
    const amountLamports = Math.floor(amountSOL * 1e9)
    
    // Convert Solana PublicKey to bytes32
    const payerSolanaBytes32 = '0x' + payerSolanaPublicKey.toBuffer().toString('hex')

    try {
      const tx = await this.contract.paySolanaLink(
        linkId,
        amountLamports,
        payerSolanaBytes32
      )

      const receipt = await tx.wait()
      
      return {
        txHash: receipt.hash
      }
    } catch (error: any) {
      if (error.message.includes('LinkNotFound')) {
        throw new Error('Payment link not found')
      }
      if (error.message.includes('LinkInactive')) {
        throw new Error('Payment link is no longer active')
      }
      if (error.message.includes('InvalidAmount')) {
        throw new Error('Invalid payment amount')
      }
      throw error
    }
  }

  /**
   * Deactivate a payment link
   */
  async deactivateLink(linkId: string): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Wallet not connected')
    }

    try {
      const tx = await this.contract.deactivateSolanaLink(linkId)
      const receipt = await tx.wait()
      
      return {
        txHash: receipt.hash
      }
    } catch (error: any) {
      if (error.message.includes('Unauthorized')) {
        throw new Error('You can only deactivate your own payment links')
      }
      throw error
    }
  }

  /**
   * Check if user is registered with Solana
   */
  async isSolanaUser(address: string): Promise<boolean> {
    try {
      return await this.contract.isSolanaUser(address)
    } catch (error) {
      return false
    }
  }

  /**
   * Get Solana address for EVM address
   */
  async getSolanaAddress(address: string): Promise<string | null> {
    try {
      const result = await this.contract.getSolanaUserAddress(address)
      return result === '0x0000000000000000000000000000000000000000000000000000000000000000' ? null : result
    } catch (error) {
      return null
    }
  }

  /**
   * Create a shareable URL for a payment link
   */
  createPaymentURL(linkId: string): string {
    return `${window.location.origin}?pay=${linkId}`
  }

  /**
   * Extract link ID from URL
   */
  static extractLinkIdFromURL(url: string): string | null {
    try {
      const urlObj = new URL(url)
      return urlObj.searchParams.get('pay')
    } catch {
      return null
    }
  }
}

// Export singleton instance
export const solanaTipCardContract = new SolanaTipCardContract()