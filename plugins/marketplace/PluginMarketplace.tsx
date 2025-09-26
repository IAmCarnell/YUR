/**
 * Plugin Marketplace Interface
 * Community-driven plugin discovery and installation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Star, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Filter,
  TrendingUp,
  User,
  Calendar,
  Package
} from 'lucide-react';

interface PluginListing {
  id: string;
  name: string;
  description: string;
  author: {
    id: string;
    name: string;
    verified: boolean;
    avatar?: string;
  };
  version: string;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  reviews: number;
  price: number; // 0 for free
  screenshots: string[];
  lastUpdated: Date;
  securityProfile: {
    level: 'trusted' | 'verified' | 'unverified' | 'suspicious' | 'blocked';
    score: number;
  };
  manifest: any;
  featured: boolean;
  trending: boolean;
}

interface PluginMarketplaceProps {
  onInstallPlugin: (pluginId: string) => Promise<void>;
  onViewPlugin: (pluginId: string) => void;
  installedPlugins: string[];
  userPreferences: {
    categories: string[];
    allowUnverified: boolean;
    autoUpdate: boolean;
  };
}

interface MarketplaceFilters {
  category: string;
  priceRange: [number, number];
  rating: number;
  securityLevel: string[];
  featured: boolean;
  trending: boolean;
  sortBy: 'popularity' | 'rating' | 'newest' | 'name';
}

const CATEGORIES = [
  'All',
  'Productivity',
  'Entertainment',
  'Education',
  'Graphics',
  'Development',
  'Scientific',
  'Social',
  'Utilities',
  'Games',
];

const SECURITY_LEVELS = [
  { id: 'trusted', label: 'Trusted', color: '#4caf50', icon: '🛡️' },
  { id: 'verified', label: 'Verified', color: '#2196f3', icon: '✅' },
  { id: 'unverified', label: 'Unverified', color: '#ff9800', icon: '⚠️' },
  { id: 'suspicious', label: 'Suspicious', color: '#f44336', icon: '🚨' },
  { id: 'blocked', label: 'Blocked', color: '#9e9e9e', icon: '🚫' },
];

export const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({
  onInstallPlugin,
  onViewPlugin,
  installedPlugins,
  userPreferences,
}) => {
  const [plugins, setPlugins] = useState<PluginListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<MarketplaceFilters>({
    category: 'All',
    priceRange: [0, 100],
    rating: 0,
    securityLevel: ['trusted', 'verified'],
    featured: false,
    trending: false,
    sortBy: 'popularity',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginListing | null>(null);
  const [installing, setInstalling] = useState<Set<string>>(new Set());

  // Load plugins from marketplace API
  useEffect(() => {
    loadMarketplacePlugins();
  }, []);

  const loadMarketplacePlugins = async () => {
    setLoading(true);
    try {
      // Simulate API call
      const mockPlugins: PluginListing[] = [
        {
          id: 'markdown-editor',
          name: 'Advanced Markdown Editor',
          description: 'Full-featured markdown editor with live preview, syntax highlighting, and export options.',
          author: { id: 'dev1', name: 'TechCorp Inc.', verified: true, avatar: '/avatars/techcorp.png' },
          version: '2.1.0',
          category: 'Productivity',
          tags: ['markdown', 'editor', 'productivity', 'writing'],
          downloads: 15420,
          rating: 4.8,
          reviews: 342,
          price: 0,
          screenshots: ['/screenshots/markdown1.png', '/screenshots/markdown2.png'],
          lastUpdated: new Date('2024-01-15'),
          securityProfile: { level: 'trusted', score: 95 },
          manifest: {},
          featured: true,
          trending: true,
        },
        {
          id: 'data-visualizer',
          name: 'Scientific Data Visualizer',
          description: 'Advanced data visualization tool for scientific computing with support for 3D plots, animations, and custom rendering.',
          author: { id: 'dev2', name: 'DataViz Labs', verified: true, avatar: '/avatars/dataviz.png' },
          version: '1.5.2',
          category: 'Scientific',
          tags: ['visualization', 'data', 'science', '3d', 'charts'],
          downloads: 8750,
          rating: 4.6,
          reviews: 156,
          price: 29.99,
          screenshots: ['/screenshots/dataviz1.png', '/screenshots/dataviz2.png', '/screenshots/dataviz3.png'],
          lastUpdated: new Date('2024-01-10'),
          securityProfile: { level: 'verified', score: 87 },
          manifest: {},
          featured: false,
          trending: true,
        },
        {
          id: 'todo-manager',
          name: 'Smart Todo Manager',
          description: 'AI-powered task management with smart categorization, deadline prediction, and productivity insights.',
          author: { id: 'dev3', name: 'IndieCreator', verified: false, avatar: '/avatars/indie.png' },
          version: '0.9.1',
          category: 'Productivity',
          tags: ['todo', 'ai', 'productivity', 'tasks'],
          downloads: 3240,
          rating: 4.2,
          reviews: 68,
          price: 0,
          screenshots: ['/screenshots/todo1.png'],
          lastUpdated: new Date('2024-01-08'),
          securityProfile: { level: 'unverified', score: 72 },
          manifest: {},
          featured: false,
          trending: false,
        },
        {
          id: 'game-engine',
          name: '2D Game Engine',
          description: 'Lightweight 2D game engine with physics, animations, and easy scripting for creating browser games.',
          author: { id: 'dev4', name: 'GameDev Studio', verified: true, avatar: '/avatars/gamedev.png' },
          version: '3.0.0',
          category: 'Games',
          tags: ['game', 'engine', '2d', 'physics', 'development'],
          downloads: 12680,
          rating: 4.7,
          reviews: 289,
          price: 49.99,
          screenshots: ['/screenshots/game1.png', '/screenshots/game2.png'],
          lastUpdated: new Date('2024-01-12'),
          securityProfile: { level: 'trusted', score: 91 },
          manifest: {},
          featured: true,
          trending: false,
        },
      ];

      setPlugins(mockPlugins);
    } catch (error) {
      console.error('Failed to load marketplace plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort plugins
  const filteredPlugins = useMemo(() => {
    let result = plugins.filter(plugin => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchable = `${plugin.name} ${plugin.description} ${plugin.tags.join(' ')}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      // Category
      if (filters.category !== 'All' && plugin.category !== filters.category) return false;

      // Price range
      if (plugin.price < filters.priceRange[0] || plugin.price > filters.priceRange[1]) return false;

      // Rating
      if (plugin.rating < filters.rating) return false;

      // Security level
      if (!filters.securityLevel.includes(plugin.securityProfile.level)) return false;

      // Featured/Trending
      if (filters.featured && !plugin.featured) return false;
      if (filters.trending && !plugin.trending) return false;

      // User preferences
      if (!userPreferences.allowUnverified && plugin.securityProfile.level === 'unverified') return false;

      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'popularity':
          return b.downloads - a.downloads;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [plugins, searchQuery, filters, userPreferences]);

  const handleInstallPlugin = async (pluginId: string) => {
    setInstalling(prev => new Set(prev).add(pluginId));
    try {
      await onInstallPlugin(pluginId);
    } catch (error) {
      console.error('Failed to install plugin:', error);
    } finally {
      setInstalling(prev => {
        const newSet = new Set(prev);
        newSet.delete(pluginId);
        return newSet;
      });
    }
  };

  const getSecurityLevelInfo = (level: string) => {
    return SECURITY_LEVELS.find(sl => sl.id === level) || SECURITY_LEVELS[2];
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const PluginCard: React.FC<{ plugin: PluginListing }> = ({ plugin }) => {
    const securityInfo = getSecurityLevelInfo(plugin.securityProfile.level);
    const isInstalled = installedPlugins.includes(plugin.id);
    const isInstalling = installing.has(plugin.id);

    return (
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6">
        {/* Plugin Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{plugin.name}</h3>
              {plugin.featured && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  Featured
                </span>
              )}
              {plugin.trending && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp size={12} />
                  Trending
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plugin.description}</p>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {plugin.tags.slice(0, 3).map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
              {plugin.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{plugin.tags.length - 3} more</span>
              )}
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex flex-col items-center ml-4">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: securityInfo.color }}
              title={`Security Level: ${securityInfo.label}`}
            >
              {securityInfo.icon}
            </div>
            <span className="text-xs text-gray-500 mt-1">{plugin.securityProfile.score}%</span>
          </div>
        </div>

        {/* Plugin Stats */}
        <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Download size={14} />
              <span>{plugin.downloads.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500" />
              <span>{plugin.rating}</span>
              <span className="text-gray-400">({plugin.reviews})</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{formatLastUpdated(plugin.lastUpdated)}</span>
            </div>
          </div>
          <div className="font-semibold text-lg">
            {formatPrice(plugin.price)}
          </div>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
            <User size={14} />
          </div>
          <span className="text-sm text-gray-700">{plugin.author.name}</span>
          {plugin.author.verified && (
            <CheckCircle size={14} className="text-blue-500" title="Verified Developer" />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewPlugin(plugin.id)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            View Details
          </button>
          
          {isInstalled ? (
            <button
              disabled
              className="bg-green-100 text-green-800 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Installed
            </button>
          ) : (
            <button
              onClick={() => handleInstallPlugin(plugin.id)}
              disabled={isInstalling}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {isInstalling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Install
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const FilterPanel: React.FC = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-gray-500 hover:text-gray-700"
        >
          <Filter size={20} />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Minimum Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
            <select
              value={filters.rating}
              onChange={(e) => setFilters(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Any Rating</option>
              <option value={4}>4+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
              <option value="name">Name</option>
            </select>
          </div>

          {/* Security Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Security Level</label>
            <div className="space-y-2">
              {SECURITY_LEVELS.filter(sl => sl.id !== 'blocked').map(level => (
                <label key={level.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.securityLevel.includes(level.id)}
                    onChange={(e) => {
                      setFilters(prev => ({
                        ...prev,
                        securityLevel: e.target.checked
                          ? [...prev.securityLevel, level.id]
                          : prev.securityLevel.filter(id => id !== level.id)
                      }));
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{level.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Plugin Marketplace</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, featured: !prev.featured }))}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filters.featured
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Featured Only
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, trending: !prev.trending }))}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                filters.trending
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp size={16} />
              Trending
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel />

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {filteredPlugins.length} of {plugins.length} plugins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlugins.map(plugin => (
              <PluginCard key={plugin.id} plugin={plugin} />
            ))}
          </div>

          {filteredPlugins.length === 0 && (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No plugins found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PluginMarketplace;