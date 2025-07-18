'use client'

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { Link, ExternalLink } from 'lucide-react'

export const Header = () => {
  const { publicKey } = useWallet()

  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-neon-400 to-neon-600 rounded-lg flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">TipCard</h1>
          </div>
          
          <div className="flex flex-col-reverse gap-2 items-center space-x-4">            
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </header>
  )
}