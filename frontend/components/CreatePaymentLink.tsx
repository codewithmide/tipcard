'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { ethers } from 'ethers'
import { PublicKey } from '@solana/web3.js'
import { Copy, CheckCircle, Link, DollarSign } from 'lucide-react'

const CONTRACT_ADDRESS = '0xa5Faf19C61CA722873987Fa9D7F9f434cf15c674'
const NEON_RPC_URL = 'https://devnet.neonevm.org'

const CONTRACT_ABI = [
  "function createSolanaPaymentLink(bytes32 _solanaCreator, uint64 _amount, bool _isFlexible, string memory _description) external returns (bytes32)",
  "function getSolanaPaymentLink(bytes32 _linkId) external view returns (tuple(address evmCreator, bytes32 solanaCreator, uint64 amount, bool isFlexible, bool isActive, uint64 totalReceived, uint32 paymentCount, string description))",
  "function getUserSolanaLinks(address _user) external view returns (bytes32[] memory)"
]

export const CreatePaymentLink = () => {
  const { publicKey } = useWallet()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Convert Solana address to bytes32 format for contract
  const solanaToBytes32 = (solanaAddress: string): string => {
    try {
      const publicKey = new PublicKey(solanaAddress)
      const publicKeyBytes = publicKey.toBytes()
      
      // Convert to hex string with 0x prefix (bytes32)
      return '0x' + Buffer.from(publicKeyBytes).toString('hex')
    } catch (error) {
      throw new Error('Invalid Solana address')
    }
  }

  const handleCreateLink = async () => {
    if (!publicKey || !recipient || !amount) return

    setIsLoading(true)
    try {
      // Validate and convert Solana address to bytes32 format
      const bytes32Recipient = solanaToBytes32(recipient)
      
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        await provider.send('eth_requestAccounts', [])
        const signer = await provider.getSigner()
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
        
        // Convert amount to lamports (SOL has 9 decimals)
        const amountLamports = Math.floor(parseFloat(amount) * 1e9)
        
        const tx = await contract.createSolanaPaymentLink(
          bytes32Recipient,
          amountLamports,
          false, // isFlexible - set to false for fixed amount
          description || 'Payment request'
        )
        
        const receipt = await tx.wait()
        
        // Get the link ID from the transaction receipt
        const linkId = receipt.logs[0].topics[1] // First indexed parameter is linkId
        
        const paymentLink = `${window.location.origin}?pay=${linkId}`
        setCreatedLink(paymentLink)
        
        // Reset form
        setRecipient('')
        setAmount('')
        setDescription('')
      }
    } catch (error) {
      console.error('Error creating payment link:', error)
      if (error instanceof Error && error.message === 'Invalid Solana address') {
        alert('Please enter a valid Solana address.')
      } else {
        alert('Failed to create payment link. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (createdLink) {
      await navigator.clipboard.writeText(createdLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!publicKey) {
    return (
      <div className="text-center py-8">
        <div className="bg-secondary/50 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your Solana wallet to create payment links.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter Solana address (Base58 format)"
            className="w-full p-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter a valid Solana address (e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM)
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount (SOL)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.001"
              className="w-full p-3 pl-10 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this payment for?"
          rows={3}
          className="w-full p-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <button
        onClick={handleCreateLink}
        disabled={!recipient || !amount || isLoading}
        className="w-full bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Creating Link...</span>
          </>
        ) : (
          <>
            <Link className="w-5 h-5" />
            <span>Create Payment Link</span>
          </>
        )}
      </button>

      {createdLink && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-500">Payment Link Created!</span>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono break-all">{createdLink}</span>
              <button
                onClick={copyToClipboard}
                className="ml-2 p-1 hover:bg-accent rounded"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}