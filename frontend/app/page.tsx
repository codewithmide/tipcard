'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CreatePaymentLink } from '@/components/CreatePaymentLink'
import { MyLinks } from '@/components/MyLinks'
import { PaymentProcessor } from '@/components/PaymentProcessor'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'links' | 'pay'>('create')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-neon-400 to-neon-600 bg-clip-text text-transparent">
              TipCard
            </h1>
            <p className="text-lg text-muted-foreground">
              Create instant crypto payment links powered by Neon EVM and Solana
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Create Link
              </button>
              <button
                onClick={() => setActiveTab('links')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'links'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                My Links
              </button>
              <button
                onClick={() => setActiveTab('pay')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'pay'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Pay Link
              </button>
            </div>

            {activeTab === 'create' && <CreatePaymentLink />}
            {activeTab === 'links' && <MyLinks />}
            {activeTab === 'pay' && <PaymentProcessor />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}