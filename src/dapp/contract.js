import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    // Modify to have flight, airline, timestamp
    fetchFlightStatus(flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: timestamp
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    authorizeContract(callback) {
        let self = this;
        console.log(self.flightSuretyApp._address);
        self.flightSuretyData.methods.authorizeContract(self.flightSuretyApp._address)
        .send({from: self.owner}, callback);
    }

    registerAirline(airline, callback){
        let self = this;
        self.flightSuretyData.methods.registerAirline(airline).send({from: self.owner}, callback);
    }

    isAirline(airline, callback) {
        let self = this;
        self.flightSuretyData.methods.isAirline(airline).call({from: self.owner}, callback);
    }

    initialAirlineNum() {
        let self = this;
        self.flightSuretyData.methods.initialAirlineNum().send({from: self.owner});
    }

    fundAirline(callback){
        let self = this;
        self.flightSuretyApp.methods.fundAirline()
        .send({from: self.airlines[0], value: self.web3.utils.toWei('2', 'ether')}, callback);
    }

    registerFlight(airline, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods.registerFlight(airline, flight, timestamp)
        .send({from: self.airlines[0], gas: 6500000}, callback);
    }

    buyInsurance(airline, flight, timestamp, callback) {
        let self = this;
        var sending = Web3.utils.toWei('1', 'ether');
        self.flightSuretyApp.methods.buyInsurance(airline, flight, timestamp)
        .send({from: self.passengers[0], gas: 6500000, value: sending}, callback);
    }

}