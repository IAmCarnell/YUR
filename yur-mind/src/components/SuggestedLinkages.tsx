'use client';
import { useState, useEffect } from 'react';

interface SuggestedLink {
  sourceId: string;
  targetId: string;
  similarity: number;
  timestamp: string;
}

interface Suggestion {
  nodeId: string;
  suggestions: SuggestedLink[];
  generatedAt: string;
}

interface SuggestedLinkagesProps {
  isVisible: boolean;
  onToggle: () => void;
  selectedNodeId?: string;
}

export function SuggestedLinkages({ isVisible, onToggle, selectedNodeId }: SuggestedLinkagesProps) {
  const [suggestions, setSuggestions] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggestions for the selected node
  const fetchSuggestions = async (nodeId: string) => {
    if (!nodeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3001/api/suggestions/${nodeId}?nodeType=agent&topN=5`);
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSuggestions(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId && isVisible) {
      fetchSuggestions(selectedNodeId);
    }
  }, [selectedNodeId, isVisible]);

  // Handle accepting a linkage suggestion
  const handleAcceptLinkage = async (suggestion: SuggestedLink) => {
    try {
      // In a real implementation, this would create the linkage
      console.log('Accepting linkage:', suggestion);
      
      // For demo purposes, just show an alert
      alert(`Linkage accepted between ${suggestion.sourceId} and ${suggestion.targetId} (similarity: ${(suggestion.similarity * 100).toFixed(1)}%)`);
      
      // Refresh suggestions
      if (selectedNodeId) {
        fetchSuggestions(selectedNodeId);
      }
    } catch (err) {
      console.error('Failed to accept linkage:', err);
    }
  };

  const handleRejectLinkage = (suggestion: SuggestedLink) => {
    // In a real implementation, this would mark the suggestion as rejected
    console.log('Rejecting linkage:', suggestion);
    alert(`Linkage rejected between ${suggestion.sourceId} and ${suggestion.targetId}`);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 300,
      left: 10,
      width: '350px',
      maxHeight: '400px',
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
        background: 'rgba(74, 144, 226, 0.8)',
        padding: '12px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Suggested Linkages</h3>
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
      <div style={{ padding: '12px', maxHeight: '320px', overflowY: 'auto' }}>
        {!selectedNodeId && (
          <div style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
            Select a node to view suggested linkages
          </div>
        )}

        {selectedNodeId && (
          <div style={{ marginBottom: '12px' }}>
            <strong>Node:</strong> {selectedNodeId.substring(0, 20)}...
            <button
              onClick={() => selectedNodeId && fetchSuggestions(selectedNodeId)}
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                background: '#444',
                border: '1px solid #666',
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Refresh
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#ccc' }}>
            Loading suggestions...
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

        {suggestions && !loading && (
          <>
            {suggestions.suggestions.length === 0 ? (
              <div style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
                No suggestions found. Try computing embeddings first.
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '12px', fontSize: '12px', color: '#ccc' }}>
                  Found {suggestions.suggestions.length} suggestions
                </div>
                
                {suggestions.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <div><strong>Target:</strong> {suggestion.targetId.substring(0, 30)}...</div>
                      <div style={{ marginTop: '4px' }}>
                        <strong>Similarity:</strong> 
                        <span style={{ 
                          color: suggestion.similarity > 0.7 ? '#4CAF50' : 
                                suggestion.similarity > 0.4 ? '#FF9800' : '#F44336',
                          marginLeft: '8px',
                          fontWeight: 'bold'
                        }}>
                          {(suggestion.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAcceptLinkage(suggestion)}
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
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectLinkage(suggestion)}
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
                        Reject
                      </button>
                    </div>
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

// Button to toggle the suggestions panel
interface SuggestionsToggleProps {
  onClick: () => void;
  isVisible: boolean;
}

export function SuggestionsToggle({ onClick, isVisible }: SuggestionsToggleProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 230,
        left: 10,
        padding: '8px 12px',
        background: isVisible ? '#4CAF50' : 'rgba(74, 144, 226, 0.8)',
        border: '1px solid #333',
        color: 'white',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: 1001
      }}
    >
      🔗 Suggestions {isVisible ? '✓' : ''}
    </button>
  );
}