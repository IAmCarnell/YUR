/**
 * Issue #5: Knowledge Staking and Slashing for Relevance Claims
 * 
 * Implements staking mechanics for relevance claims with slashing
 * and reputation management.
 */

import { Stake, UserReputation, Agent, Skill } from '../agents/evolution';

/**
 * Configuration for staking mechanics
 */
export interface StakingConfig {
  minStakeAmount: number;         // Minimum stake amount
  maxStakeAmount: number;         // Maximum stake amount
  slashingPenalty: number;        // Percentage of stake slashed (0-1)
  reputationDecay: number;        // Daily reputation decay rate
  consensusThreshold: number;     // Threshold for automatic resolution
  stakingPeriod: number;         // Staking period in milliseconds
}

/**
 * Staking validation result
 */
export interface StakeValidation {
  valid: boolean;
  reason?: string;
  suggestedAmount?: number;
}

/**
 * Consensus calculation result
 */
export interface ConsensusResult {
  support: number;              // 0-1 support ratio
  totalStaked: number;
  stakeholderCount: number;
  confidence: number;           // 0-1 confidence in consensus
  recommendedAction: 'approve' | 'reject' | 'defer';
}

/**
 * Service for managing knowledge staking and slashing mechanics
 */
export class StakingService {
  private config: StakingConfig;
  private userReputations: Map<string, UserReputation> = new Map();
  private stakes: Map<string, Stake> = new Map();

  constructor(config?: Partial<StakingConfig>) {
    this.config = {
      minStakeAmount: 1,
      maxStakeAmount: 1000,
      slashingPenalty: 0.5,
      reputationDecay: 0.01,
      consensusThreshold: 0.7,
      stakingPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      ...config
    };
  }

  /**
   * Create a new stake on a relevance claim
   */
  async createStake(
    userId: string,
    sourceNodeId: string,
    targetNodeId: string | undefined,
    linkId: string | undefined,
    amount: number,
    claimType: 'relevance' | 'link_strength' | 'accuracy' | 'quality',
    evidence?: string
  ): Promise<Stake | null> {
    // Validate stake
    const validation = await this.validateStake(userId, amount, sourceNodeId);
    if (!validation.valid) {
      console.error(`Stake validation failed: ${validation.reason}`);
      return null;
    }

    // Create stake
    const stake: Stake = {
      id: this.generateId(),
      userId,
      sourceNodeId,
      targetNodeId,
      linkId,
      amount,
      claimType,
      status: 'active',
      createdAt: new Date(),
      evidence
    };

    // Update user reputation
    await this.updateUserStakeHistory(userId, stake);

    this.stakes.set(stake.id, stake);
    return stake;
  }

  /**
   * Slash a stake for false claims
   */
  async slashStake(
    stakeId: string,
    reason: string,
    slasherUserId?: string
  ): Promise<boolean> {
    const stake = this.stakes.get(stakeId);
    if (!stake || stake.status !== 'active') {
      return false;
    }

    // Calculate slashing amount
    const slashAmount = stake.amount * this.config.slashingPenalty;

    // Update stake
    const slashedStake: Stake = {
      ...stake,
      status: 'slashed',
      resolvedAt: new Date(),
      slashReason: reason
    };

    this.stakes.set(stakeId, slashedStake);

    // Update user reputation
    await this.applySlashingPenalty(stake.userId, slashAmount);

    // If there's a slasher, reward them (future feature)
    if (slasherUserId) {
      await this.rewardSlasher(slasherUserId, slashAmount * 0.1); // 10% reward
    }

    return true;
  }

  /**
   * Resolve a stake (successful claim)
   */
  async resolveStake(stakeId: string, successful: boolean): Promise<boolean> {
    const stake = this.stakes.get(stakeId);
    if (!stake || stake.status !== 'active') {
      return false;
    }

    const resolvedStake: Stake = {
      ...stake,
      status: 'resolved',
      resolvedAt: new Date()
    };

    this.stakes.set(stakeId, resolvedStake);

    // Update user reputation based on outcome
    if (successful) {
      await this.rewardSuccessfulStake(stake.userId, stake.amount);
    } else {
      await this.applySlashingPenalty(stake.userId, stake.amount * 0.2); // Minor penalty for unsuccessful
    }

    return true;
  }

  /**
   * Get stakes for a specific node
   */
  getStakesByNode(nodeId: string): Stake[] {
    return Array.from(this.stakes.values()).filter(
      stake => stake.sourceNodeId === nodeId || stake.targetNodeId === nodeId
    );
  }

  /**
   * Get stakes by user
   */
  getStakesByUser(userId: string): Stake[] {
    return Array.from(this.stakes.values()).filter(
      stake => stake.userId === userId
    );
  }

