import { ethers } from "ethers";
import * as fs from "fs/promises";
import { task } from "hardhat/config";

import UniswapFactoryAbi from "../abis/UniswapFactory.json";
import Multicall from "../utils/multicall";

task("fetch-pairs", "Fetch token pairs from Uniswap factories").setAction(
  async (_args, hre) => {
    const network = hre.network.name;
    const config = hre.config.uniswapSkimScanner;

    if (network in config) {
      const multicallAddress = config[network].multicallAddress;
      const uniswapClones = config[network].uniswapClones;

      const multicall = new Multicall(hre.ethers.provider, multicallAddress);

      const uniswapFactoryInterface = new ethers.utils.Interface(
        UniswapFactoryAbi
      );

      for (const [name, factoryAddress] of Object.entries(uniswapClones)) {
        console.log(`Retrieving token pairs of ${name}`);

        const [allPairsLengthData] = await multicall.aggregate(
          uniswapFactoryInterface,
          [
            {
              target: factoryAddress,
              method: "allPairsLength",
              args: [],
            },
          ]
        );

        let numPairs = Number(allPairsLengthData[0]);

        console.log(`Detected ${numPairs} token pairs`);

        let allPairs: string[] = [];

        // On-chain read might timeout if we try to read too much data
        // so we need to cap the number of pairs we read at once
        const MAX_PAIRS_READ = 1000;
//        const MAX_PAIRS_READ = 500;
        while (numPairs > 0) {
	    console.log(numPairs);
//	    console.log([...Array(Math.min(numPairs, MAX_PAIRS_READ)).keys()]);
	    try{
          const allPairsData = await multicall.aggregate(
            uniswapFactoryInterface,
            [...Array(Math.min(numPairs, MAX_PAIRS_READ)).keys()].map((i) => ({
              target: factoryAddress,
              method: "allPairs",
//              args: [i],
              args: [numPairs-i-1],
            }))
          );

          allPairs = [
            ...allPairs,
            ...allPairsData.map((pairData) => pairData[0]),
          ];
          numPairs -= MAX_PAIRS_READ;
	    }
	    catch(e){
	    console.log(e);
	    }
        }

//duplicates
	console.log(allPairs);
	const allPairsUniq=[...new Set(allPairs)];
//	const allPairsUniq = allPairs.filter((x, i) => i === allPairs.indexOf(x))
        await fs.writeFile(
          `./pairs/${name}.json`,
          JSON.stringify(allPairsUniq, null, 2)
        );

        console.log(`Token pairs saved to './pairs/${name}.json'`);
      }
    } else {
      console.log("Unsupported network");
    }
  }
);
