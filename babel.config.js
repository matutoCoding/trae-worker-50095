module.exports = {
  presets: [['@babel/preset-env', {
    targets: [
      'last 3 versions',
      'Android >= 4.1',
      'ios >= 8'
    ]
  }]],
  plugins: []
}
