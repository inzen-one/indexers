const express = require('express');

const WithdrawModel = require("./withdrawObserver");
const DepositsModel = require("./depositsObserver");

const withdrawModel = new WithdrawModel();
const depositsModel = new DepositsModel();

const app = express();
app.use(express.json());


app.get('/deposits', async (req, res) => {
    const poolAddress = req.params.poolAddress;
    const userAddress = req.params.userAddress;
    return res.json(depositsModel.getAllDeposits(poolAddress + "," + userAddress));
});

app.get('/withdraws', async (req, res) => {
    const poolAddress = req.params.poolAddress;
    const userAddress = req.params.userAddress;
    return res.json(withdrawModel.getAllWithdrawal(poolAddress + "," + userAddress));
});

async function start(port) {
    const startMs = Date.now();

    await withdrawModel.warmup();
    await depositsModel.warmup();
    withdrawModel.run();
    depositsModel.run();
    app.listen(port);

    const ms = Date.now() - startMs;
    console.log(`Service start at port ${port} (${ms}ms)`)
}

start(15003);