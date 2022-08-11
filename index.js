// make sure to test your own strategies, do not use this version in production
require('dotenv').config();

const privateKey = process.env.PRIVATE_KEY;
// your contract address
const flashLoanerAddress = process.env.FLASH_LOANER;

const { ethers } = require('ethers');

// uni/sushiswap ABIs
const UniswapV2Pair = require('./abis/IUniswapV2Pair.json');
const UniswapV2Factory = require('./abis/IUniswapV2Factory.json');
const addresses = require('./addresses/ethereum');

// use your own Infura node in production
// const provider = new ethers.providers.InfuraProvider('mainnet', process.env.INFURA_KEY);
const provider = new ethers.providers.InfuraProvider('goerli', process.env.INFURA_KEY);

const wallet = new ethers.Wallet(privateKey, provider);

// TODO: Work out if we can fetch these values from Uniswap themselves.
// These are the amounts we try to swap. This guy gets the amounts using this
// https://github.com/6eer/uniswap-sushiswap-arbitrage-bot/blob/300db222e20070fb3ed488cfb0a6dcb476aea833/src/bot_flashswap.js#L110
const ETH_TRADE = 0.01;
// eslint-disable-next-line max-len
// TODO: As we aren't swapping DAI I think this needs be set based on the token we're swapping with WETH.
const DAI_TRADE = 100;

const runBot = async () => {
  const sushiFactory = new ethers.Contract(
    // mainnet '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
    UniswapV2Factory.abi, wallet,
  );
  const uniswapFactory = new ethers.Contract(
    '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    UniswapV2Factory.abi, wallet,
  );

  // const mainnet wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  const wethAddress = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

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

        const sushiReserves = await sushi.getReserves();
        const uniswapReserves = await uniswap.getReserves();

        const reserve0Sushi = Number(ethers.utils.formatUnits(sushiReserves[0], token.decimal));
        const reserve1Sushi = Number(ethers.utils.formatUnits(sushiReserves[1], token.decimal));

        const reserve0Uni = Number(ethers.utils.formatUnits(uniswapReserves[0], token.decimal));
        const reserve1Uni = Number(ethers.utils.formatUnits(uniswapReserves[1], token.decimal));

        // Price calculation example, in a pool with 2,000,000 DAI and 1,000 WETH,
        // the market price for WETH is $2,000. 2,000,000 / 1,000
        const priceUniswap = reserve0Uni / reserve1Uni;
        const priceSushiswap = reserve0Sushi / reserve1Sushi;

        // Uniswap charges a 0.3% fee on trades. We need 2 trades when performing
        // the arbitrage so we calculate 0.6%. TODO - Fix this calculation and ensure its correct.
        const fees = Math.abs((priceSushiswap + priceUniswap * 0.6) / 100);
        const profitable = (priceUniswap - priceSushiswap) - fees > 0;
        const profit = priceUniswap - priceSushiswap - fees;

        console.log(token.name, ` UNISWAP PRICE ${priceUniswap}`);
        console.log(token.name, ` SUSHISWAP PRICE ${priceSushiswap}`);
        console.log(token.name, ` FEES: ${fees}`);
        console.log(token.name, ` PROFITABLE? ${profitable}`);
        console.log(token.name, ` PROFIT ${profit}`);

        if (!profitable) return;

        // TODO: Trying to estimate the gas failed so I manually set it below for now
        // const gasLimit = await sushi.estimateGas.swap(
        //   !shouldStartEth ? DAI_TRADE : 0,
        //   shouldStartEth ? ETH_TRADE : 0,
        //   flashLoanerAddress,
        //   ethers.utils.toUtf8Bytes('1'),
        // );

        const gasLimit = 100000;

        const gasPrice = await wallet.getGasPrice();

        const gasCost = Number(ethers.utils.formatEther(gasPrice.mul(4250000006)));

        const profitAfterTxFees = profit - gasCost - fees;
        const shouldSendTx = profitAfterTxFees > 0;
        // eslint-disable-next-line no-console
        console.log('Profit left over after TX fees :', profitAfterTxFees);

        // don't trade if gasCost makes the trade unprofitable
        if (!shouldSendTx) return;

        const options = {
          gasPrice,
          gasLimit,
        };

        // TODO: Work out how much to swap here? If we find there is a profitable trade
        // we need to figure out the amount to swap.
        const tx = await sushi.swap(
          !profitable ? DAI_TRADE : 0,
          profitable ? ETH_TRADE : 0,
          flashLoanerAddress,
          ethers.utils.toUtf8Bytes('1'), options,
        );

        console.log('ARBITRAGE EXECUTED! PENDING TX TO BE MINED');
        console.log(tx);

        await tx.wait();

        console.log('SUCCESS! TX MINED');
      }));
    } catch (err) {
      console.error(err);
    }
  });
};

console.log('Bot started!');

runBot();
