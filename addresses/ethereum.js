const tokens = [
  { name: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimal: 18 },
  { name: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimal: 6 },
  { name: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimal: 6 },
  { name: 'UNI', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', decimal: 18 },
  { name: 'WBTC', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', decimal: 8 },
  { name: 'YFI', address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e', decimal: 18 },
  { name: 'SPELL', address: '0x090185f2135308BaD17527004364eBcC2D37e5F6', decimal: 18 },
  { name: 'CVX', address: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B', decimal: 18 },
];

const testTokens = [
  { name: 'USDC', address: '0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C', decimal: 8 },
 //  { name: 'ZRX', address: '0xe4E81Fa6B16327D4B78CFEB83AAdE04bA7075165', decimal: 18 },
];

const swapFrom = {
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
};

module.exports = {
  tokens,
  testTokens,
  swapFrom,
};
