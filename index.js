require('dotenv').config({ path: `./.env.${process.env.NODE_ENV}` });

const privateKey = process.env.PRIVATE_KEY;
// the address that we deployed the smart contract to - 0x4Aec689A464ba3676Eb04ec1c7278819CB9B8521
const flashLoanerAddress = process.env.FLASH_LOANER;
const { ethers } = require('ethers');

//  Minimum value for constant product for a healthy pool.
const MIN_HEALTHY_POOL = 100000000;
// The quantity of wei we use when calculating the impact of a buy or sell on a pool.
// Equals 0.0001 ETH
const QUANTITY_WEI = 100000000000000;
// We need the ETH quantity when passing into our calculatePrice function.
// TODO: Get an Eth number representation from the above QUANTITY_WEI
const QUANTITY_ETH = 10;

// Uniswap / Sushiswap ABIs
const UniswapV2Pair = require('./abis/IUniswapV2Pair.json');
const UniswapV2Factory = require('./abis/IUniswapV2Factory.json');
const addresses = require('./addresses/ethereum');

// Setup up the Infura provider for use when communicating with Ethereum nodes
const provider = new ethers.providers.InfuraProvider(process.env.NETWORK, process.env.INFURA_KEY);
// Set up our wallet with the private key in `.env` and our Infura provider
const wallet = new ethers.Wallet(privateKey, provider);

// You can read about how the price is calculated here
// https://github.com/bt3gl-labs/bdex-AMM-Arbitrage#how-the-price-is-calculated
function calculatePrice(t1Balance, t2Balance, quantity) {
  const CONSTANT_PRODUCT = t1Balance * t2Balance;
  const CURRENT_PRICE = t2Balance / t1Balance;

  // Calculate buy price

  //  How much WETH needs to remain in balance to keep the constant
  const token1BalanceBuy = CONSTANT_PRODUCT / (t2Balance + quantity);

  //  How much WETH goes out to keep the constant
  const t1AmountOutBuy = t1Balance - token1BalanceBuy;

  // Buy price to reflect the balances change
  const buyPrice = quantity / t1AmountOutBuy;

  // Difference of buy price to current price
  const buyImpact = 1 - (CURRENT_PRICE / buyPrice);

  // Calculate sell price

  // How much X to keep the balances constant
  const token2BalanceBuy = CONSTANT_PRODUCT / (t1Balance + quantity);

  // How much X goes out that constant
  const t2AmountOutBuy = t2Balance + token2BalanceBuy;

  // How the X balance reflects with the income WETH
  const token1BalanceSell = CONSTANT_PRODUCT / (t2Balance - quantity);

  // The proportion of WETH in the new balance:
  const t1AmountInSell = t1Balance + token1BalanceSell;

  // Sell price to reflect the balances change
  const sellPrice = t2AmountOutBuy / t1AmountInSell;

  //  Difference of sell price to current price
  const sellImpact = 1 - (CURRENT_PRICE / sellPrice);

  return {
    currentPrice: CURRENT_PRICE,
    buyPrice,
    sellPrice,
    buyImpact,
    sellImpact,
    constantProduct: CONSTANT_PRODUCT,
  };
}

