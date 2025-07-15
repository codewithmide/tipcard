'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { ethers } from 'ethers'
import { LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { CheckCircle, AlertCircle, DollarSign, User, Clock } from 'lucide-react'

const CONTRACT_ADDRESS = '0xa5Faf19C61CA722873987Fa9D7F9f434cf15c674'
const NEON_RPC_URL = 'https://devnet.neonevm.org'

const CONTRACT_ABI = [
  "function getSolanaPaymentLink(bytes32 _linkId) external view returns (tuple(address evmCreator, bytes32 solanaCreator, uint64 amount, bool isFlexible, bool isActive, uint64 totalReceived, uint32 paymentCount, string description))",
  "function paySolanaLink(bytes32 _linkId, uint64 _amount, bytes32 _payerSolanaAccount) external"
]

interface PaymentLink {
  evmCreator: string
  solanaCreator: string
  amount: string
  isFlexible: boolean
  isActive: boolean
  totalReceived: string
  paymentCount: number
  description: string
}

export const PaymentProcessor = () => {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [linkId, setLinkId] = useState('')
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Convert Solana address to bytes32 format for contract
  const solanaToBytes32 = (solanaAddress: string): string => {
    try {
      const publicKey = new PublicKey(solanaAddress)
      const publicKeyBytes = publicKey.toBytes()
      return '0x' + Buffer.from(publicKeyBytes).toString('hex')
    } catch (error) {
      throw new Error('Invalid Solana address')
    }
  }

  // Convert bytes32 back to Solana address
  const bytes32ToSolana = (bytes32: string): string => {
    try {
      const hex = bytes32.replace('0x', '')
      const publicKeyBytes = Buffer.from(hex, 'hex')
      const publicKey = new PublicKey(publicKeyBytes)
      return publicKey.toBase58()
    } catch (error) {
      return 'Invalid Address'
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const payParam = urlParams.get('pay')
    if (payParam) {
      setLinkId(payParam)
      fetchPaymentLink(payParam)
    }
  }, [])

  const fetchPaymentLink = async (id: string) => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider(NEON_RPC_URL)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      
      // Convert linkId to bytes32 format
      const linkIdBytes32 = id.startsWith('0x') ? id : '0x' + id.padStart(64, '0')
      const result = await contract.getSolanaPaymentLink(linkIdBytes32)
      
      setPaymentLink({
        evmCreator: result[0],
        solanaCreator: bytes32ToSolana(result[1]),
        amount: (Number(result[2]) / 1e9).toString(), // Convert lamports to SOL
        isFlexible: result[3],
        isActive: result[4],
        totalReceived: (Number(result[5]) / 1e9).toString(),
        paymentCount: Number(result[6]),
        description: result[7]
      })
    } catch (error) {
      console.error('Error fetching payment link:', error)
      setError('Invalid payment link or link not found')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!publicKey || !paymentLink || !linkId) return

    setIsPaying(true)
    setError(null)

    try {
      // Create Solana transaction
      const recipientPubkey = new PublicKey(paymentLink.solanaCreator)
      const amountLamports = Math.floor(parseFloat(paymentLink.amount) * LAMPORTS_PER_SOL)

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: amountLamports,
        })
      )

      // Send Solana transaction
      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'processed')

      // Process payment on Neon contract
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        await provider.send('eth_requestAccounts', [])
        const signer = await provider.getSigner()
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
        
        // Convert linkId to bytes32 format
        const linkIdBytes32 = linkId.startsWith('0x') ? linkId : '0x' + linkId.padStart(64, '0')
        const payerSolanaBytes32 = solanaToBytes32(publicKey.toBase58())
        
        const tx = await contract.paySolanaLink(
          linkIdBytes32,
          amountLamports,
          payerSolanaBytes32
        )
        await tx.wait()
      }

      setPaymentStatus('success')
    } catch (error) {
      console.error('Payment failed:', error)
      setError('Payment failed. Please try again.')
      setPaymentStatus('error')
    } finally {
      setIsPaying(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Payment Link ID
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
            placeholder="Enter payment link ID"
            className="flex-1 p-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => fetchPaymentLink(linkId)}
            disabled={!linkId || isLoading}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="font-medium text-destructive">Error</span>
          </div>
          <p className="text-destructive mt-1">{error}</p>
        </div>
      )}

      {paymentLink && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Recipient:</span>
              <span className="font-mono text-sm">{formatAddress(paymentLink.solanaCreator)}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-semibold">{paymentLink.amount} SOL</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Payments:</span>
              <span className="text-sm">{paymentLink.paymentCount} received</span>
            </div>
            
            {paymentLink.description && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Description:</p>
                <p className="text-sm">{paymentLink.description}</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            {!paymentLink.isActive ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <span className="font-medium text-destructive">Payment Link Inactive</span>
                </div>
                <p className="text-destructive mt-1">This payment link is no longer active.</p>
              </div>
            ) : !publicKey ? (
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground">Please connect your wallet to make a payment.</p>
              </div>
            ) : paymentStatus === 'success' ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-500">Payment Successful!</span>
                </div>
                <p className="text-green-500 mt-1">Your payment has been processed successfully.</p>
              </div>
            ) : (
              <button
                onClick={handlePayment}
                disabled={isPaying}
                className="w-full bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isPaying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    <span>Pay {paymentLink.amount} SOL</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}