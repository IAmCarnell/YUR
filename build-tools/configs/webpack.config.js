/**
 * Webpack configuration for YUR Framework production builds
 * Includes bundle splitting, caching strategies, and performance optimizations
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      main: './src/index.tsx',
      vendor: ['react', 'react-dom', '@mui/material'],
      scientific: './src/scientific/index.ts',
      spatial: './src/spatial/index.ts'
    },
    
    output: {
      path: path.resolve(__dirname, '../../frontend/dist'),
      filename: isProduction 
        ? '[name].[contenthash].js' 
        : '[name].js',
      chunkFilename: isProduction 
        ? '[name].[contenthash].chunk.js' 
        : '[name].chunk.js',
      clean: true
    },
    
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          threejs: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: 'threejs',
            chunks: 'all',
            priority: 20
          },
          scientific: {
            test: /[\\/]src[\\/]scientific[\\/]/,
            name: 'scientific',
            chunks: 'all',
            priority: 15
          },
          common: {
            minChunks: 2,
            chunks: 'all',
            name: 'common',
            priority: 5
          }
        }
      },
      runtimeChunk: 'single',
      usedExports: true,
      sideEffects: false
    },
    
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                noEmit: false
              }
            }
          },
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[hash][ext]'
          }
        },
        {
          test: /\.(gltf|glb|obj|fbx)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/3d/[name].[hash][ext]'
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
        '@components': path.resolve(__dirname, '../../frontend/src/components')
      }
    },
    
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        inject: true,
        minify: isProduction
      }),
      
      ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin()] : [])
    ],
    
    devServer: {
      static: {
        directory: path.join(__dirname, '../../frontend/public')
      },
      compress: true,
      port: 3000,
      hot: true,
      historyApiFallback: true
    },
    
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '../../node_modules/.cache/webpack')
    },
    
    performance: {
      maxAssetSize: 512000,
      maxEntrypointSize: 512000,
      hints: isProduction ? 'warning' : false
    }
  };
};