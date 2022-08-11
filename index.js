require('dotenv').config();

const privateKey = process.env.PRIVATE_KEY;
// the address that we deployed the smart contract to - 0x4Aec689A464ba3676Eb04ec1c7278819CB9B8521
const flashLoanerAddress = process.env.FLASH_LOANER;

const { ethers } = require('ethers');

// Uniswap / Sushiswap ABIs
const UniswapV2Pair = require('./abis/IUniswapV2Pair.json');
const UniswapV2Factory = require('./abis/IUniswapV2Factory.json');
const addresses = require('./addresses/ethereum');

// Setup up the Infura provider for use when communicating with Ethereum nodes
// const provider = new ethers.providers.InfuraProvider('mainnet', process.env.INFURA_KEY);
const provider = new ethers.providers.InfuraProvider('goerli', process.env.INFURA_KEY);

// Set up our wallet with the private key in `.env` and our Infura provider
const wallet = new ethers.Wallet(privateKey, provider);

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
          0,
          ethers.utils.parseEther('0.1'),
          flashLoanerAddress,
          ethers.utils.toUtf8Bytes('1'), options,
        );

        console.log('ARBITRAGE EXECUTED! PENDING TX TO BE MINED');
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
