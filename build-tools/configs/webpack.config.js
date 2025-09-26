/**
 * Enhanced Webpack configuration for YUR Framework production builds
 * Includes advanced bundle splitting, caching strategies, and performance optimizations
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;
  
  return {
    entry: {
      main: './src/index.tsx',
      vendor: ['react', 'react-dom', '@mui/material'],
      scientific: './src/scientific/index.ts',
      spatial: './src/spatial/index.ts',
      agents: './src/agents/index.ts',
      plugins: './src/plugins/index.ts'
    },
    
    output: {
      path: path.resolve(__dirname, '../../frontend/dist'),
      filename: isProduction 
        ? '[name].[contenthash:8].js' 
        : '[name].js',
      chunkFilename: isProduction 
        ? '[name].[contenthash:8].chunk.js' 
        : '[name].chunk.js',
      assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
      clean: true,
      publicPath: '/',
      crossOriginLoading: 'anonymous'
    },
    
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true
          },
          // React ecosystem
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20
          },
          // Three.js and 3D libraries
          threejs: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: 'threejs',
            chunks: 'all',
            priority: 20
          },
          // Material-UI components
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            chunks: 'all',
            priority: 15
          },
          // Scientific computing libraries
          scientific: {
            test: /[\\/](src[\\/]scientific|node_modules[\\/](d3|plotly))[\\/]/,
            name: 'scientific',
            chunks: 'all',
            priority: 15
          },
          // Spatial computing components
          spatial: {
            test: /[\\/]src[\\/]spatial[\\/]/,
            name: 'spatial',
            chunks: 'all',
            priority: 15
          },
          // Agent framework
          agents: {
            test: /[\\/](src[\\/]agents|agent-framework)[\\/]/,
            name: 'agents',
            chunks: 'all',
            priority: 15
          },
          // Common utilities
          common: {
            minChunks: 2,
            chunks: 'all',
            name: 'common',
            priority: 5,
            reuseExistingChunk: true
          }
        }
      },
      runtimeChunk: {
        name: 'runtime'
      },
      usedExports: true,
      sideEffects: false,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic'
    },
    
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: isDevelopment,
                compilerOptions: {
                  noEmit: false,
                  sourceMap: isDevelopment
                }
              }
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                sourceMap: isDevelopment,
                modules: {
                  auto: true,
                  localIdentName: isProduction 
                    ? '[hash:base64:8]' 
                    : '[name]__[local]--[hash:base64:5]'
                }
              }
            }
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8192 // 8kb
            }
          },
          generator: {
            filename: 'assets/images/[name].[contenthash:8][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[contenthash:8][ext]'
          }
        },
        {
          test: /\.(gltf|glb|obj|fbx)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/3d/[name].[contenthash:8][ext]'
          }
        },
        {
          test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/media/[name].[contenthash:8][ext]'
          }
        }
      ]
    },
    
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, '../../frontend/src'),
        '@scientific': path.resolve(__dirname, '../../frontend/src/scientific'),
        '@spatial': path.resolve(__dirname, '../../frontend/src/spatial'),
        '@components': path.resolve(__dirname, '../../frontend/src/components'),
        '@agents': path.resolve(__dirname, '../../agent-framework'),
        '@yur-os': path.resolve(__dirname, '../../yur-os'),
        '@plugins': path.resolve(__dirname, '../../plugins'),
        '@core': path.resolve(__dirname, '../../core')
      },
      fallback: {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer")
      }
    },
    
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        inject: true,
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),
      
      // Service Worker for caching
      ...(isProduction ? [
        new WorkboxPlugin.GenerateSW({
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets'
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            },
            {
              urlPattern: /\.(?:js|css|html)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources'
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ]
        })
      ] : []),
      
      // Compression
      ...(isProduction ? [
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8
        })
      ] : []),
      
      // Bundle analyzer
      ...(process.env.ANALYZE ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: '../reports/bundle-report.html'
        })
      ] : [])
    ],
    
    devServer: {
      static: {
        directory: path.join(__dirname, '../../frontend/public'),
        publicPath: '/'
      },
      compress: true,
      port: 3000,
      hot: true,
      historyApiFallback: true,
      open: false,
      allowedHosts: 'all',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authentication'
      }
    },
    
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '../../node_modules/.cache/webpack'),
      buildDependencies: {
        config: [__filename]
      }
    },
    
    performance: {
      maxAssetSize: 512000,        // 500KB
      maxEntrypointSize: 512000,   // 500KB
      hints: isProduction ? 'warning' : false,
      assetFilter: (assetFilename) => {
        return !/(\.map$|\.json$|\.txt$)/.test(assetFilename);
      }
    },
    
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    
    stats: {
      preset: 'minimal',
      moduleTrace: true,
      errorDetails: true
    }
  };
};