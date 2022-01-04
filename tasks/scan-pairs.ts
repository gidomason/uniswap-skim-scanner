import { ethers } from "ethers";
import * as fs from "fs/promises";
import { task } from "hardhat/config";

import ERC20Abi from "../abis/ERC20.json";
import UniswapPairAbi from "../abis/UniswapPair.json";
import Multicall from "../utils/multicall";

const axios = require('axios').default;
const colors = require('colors');

const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType } = require ('@uniswap/sdk');

const minDollarValue = 10.01;
const markDollarValue = 100.01;
//const lastPair='0x4393F4390b84B32776CE312DF401305Dc25E64a4';
const lastPair='';

task("scan-pairs", "Scan Uniswap pairs for skim opportunities").setAction(
  async (_args, hre) => {
    const network = hre.network.name;
    const config = hre.config.uniswapSkimScanner;

    if (network in config) {
      const multicallAddress = config[network].multicallAddress;
      const uniswapClones = config[network].uniswapClones;

      const multicall = new Multicall(hre.ethers.provider, multicallAddress);

      const erc20Interface = new ethers.utils.Interface(ERC20Abi);
      const uniswapPairInterface = new ethers.utils.Interface(UniswapPairAbi);

//https://www.quicknode.com/guides/defi/how-to-interact-with-uniswap-using-javascript
//    const dai = await Fetcher.fetchTokenData(chainId, tokenAddress, customHttpProvider);
//    const weth = WETH[chainId];
//    const pair = await Fetcher.fetchPairData(dai, weth, customHttpProvider);
//    const route = new Route([pair], weth);

//

      for (const [name] of Object.entries(uniswapClones)) {
        console.log(`Scanning token pairs of ${name}`);

        const pairs = JSON.parse(
          (
            await fs.readFile(`./pairs/${name}.json`).catch(() => "[]")
          ).toString()
        );
//        var pairsNotUniq = JSON.parse(
//          (
//            await fs.readFile(`./pairs/${name}.json`).catch(() => "[]")
//          )
//        );
//	console.log(pairsNotUniq);
//	const pairs=[...new Set(pairsNotUniq)].toString();


        if (pairs.length === 0) {
          console.log("No local pairs found (tip: run 'fetch-pairs' first)");
        }
	var start=0;
        for (const pairAddress of pairs) {
	    if (start!=1 && (pairAddress==lastPair || lastPair=='')){
		start=1;
		console.log('Start!');
	    }
	    if (start==0){
		continue;
	    }
	    try{
		var token0Data,token1Data,getReservesData;
            [
            token0Data,
            token1Data,
            getReservesData,
          ] = await multicall.aggregate(uniswapPairInterface, [
            {
              target: pairAddress,
              method: "token0",
              args: [],
            },
            {
              target: pairAddress,
              method: "token1",
              args: [],
            },
            {
              target: pairAddress,
              method: "getReserves",
              args: [],
            },
          ]);

          var token0: string = token0Data[0];
          var token1: string = token1Data[0];
          const reserve0: ethers.BigNumber = getReservesData[0];
          const reserve1: ethers.BigNumber = getReservesData[1];

	var balanceOf0Data, balanceOf1Data,decimals0=18,decimals1=18;
           [balanceOf0Data, balanceOf1Data] = await multicall.aggregate(
            erc20Interface,
            [
              {
                target: token0,
                method: "balanceOf",
                args: [pairAddress],
              },
              {
                target: token1,
                method: "balanceOf",
                args: [pairAddress],
              },
            ]
          );

          const balanceOf0: ethers.BigNumber = balanceOf0Data[0];
          const balanceOf1: ethers.BigNumber = balanceOf1Data[0];

	  var BalanceDiff0: ethers.BigNumber=balanceOf0.sub(reserve0);
	  var BalanceDiff1: ethers.BigNumber=balanceOf1.sub(reserve1);
//	    const USD0=await getValue(BalanceDiff0.div(web3.utils.toBN(10).pow(web3.utils.toBN(18))), await getPrice(token0,network))
//	    const USD1=await getValue(BalanceDiff1.div(web3.utils.toBN(10).pow(web3.utils.toBN(18))), await getPrice(token1,network))
//	    const USD0=await getValue(ethers.utils.formatUnits(BalanceDiff0, "ether"), await getPrice(token0,network))
//	    const USD1=await getValue(ethers.utils.formatUnits(BalanceDiff1, "ether"), await getPrice(token1,network))
//	    console.log(`${token0} ${token1}`);
//	    console.log(` USD0 : ${USD0} , USD1 : ${USD1}`);
//	    BalanceDiff0=ethers.BigNumber.from('50000000000000000');
//	    BalanceDiff1=ethers.BigNumber.from('-25876553368045583127');
//	    token0='0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
//	    token1='0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
	  if (!BalanceDiff0.eq(0) || !BalanceDiff1.eq(0)){

//	    const amount0=Number(BalanceDiff0.div(ethers.BigNumber.from(10).pow(ethers.BigNumber.from(decimals0))));
//	    const amount1=Number(BalanceDiff1.div(ethers.BigNumber.from(10).pow(ethers.BigNumber.from(decimals1))));

//#https://ethereum.stackexchange.com/questions/84004/ethers-formatetherwei-with-max-4-decimal-places/97885
	    let amount0=ethers.utils.formatUnits(BalanceDiff0, decimals0);
	    amount0 = (+amount0).toFixed(8);
	    let amount1=ethers.utils.formatUnits(BalanceDiff1, decimals1);
	    amount1 = (+amount1).toFixed(8);

	    const USD0=await getValue(amount0, await getPrice(token0.toLowerCase(),network))
	    const USD1=await getValue(amount1, await getPrice(token1.toLowerCase(),network))
//	    const USD0=await getValue(ethers.utils.formatUnits(BalanceDiff0, "ether"), await getPrice(token0,network))
//	    const USD1=await getValue(ethers.utils.formatUnits(BalanceDiff1, "ether"), await getPrice(token1,network))
	    if ((USD0=='no' || USD0<minDollarValue) && (USD1 == 'no' || USD1<minDollarValue)){
		    continue
	    }
	    if (((USD0!='no' && USD0>markDollarValue) || (USD1 != 'no' && USD1>markDollarValue)) && BalanceDiff0.gte(0) && BalanceDiff1.gte(0)){
//		    console.log('!!!');
		    console.log(` !!! token0 : ${token0} , token1 : ${token1}`);
	    }

          console.log(
            balanceOf0.sub(reserve0).toString(),
            balanceOf1.sub(reserve1).toString(),
            pairAddress,
	    `amount0 : ${amount0} , USD0 val: ${USD0} `,colors.yellow(USD0),
	    `amount1 : ${amount1} , USD1 val: ${USD1} `,colors.yellow(USD1)
          );
//	    console.log(`token0 : ${token0} , token1 : ${token1}`);
	  }
	    }
	    catch(error){
//	    console.log(`Error pair ${pairAddress}`);
	    continue;
	    }

        }
      }
    } else {
      console.log("Unsupported network");
    }
  }
);

const getPrice = async (address: string,network) => {
	const networkResolver = new Map([
	    ['mainnet','ethereum'],
	    ['bsc','binance-smart-chain'],
	    ['xdai','xdai'],
	    ['polygon','polygon-pos'],
	    ['avax','avalanche'],
	    ])
	const netName=networkResolver.get(network)
	try {
		const URL=`https://api.coingecko.com/api/v3/simple/token_price/${netName}?contract_addresses=${address}&vs_currencies=USD`;
//		console.log(`${network} ${netName} URL : ${URL}`);
		const response = await axios.get(URL);
//		console.log(`response ${response.data}`);
//		console.log(response.data,response.data[address]);
		const price = await response.data[address].usd;
//		console.log(`price : ${price}`);
		return price;
	} catch {
		return 'no';
	}
};

const getValue = (amount, price) => {
	if (price === 'no') {
		return price;
	}

	const amnt = typeof amount === 'number' ? amount : Number(amount);
	const prc = typeof price === 'number' ? price : Number(price);
	const value = Number(amnt * prc).toFixed(2);
	return Number(value).toLocaleString();
};
