const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {
  entry: {
    main: path.join(__dirname, 'src', 'main.ts'),
    webworker: path.join(__dirname, 'src', 'worker.ts')
  },
  mode: 'development',
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      loader: 'ts-loader'
    },{
      test : /thirdparty.*?.js$/,
      exclude : /node_modules/,
      use : [{
        loader : 'file-loader',
        options : {
          name : 'thirdparty/[name].[ext]'
        }
      }]
    }]
  },
  output: {
    filename: '[name].js'
  },
  resolve: {
    extensions : ['.ts','.js']
  },
  devtool: 'source-map',
  devServer: {
    port: 8080
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'index.html')
    })
  ]
}