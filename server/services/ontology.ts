/**
 * Issue #3: Ontology Merging and Isomorphic Subtree Detection
 * 
 * Implements canonical hashing and detection of isomorphic subtrees
 * across the ontology for merging opportunities.
 */

import { SubtreeHashRecord, IsomorphicGroup, Agent, Skill } from '../agents/evolution';
import * as crypto from 'crypto';

/**
 * Represents a node in the ontology tree structure
 */
export interface OntologyNode {
  id: string;
  label: string;
  type: 'agent' | 'skill' | 'quest' | 'other';
  children: OntologyNode[];
  metadata?: Record<string, any>;
}

/**
 * Configuration for subtree detection
 */
export interface SubtreeDetectionConfig {
  maxDepth: number;         // Maximum depth to consider for performance
  minChildren: number;      // Minimum children count to consider
  maxChildren: number;      // Maximum children count to consider
  includeLeafNodes: boolean; // Whether to include nodes with no children
}

/**
 * Service for detecting isomorphic subtrees in ontology structures
 */
export class OntologyService {
  private hashCache: Map<string, string> = new Map();
  private config: SubtreeDetectionConfig;

  constructor(config?: Partial<SubtreeDetectionConfig>) {
    this.config = {
      maxDepth: 5,
      minChildren: 0,
      maxChildren: 20,
      includeLeafNodes: true,
      ...config
    };
  }

  /**
   * Generate canonical hash for a subtree rooted at the given node
   * Uses stable ordering based on lexicographic sorting of child structures
   */
  generateSubtreeHash(node: OntologyNode, currentDepth: number = 0): string {
    const cacheKey = `${node.id}:${currentDepth}`;
    
    if (this.hashCache.has(cacheKey)) {
      return this.hashCache.get(cacheKey)!;
    }

    // Stop recursion at max depth or if node exceeds size limits
    if (currentDepth >= this.config.maxDepth || 
        node.children.length > this.config.maxChildren) {
      const leafHash = this.hashString(node.label);
      this.hashCache.set(cacheKey, leafHash);
      return leafHash;
    }

    // Skip nodes that don't meet criteria
    if (node.children.length < this.config.minChildren ||
        (!this.config.includeLeafNodes && node.children.length === 0)) {
      const leafHash = this.hashString(node.label);
      this.hashCache.set(cacheKey, leafHash);
      return leafHash;
    }

    // Normalize node label (lowercase, trim)
    const normalizedLabel = node.label.toLowerCase().trim();

    // Generate child hashes
    const childHashes = node.children.map(child => {
      const childHash = this.generateSubtreeHash(child, currentDepth + 1);
      return {
        label: child.label.toLowerCase().trim(),
        hash: childHash
      };
    });

    // Sort children by label for stable ordering
    childHashes.sort((a, b) => a.label.localeCompare(b.label));

    // Create subtree signature
    const childHashString = childHashes.map(ch => `${ch.label}:${ch.hash}`).join('|');
    const subtreeSignature = `${normalizedLabel}[${childHashString}]`;

    // Generate hash
    const hash = this.hashString(subtreeSignature);
    this.hashCache.set(cacheKey, hash);

    return hash;
  }

  /**
   * Create a SubtreeHashRecord for a given node
   */
  createSubtreeHashRecord(node: OntologyNode): SubtreeHashRecord {
    const hash = this.generateSubtreeHash(node);
    
    return {
      id: this.generateId(),
      nodeId: node.id,
      hash,
      depth: this.calculateDepth(node),
      childrenCount: node.children.length,
      metadata: {
        nodeLabel: node.label,
        childrenLabels: node.children.map(child => child.label).sort(),
        generatedAt: new Date()
      }
    };
  }

  /**
   * Detect isomorphic subtrees from a collection of hash records
   */
  detectIsomorphicGroups(hashRecords: SubtreeHashRecord[]): IsomorphicGroup[] {
    // Group records by hash
    const hashGroups = new Map<string, SubtreeHashRecord[]>();
    
    for (const record of hashRecords) {
      if (!hashGroups.has(record.hash)) {
        hashGroups.set(record.hash, []);
      }
      hashGroups.get(record.hash)!.push(record);
    }

    // Convert groups with multiple nodes to IsomorphicGroup objects
    const isomorphicGroups: IsomorphicGroup[] = [];
    
    for (const [hash, records] of hashGroups.entries()) {
      if (records.length > 1) { // Only groups with multiple nodes are isomorphic
        const group: IsomorphicGroup = {
          id: this.generateId(),
          hash,
          nodeIds: records.map(r => r.nodeId),
          depth: Math.max(...records.map(r => r.depth)),
          confidence: this.calculateConfidence(records),
          detectedAt: new Date(),
          reviewed: false
        };
        
        isomorphicGroups.push(group);
      }
    }

    // Sort by confidence (highest first)
    return isomorphicGroups.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Build ontology tree from agents and skills
   */
  buildOntologyFromAgents(agents: Agent[]): OntologyNode[] {
    const ontologyNodes: OntologyNode[] = [];

    for (const agent of agents) {
      // Create skill nodes for this agent
      const skillNodes: OntologyNode[] = Array.from(agent.skills.values()).map(skill => ({
        id: skill.id,
        label: skill.name,
        type: 'skill' as const,
        children: [],
        metadata: {
          description: skill.description,
          category: skill.category,
          level: skill.level
        }
      }));

      // Group skills by category
      const categoryGroups = new Map<string, OntologyNode[]>();
      for (const skillNode of skillNodes) {
        const category = skillNode.metadata?.category || 'general';
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, []);
        }
        categoryGroups.get(category)!.push(skillNode);
      }

      // Create category nodes
      const categoryNodes: OntologyNode[] = Array.from(categoryGroups.entries()).map(([category, skills]) => ({
        id: `${agent.id}_${category}`,
        label: category,
        type: 'other' as const,
        children: skills,
        metadata: { type: 'skill_category' }
      }));

      // Create agent node
      const agentNode: OntologyNode = {
        id: agent.id,
        label: agent.name,
        type: 'agent',
        children: categoryNodes,
        metadata: {
          type: agent.type,
          level: agent.level,
          totalXP: agent.totalXP
        }
      };

      ontologyNodes.push(agentNode);
    }

