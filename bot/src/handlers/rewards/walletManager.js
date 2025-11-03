// ============================================================================
// FILE 4: bot/src/handlers/rewards/walletManager.js
// ============================================================================

import { walletQueries, globalUserQueries } from '../../database/queries.js';
import logger from '../../config/logger.js';
import solanaManager from './solanaManager.js';

class WalletManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Set user wallet
   */
  setWallet(userId, walletAddress) {
    try {
      // Validate Solana address
      if (!solanaManager.isValidAddress(walletAddress)) {
        throw new Error('Invalid Solana wallet address');
      }

      // Ensure user exists
      globalUserQueries.upsertUser(this.db, userId, 'Unknown', '');

      // Check if wallet already exists for another user
      const existing = walletQueries.walletExists(this.db, walletAddress, userId);
      if (existing) {
        throw new Error('This wallet is already linked to another account');
      }

      // Set wallet
      walletQueries.setWallet(this.db, userId, walletAddress);

      logger.info(`Wallet set for user ${userId}: ${walletAddress}`);

      return { success: true, walletAddress };
    } catch (error) {
      logger.error('Error setting wallet:', error);
      throw error;
    }
  }

  /**
   * Get user wallet
   */
  getWallet(userId) {
    return walletQueries.getWallet(this.db, userId);
  }

  /**
   * Update user wallet
   */
  updateWallet(userId, newWalletAddress) {
    try {
      // Validate new address
      if (!solanaManager.isValidAddress(newWalletAddress)) {
        throw new Error('Invalid Solana wallet address');
      }

      // Check if new wallet already exists for another user
      const existing = walletQueries.walletExists(this.db, newWalletAddress, userId);
      if (existing) {
        throw new Error('This wallet is already linked to another account');
      }

      // Update wallet
      walletQueries.setWallet(this.db, userId, newWalletAddress);

      logger.info(`Wallet updated for user ${userId}: ${newWalletAddress}`);

      return { success: true, walletAddress: newWalletAddress };
    } catch (error) {
      logger.error('Error updating wallet:', error);
      throw error;
    }
  }

  /**
   * Remove user wallet
   */
  removeWallet(userId) {
    try {
      this.db.prepare('DELETE FROM global_wallets WHERE user_id = ?').run(userId);

      logger.info(`Wallet removed for user ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error removing wallet:', error);
      throw error;
    }
  }

  /**
   * Check if user has wallet set
   */
  hasWallet(userId) {
    const wallet = this.getWallet(userId);
    return !!wallet;
  }

  /**
   * Validate wallet address format
   */
  validateAddress(address) {
    return solanaManager.isValidAddress(address);
  }

  /**
   * Get wallet with balance
   */
  async getWalletWithBalance(userId) {
    const wallet = this.getWallet(userId);

    if (!wallet) {
      return null;
    }

    try {
      // Get SOL balance
      const connection = solanaManager.connection;
      const publicKey = new (await import('@solana/web3.js')).PublicKey(wallet.wallet_address);
      const lamports = await connection.getBalance(publicKey);
      const solBalance = lamports / 1000000000; // LAMPORTS_PER_SOL

      // Get token balance
      const tokenBalance = await solanaManager.getTokenBalance(publicKey);

      return {
        ...wallet,
        solBalance,
        tokenBalance,
      };
    } catch (error) {
      logger.error('Error getting wallet balance:', error);
      return {
        ...wallet,
        solBalance: 0,
        tokenBalance: 0,
        error: 'Failed to fetch balance',
      };
    }
  }

  /**
   * Get all wallets (admin function)
   */
  getAllWallets() {
    return this.db.prepare('SELECT * FROM global_wallets ORDER BY created_at DESC').all();
  }

  /**
   * Get wallet statistics
   */
  getWalletStats() {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total_wallets,
        COUNT(DISTINCT user_id) as unique_users
      FROM global_wallets
    `).get();

    return stats;
  }

  /**
   * Find user by wallet address
   */
  findUserByWallet(walletAddress) {
    const wallet = this.db.prepare(
      'SELECT * FROM global_wallets WHERE wallet_address = ?'
    ).get(walletAddress);

    if (!wallet) return null;

    const user = this.db.prepare(
      'SELECT * FROM global_users WHERE user_id = ?'
    ).get(wallet.user_id);

    return { wallet, user };
  }

  /**
   * Verify wallet ownership (future feature)
   */
  async verifyWalletOwnership(userId, walletAddress, signature) {
    // TODO: Implement wallet signature verification
    // This would require the user to sign a message with their private key
    // to prove ownership of the wallet

    logger.info(`Wallet verification requested for user ${userId}`);

    return {
      verified: false,
      message: 'Wallet verification not yet implemented',
    };
  }
}

export default WalletManager;