'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { CheckCircle, AlertCircle, DollarSign, User, Clock, Zap, Send } from 'lucide-react'
import { SimpleWalletSigner } from '@/utils/simple-wallet-signer'
import { PublicKey } from '@solana/web3.js'

interface PaymentLinkData {
  creator: string
  amount: number
  isFlexible: boolean
  description: string
  timestamp: number
}

export const SimplePaymentProcessor = () => {
  const { publicKey, wallet } = useWallet()
  const [linkId, setLinkId] = useState('')
  const [paymentData, setPaymentData] = useState<PaymentLinkData | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [solBalance, setSolBalance] = useState<number>(0)

  const signer = new SimpleWalletSigner()

  // Check for payment link in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const payParam = urlParams.get('pay')
    if (payParam) {
      setLinkId(payParam)
      loadPaymentLink(payParam)
    }
  }, [])

  // Check SOL balance when wallet connects
  useEffect(() => {
    if (publicKey) {
      checkBalance()
    }
  }, [publicKey])

  const checkBalance = async () => {
    if (!publicKey) return
    
    try {
      const balance = await signer.getSOLBalance(publicKey)
      setSolBalance(balance)
    } catch (error) {
      console.error('Error checking balance:', error)
    }
  }

  const loadPaymentLink = async (id: string) => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      // Decode the payment link data
      const decoded = atob(id)
      const data: PaymentLinkData = JSON.parse(decoded)
      
      // Validate the data
      if (!data.creator) {
        throw new Error('Invalid payment link: missing creator')
      }

      // Validate creator is a valid Solana address
      try {
        new PublicKey(data.creator)
      } catch {
        throw new Error('Invalid payment link: invalid creator address')
      }

      setPaymentData(data)
      
      // If it's a fixed amount, set the custom amount
      if (!data.isFlexible) {
        setCustomAmount(data.amount.toString())
      }
      
    } catch (error) {
      console.error('Error loading payment link:', error)
      setError('Invalid payment link or link not found')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!publicKey || !paymentData || !wallet?.adapter) return

    // Determine payment amount
    let paymentAmount: number
    if (paymentData.isFlexible) {
      if (!customAmount || parseFloat(customAmount) <= 0) {
        alert('Please enter a valid amount to pay')
        return
      }
      paymentAmount = parseFloat(customAmount)
    } else {
      paymentAmount = paymentData.amount
    }

    setIsPaying(true)
    setError(null)

    try {
      // Check SOL balance first
      const { balance, hasEnough } = await signer.checkSOLBalance(publicKey)
      
      if (!hasEnough) {
        throw new Error(`Insufficient SOL balance. You have ${balance.toFixed(4)} SOL but need at least 0.001 SOL for transaction fees.`)
      }

      // Check if we have enough for the payment
      const totalNeeded = paymentAmount + 0.001 // payment + fees
      if (balance < totalNeeded) {
        throw new Error(`Insufficient SOL for payment. You have ${balance.toFixed(4)} SOL but need ${totalNeeded.toFixed(4)} SOL (including fees).`)
      }

      // Create recipient public key
      const recipientPubkey = new PublicKey(paymentData.creator)
      
      // Create and send SOL transfer
      const result = await signer.createSOLTransfer(
        wallet.adapter as any,
        publicKey,
        recipientPubkey,
        paymentAmount
      )

      if (result.success) {
        console.log('Payment successful:', result.signature)
        setPaymentStatus('success')
        
        // Update balance
        checkBalance()
        
        // Show success message
        alert(`Payment successful! Sent ${paymentAmount} SOL to ${paymentData.creator.slice(0, 8)}...${paymentData.creator.slice(-8)}`)
      }

    } catch (error) {
      console.error('Payment failed:', error)
      setError(error instanceof Error ? error.message : 'Payment failed')
      setPaymentStatus('error')
    } finally {
      setIsPaying(false)
    }
  }

  const requestAirdrop = async () => {
    if (!publicKey) return
    
    setIsLoading(true)
    try {
      const result = await signer.requestAirdrop(publicKey)
      if (result.success) {
        alert('Airdrop successful! Check your wallet balance.')
        checkBalance()
      }
    } catch (error) {
      alert(`Airdrop failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  return (
    <div className="space-y-6">
      {/* Load Payment Link */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Payment Link ID
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
            placeholder="Enter payment link ID or paste full URL"
            className="flex-1 p-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => loadPaymentLink(linkId)}
            disabled={!linkId || isLoading}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </div>

      {/* Balance Check */}
      {publicKey && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-blue-500">Your SOL Balance</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold">
                {solBalance.toFixed(4)} SOL
              </span>
              {solBalance < 0.01 && (
                <button
                  onClick={requestAirdrop}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Get Test SOL
                </button>
              )}
            </div>
          </div>
          {solBalance < 0.01 && (
            <p className="text-xs text-red-500 mt-2">
              ⚠️ You need SOL to pay for transactions and fees. Use "Get Test SOL" button for testing.
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="font-medium text-destructive">Error</span>
          </div>
          <p className="text-destructive mt-1">{error}</p>
        </div>
      )}

      {/* Payment Details */}
      {paymentData && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pay to:</span>
              <span className="font-mono text-sm">{formatAddress(paymentData.creator)}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-semibold">
                {paymentData.isFlexible ? 'Flexible' : `${paymentData.amount} SOL`}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Created:</span>
              <span className="text-sm">{new Date(paymentData.timestamp).toLocaleString()}</span>
            </div>
            
            {paymentData.description && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Description:</p>
                <p className="text-sm">{paymentData.description}</p>
              </div>
            )}
          </div>

          {/* Payment Amount Input */}
          {paymentData.isFlexible && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Amount to Pay (SOL)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount"
                  step="0.001"
                  className="w-full p-3 pl-10 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {paymentData.amount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Suggested: {paymentData.amount} SOL
                </p>
              )}
            </div>
          )}

          {/* Payment Button */}
          <div className="mt-6">
            {!publicKey ? (
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground">Please connect your wallet to make a payment.</p>
              </div>
            ) : paymentStatus === 'success' ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-500">Payment Successful!</span>
                </div>
                <p className="text-green-500 mt-1">Your payment has been sent successfully.</p>
              </div>
            ) : (
              <button
                onClick={handlePayment}
                disabled={isPaying || (!paymentData.isFlexible && paymentData.amount <= 0) || (paymentData.isFlexible && (!customAmount || parseFloat(customAmount) <= 0))}
                className="w-full bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isPaying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>
                      Pay {paymentData.isFlexible ? (customAmount ? `${customAmount} SOL` : 'Amount') : `${paymentData.amount} SOL`}
                    </span>
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