const webpack = require('webpack');

module.exports = {
  mode: 'development',

  entry: {
    app: './src/app.tsx'
  },

  output: {
    library: 'App'
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },

  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/env', '@babel/react'],
              plugins: ['@babel/proposal-class-properties']
            }
          },
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },

  // Optional: Enables reading mapbox token from environment variable
  plugins: [new webpack.EnvironmentPlugin(['MapboxAccessToken'])]
};