const runBot = async () => {
  const sushiFactory = new ethers.Contract(
    process.env.SUSHI_FACTORY,
    UniswapV2Factory.abi, wallet,
  );
  const uniswapFactory = new ethers.Contract(
    process.env.UNISWAP_FACTORY,
    UniswapV2Factory.abi, wallet,
  );

  const wethAddress = process.env.WETH_ADDRESS;

  // perform function on each new block
  provider.on('block', async (blockNumber) => {
    try {
      console.log(blockNumber);

      await Promise.all(addresses.testTokens.map(async (token) => {
        const sushi = new ethers.Contract(
          sushiFactory.getPair(wethAddress, token.address),
          UniswapV2Pair.abi, wallet,
        );

        const uniswap = new ethers.Contract(
          uniswapFactory.getPair(wethAddress, token.address),
          UniswapV2Pair.abi, wallet,
        );

        // TODO: I think we may need to convert these values into ETH from WEI
        // https://github.com/bt3gl-labs/bdex-AMM-Arbitrage/blob/14696d79eac4486d74ea80d10fccedd26aa6ecd6/api/arbitrage.py#L126
        // Are these .getReserves() methods correct? The above project gets the token balances directly.
        const sushiReserves = await sushi.getReserves();
        const uniswapReserves = await uniswap.getReserves();

        const reserve0Sushi = Number(ethers.utils.formatUnits(sushiReserves[0], token.decimal));
        const reserve1Sushi = Number(ethers.utils.formatUnits(sushiReserves[1], token.decimal));
        // TODO: Does the quantity need to be passed in as WEI or ETH?
        const sushiswapPriceData = calculatePrice(reserve0Sushi, reserve1Sushi, QUANTITY_ETH);
        console.log('SUSHI ', token.name, sushiswapPriceData);
        if (sushiswapPriceData.constantProduct <= MIN_HEALTHY_POOL) {
          console.log('token: ', token.name, ' has an unbalanced pool for at least one token on Sushiswap, unable to arbitrage');
          return;
        }

        const reserve0Uni = Number(ethers.utils.formatUnits(uniswapReserves[0], token.decimal));
        const reserve1Uni = Number(ethers.utils.formatUnits(uniswapReserves[1], token.decimal));
        const uniswapPriceData = calculatePrice(reserve0Uni, reserve1Uni, QUANTITY_ETH);
        console.log('UNI ', token.name, uniswapPriceData);
        if (uniswapPriceData.constantProduct <= MIN_HEALTHY_POOL) {
          console.log('token: ', token.name, ' has an unbalanced pool for at least one token on Uniswap, unable to arbitrage');
          return;
        }

        // TODO: Also check the other way around, this currently only checks if we make a profit
        // buying on Uniswap and selling on Sushiswap. The spread is the difference between the sell and buy price
        // minus the 0.6% fees for trading on both dexes. If it is positive then we should be able to take profit.
        const spread = Math.abs((sushiswapPriceData.sellPrice / uniswapPriceData.buyPrice - 1) * 100) - 0.6;
        if (spread < 0) {
          console.log('no arbitrage opportunity on ', token.name, ' for quantity ', QUANTITY_ETH, 'ETH');
          console.log(token.name, ` UNISWAP PRICE BUY PRICE ${uniswapPriceData.buyPrice}`);
          console.log(token.name, ` SUSHISWAP PRICE SELL PRICE ${sushiswapPriceData.sellPrice}`);
          console.log(token.name, `SPREAD ${spread}%`);
          return;
        }

        console.log('arbitrage opportunity on ', token.name, ' for quantity ', QUANTITY_ETH, 'ETH');
        console.log(token.name, ` UNISWAP PRICE BUY PRICE ${uniswapPriceData.buyPrice}`);
        console.log(token.name, ` SUSHISWAP PRICE SELL PRICE ${sushiswapPriceData.sellPrice}`);
        console.log(token.name, `SPREAD ${spread}%`);

        // TODO: Trying to estimate the gas failed so I manually set it below for now
        // const gasLimit = await sushi.estimateGas.swap(
        //   0,
        //   QUANTITY_ETH,
        //   flashLoanerAddress,
        //   ethers.utils.toUtf8Bytes('1'),
        // );

        const gasLimit = ethers.BigNumber.from(1000000).toHexString();
        const gasPrice = await wallet.getGasPrice();
        const gasCost = Number(ethers.utils.formatEther(gasPrice.mul(gasLimit)));

        const shouldSendTx = (gasCost / QUANTITY_ETH) < spread;

        // don't trade if gasCost makes the trade unprofitable
        if (!shouldSendTx) {
          console.log(`trade for ${token.name} is unprofitable when including gas cost: ${gasCost / QUANTITY_ETH}`);
          return;
        }

        const options = {
          gasPrice,
          gasLimit,
        };

        // TODO: Work out how much to swap here? If we find there is a profitable trade
        // we need to figure out the amount to swap. Do we pass in the Wei or Eth value here?
        const tx = await sushi.swap(
          0,
          QUANTITY_ETH,
          flashLoanerAddress,
          ethers.utils.toUtf8Bytes('1'), options,
        );

        console.log(`ARBITRAGE EXECUTED ON ${token.name}! PENDING TX TO BE MINED`);
        console.log(tx);

        // eslint-disable-next-line max-len
        // Resolves to the TransactionReceipt once the transaction has been included in the chain for x confirms blocks.
        const receipt = (await tx).wait();

        // Logs the information about the transaction it has been mined.
        if (receipt) {
          console.log(' - Transaction is mined - ' + '\n'
            + 'Transaction Hash:', `${(await tx).hash
          }\n` + `Block Number: ${
            (await receipt).blockNumber}\n`
            + `Navigate to https://goerli.etherscan.io/txn/${
              (await tx).hash}`, 'to see your transaction');
        } else {
          console.log('Error submitting transaction');
        }

        console.log('SUCCESS! TX MINED');
      }));
    } catch (err) {
      console.error(err);
    }
  });
};

console.log('Bot started!');

runBot();
