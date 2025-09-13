'use client';
import { useState, useEffect } from 'react';

interface IsomorphicGroup {
  id: string;
  hash: string;
  nodeIds: string[];
  depth: number;
  confidence: number;
  detectedAt: string;
  reviewed?: boolean;
}

interface IsomorphicCandidatesData {
  totalNodes: number;
  isomorphicGroups: IsomorphicGroup[];
  detectedAt: string;
}

interface IsomorphicCandidatesProps {
  isVisible: boolean;
  onToggle: () => void;
  onNodeSelect?: (nodeId: string) => void;
}

export function IsomorphicCandidates({ isVisible, onToggle, onNodeSelect }: IsomorphicCandidatesProps) {
  const [candidates, setCandidates] = useState<IsomorphicCandidatesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Fetch isomorphic candidates
  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/ontology/isomorphic-candidates');
      if (!response.ok) {
        throw new Error('Failed to fetch isomorphic candidates');
      }
      
      const data = await response.json();
      setCandidates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCandidates(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      fetchCandidates();
    }
  }, [isVisible]);

  const handleNodeClick = (nodeId: string) => {
    onNodeSelect?.(nodeId);
  };

  const handleMergeApproval = async (groupId: string, approved: boolean) => {
    // In a real implementation, this would send approval to the server
    console.log(`Merge ${approved ? 'approved' : 'rejected'} for group:`, groupId);
    
    // For demo purposes, just show an alert
    const group = candidates?.isomorphicGroups.find(g => g.id === groupId);
    if (group) {
      alert(
        `Merge ${approved ? 'approved' : 'rejected'} for ${group.nodeIds.length} isomorphic nodes ` +
        `(confidence: ${(group.confidence * 100).toFixed(1)}%)`
      );
    }
    
    // Refresh candidates
    fetchCandidates();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    if (confidence >= 0.4) return '#FFC107';
    return '#F44336';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 120,
      right: 430,
      width: '400px',
      maxHeight: '500px',
      background: 'rgba(0,0,0,0.9)',
      border: '1px solid #333',
      borderRadius: '8px',
      color: 'white',
      fontFamily: 'sans-serif',
      fontSize: '14px',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 152, 0, 0.8)',
        padding: '12px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Isomorphic Candidates</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={fetchCandidates}
            disabled={loading}
            style={{
              padding: '4px 8px',
              background: '#444',
              border: '1px solid #666',
              color: 'white',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            {loading ? '...' : '🔄'}
          </button>
          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px', maxHeight: '420px', overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#ccc' }}>
            Detecting isomorphic structures...
          </div>
        )}

        {error && (
          <div style={{ 
            color: '#ff6b6b', 
            textAlign: 'center', 
            padding: '20px',
            background: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 107, 107, 0.3)'
          }}>
            Error: {error}
          </div>
        )}

        {candidates && !loading && (
          <>
            {/* Stats */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #444',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '12px',
              fontSize: '12px'
            }}>
              <div><strong>Total Nodes Analyzed:</strong> {candidates.totalNodes}</div>
              <div><strong>Isomorphic Groups Found:</strong> {candidates.isomorphicGroups.length}</div>
              <div><strong>Last Detection:</strong> {new Date(candidates.detectedAt).toLocaleString()}</div>
            </div>

            {/* Groups */}
            {candidates.isomorphicGroups.length === 0 ? (
              <div style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
                No isomorphic structures detected.
                <br />
                <span style={{ fontSize: '12px' }}>
                  Try creating more agents with similar skill structures.
                </span>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '12px', fontSize: '12px', color: '#ccc' }}>
                  Found {candidates.isomorphicGroups.length} groups with similar structures
                </div>

                {candidates.isomorphicGroups.map((group) => (
                  <div
                    key={group.id}
                    style={{
                      background: selectedGroup === group.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
                  >
                    {/* Group Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div>
                        <strong>{group.nodeIds.length} Nodes</strong>
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#ccc' }}>
                          Depth: {group.depth}
                        </span>
                      </div>
                      <div style={{ 
                        color: getConfidenceColor(group.confidence),
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {getConfidenceLabel(group.confidence)} ({(group.confidence * 100).toFixed(1)}%)
                      </div>
                    </div>

                    {/* Hash and ID preview */}
                    <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '8px' }}>
                      Hash: <code style={{ background: '#333', padding: '2px 4px', borderRadius: '2px' }}>
                        {group.hash.substring(0, 12)}...
                      </code>
                    </div>

                    {/* Expanded view */}
                    {selectedGroup === group.id && (
                      <div style={{ borderTop: '1px solid #555', paddingTop: '8px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Nodes in this group:</strong>
                        </div>
                        
                        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                          {group.nodeIds.map((nodeId) => (
                            <div
                              key={nodeId}
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                padding: '6px',
                                marginBottom: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNodeClick(nodeId);
                              }}
                            >
                              <span>{nodeId.substring(0, 25)}...</span>
                              <span style={{ color: '#4CAF50', fontSize: '10px' }}>
                                👁️ View
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Merge Actions */}
                        <div style={{ 
                          marginTop: '12px', 
                          display: 'flex', 
                          gap: '8px',
                          borderTop: '1px solid #555',
                          paddingTop: '8px'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMergeApproval(group.id, true);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#4CAF50',
                              border: 'none',
                              color: 'white',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              flex: 1
                            }}
                          >
                            ✓ Approve Merge
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMergeApproval(group.id, false);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#F44336',
                              border: 'none',
                              color: 'white',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              flex: 1
                            }}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Button to toggle the isomorphic candidates panel
interface IsomorphicToggleProps {
  onClick: () => void;
  isVisible: boolean;
}

export function IsomorphicToggle({ onClick, isVisible }: IsomorphicToggleProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 330,
        left: 10,
        padding: '8px 12px',
        background: isVisible ? '#FF9800' : 'rgba(255, 152, 0, 0.8)',
        border: '1px solid #333',
        color: 'white',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: 1001
      }}
    >
      🔀 Isomorphic {isVisible ? '✓' : ''}
    </button>
  );
}