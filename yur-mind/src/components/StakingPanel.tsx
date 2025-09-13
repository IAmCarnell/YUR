'use client';
import { useState, useEffect } from 'react';

interface Stake {
  id: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId?: string;
  amount: number;
  claimType: 'relevance' | 'link_strength' | 'accuracy' | 'quality';
  status: 'active' | 'slashed' | 'resolved' | 'withdrawn';
  createdAt: string;
  evidence?: string;
}

interface UserReputation {
  userId: string;
  totalStaked: number;
  totalSlashed: number;
  successfulStakes: number;
  reputation: number;
  stakes: Stake[];
  lastActivity: string;
}

interface StakeRecommendation {
  recommendedAmount: number;
  maxAllowedAmount: number;
  riskLevel: 'low' | 'medium' | 'high';
  explanation: string;
}

interface StakingPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  selectedNodeId?: string;
  currentUserId: string;
}

export function StakingPanel({ isVisible, onToggle, selectedNodeId, currentUserId }: StakingPanelProps) {
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [userReputation, setUserReputation] = useState<UserReputation | null>(null);
  const [recommendations, setRecommendations] = useState<StakeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for creating new stakes
  const [stakeForm, setStakeForm] = useState({
    amount: 0,
    claimType: 'relevance' as 'relevance' | 'link_strength' | 'accuracy' | 'quality',
    evidence: ''
  });

  // Fetch stakes for the selected node
  const fetchStakes = async (nodeId: string) => {
    if (!nodeId) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/stakes/${nodeId}`);
      if (response.ok) {
        const data = await response.json();
        setStakes(data.stakes || []);
      }
    } catch (err) {
      console.error('Failed to fetch stakes:', err);
    }
  };

  // Fetch user reputation
  const fetchUserReputation = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/users/${currentUserId}/reputation`);
      if (response.ok) {
        const data = await response.json();
        setUserReputation(data);
      }
    } catch (err) {
      console.error('Failed to fetch user reputation:', err);
    }
  };

  // Fetch stake recommendations
  const fetchRecommendations = async (nodeId: string) => {
    if (!nodeId) return;
    
    try {
      const response = await fetch(
        `http://localhost:3001/api/stakes/recommendations/${currentUserId}/${nodeId}?claimType=${stakeForm.claimType}`
      );
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
        setStakeForm(prev => ({ ...prev, amount: data.recommendedAmount }));
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
  };

  // Create a new stake
  const handleCreateStake = async () => {
    if (!selectedNodeId || stakeForm.amount <= 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          sourceNodeId: selectedNodeId,
          amount: stakeForm.amount,
          claimType: stakeForm.claimType,
          evidence: stakeForm.evidence
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create stake');
      }
      
      // Reset form and refresh data
      setStakeForm({ amount: 0, claimType: 'relevance', evidence: '' });
      await Promise.all([
        fetchStakes(selectedNodeId),
        fetchUserReputation(),
        fetchRecommendations(selectedNodeId)
      ]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch data when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId && isVisible) {
      const fetchAllData = async () => {
        // Fetch stakes for the selected node
        try {
          const stakesResponse = await fetch(`http://localhost:3001/api/stakes/${selectedNodeId}`);
          if (stakesResponse.ok) {
            const stakesData = await stakesResponse.json();
            setStakes(stakesData.stakes || []);
          }
        } catch (err) {
          console.error('Failed to fetch stakes:', err);
        }

        // Fetch user reputation
        try {
          const reputationResponse = await fetch(`http://localhost:3001/api/users/${currentUserId}/reputation`);
          if (reputationResponse.ok) {
            const reputationData = await reputationResponse.json();
            setUserReputation(reputationData);
          }
        } catch (err) {
          console.error('Failed to fetch user reputation:', err);
        }

        // Fetch stake recommendations
        try {
          const recommendationsResponse = await fetch(
            `http://localhost:3001/api/stakes/recommendations/${currentUserId}/${selectedNodeId}?claimType=${stakeForm.claimType}`
          );
          if (recommendationsResponse.ok) {
            const recommendationsData = await recommendationsResponse.json();
            setRecommendations(recommendationsData);
            setStakeForm(prev => ({ ...prev, amount: recommendationsData.recommendedAmount }));
          }
        } catch (err) {
          console.error('Failed to fetch recommendations:', err);
        }
      };

      fetchAllData();
    }
  }, [selectedNodeId, isVisible, stakeForm.claimType, currentUserId]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      default: return '#ccc';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'resolved': return '#2196F3';
      case 'slashed': return '#F44336';
      case 'withdrawn': return '#9E9E9E';
      default: return '#ccc';
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 120,
      right: 10,
      width: '400px',
      maxHeight: '600px',
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
        background: 'rgba(156, 39, 176, 0.8)',
        padding: '12px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Knowledge Staking</h3>
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

      {/* Content */}
      <div style={{ padding: '12px', maxHeight: '520px', overflowY: 'auto' }}>
        {/* User Reputation */}
        {userReputation && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #444',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '12px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Your Reputation</h4>
            <div style={{ fontSize: '12px', color: '#ccc' }}>
              <div>Reputation: <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{userReputation.reputation}</span></div>
              <div>Total Staked: {userReputation.totalStaked}</div>
              <div>Success Rate: {userReputation.stakes.length > 0 
                ? ((userReputation.successfulStakes / userReputation.stakes.length) * 100).toFixed(1)
                : 0}%</div>
            </div>
          </div>
        )}

        {!selectedNodeId && (
          <div style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
            Select a node to stake on its relevance
          </div>
        )}

        {selectedNodeId && (
          <>
            {/* Create New Stake */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #444',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '12px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Create Stake</h4>
              
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                  Claim Type:
                </label>
                <select
                  value={stakeForm.claimType}
                  onChange={(e) => setStakeForm(prev => ({ ...prev, claimType: e.target.value as 'relevance' | 'link_strength' | 'accuracy' | 'quality' }))}
                  style={{
                    width: '100%',
                    padding: '6px',
                    background: '#333',
                    border: '1px solid #555',
                    color: 'white',
                    borderRadius: '4px'
                  }}
                >
                  <option value="relevance">Relevance</option>
                  <option value="link_strength">Link Strength</option>
                  <option value="accuracy">Accuracy</option>
                  <option value="quality">Quality</option>
                </select>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                  Amount: {stakeForm.amount}
                </label>
                <input
                  type="range"
                  min="1"
                  max={recommendations?.maxAllowedAmount || 100}
                  value={stakeForm.amount}
                  onChange={(e) => setStakeForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  style={{ width: '100%' }}
                />
                {recommendations && (
                  <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>
                    Recommended: {recommendations.recommendedAmount} | 
                    Risk: <span style={{ color: getRiskColor(recommendations.riskLevel) }}>
                      {recommendations.riskLevel}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                  Evidence (optional):
                </label>
                <textarea
                  value={stakeForm.evidence}
                  onChange={(e) => setStakeForm(prev => ({ ...prev, evidence: e.target.value }))}
                  placeholder="Provide evidence for your claim..."
                  style={{
                    width: '100%',
                    height: '60px',
                    padding: '6px',
                    background: '#333',
                    border: '1px solid #555',
                    color: 'white',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {recommendations && (
                <div style={{
                  fontSize: '11px',
                  color: '#ccc',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  {recommendations.explanation}
                </div>
              )}

              <button
                onClick={handleCreateStake}
                disabled={loading || !selectedNodeId || stakeForm.amount <= 0}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: loading ? '#666' : '#9C27B0',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {loading ? 'Creating...' : `Stake ${stakeForm.amount} Points`}
              </button>

              {error && (
                <div style={{
                  color: '#ff6b6b',
                  fontSize: '12px',
                  marginTop: '8px',
                  padding: '6px',
                  background: 'rgba(255, 107, 107, 0.1)',
                  borderRadius: '4px'
                }}>
                  {error}
                </div>
              )}
            </div>

            {/* Existing Stakes */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #444',
              borderRadius: '6px',
              padding: '12px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                Existing Stakes ({stakes.length})
              </h4>
              
              {stakes.length === 0 ? (
                <div style={{ color: '#ccc', textAlign: 'center', padding: '20px', fontSize: '12px' }}>
                  No stakes on this node yet
                </div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {stakes.map((stake) => (
                    <div
                      key={stake.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        padding: '8px',
                        marginBottom: '6px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span><strong>{stake.userId.substring(0, 10)}...</strong></span>
                        <span style={{ color: getStatusColor(stake.status) }}>
                          {stake.status.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        Amount: <strong>{stake.amount}</strong> | 
                        Type: <em>{stake.claimType}</em>
                      </div>
                      {stake.evidence && (
                        <div style={{ 
                          marginTop: '4px', 
                          fontSize: '11px', 
                          color: '#ccc',
                          fontStyle: 'italic'
                        }}>
                          &quot;{stake.evidence.substring(0, 80)}...&quot;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Button to toggle the staking panel
interface StakingToggleProps {
  onClick: () => void;
  isVisible: boolean;
}

export function StakingToggle({ onClick, isVisible }: StakingToggleProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 280,
        left: 10,
        padding: '8px 12px',
        background: isVisible ? '#9C27B0' : 'rgba(156, 39, 176, 0.8)',
        border: '1px solid #333',
        color: 'white',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: 1001
      }}
    >
      💰 Staking {isVisible ? '✓' : ''}
    </button>
  );
}