  /**
   * Calculate consensus for a set of stakes
   */
  calculateConsensus(stakes: Stake[]): ConsensusResult {
    const activeStakes = stakes.filter(stake => stake.status === 'active');
    
    if (activeStakes.length === 0) {
      return {
        support: 0,
        totalStaked: 0,
        stakeholderCount: 0,
        confidence: 0,
        recommendedAction: 'defer'
      };
    }

    // Group stakes by claim type and calculate weighted support
    const supportingStakes = activeStakes.filter(stake => 
      stake.claimType === 'relevance' || stake.claimType === 'accuracy'
    );
    
    const opposingStakes = activeStakes.filter(stake =>
      stake.claimType === 'quality' && stake.amount < 0 // Negative stakes indicate opposition
    );

    const supportingAmount = supportingStakes.reduce((sum, stake) => sum + stake.amount, 0);
    const opposingAmount = Math.abs(opposingStakes.reduce((sum, stake) => sum + stake.amount, 0));
    const totalStaked = supportingAmount + opposingAmount;

    const support = totalStaked > 0 ? supportingAmount / totalStaked : 0;
    
    // Calculate confidence based on total amount and number of stakeholders
    const stakeholderCount = new Set(activeStakes.map(stake => stake.userId)).size;
    const amountConfidence = Math.min(totalStaked / 100, 1); // Normalize to 100 as max
    const stakeholderConfidence = Math.min(stakeholderCount / 5, 1); // Normalize to 5 as max
    const confidence = (amountConfidence + stakeholderConfidence) / 2;

    // Recommend action based on consensus threshold
    let recommendedAction: 'approve' | 'reject' | 'defer';
    if (support >= this.config.consensusThreshold && confidence > 0.5) {
      recommendedAction = 'approve';
    } else if (support <= (1 - this.config.consensusThreshold) && confidence > 0.5) {
      recommendedAction = 'reject';
    } else {
      recommendedAction = 'defer';
    }

    return {
      support,
      totalStaked,
      stakeholderCount,
      confidence,
      recommendedAction
    };
  }

  /**
   * Get or create user reputation
   */
  async getUserReputation(userId: string): Promise<UserReputation> {
    if (this.userReputations.has(userId)) {
      return this.userReputations.get(userId)!;
    }

    const reputation: UserReputation = {
      userId,
      totalStaked: 0,
      totalSlashed: 0,
      successfulStakes: 0,
      reputation: 100, // Starting reputation
      stakes: [],
      lastActivity: new Date()
    };

    this.userReputations.set(userId, reputation);
    return reputation;
  }

  /**
   * Calculate stake recommendations for a user
   */
  async getStakeRecommendations(
    userId: string,
    sourceNodeId: string,
    claimType: 'relevance' | 'link_strength' | 'accuracy' | 'quality'
  ): Promise<{
    recommendedAmount: number;
    maxAllowedAmount: number;
    riskLevel: 'low' | 'medium' | 'high';
    explanation: string;
  }> {
    const userReputation = await this.getUserReputation(userId);
    const existingStakes = this.getStakesByNode(sourceNodeId);

    // Calculate user's available staking power based on reputation
    const maxAllowedAmount = Math.min(
      this.config.maxStakeAmount,
      Math.floor(userReputation.reputation * 10) // Reputation-based limit
    );

    // Calculate recommended amount based on existing consensus
    const consensus = this.calculateConsensus(existingStakes);
    let recommendedAmount: number;
    let riskLevel: 'low' | 'medium' | 'high';
    let explanation: string;

    if (consensus.confidence > 0.8) {
      recommendedAmount = Math.min(maxAllowedAmount * 0.2, 20); // Conservative when consensus is high
      riskLevel = 'low';
      explanation = 'Strong existing consensus - small stake recommended';
    } else if (consensus.confidence > 0.4) {
      recommendedAmount = Math.min(maxAllowedAmount * 0.5, 50); // Moderate when consensus is medium
      riskLevel = 'medium';
      explanation = 'Moderate consensus - medium stake recommended';
    } else {
      recommendedAmount = Math.min(maxAllowedAmount * 0.3, 30); // Careful when no consensus
      riskLevel = 'high';
      explanation = 'No clear consensus - small stake recommended due to uncertainty';
    }

    return {
      recommendedAmount,
      maxAllowedAmount,
      riskLevel,
      explanation
    };
  }

