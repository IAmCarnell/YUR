/**
 * Enhanced Webpack configuration for YUR Framework production builds
 * Includes advanced bundle splitting, caching strategies, and performance optimizations
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const WorkboxPlugin = require('workbox-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isAnalyze = process.env.ANALYZE === 'true';
  
  return {
    entry: {
      main: './src/index.tsx',
      vendor: ['react', 'react-dom', '@mui/material'],
      scientific: './src/scientific/index.ts',
      spatial: './src/spatial/index.ts',
      agents: './src/agents/index.ts'
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
      // Enable module federation for micro-frontend architecture
      uniqueName: 'yur-framework',
      // Optimize for HTTP/2 multiplexing
      chunkLoadTimeout: 30000,
    },
    
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
              pure_funcs: isProduction ? ['console.log', 'console.info'] : [],
            },
            mangle: {
              safari10: true,
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
              },
            ],
          },
        }),
      ],
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        minRemainingSize: 0,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        enforceSizeThreshold: 50000,
        cacheGroups: {
          // Core React libraries
          reactVendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
            name: 'react-vendor',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // UI Framework (Material-UI)
          uiVendor: {
            test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
            name: 'ui-vendor',
            chunks: 'all',
            priority: 35,
            enforce: true,
          },
          // Three.js and 3D libraries
          threejsVendor: {
            test: /[\\/]node_modules[\\/](three|@react-three|@types\/three)[\\/]/,
            name: 'threejs-vendor',
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          // Scientific computing libraries
          scientificVendor: {
            test: /[\\/]node_modules[\\/](plotly\.js|d3|katex|plotly\.js-dist)[\\/]/,
            name: 'scientific-vendor',
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
          // Common utilities
          utilsVendor: {
            test: /[\\/]node_modules[\\/](axios|lodash|moment|date-fns)[\\/]/,
            name: 'utils-vendor',
            chunks: 'all',
            priority: 20,
            enforce: true,
          },
          // Application modules
          scientific: {
            test: /[\\/]src[\\/]scientific[\\/]/,
            name: 'scientific-app',
            chunks: 'all',
            priority: 15,
            minChunks: 1,
          },
          spatial: {
            test: /[\\/]src[\\/]spatial[\\/]/,
            name: 'spatial-app',
            chunks: 'all',
            priority: 15,
            minChunks: 1,
          },
          agents: {
            test: /[\\/]src[\\/]agents[\\/]/,
            name: 'agents-app',
            chunks: 'all',
            priority: 15,
            minChunks: 1,
          },
          // Common application code
          common: {
            test: /[\\/]src[\\/](components|utils|hooks)[\\/]/,
            name: 'common-app',
            chunks: 'all',
            priority: 10,
            minChunks: 2,
          },
          // Default vendor chunk for remaining node_modules
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 5,
            minChunks: 1,
          },
        }
      },
      runtimeChunk: {
        name: entrypoint => `runtime-${entrypoint.name}`,
      },
      usedExports: true,
      sideEffects: false,
      // Enable module concatenation
      concatenateModules: true,
      // Tree shaking optimizations
      providedExports: true,
    },
    
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, '../../frontend/src'),
        '@scientific': path.resolve(__dirname, '../../frontend/src/scientific'),
        '@spatial': path.resolve(__dirname, '../../frontend/src/spatial'),
        '@components': path.resolve(__dirname, '../../frontend/src/components'),
        '@agents': path.resolve(__dirname, '../../frontend/src/agents'),
        '@utils': path.resolve(__dirname, '../../frontend/src/utils'),
        '@hooks': path.resolve(__dirname, '../../frontend/src/hooks'),
        '@types': path.resolve(__dirname, '../../frontend/src/types'),
      },
      // Resolve optimization
      symlinks: false,
      cacheWithContext: false,
    },
    
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', {
                    targets: {
                      browsers: ['> 1%', 'last 2 versions', 'not ie <= 11']
                    },
                    modules: false,
                    useBuiltIns: 'usage',
                    corejs: 3,
                  }],
                  ['@babel/preset-react', {
                    runtime: 'automatic',
                  }],
                  '@babel/preset-typescript',
                ],
                plugins: [
                  ['@babel/plugin-transform-runtime', {
                    corejs: false,
                    helpers: true,
                    regenerator: true,
                    useESModules: true,
                  }],
                  // Tree shaking for imports
                  ['babel-plugin-import', {
                    libraryName: '@mui/material',
                    libraryDirectory: '',
                    camel2DashComponentName: false,
                    style: false,
                  }],
                ],
                cacheDirectory: true,
                cacheCompression: isProduction,
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: {
                  auto: true,
                  localIdentName: isProduction 
                    ? '[contenthash:base64:8]' 
                    : '[name]__[local]--[hash:base64:5]',
                },
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    'autoprefixer',
                    'cssnano',
                  ],
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024, // 8kb
            },
          },
          generator: {
            filename: 'assets/images/[name].[contenthash:8][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[contenthash:8][ext]',
          },
        },
        {
          test: /\.(gltf|glb|obj|fbx)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/3d/[name].[contenthash:8][ext]',
          },
        },
        // Web Workers
        {
          test: /\.worker\.(js|ts)$/,
          use: {
            loader: 'worker-loader',
            options: {
              filename: 'workers/[name].[contenthash:8].js',
            },
          },
        },
      ]
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
          minifyURLs: true,
        } : false,
        // Preload critical chunks
        chunks: ['runtime-main', 'react-vendor', 'ui-vendor', 'main'],
        chunksSortMode: 'manual',
      }),
      
      // Service Worker for caching
      ...(isProduction ? [
        new WorkboxPlugin.GenerateSW({
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            {
              urlPattern: /\.(js|css|html)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources',
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
        }),
      ] : []),
      
      // Compression
      ...(isProduction ? [
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
        }),
      ] : []),
      
      // Bundle analyzer
      ...(isAnalyze ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        }),
      ] : []),
    ],
    
    devServer: {
      static: {
        directory: path.join(__dirname, '../../frontend/public'),
        publicPath: '/',
      },
      compress: true,
      port: 3000,
      hot: true,
      historyApiFallback: true,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
      // HTTP/2 support
      http2: true,
      // Enable caching headers
      headers: {
        'Cache-Control': 'no-cache',
      },
    },
    
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '../../node_modules/.cache/webpack'),
      compression: 'gzip',
      hashAlgorithm: 'xxhash64',
      store: 'pack',
      buildDependencies: {
        config: [__filename],
      },
    },
    
    performance: {
      maxAssetSize: 512000,
      maxEntrypointSize: 512000,
      hints: isProduction ? 'warning' : false,
      assetFilter: (assetFilename) => {
        // Ignore source maps and compressed files for performance budgets
        return !assetFilename.endsWith('.map') && !assetFilename.endsWith('.gz');
      },
    },
    
    // Enable source maps for debugging
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    // Optimization for build speed
    stats: {
      children: false,
      chunks: false,
      modules: false,
      reasons: false,
      usedExports: false,
      providedExports: false,
      optimizationBailout: false,
      errorDetails: true,
      cachedAssets: false,
    },
    
    // Node.js polyfills
    resolve: {
      fallback: {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser"),
      },
    },
    
    experiments: {
      // Enable WebAssembly support
      asyncWebAssembly: true,
      // Enable top-level await
      topLevelAwait: true,
      // Enable module federation
      outputModule: true,
    },
  };
};