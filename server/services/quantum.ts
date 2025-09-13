/**
 * Issue #4: Quantum-Inspired UI Mode with Probability Cloud Visualization
 * 
 * Implements uncertainty models and quantum state management for
 * probability cloud visualization effects.
 */

import { QuantumState, Agent, Skill, SuggestedLink } from '../agents/evolution';

/**
 * Configuration for quantum state calculations
 */
export interface QuantumConfig {
  baseUncertainty: number;        // Base uncertainty level (0-1)
  similarityWeight: number;       // How much similarity affects uncertainty
  stakingWeight: number;         // How much staking affects uncertainty
  ageWeight: number;             // How much age affects uncertainty
  collapseThreshold: number;     // Threshold for automatic collapse
}

/**
 * Represents different types of uncertainty sources
 */
export interface UncertaintySource {
  type: 'similarity' | 'staking' | 'age' | 'consensus' | 'manual';
  value: number;    // 0-1 uncertainty contribution
  weight: number;   // Importance of this source
  metadata?: Record<string, any>;
}

/**
 * Service for managing quantum states and uncertainty calculations
 */
export class QuantumService {
  private config: QuantumConfig;
  private quantumStates: Map<string, QuantumState> = new Map();

  constructor(config?: Partial<QuantumConfig>) {
    this.config = {
      baseUncertainty: 0.3,
      similarityWeight: 0.4,
      stakingWeight: 0.3,
      ageWeight: 0.2,
      collapseThreshold: 0.1,
      ...config
    };
  }

  /**
   * Calculate uncertainty for an agent based on various factors
   */
  calculateAgentUncertainty(
    agent: Agent,
    similarityScores?: number[],
    stakingData?: { totalStaked: number; consensus: number },
    createdDaysAgo?: number
  ): number {
    const sources: UncertaintySource[] = [];

    // Base uncertainty
    sources.push({
      type: 'manual',
      value: this.config.baseUncertainty,
      weight: 1.0
    });

    // Similarity-based uncertainty (higher max similarity = lower uncertainty)
    if (similarityScores && similarityScores.length > 0) {
      const maxSimilarity = Math.max(...similarityScores);
      const similarityUncertainty = 1 - maxSimilarity; // Invert: high similarity = low uncertainty
      sources.push({
        type: 'similarity',
        value: similarityUncertainty,
        weight: this.config.similarityWeight,
        metadata: { maxSimilarity, scoreCount: similarityScores.length }
      });
    }

    // Staking-based uncertainty (more stakes and consensus = lower uncertainty)
    if (stakingData) {
      const stakingUncertainty = Math.max(0, 1 - (stakingData.consensus * Math.min(stakingData.totalStaked / 100, 1)));
      sources.push({
        type: 'staking',
        value: stakingUncertainty,
        weight: this.config.stakingWeight,
        metadata: stakingData
      });
    }

    // Age-based uncertainty (newer agents are more uncertain)
    if (createdDaysAgo !== undefined) {
      const ageUncertainty = Math.max(0, 1 - (createdDaysAgo / 30)); // 30 days to stabilize
      sources.push({
        type: 'age',
        value: ageUncertainty,
        weight: this.config.ageWeight,
        metadata: { daysAge: createdDaysAgo }
      });
    }

    return this.combineUncertaintySources(sources);
  }

  /**
   * Calculate uncertainty for a skill based on mastery and usage
   */
  calculateSkillUncertainty(
    skill: Skill,
    averageLevel?: number,
    usageFrequency?: number
  ): number {
    const sources: UncertaintySource[] = [];

    // Base uncertainty
    sources.push({
      type: 'manual',
      value: this.config.baseUncertainty,
      weight: 1.0
    });

    // Mastery-based uncertainty (higher level = lower uncertainty)
    const masteryUncertainty = Math.max(0, 1 - (skill.level / skill.maxLevel));
    sources.push({
      type: 'consensus',
      value: masteryUncertainty,
      weight: 0.5,
      metadata: { level: skill.level, maxLevel: skill.maxLevel }
    });

    // Experience-based uncertainty
    const experienceRatio = skill.totalExperience / skill.masteryThreshold;
    const experienceUncertainty = Math.max(0, 1 - Math.min(experienceRatio, 1));
    sources.push({
      type: 'consensus',
      value: experienceUncertainty,
      weight: 0.3,
      metadata: { totalXP: skill.totalExperience, masteryThreshold: skill.masteryThreshold }
    });

    // Usage frequency uncertainty (more used = more certain)
    if (usageFrequency !== undefined) {
      const usageUncertainty = Math.max(0, 1 - Math.min(usageFrequency, 1));
      sources.push({
        type: 'consensus',
        value: usageUncertainty,
        weight: 0.2,
        metadata: { usageFrequency }
      });
    }

    return this.combineUncertaintySources(sources);
  }

