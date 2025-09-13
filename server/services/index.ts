/**
 * Service Integration Layer
 * 
 * Integrates all enhancement services and provides a unified API
 * for the main server to use.
 */

import { IEvolutionStorage, Agent, Skill } from '../agents/evolution';
import { EmbeddingService, createEmbeddingService } from './embedding';
import { OntologyService, createOntologyService } from './ontology';
import { QuantumService, createQuantumService } from './quantum';
import { StakingService, createStakingService } from './staking';

/**
 * Main service manager that coordinates all enhancement services
 */
export class EnhancementServices {
  public embedding: EmbeddingService;
  public ontology: OntologyService;
  public quantum: QuantumService;
  public staking: StakingService;
  private storage: IEvolutionStorage;

  constructor(storage: IEvolutionStorage) {
    this.storage = storage;
    this.embedding = createEmbeddingService();
    this.ontology = createOntologyService();
    this.quantum = createQuantumService();
    this.staking = createStakingService();
  }

  /**
   * Issue #2: Generate suggestions for a node
   */
  async generateSuggestions(
    nodeId: string,
    nodeType: 'agent' | 'skill' | 'quest' | 'other',
    topN: number = 5
  ) {
    try {
      // Get or load embedding for the target node
      let targetEmbedding = await this.storage.loadEmbedding(nodeId, nodeType);
      
      if (!targetEmbedding) {
        // Generate embedding if it doesn't exist
        const label = await this.getNodeLabel(nodeId, nodeType);
        const description = await this.getNodeDescription(nodeId, nodeType);
        
        targetEmbedding = await this.embedding.generateEmbedding(
          nodeId,
          nodeType,
          label,
          description
        );
        
        await this.storage.saveEmbedding(targetEmbedding);
      }

      // Get all embeddings
      const allEmbeddings = await this.storage.loadAllEmbeddings();
      
      // Find similar nodes
      const suggestions = await this.embedding.findSimilarNodes(
        targetEmbedding,
        allEmbeddings,
        topN
      );

      return {
        nodeId,
        suggestions,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error(`Failed to generate suggestions for ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Issue #3: Detect isomorphic candidates
   */
  async detectIsomorphicCandidates() {
    try {
      // Build ontology from current agents
      const agents = await this.storage.loadAllAgents();
      const ontologyNodes = this.ontology.buildOntologyFromAgents(agents);
      
      // Generate hash records for all nodes
      const hashRecords = this.ontology.batchGenerateHashRecords(ontologyNodes);
      
      // Save hash records
      for (const record of hashRecords) {
        await this.storage.saveSubtreeHash(record);
      }
      
      // Detect isomorphic groups
      const isomorphicGroups = this.ontology.detectIsomorphicGroups(hashRecords);
      
      // Save isomorphic groups
      for (const group of isomorphicGroups) {
        await this.storage.saveIsomorphicGroup(group);
      }

      return {
        totalNodes: hashRecords.length,
        isomorphicGroups,
        detectedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to detect isomorphic candidates:', error);
      throw error;
    }
  }

  /**
   * Issue #4: Update quantum states for nodes
   */
  async updateQuantumStates(agents: Agent[]) {
    try {
      const updates = [];

      for (const agent of agents) {
        // Calculate uncertainty based on agent data
        const similarityScores = agent.suggestedLinks?.map(link => link.similarity) || [];
        const agentAge = Math.floor((Date.now() - agent.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        
        const uncertainty = this.quantum.calculateAgentUncertainty(
          agent,
          similarityScores,
          undefined, // No staking data yet
          agentAge
        );

        updates.push({
          nodeId: agent.id,
          uncertainty
        });

        // Also update quantum states for skills
        for (const skill of agent.skills.values()) {
          const skillUncertainty = this.quantum.calculateSkillUncertainty(skill);
          updates.push({
            nodeId: skill.id,
            uncertainty: skillUncertainty
          });
        }
      }

      const quantumStates = this.quantum.batchUpdateQuantumStates(updates);

      // Save quantum states
      for (const state of quantumStates) {
        await this.storage.saveQuantumState(state);
      }

      return {
        updatedStates: quantumStates.length,
        quantumStates,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to update quantum states:', error);
      throw error;
    }
  }

  /**
   * Issue #5: Create a new stake
   */
  async createStake(
    userId: string,
    sourceNodeId: string,
    targetNodeId: string | undefined,
    linkId: string | undefined,
    amount: number,
    claimType: 'relevance' | 'link_strength' | 'accuracy' | 'quality',
    evidence?: string
  ) {
    try {
      const stake = await this.staking.createStake(
        userId,
        sourceNodeId,
        targetNodeId,
        linkId,
        amount,
        claimType,
        evidence
      );

      if (stake) {
        await this.storage.saveStake(stake);
        
        // Update user reputation
        const userReputation = await this.staking.getUserReputation(userId);
        await this.storage.saveUserReputation(userReputation);
      }

      return stake;
    } catch (error) {
      console.error('Failed to create stake:', error);
      throw error;
    }
  }

  /**
   * Batch compute embeddings for all agents and skills
   */
  async batchComputeEmbeddings() {
    try {
      const agents = await this.storage.loadAllAgents();
      const skills = await this.storage.loadAllSkills();

      const nodes = [
        ...agents.map(agent => ({
          nodeId: agent.id,
          nodeType: 'agent' as const,
          label: agent.name,
          description: `${agent.type} agent with ${agent.skills.size} skills`
        })),
        ...skills.map(skill => ({
          nodeId: skill.id,
          nodeType: 'skill' as const,
          label: skill.name,
          description: skill.description
        }))
      ];

      const embeddings = await this.embedding.batchGenerateEmbeddings(nodes);

      // Save all embeddings
      for (const embedding of embeddings) {
        await this.storage.saveEmbedding(embedding);
      }

      return {
        processedNodes: nodes.length,
        generatedEmbeddings: embeddings.length,
        processedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to batch compute embeddings:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive node status (for debugging/monitoring)
   */
  async getNodeStatus(nodeId: string) {
    try {
      const [
        agentEmbedding,
        skillEmbedding,
        subtreeHash,
        quantumState,
        stakes
      ] = await Promise.all([
        this.storage.loadEmbedding(nodeId, 'agent'),
        this.storage.loadEmbedding(nodeId, 'skill'),
        this.storage.loadSubtreeHash(nodeId),
        this.storage.loadQuantumState(nodeId),
        this.storage.loadStakesByNode(nodeId)
      ]);

      return {
        nodeId,
        embedding: agentEmbedding || skillEmbedding,
        subtreeHash,
        quantumState,
        stakes,
        stakingStats: stakes.length > 0 ? this.staking.calculateConsensus(stakes) : null,
        statusAt: new Date()
      };
    } catch (error) {
      console.error(`Failed to get node status for ${nodeId}:`, error);
      throw error;
    }
  }

  private async getNodeLabel(nodeId: string, nodeType: string): Promise<string> {
    // Try to get label from existing data
    if (nodeType === 'agent') {
      const agent = await this.storage.loadAgent(nodeId);
      return agent?.name || `Agent ${nodeId}`;
    } else if (nodeType === 'skill') {
      const skills = await this.storage.loadAllSkills();
      const skill = skills.find(s => s.id === nodeId);
      return skill?.name || `Skill ${nodeId}`;
    }
    return `Node ${nodeId}`;
  }

  private async getNodeDescription(nodeId: string, nodeType: string): Promise<string | undefined> {
    if (nodeType === 'agent') {
      const agent = await this.storage.loadAgent(nodeId);
      return agent ? `${agent.type} agent with ${agent.skills.size} skills` : undefined;
    } else if (nodeType === 'skill') {
      const skills = await this.storage.loadAllSkills();
      const skill = skills.find(s => s.id === nodeId);
      return skill?.description;
    }
    return undefined;
  }
}

// Export factory function
export function createEnhancementServices(storage: IEvolutionStorage): EnhancementServices {
  return new EnhancementServices(storage);
}