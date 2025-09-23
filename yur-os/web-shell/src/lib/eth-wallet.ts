/**
 * YUR Ethereum Wallet Integration - DeFi and Web3 connectivity
 */

import { ethers } from 'ethers'

export interface WalletInfo {
  address: string
  balance: string
  chainId: number
  connected: boolean
  provider?: any
}

export interface TokenInfo {
  symbol: string
  name: string
  address: string
  decimals: number
  balance: string
}

export interface TransactionRequest {
  to: string
  value?: string
  data?: string
  gasLimit?: string
  gasPrice?: string
}

export interface WalletEvents {
  connected: (wallet: WalletInfo) => void
  disconnected: () => void
  accountChanged: (address: string) => void
  chainChanged: (chainId: number) => void
  error: (error: Error) => void
}

export class YUREthWallet {
  private provider: any = null
  private signer: any = null
  private wallet: WalletInfo | null = null
  private listeners: Map<keyof WalletEvents, Function[]> = new Map()

  // Connection Management
  async connect(): Promise<WalletInfo> {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask to continue.')
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.')
      }

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum)
      this.signer = await this.provider.getSigner()

      // Get wallet info
      const address = accounts[0]
      const balance = await this.provider.getBalance(address)
      const network = await this.provider.getNetwork()

      this.wallet = {
        address,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
        connected: true,
        provider: this.provider
      }

      // Set up event listeners
      this.setupEventListeners()

      this.emit('connected', this.wallet)
      return this.wallet

    } catch (error) {
      this.emit('error', error as Error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.provider = null
    this.signer = null
    this.wallet = null
    this.emit('disconnected')
  }

  isConnected(): boolean {
    return this.wallet?.connected || false
  }

  getWallet(): WalletInfo | null {
    return this.wallet
  }

  // Balance and Token Operations
  async getBalance(address?: string): Promise<string> {
    if (!this.provider) throw new Error('Wallet not connected')
    
    const targetAddress = address || this.wallet?.address
    if (!targetAddress) throw new Error('No address provided')

    const balance = await this.provider.getBalance(targetAddress)
    return ethers.formatEther(balance)
  }

  async getTokenBalance(tokenAddress: string, userAddress?: string): Promise<string> {
    if (!this.provider) throw new Error('Wallet not connected')

    const targetAddress = userAddress || this.wallet?.address
    if (!targetAddress) throw new Error('No address provided')

    // Standard ERC-20 ABI for balanceOf function
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ]

    const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider)
    const balance = await contract.balanceOf(targetAddress)
    const decimals = await contract.decimals()
    
    return ethers.formatUnits(balance, decimals)
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    if (!this.provider) throw new Error('Wallet not connected')

    const erc20Abi = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function balanceOf(address owner) view returns (uint256)'
    ]

    const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider)
    
    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals()
    ])

    const balance = await this.getTokenBalance(tokenAddress)

    return {
      name,
      symbol,
      address: tokenAddress,
      decimals,
      balance
    }
  }

  // Transaction Operations
  async sendTransaction(request: TransactionRequest): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected')

    try {
      const tx = await this.signer.sendTransaction({
        to: request.to,
        value: request.value ? ethers.parseEther(request.value) : 0,
        data: request.data || '0x',
        gasLimit: request.gasLimit,
        gasPrice: request.gasPrice
      })

      return tx.hash
    } catch (error) {
      this.emit('error', error as Error)
      throw error
    }
  }

  async sendTokens(tokenAddress: string, to: string, amount: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected')

    const erc20Abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)'
    ]

    const contract = new ethers.Contract(tokenAddress, erc20Abi, this.signer)
    const decimals = await contract.decimals()
    const amountInUnits = ethers.parseUnits(amount, decimals)

    const tx = await contract.transfer(to, amountInUnits)
    return tx.hash
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected')
    return await this.signer.signMessage(message)
  }

  // Network Operations
  async switchNetwork(chainId: number): Promise<void> {
    if (!window.ethereum) throw new Error('MetaMask not found')

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      })
    } catch (error: any) {
      // If the chain hasn't been added to MetaMask
      if (error.code === 4902) {
        throw new Error('Network not added to wallet. Please add it manually.')
      }
      throw error
    }
  }

  // Event Management
  on<K extends keyof WalletEvents>(event: K, callback: WalletEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off<K extends keyof WalletEvents>(event: K, callback: WalletEvents[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit<K extends keyof WalletEvents>(event: K, ...args: Parameters<WalletEvents[K]>): void {
    const callbacks = this.listeners.get(event) || []
    callbacks.forEach(callback => (callback as any)(...args))
  }

  private setupEventListeners(): void {
    if (!window.ethereum) return

    // Account changed
    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnect()
      } else if (this.wallet) {
        this.wallet.address = accounts[0]
        this.emit('accountChanged', accounts[0])
      }
    })

    // Chain changed
    window.ethereum.on('chainChanged', (chainId: string) => {
      const newChainId = parseInt(chainId, 16)
      if (this.wallet) {
        this.wallet.chainId = newChainId
        this.emit('chainChanged', newChainId)
      }
    })

    // Disconnection
    window.ethereum.on('disconnect', () => {
      this.disconnect()
    })
  }
}

// Global wallet instance
export const ethWallet = new YUREthWallet()

// Network configurations
export const NETWORKS = {
  ETHEREUM: { chainId: 1, name: 'Ethereum Mainnet' },
  POLYGON: { chainId: 137, name: 'Polygon' },
  BSC: { chainId: 56, name: 'Binance Smart Chain' },
  ARBITRUM: { chainId: 42161, name: 'Arbitrum One' },
  OPTIMISM: { chainId: 10, name: 'Optimism' },
  GOERLI: { chainId: 5, name: 'Goerli Testnet' }
}

// Popular token addresses (Ethereum mainnet)
export const TOKENS = {
  USDC: '0xA0b86a33E6417c7D6D5D2DD268b252b8d36eF67e',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
}

// Utility functions
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatTokenAmount(amount: string, decimals: number = 4): string {
  const num = parseFloat(amount)
  return num.toFixed(decimals)
}

// Demo mode for development
export function createMockWallet(): WalletInfo {
  return {
    address: '0x742d35Cc6075C2532C3F2bc8f26D5B76d7d3F9f1',
    balance: '1.2345',
    chainId: 1,
    connected: true
  }
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}