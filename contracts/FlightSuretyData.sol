pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                              // Account used to deploy contract
    bool private operational = true;                            // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;    // Only access authorizedContracts
    mapping(address => Airline) private airlines;               // Registered airlines
    uint256 public airlineNum = 0;                              // Airline registers a new airline until there are four airlines registered
    mapping(address => uint256) creaditBalances;                // credit balance of each passengers
    mapping(bytes32 => Insuree) insurees;                     // store insuree address of each fligth
    mapping(bytes32 => address[]) passengers;

    struct Airline {
        bool isRegistered;
        uint256 fundAmount;
        uint256 votes;
        bool isFunded;
    }

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }

    mapping(bytes32 => Flight) private flights;                 // Storing flights information

    struct Insuree {
        mapping(address => uint8) isInsured;
    }

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event CheckKey(bytes32 key, address passenger, uint256 result);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor() public {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the Application contract is authorized
    */
    modifier requireIsCallerAuthorized() {
        require(authorizedContracts[msg.sender] == 1, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /**
    * @dev Authorize Application contract
    *
    */    
    function authorizeContract(address contractAddress) external requireContractOwner {
        authorizedContracts[contractAddress] = 1;
    }

    function deauthorizeContract(address contractAddress) external requireContractOwner {
        delete authorizedContracts[contractAddress];
    }

    function getAirlineNum() public returns (uint256){
        return airlineNum;
    }

    function initialAirlineNum() public {
        airlineNum = 0;
    }
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline(address newAirline)
    requireIsOperational external {
        //if airlineNum is smaller than 4, there is no need to vote
        if(airlineNum < 4) {
            airlines[newAirline] = Airline({
                isRegistered: true,
                fundAmount: 0,
                votes: 0,
                isFunded: false
            });
            airlineNum = airlineNum + 1;
        } else {
            airlines[newAirline] = Airline({
                isRegistered: false,
                fundAmount: 0,
                votes: 0,
                isFunded: false
            });
        }
        
    }

    function vote(address airline)
    requireIsOperational requireIsCallerAuthorized external {
        airlines[airline].votes++;
        if(airlines[airline].votes >= airlineNum.div(2)) {
            airlines[airline].isRegistered = true;
            airlineNum++;
        }
    }

    function registerFlight(bytes32 key, address airline, string flight, uint256 timestamp)
    external requireIsCallerAuthorized requireIsOperational{
        Flight memory newFlight = Flight({
            isRegistered: true,
            statusCode: 0,
            updatedTimestamp: timestamp,
            airline: airline
        });
        flights[key] = newFlight;
    }

    /**
    * @dev Check the airline is registered
    *
    * @return true if the airline is registered
    */
    function isAirline (address airline)
    requireIsOperational external returns(bool) {
        if(airlines[airline].isRegistered == true) {
            return true;
        } else {
            return false;
        }
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(bytes32 key, address passenger)
    requireIsOperational external payable {
        require(flights[key].isRegistered, "That flight is not registered yet");
        insurees[key].isInsured[passenger] = 1;
        passengers[key].push(passenger);
    }

    /** 
    * @dev Check insurance is purchased
    */
    function isInsured(address airline, string flight, uint256 timestamp)
    requireIsOperational public returns(bool) {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        uint256 comp = insurees[key].isInsured[msg.sender];
        if (comp >= 1) {
            return true;
        } else {
            return false;
        }
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(bytes32 key)
    external requireIsOperational requireIsCallerAuthorized {
        for(uint8 i = 0; i < passengers[key].length; i++) {
            address insuree = passengers[key][i];
            uint256 credit = 1.5 ether;
            delete insurees[key].isInsured[insuree];
            creaditBalances[insuree].add(credit);
        }
        delete passengers[key];
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(address insuree)
    external payable requireIsOperational requireIsCallerAuthorized {
        require(creaditBalances[insuree] > 0, "Passenger has no credit balance");
        uint256 amount = creaditBalances[insuree];
        creaditBalances[insuree] = 0;
        insuree.transfer(amount);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund (address airline) public requireIsCallerAuthorized payable {
        airlines[airline].isFunded = true;
    }

    function isFunded () public returns(bool){
        return airlines[tx.origin].isFunded;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable {
        //fund(msg.sender);
    }

}
