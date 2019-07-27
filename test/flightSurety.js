
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    //config.flightSuretyApp.address means flightSuretyApp contracts' address
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address); 
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(util) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(util) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(util) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(util) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) can register an Airline using registerAirline() until there are four airlineds', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    // ACT
    await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    let result = await config.flightSuretyData.isAirline.call(newAirline); 
    // ASSERT
    assert.equal(result, true, "Airline cannot register a new airline");

  });

  it('(multiparty) can register by using multi party when there are more than four airlines', async() => {
    //let airlineNum = await config.flightSuretyData.getAirlineNum.call();
    //console.log(airlineNum);
    let newAirline = accounts[2];
    let newAirline2 = accounts[3];
    let newAirline3 = accounts[4];
    let newAirline4 = accounts[5];

    await config.flightSuretyApp.registerAirline(newAirline2, {from: newAirline});
    await config.flightSuretyApp.registerAirline(newAirline3, {from: newAirline2});
    await config.flightSuretyApp.registerAirline(newAirline4, {from: newAirline3});
    var result = await config.flightSuretyData.isAirline.call(newAirline4); 
    assert.equal(result, false, "Airline cannot be registered until got votes more than half of total airline");
    await config.flightSuretyApp.vote(newAirline4, {from: newAirline});
    await config.flightSuretyApp.vote(newAirline4, {from: newAirline2});
    result = await config.flightSuretyData.isAirline.call(newAirline4); 
    assert.equal(result, true, "Airline should be registered as it is voted more than half of total airline");

  });
 
  it('(airline) can fund in order to participate service', async() => {
    let newAirline3 = accounts[4];
    var sendAmount = web3.utils.toWei("2", "ether");
    await config.flightSuretyApp.fundAirline({from: newAirline3, value: sendAmount});
    var result = await config.flightSuretyData.isFunded.call({from: newAirline3});
    assert.equal(result, true, "Funding is not enough");
  });

  it('(airline) can register flight', async() => {
      let newAirline3 = accounts[4];
      var now = new Date().getTime()/60000;
      now = Math.floor(now);
      await config.flightSuretyApp.registerFlight(newAirline3, 'first Flight', now, {from: newAirline3});
  });

  it('(passenger) can buy flight insurance', async() => {
      let newAirline3 = accounts[4];
      let passenger = accounts[6];
      var now = new Date().getTime()/60000; //ignore time difference in 10 minutes
      now = Math.floor(now);
      var sendAmount = web3.utils.toWei("1", "ether");
      await config.flightSuretyApp.buyInsurance(newAirline3, 'first Flight', now, {from: passenger, value: sendAmount});
      var result = await config.flightSuretyData.isInsured.call(newAirline3, 'first Flight', now, {from: passenger});
      assert.equal(result, true, "Insurance is not bought successfully");
  });

});
