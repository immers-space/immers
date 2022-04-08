const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    ap: { import: './views/ap/ap.js', filename: '[name]/[name].js' },
    login: { import: './views/login/login.js', filename: '[name]/[name].js' },
    dialog: { import: './views/dialog/dialog.js', filename: '[name]/[name].js' },
    reset: { import: './views/reset/reset.js', filename: '[name]/[name].js' }
  },
  // Where files should be sent once they are bundled
  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].bundle.js',
    publicPath: '/dist/',
    clean: true
  },
  devServer: {
    port: 3000,
    watchContentBase: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },

      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'

      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: '[name]/[name].css' }),
    new HtmlWebpackPlugin({ template: './views/ap.html', chunks: ['ap'], inject: false, filename: 'ap/ap.html' }),
    new HtmlWebpackPlugin({ template: './views/auth.html', chunks: ['login'], inject: false, filename: 'login/login.html' }),
    new HtmlWebpackPlugin({ template: './views/auth.html', chunks: ['dialog'], inject: false, filename: 'dialog/dialog.html' }),
    new HtmlWebpackPlugin({ template: './views/auth.html', chunks: ['reset'], inject: false, filename: 'reset/reset.html' })
  ]
}