  /**
   * Create or update quantum state for a node
   */
  createQuantumState(
    nodeId: string,
    uncertainty: number,
    probabilityDistribution?: { [key: string]: number }
  ): QuantumState {
    const state: QuantumState = {
      nodeId,
      uncertainty: Math.max(0, Math.min(1, uncertainty)), // Clamp to 0-1
      probabilityDistribution,
      lastCollapsed: undefined,
      collapsedState: undefined
    };

    this.quantumStates.set(nodeId, state);
    return state;
  }

  /**
   * Collapse quantum state (user interaction)
   */
  collapseQuantumState(
    nodeId: string,
    resolvedState: any,
    animationDuration: number = 1000
  ): QuantumState | null {
    const state = this.quantumStates.get(nodeId);
    if (!state) {
      return null;
    }

    // Update state with collapsed information
    const collapsedState: QuantumState = {
      ...state,
      uncertainty: Math.max(this.config.collapseThreshold, state.uncertainty * 0.1), // Dramatically reduce uncertainty
      collapsedState: resolvedState,
      lastCollapsed: new Date()
    };

    this.quantumStates.set(nodeId, collapsedState);
    
    // Schedule automatic uncertainty increase over time (quantum decoherence)
    setTimeout(() => {
      this.decohereQuantumState(nodeId);
    }, animationDuration * 5); // Start decoherence after animation

    return collapsedState;
  }

  /**
   * Get quantum state for a node
   */
  getQuantumState(nodeId: string): QuantumState | null {
    return this.quantumStates.get(nodeId) || null;
  }

  /**
   * Get all quantum states
   */
  getAllQuantumStates(): QuantumState[] {
    return Array.from(this.quantumStates.values());
  }

  /**
   * Calculate quantum visualization parameters for UI rendering
   */
  calculateVisualizationParams(uncertainty: number): {
    cloudRadius: number;
    opacity: number;
    particleCount: number;
    animationSpeed: number;
    colors: string[];
  } {
    // Scale visualization intensity with uncertainty
    return {
      cloudRadius: 10 + (uncertainty * 40), // 10-50px radius
      opacity: 0.2 + (uncertainty * 0.6),   // 0.2-0.8 opacity
      particleCount: Math.floor(5 + (uncertainty * 25)), // 5-30 particles
      animationSpeed: 0.5 + (uncertainty * 1.5), // 0.5-2.0 speed multiplier
      colors: this.getUncertaintyColors(uncertainty)
    };
  }

  /**
   * Batch update quantum states for multiple nodes
   */
  batchUpdateQuantumStates(
    updates: Array<{
      nodeId: string;
      uncertainty?: number;
      probabilityDistribution?: { [key: string]: number };
    }>
  ): QuantumState[] {
    const results: QuantumState[] = [];

    for (const update of updates) {
      const existingState = this.quantumStates.get(update.nodeId);
      
      if (existingState) {
        const updatedState: QuantumState = {
          ...existingState,
          uncertainty: update.uncertainty !== undefined ? update.uncertainty : existingState.uncertainty,
          probabilityDistribution: update.probabilityDistribution || existingState.probabilityDistribution
        };
        
        this.quantumStates.set(update.nodeId, updatedState);
        results.push(updatedState);
      } else if (update.uncertainty !== undefined) {
        const newState = this.createQuantumState(
          update.nodeId,
          update.uncertainty,
          update.probabilityDistribution
        );
        results.push(newState);
      }
    }

    return results;
  }

