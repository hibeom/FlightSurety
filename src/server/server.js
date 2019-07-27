import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
require('babel-polyfill')


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
const NUMBER_OF_ORACLES = 20;
let registeredOracles = [];
let STATUS_CODES = [0, 10, 20, 30, 40, 50];

async function RegisterOracles() {
  // Authorize application contract
  await flightSuretyData.methods.authorizeContract(flightSuretyApp._address);

  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  let accounts = await web3.eth.getAccounts();

  for(let i=1; i<NUMBER_OF_ORACLES; i++) {
    await flightSuretyApp.methods.registerOracle().send({ from: accounts[i], value: fee, gas: '300000', gasPrice: '100000000'});
    console.log(`Registered oracle ${i}.  Retrieving indexes.`);
    let result = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[i]});
    var sub = {
      address: accounts[i],
      indexes: result
    }
    registeredOracles.push(sub);
    console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
  }
}

RegisterOracles();

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, async function (error, event) {
    let accounts = await web3.eth.getAccounts();

    if (error) {
      console.log(error);
    } else {
      let index = event.returnValues.index;
      let airline = event.returnValues.airline;
      let flight = event.returnValues.flight;
      let timestamp = event.returnValues.timestamp;
      let statusCode = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];

      for(let i = 0; i < registeredOracles.length; i++) {
        if(registeredOracles[i].indexes.includes(index)) {
          try{
            await flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode)
            .send({from: registeredOracles[i].address});

            console.log('Process credit insuree');
          } catch(e) {
            console.log('No need to process any credit insuree');
          }
        }
      }      
    }
  });

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
});

export default app;


