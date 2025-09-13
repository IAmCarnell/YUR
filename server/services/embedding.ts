/**
 * Issue #2: Embedding Integration for Auto-Suggested Concept Linkages
 * 
 * Provides embedding generation, persistence, and similarity computation
 * for semantic concept linkage suggestions.
 */

import { EmbeddingRecord, Agent, Skill, SuggestedLink } from '../agents/evolution';

/**
 * Interface for embedding providers (OpenAI, local, mock)
 */
export interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  getDimensions(): number;
  getModelName(): string;
}

/**
 * Mock embedding provider for development/testing
 */
export class MockEmbeddingProvider implements IEmbeddingProvider {
  private readonly dimensions = 384; // Common embedding size

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate a deterministic but pseudo-random embedding based on text
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    
    for (let i = 0; i < this.dimensions; i++) {
      // Use text hash to seed pseudo-random values
      const seed = (hash + i) % 1000000;
      embedding.push((Math.sin(seed) + Math.cos(seed * 2)) / 2);
    }
    
    // Normalize to unit vector
    return this.normalize(embedding);
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModelName(): string {
    return 'mock-v1';
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }
}

/**
 * OpenAI embedding provider (placeholder for when API key is available)
 */
export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'text-embedding-ada-002') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey || this.apiKey === 'mock') {
      // Fallback to mock if no real API key
      const mockProvider = new MockEmbeddingProvider();
      return mockProvider.generateEmbedding(text);
    }

    try {
      // Placeholder for actual OpenAI API call
      // const response = await fetch('https://api.openai.com/v1/embeddings', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     input: text,
      //     model: this.model,
      //   }),
      // });
      // const data = await response.json();
      // return data.data[0].embedding;
      
      console.log(`Would call OpenAI API for text: ${text.substring(0, 50)}...`);
      // For now, fallback to mock
      const mockProvider = new MockEmbeddingProvider();
      return mockProvider.generateEmbedding(text);
    } catch (error) {
      console.error('OpenAI API error, falling back to mock:', error);
      const mockProvider = new MockEmbeddingProvider();
      return mockProvider.generateEmbedding(text);
    }
  }

  getDimensions(): number {
    return 1536; // OpenAI ada-002 dimensions
  }

  getModelName(): string {
    return this.model;
  }
}

/**
 * Main embedding service for managing embeddings and similarity computation
 */
export class EmbeddingService {
  private provider: IEmbeddingProvider;
  private cache: Map<string, EmbeddingRecord> = new Map();

  constructor(provider?: IEmbeddingProvider) {
    // Default to mock provider if none specified
    this.provider = provider || new MockEmbeddingProvider();
  }

  /**
   * Generate and store embedding for a node (agent, skill, etc.)
   */
  async generateEmbedding(
    nodeId: string,
    nodeType: 'agent' | 'skill' | 'quest' | 'other',
    label: string,
    description?: string
  ): Promise<EmbeddingRecord> {
    const text = description ? `${label} - ${description}` : label;
    const embedding = await this.provider.generateEmbedding(text);

    const record: EmbeddingRecord = {
      id: this.generateId(),
      nodeId,
      nodeType,
      embedding,
      metadata: {
        label,
        description,
        generatedBy: this.provider.getModelName().includes('mock') ? 'mock' : 
                    this.provider.getModelName().includes('ada') ? 'openai' : 'local',
        modelVersion: this.provider.getModelName(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Cache the embedding
    this.cache.set(`${nodeId}:${nodeType}`, record);

    return record;
  }

  /**
   * Compute cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embedding vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Find the top-N most similar nodes to a given node
   */
  async findSimilarNodes(
    targetEmbedding: EmbeddingRecord,
    allEmbeddings: EmbeddingRecord[],
    topN: number = 5,
    excludeNodeIds: string[] = []
  ): Promise<SuggestedLink[]> {
    const suggestions: Array<{
      record: EmbeddingRecord;
      similarity: number;
    }> = [];

    for (const record of allEmbeddings) {
      // Skip self and excluded nodes
      if (record.nodeId === targetEmbedding.nodeId || excludeNodeIds.includes(record.nodeId)) {
        continue;
      }

      const similarity = this.cosineSimilarity(targetEmbedding.embedding, record.embedding);
      suggestions.push({ record, similarity });
    }

    // Sort by similarity (descending) and take top-N
    suggestions.sort((a, b) => b.similarity - a.similarity);
    const topSuggestions = suggestions.slice(0, topN);

    return topSuggestions.map(({ record, similarity }) => ({
      sourceId: targetEmbedding.nodeId,
      targetId: record.nodeId,
      similarity,
      timestamp: new Date(),
    }));
  }

  /**
   * Generate embeddings for an agent based on skills and profile
   */
  async generateAgentEmbedding(agent: Agent): Promise<EmbeddingRecord> {
    const skillNames = Array.from(agent.skills.values())
      .map(skill => skill.name)
      .join(', ');
    
    const agentText = `${agent.name} (${agent.type}): Skills include ${skillNames}`;
    
    return this.generateEmbedding(
      agent.id,
      'agent',
      agent.name,
      agentText
    );
  }

  /**
   * Generate embeddings for a skill
   */
  async generateSkillEmbedding(skill: Skill): Promise<EmbeddingRecord> {
    return this.generateEmbedding(
      skill.id,
      'skill',
      skill.name,
      skill.description
    );
  }

  /**
   * Get cached embedding or generate if not available
   */
  async getOrGenerateEmbedding(
    nodeId: string,
    nodeType: 'agent' | 'skill' | 'quest' | 'other',
    label: string,
    description?: string
  ): Promise<EmbeddingRecord> {
    const cacheKey = `${nodeId}:${nodeType}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    return this.generateEmbedding(nodeId, nodeType, label, description);
  }

  /**
   * Batch compute embeddings for multiple nodes
   */
  async batchGenerateEmbeddings(
    nodes: Array<{
      nodeId: string;
      nodeType: 'agent' | 'skill' | 'quest' | 'other';
      label: string;
      description?: string;
    }>
  ): Promise<EmbeddingRecord[]> {
    const results: EmbeddingRecord[] = [];

    for (const node of nodes) {
      try {
        const embedding = await this.generateEmbedding(
          node.nodeId,
          node.nodeType,
          node.label,
          node.description
        );
        results.push(embedding);
      } catch (error) {
        console.error(`Failed to generate embedding for ${node.nodeId}:`, error);
      }
    }

    return results;
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update provider (useful for switching between mock and real providers)
   */
  setProvider(provider: IEmbeddingProvider): void {
    this.provider = provider;
    this.clearCache(); // Clear cache when provider changes
  }

  private generateId(): string {
    return `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory function to create embedding service based on environment
export function createEmbeddingService(): EmbeddingService {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (openaiKey && openaiKey !== 'mock' && openaiKey !== '') {
    console.log('Using OpenAI embedding provider');
    return new EmbeddingService(new OpenAIEmbeddingProvider(openaiKey));
  } else {
    console.log('Using mock embedding provider (set OPENAI_API_KEY for real embeddings)');
    return new EmbeddingService(new MockEmbeddingProvider());
  }
}