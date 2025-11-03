// ============================================================================
// FILE 3: bot/src/handlers/rewards/solanaManager.js
// ============================================================================

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import settings from '../../config/settings.js';
import logger from '../../config/logger.js';

class SolanaManager {
  constructor() {
    this.connection = new Connection(settings.solana.rpcUrl, 'confirmed');
    this.treasuryKeypair = null;
    this.tokenMintAddress = settings.solana.tokenMintAddress
      ? new PublicKey(settings.solana.tokenMintAddress)
      : null;
  }

  /**
   * Initialize treasury wallet from private key
   */
  initializeTreasury(privateKeyBase58) {
    try {
      // Decode base58 private key
      const privateKeyBytes = this.base58ToBytes(privateKeyBase58);
      this.treasuryKeypair = Keypair.fromSecretKey(privateKeyBytes);

      logger.info(`Treasury wallet initialized: ${this.treasuryKeypair.publicKey.toBase58()}`);
      return { success: true, publicKey: this.treasuryKeypair.publicKey.toBase58() };
    } catch (error) {
      logger.error('Error initializing treasury:', error);
      throw error;
    }
  }

  /**
   * Get treasury balance
   */
  async getTreasuryBalance() {
    try {
      if (!this.treasuryKeypair) {
        throw new Error('Treasury not initialized');
      }

      const balance = await this.connection.getBalance(this.treasuryKeypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      let tokenBalance = 0;
      if (this.tokenMintAddress) {
        tokenBalance = await this.getTokenBalance(this.treasuryKeypair.publicKey);
      }

      return {
        sol: solBalance,
        token: tokenBalance,
        publicKey: this.treasuryKeypair.publicKey.toBase58(),
      };
    } catch (error) {
      logger.error('Error getting treasury balance:', error);
      throw error;
    }
  }

  /**
   * Send SOL reward
   */
  async sendSOL(recipientAddress, amount) {
    try {
      if (!this.treasuryKeypair) {
        throw new Error('Treasury not initialized');
      }

      const recipient = new PublicKey(recipientAddress);
      const lamports = amount * LAMPORTS_PER_SOL;

      // Check treasury balance
      const balance = await this.connection.getBalance(this.treasuryKeypair.publicKey);
      if (balance < lamports) {
        throw new Error('Insufficient SOL in treasury');
      }

      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.treasuryKeypair.publicKey,
          toPubkey: recipient,
          lamports,
        })
      );

      // Send transaction
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.treasuryKeypair],
        { skipPreflight: false }
      );

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      logger.reward('sent_sol', recipientAddress, amount, 'SOL');
      logger.info(`Sent ${amount} SOL to ${recipientAddress}, tx: ${signature}`);

      return signature;
    } catch (error) {
      logger.error('Error sending SOL:', error);
      throw error;
    }
  }

  /**
   * Send SPL token reward
   */
  async sendToken(recipientAddress, amount) {
    try {
      if (!this.treasuryKeypair) {
        throw new Error('Treasury not initialized');
      }

      if (!this.tokenMintAddress) {
        throw new Error('Token mint address not configured');
      }

      const recipient = new PublicKey(recipientAddress);

      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        this.tokenMintAddress,
        this.treasuryKeypair.publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        this.tokenMintAddress,
        recipient
      );

      // Check if recipient token account exists
      const accountInfo = await this.connection.getAccountInfo(toTokenAccount);
      if (!accountInfo) {
        throw new Error('Recipient token account does not exist. User must create it first.');
      }

      // Create transfer instruction
      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          this.treasuryKeypair.publicKey,
          amount * Math.pow(10, 9), // Assuming 9 decimals
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Send transaction
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.treasuryKeypair],
        { skipPreflight: false }
      );

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      logger.reward('sent_token', recipientAddress, amount, 'TOKEN');
      logger.info(`Sent ${amount} tokens to ${recipientAddress}, tx: ${signature}`);

      return signature;
    } catch (error) {
      logger.error('Error sending token:', error);
      throw error;
    }
  }

  /**
   * Send reward (auto-detect type)
   */
  async sendReward(recipientAddress, amount, type = 'sol') {
    if (type === 'sol') {
      return this.sendSOL(recipientAddress, amount);
    } else if (type === 'token') {
      return this.sendToken(recipientAddress, amount);
    } else {
      throw new Error(`Unknown reward type: ${type}`);
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(ownerPublicKey) {
    try {
      if (!this.tokenMintAddress) return 0;

      const tokenAccount = await getAssociatedTokenAddress(
        this.tokenMintAddress,
        ownerPublicKey
      );

      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals);
    } catch (error) {
      logger.error('Error getting token balance:', error);
      return 0;
    }
  }

  /**
   * Validate Solana address
   */
  isValidAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Base58 to bytes conversion
   */
  base58ToBytes(base58) {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const bytes = [];

    for (let i = 0; i < base58.length; i++) {
      let value = alphabet.indexOf(base58[i]);
      if (value < 0) throw new Error('Invalid base58 character');

      for (let j = 0; j < bytes.length; j++) {
        value += bytes[j] * 58;
        bytes[j] = value & 0xff;
        value >>= 8;
      }

      while (value > 0) {
        bytes.push(value & 0xff);
        value >>= 8;
      }
    }

    return Uint8Array.from(bytes.reverse());
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature) {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
      });
      return tx;
    } catch (error) {
      logger.error('Error getting transaction:', error);
      return null;
    }
  }
}

// Singleton instance
const solanaManager = new SolanaManager();

export default solanaManager;