  /**
   * Validate a stake before creation
   */
  private async validateStake(
    userId: string,
    amount: number,
    sourceNodeId: string
  ): Promise<StakeValidation> {
    // Check amount bounds
    if (amount < this.config.minStakeAmount) {
      return {
        valid: false,
        reason: `Stake amount must be at least ${this.config.minStakeAmount}`,
        suggestedAmount: this.config.minStakeAmount
      };
    }

    if (amount > this.config.maxStakeAmount) {
      return {
        valid: false,
        reason: `Stake amount cannot exceed ${this.config.maxStakeAmount}`,
        suggestedAmount: this.config.maxStakeAmount
      };
    }

    // Check user reputation and limits
    const userReputation = await this.getUserReputation(userId);
    const maxAllowed = Math.floor(userReputation.reputation * 10);
    
    if (amount > maxAllowed) {
      return {
        valid: false,
        reason: `Stake amount exceeds reputation limit of ${maxAllowed}`,
        suggestedAmount: maxAllowed
      };
    }

    // Check for duplicate active stakes (same user, same node)
    const existingStakes = this.getStakesByNode(sourceNodeId);
    const userActiveStakes = existingStakes.filter(
      stake => stake.userId === userId && stake.status === 'active'
    );

    if (userActiveStakes.length > 0) {
      return {
        valid: false,
        reason: 'User already has an active stake on this node'
      };
    }

    return { valid: true };
  }

  /**
   * Update user's stake history and reputation
   */
  private async updateUserStakeHistory(userId: string, stake: Stake): Promise<void> {
    const reputation = await this.getUserReputation(userId);
    
    reputation.stakes.push(stake);
    reputation.totalStaked += stake.amount;
    reputation.lastActivity = new Date();

    this.userReputations.set(userId, reputation);
  }

  /**
   * Apply slashing penalty to user reputation
   */
  private async applySlashingPenalty(userId: string, slashAmount: number): Promise<void> {
    const reputation = await this.getUserReputation(userId);
    
    reputation.totalSlashed += slashAmount;
    reputation.reputation = Math.max(0, reputation.reputation - (slashAmount / 10)); // Reduce reputation
    reputation.lastActivity = new Date();

    this.userReputations.set(userId, reputation);
  }

  /**
   * Reward successful stake
   */
  private async rewardSuccessfulStake(userId: string, amount: number): Promise<void> {
    const reputation = await this.getUserReputation(userId);
    
    reputation.successfulStakes += 1;
    reputation.reputation = Math.min(1000, reputation.reputation + (amount / 20)); // Increase reputation
    reputation.lastActivity = new Date();

    this.userReputations.set(userId, reputation);
  }

  /**
   * Reward user for successful slashing (whistleblowing)
   */
  private async rewardSlasher(userId: string, rewardAmount: number): Promise<void> {
    const reputation = await this.getUserReputation(userId);
    
    reputation.reputation = Math.min(1000, reputation.reputation + rewardAmount);
    reputation.lastActivity = new Date();

    this.userReputations.set(userId, reputation);
  }

  /**
   * Apply daily reputation decay
   */
  applyReputationDecay(): void {
    for (const [userId, reputation] of this.userReputations.entries()) {
      const daysSinceActivity = (Date.now() - reputation.lastActivity.getTime()) / (24 * 60 * 60 * 1000);
      
      if (daysSinceActivity > 1) {
        const decayAmount = Math.floor(daysSinceActivity) * this.config.reputationDecay * reputation.reputation;
        reputation.reputation = Math.max(1, reputation.reputation - decayAmount);
        this.userReputations.set(userId, reputation);
      }
    }
  }

  /**
   * Get staking statistics
   */
  getStakingStats(): {
    totalStakes: number;
    activeStakes: number;
    totalStakedAmount: number;
    averageStakeAmount: number;
    slashingRate: number;
    topStakers: Array<{ userId: string; reputation: number; totalStaked: number }>;
  } {
    const allStakes = Array.from(this.stakes.values());
    const activeStakes = allStakes.filter(stake => stake.status === 'active');
    const slashedStakes = allStakes.filter(stake => stake.status === 'slashed');
    
    const totalStakedAmount = allStakes.reduce((sum, stake) => sum + stake.amount, 0);
    const averageStakeAmount = allStakes.length > 0 ? totalStakedAmount / allStakes.length : 0;
    const slashingRate = allStakes.length > 0 ? slashedStakes.length / allStakes.length : 0;

    // Get top stakers by reputation
    const topStakers = Array.from(this.userReputations.values())
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, 10)
      .map(rep => ({
        userId: rep.userId,
        reputation: rep.reputation,
        totalStaked: rep.totalStaked
      }));

    return {
      totalStakes: allStakes.length,
      activeStakes: activeStakes.length,
      totalStakedAmount,
      averageStakeAmount,
      slashingRate,
      topStakers
    };
  }

  /**
   * Clear all data (useful for testing)
   */
  clearAll(): void {
    this.stakes.clear();
    this.userReputations.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<StakingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private generateId(): string {
    return `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create staking service with default configuration
 */
export function createStakingService(config?: Partial<StakingConfig>): StakingService {
  return new StakingService(config);
}