    return ontologyNodes;
  }

  /**
   * Batch process multiple nodes to generate hash records
   */
  batchGenerateHashRecords(nodes: OntologyNode[]): SubtreeHashRecord[] {
    const records: SubtreeHashRecord[] = [];
    
    for (const node of nodes) {
      try {
        const record = this.createSubtreeHashRecord(node);
        records.push(record);
        
        // Also process children recursively
        const childRecords = this.batchGenerateHashRecords(node.children);
        records.push(...childRecords);
      } catch (error) {
        console.error(`Failed to generate hash for node ${node.id}:`, error);
      }
    }

    return records;
  }

  /**
   * Find potential merge candidates for a given node
   */
  findMergeCandidates(
    targetNodeId: string,
    hashRecords: SubtreeHashRecord[],
    isomorphicGroups: IsomorphicGroup[]
  ): Array<{
    groupId: string;
    candidateNodeIds: string[];
    confidence: number;
    reason: string;
  }> {
    const candidates: Array<{
      groupId: string;
      candidateNodeIds: string[];
      confidence: number;
      reason: string;
    }> = [];

    for (const group of isomorphicGroups) {
      if (group.nodeIds.includes(targetNodeId)) {
        const otherNodeIds = group.nodeIds.filter(id => id !== targetNodeId);
        
        if (otherNodeIds.length > 0) {
          candidates.push({
            groupId: group.id,
            candidateNodeIds: otherNodeIds,
            confidence: group.confidence,
            reason: `Isomorphic subtree structure (${group.nodeIds.length} total nodes)`
          });
        }
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Clear hash cache (useful for memory management)
   */
  clearCache(): void {
    this.hashCache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SubtreeDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.clearCache(); // Clear cache when config changes
  }

  /**
   * Generate statistics about the ontology structure
   */
  generateOntologyStats(nodes: OntologyNode[]): {
    totalNodes: number;
    maxDepth: number;
    avgChildren: number;
    nodesByType: Record<string, number>;
  } {
    let totalNodes = 0;
    let maxDepth = 0;
    let totalChildren = 0;
    const nodesByType: Record<string, number> = {};

    const traverse = (node: OntologyNode, depth: number) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, depth);
      totalChildren += node.children.length;
      
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    };

    for (const node of nodes) {
      traverse(node, 0);
    }

    return {
      totalNodes,
      maxDepth,
      avgChildren: totalNodes > 0 ? totalChildren / totalNodes : 0,
      nodesByType
    };
  }

  private hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  private calculateDepth(node: OntologyNode): number {
    if (node.children.length === 0) {
      return 0;
    }
    
    return 1 + Math.max(...node.children.map(child => this.calculateDepth(child)));
  }

  private calculateConfidence(records: SubtreeHashRecord[]): number {
    // Confidence based on:
    // 1. Number of matching nodes (more = higher confidence)
    // 2. Complexity of the structure (deeper/more children = higher confidence)
    // 3. Label similarity (more descriptive labels = higher confidence)
    
    const baseConfidence = Math.min(records.length / 10, 0.5); // 0-0.5 based on count
    const complexityBonus = Math.min(
      (records.reduce((sum, r) => sum + r.depth + r.childrenCount, 0) / records.length) / 20, 
      0.3
    ); // 0-0.3 based on complexity
    
    const labelQuality = records.reduce((sum, r) => {
      // Longer, more descriptive labels get higher scores
      return sum + Math.min(r.metadata.nodeLabel.length / 20, 0.2);
    }, 0) / records.length; // 0-0.2 based on label quality

    return Math.min(baseConfidence + complexityBonus + labelQuality, 1.0);
  }

  private generateId(): string {
    return `onto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create ontology service with default configuration
 */
export function createOntologyService(config?: Partial<SubtreeDetectionConfig>): OntologyService {
  return new OntologyService(config);
}