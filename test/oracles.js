
var Test = require('../config/testConfig.js');
//var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address); 

    // Watch contract events
    const STATUS_CODE_UNKNOWN = 0;
    const STATUS_CODE_ON_TIME = 10;
    const STATUS_CODE_LATE_AIRLINE = 20;
    const STATUS_CODE_LATE_WEATHER = 30;
    const STATUS_CODE_LATE_TECHNICAL = 40;
    const STATUS_CODE_LATE_OTHER = 50;

  });


  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('(airline) can fund in order to participate service', async() => {
    var sendAmount = web3.utils.toWei("2", "ether");
    await config.flightSuretyApp.fundAirline({from: config.firstAirline, value: sendAmount});
    var result = await config.flightSuretyData.isFunded.call({from: config.firstAirline});
    assert.equal(result, true, "Funding is not enough");
  });

  it('(airline) can register flight', async() => {
    let flight = 'ND1309'; // Course number
    let now = Math.floor(Date.now() / 60000);
    await config.flightSuretyApp.registerFlight(config.firstAirline, flight, now, {from: config.firstAirline});
  });

  it('(passenger) can buy flight insurance', async() => {
    let flight = 'ND1309'; // Course number
    let passenger = accounts[6];
    let now = Math.floor(Date.now() / 60000);
    var sendAmount = web3.utils.toWei("1", "ether");
    await config.flightSuretyApp.buyInsurance(config.firstAirline, flight, now, {from: passenger, value: sendAmount});
    var result = await config.flightSuretyData.isInsured.call(config.firstAirline, flight, now, {from: passenger});
    assert.equal(result, true, "Insurance is not bought successfully");
  });




  it('can request flight status', async () => {
    
    // ARRANGE
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 60000);

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flight, timestamp);
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
      for(let idx=0;idx<3;idx++) {

        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx].toNumber(), config.firstAirline, flight, timestamp, 10, { from: accounts[a] });
        }
        catch(e) {
          // Enable this when debugging
           console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
        }
        //await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flight, timestamp, 10, { from: accounts[a] });

      }
    }


  });


 
});