  /**
   * Calculate entanglement between nodes based on relationships
   */
  calculateEntanglement(
    nodeId1: string,
    nodeId2: string,
    relationship: {
      type: 'collaboration' | 'similarity' | 'hierarchy' | 'dependency';
      strength: number; // 0-1
    }
  ): number {
    const state1 = this.quantumStates.get(nodeId1);
    const state2 = this.quantumStates.get(nodeId2);

    if (!state1 || !state2) {
      return 0;
    }

    // Entanglement based on uncertainty correlation and relationship strength
    const uncertaintyCorrelation = 1 - Math.abs(state1.uncertainty - state2.uncertainty);
    const entanglement = uncertaintyCorrelation * relationship.strength;

    // Apply relationship type multipliers
    const typeMultipliers = {
      collaboration: 1.0,
      similarity: 0.8,
      hierarchy: 0.6,
      dependency: 0.9
    };

    return entanglement * typeMultipliers[relationship.type];
  }

  /**
   * Simulate quantum interference between overlapping uncertainty clouds
   */
  calculateInterference(
    states: QuantumState[],
    position: { x: number; y: number }
  ): {
    amplitude: number;
    phase: number;
    resultantUncertainty: number;
  } {
    let totalAmplitude = 0;
    let totalPhase = 0;

    for (const state of states) {
      // Simple spatial model - in real implementation, use actual positions
      const distance = Math.random() * 100; // Mock distance
      const amplitude = state.uncertainty * Math.exp(-distance / 50);
      const phase = (distance * Math.PI) / 25; // Mock phase calculation
      
      totalAmplitude += amplitude * Math.cos(phase);
      totalPhase += amplitude * Math.sin(phase);
    }

    const resultantAmplitude = Math.sqrt(totalAmplitude * totalAmplitude + totalPhase * totalPhase);
    const resultantPhase = Math.atan2(totalPhase, totalAmplitude);

    return {
      amplitude: resultantAmplitude,
      phase: resultantPhase,
      resultantUncertainty: Math.min(1, resultantAmplitude)
    };
  }

  /**
   * Clear all quantum states
   */
  clearQuantumStates(): void {
    this.quantumStates.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<QuantumConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private combineUncertaintySources(sources: UncertaintySource[]): number {
    if (sources.length === 0) {
      return this.config.baseUncertainty;
    }

    // Weighted average of uncertainty sources
    let totalWeightedUncertainty = 0;
    let totalWeight = 0;

    for (const source of sources) {
      totalWeightedUncertainty += source.value * source.weight;
      totalWeight += source.weight;
    }

    const averageUncertainty = totalWeight > 0 ? totalWeightedUncertainty / totalWeight : this.config.baseUncertainty;
    
    // Clamp to valid range
    return Math.max(0, Math.min(1, averageUncertainty));
  }

  private decohereQuantumState(nodeId: string): void {
    const state = this.quantumStates.get(nodeId);
    if (!state || !state.lastCollapsed) {
      return;
    }

    // Gradually increase uncertainty over time (quantum decoherence)
    const timeSinceCollapse = Date.now() - state.lastCollapsed.getTime();
    const decohereRate = 0.0001; // Uncertainty increase per millisecond
    const uncertaintyIncrease = timeSinceCollapse * decohereRate;

    const newUncertainty = Math.min(1, state.uncertainty + uncertaintyIncrease);
    
    const decoherentState: QuantumState = {
      ...state,
      uncertainty: newUncertainty
    };

    this.quantumStates.set(nodeId, decoherentState);
  }

  private getUncertaintyColors(uncertainty: number): string[] {
    // Color scheme based on uncertainty level
    if (uncertainty < 0.2) {
      return ['#4CAF50', '#66BB6A']; // Green - certain
    } else if (uncertainty < 0.5) {
      return ['#FF9800', '#FFB74D']; // Orange - moderate uncertainty
    } else if (uncertainty < 0.8) {
      return ['#F44336', '#EF5350']; // Red - high uncertainty
    } else {
      return ['#9C27B0', '#BA68C8']; // Purple - very uncertain
    }
  }
}

/**
 * Factory function to create quantum service with default configuration
 */
export function createQuantumService(config?: Partial<QuantumConfig>): QuantumService {
  return new QuantumService(config);
}