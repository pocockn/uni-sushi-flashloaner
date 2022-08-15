## About

The bot calculates whether there is an arbitrage opportunity on each new Ethereum block.

## Run

### Mainnet

`NODE_ENV=mainnet node index.js`

### Testnet (Goerli)

`NODE_ENV=test node index.js`

## Token list

If you switch between the mainnet and testnet you will need to modify which token array to map over on line 94 
within `index.js`. This should be stored in config if possible.

For the mainnet it should be:

```javascript
await Promise.all(addresses.tokens.map(async (token) => { ...
```

Goerli testnet:

```javascript
await Promise.all(addresses.testTokens.map(async (token) => { ...
```

## Example Output

```
Bot started!
15345248
SUSHI  DAI {
  currentPrice: 0.0005256186051303761,
  buyPrice: 0.0005256186235642309,
  sellPrice: 0.0005256185951489415,
  buyImpact: 3.5070779391688234e-8,
  sellImpact: -1.898988100101917e-8,
  constantProduct: 13203262156.10386
}
UNI  DAI {
  currentPrice: 0.0005258134311442146,
  buyPrice: 0.0005258134392170756,
  sellPrice: 0.0005258134251074839,
  buyImpact: 1.53530897994969e-8,
  sellImpact: -1.1480746575642797e-8,
  constantProduct: 36109766271.56063
}
no arbitrage opportunity on  DAI  for quantity  0.0001 ETH
DAI  UNISWAP PRICE BUY PRICE 0.0005258134392170756
DAI  SUSHISWAP PRICE SELL PRICE 0.0005256185951489415
DAI  PROFIT -1.9484406813409082e-7
SUSHI  USDT {
  currentPrice: 1.8936671097233237e-9,
  buyPrice: 1.893688336773534e-9,
  sellPrice: 1.8936671097166632e-9,
  buyImpact: 0.000011209368404596631,
  sellImpact: -3.517186542012496e-12,
  constantProduct: 1.067260037879969e+23
}
UNI  USDT {
  currentPrice: 1.899723957979823e-9,
  buyPrice: 1.8996960486322188e-9,
  sellPrice: 1.899723957974515e-9,
  buyImpact: -0.000014691480578976623,
  sellImpact: -2.794209308376594e-12,
  constantProduct: 1.685703788198898e+23
}
no arbitrage opportunity on  USDT  for quantity  0.0001 ETH
USDT  UNISWAP PRICE BUY PRICE 1.8996960486322188e-9
USDT  SUSHISWAP PRICE SELL PRICE 1.8936671097166632e-9
USDT  PROFIT -6.028938915555528e-12
SUSHI  USDC {
  currentPrice: 526273523.31471926,
  buyPrice: Infinity,
  sellPrice: 526273523.31377554,
  buyImpact: 1,
  sellImpact: -1.7932322293745528e-12,
  constantProduct: 4.0918162851890456e+23
}
UNI  USDC {
  currentPrice: 525875387.2989846,
  buyPrice: Infinity,
  sellPrice: 525875387.29856926,
  buyImpact: 1,
  sellImpact: -7.898126597183364e-13,
  constantProduct: 2.107734996605843e+24
}
no arbitrage opportunity on  USDC  for quantity  0.0001 ETH
USDC  UNISWAP PRICE BUY PRICE Infinity
USDC  SUSHISWAP PRICE SELL PRICE 526273523.31377554
USDC  PROFIT -Infinity
SUSHI  UNI {
  currentPrice: 0.004503004352038213,
  buyPrice: 0.004503007288102677,
  sellPrice: 0.00450300287756397,
  buyImpact: 6.52023031677551e-7,
  sellImpact: -3.2744243849691657e-7,
  constantProduct: 5224813.044137447
}
token:  UNI  has an unbalanced pool for at least one token on Sushiswap, unable to arbitrage
SUSHI  WBTC {
  currentPrice: 126615145502.46869,
  buyPrice: Infinity,
  sellPrice: 126615133892.16595,
  buyImpact: 1,
  sellImpact: -9.169759085381202e-8,
  constantProduct: 37645211030831040
}
UNI  WBTC {
  currentPrice: 126675798309.57875,
  buyPrice: Infinity,
  sellPrice: 126675780172.60704,
  buyImpact: 1,
  sellImpact: -1.4317631746862958e-7,
  constantProduct: 15448672225697668
}
no arbitrage opportunity on  WBTC  for quantity  0.0001 ETH
WBTC  UNISWAP PRICE BUY PRICE Infinity
WBTC  SUSHISWAP PRICE SELL PRICE 126615133892.16595
WBTC  PROFIT -Infinity
SUSHI  YFI {
  currentPrice: 5.835804068172885,
  buyPrice: 5.8358042917700255,
  sellPrice: 5.835803268504182,
  buyImpact: 3.831470862802888e-8,
  sellImpact: -1.370280433565796e-7,
  constantProduct: 1066103.9202433748
}
token:  YFI  has an unbalanced pool for at least one token on Sushiswap, unable to arbitrage

```
