const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Web3 = require("web3");

const REPORT_FILE = path.join(__dirname, './data/withdraw.csv');
const TOPIC = '0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15';

const web3 = new Web3('https://late-crimson-violet.matic.discover.quiknode.pro/da818ce3d9a6c854832472061623bd74e918afdc/');

class WithdrawModel {
    constructor() {
        this.lastBlock = 36041830;
        this.writer = fs.createWriteStream(REPORT_FILE, { flags: "a" });
        this.blockts = {};
        this.model = {};
    }

    run() {
        this.interval = setInterval(async () => {
            try {
                await this.crawl();
            } catch (err) { console.log(`Crawl ERROR`, err); }
        }, 30000)
    }

    async crawl() {
        const startMs = Date.now();
        const toBlock = await web3.eth.getBlockNumber();
        const fromBlock = toBlock - this.lastBlock > 2000 ? toBlock - 2000 : this.lastBlock;
        const pastLogs = await web3.eth.getPastLogs({
            fromBlock,
            toBlock,
            address: process.env.SALES_ADDRESS,
            topics: [TOPIC],
        })
        
        for (let log of pastLogs) {
            await this.onLog(log);
        }
        const ms = Date.now() - startMs;
        console.log(`Crawl BUY logs [${fromBlock}-${toBlock}]: ${pastLogs.length} (${ms}ms)`)
    }

    async getTime(block) {
        if (!this.blockts[block]) {
            const time = new Date((await web3.eth.getBlock(block)).timestamp * 1000);
            this.blockts[block] = time;
        }
        return this.blockts[block];
    }

    async onLog(log) {
        this.lastBlock = log.blockNumber;
        const txid = log.transactionHash;
        if (this.buyTx[txid]) return;
        const contractAddress = log.address;
        const userAddress = web3.eth.abi.decodeParameters(['address'], log.topics[1])[0]
        const values = web3.eth.abi.decodeParameters(['uint256'], log.data)
        const burnAmount = parseInt(values[0].toString(10));
        const time = await this.getTime(log.blockNumber);
        this.writer.write(`${contractAddress},${userAddress},${burnAmount},${time}\n`);
        if(!this.model[contractAddress+","+userAddress]){
            this.model[contractAddress+","+userAddress] = []
        }
        this.model[item.contractAddress + "," + item.userAddress].push({
            poolAddress : contractAddress,
            userAddress : userAddress,
            burnAmount : burnAmount,
            time : time
        });
    }

    async warmup() {
        await this.loadReport();
    }
    loadReport() {
        const reader = fs.createReadStream(REPORT_FILE).pipe(csv())
            .on('data', (item) => {
                this.model[item.contractAddress + "," + item.userAddress].push({
                    poolAddress : item.contractAddress,
                    userAddress : item.userAddress,
                    burnAmount : item.burnAmount,
                    time : item.time
                });
            });
        return new Promise((res, rej) =>
            reader.on('end', () => res()).on('error', err => rej(err))
        )
    }
    getAllWithdrawal(index) {
        return this.model[index];
    }


}

module.exports = WithdrawModel;