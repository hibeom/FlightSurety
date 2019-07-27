
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            displayFlight();
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        // Authorize contract
        contract.authorizeContract((error, result) => {
            console.log(error, result);
        });

        contract.initialAirlineNum();

        // Register airline
        contract.registerAirline(contract.airlines[0], (error, result) => {
            console.log(error, result);
        });

        contract.isAirline(contract.airlines[0], (error, result) => {
            console.log(error, result);
        });

        // Fund airline
        contract.fundAirline((error, result) => {
            console.log(error, result);
        });

        // Register flight (use register flight button)
        contract.registerFlight(contract.airlines[0], 'UdaFlight', 26065854, (error, result) => {
            console.log(error, result);
            addFlight('UdaFlight',26065854);
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            let timestamp = DOM.elid('flight-timestamp').value;
            // Write transaction
            contract.fetchFlightStatus(flight, timestamp, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        // Register flight (use register flight button)
        DOM.elid('submit-flight').addEventListener('click', () => {
            let airline = contract.airlines[0];
            let flight = DOM.elid('flight-name').value;
            let timestamp = Math.floor(Date.now() / 60000);
            contract.registerFlight(airline, flight, timestamp, (error, result) => {
                console.log(error, result);
            });
            contract.buyInsurance(airline, flight, timestamp, (error, result) => {
                console.log(error, result);
            });
            addFlight(flight, timestamp);
        })
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}

function displayFlight() {
    let displayDiv = DOM.elid("display-flight");
    let section = DOM.section();
    section.appendChild(DOM.h2('Flight List'));
    section.appendChild(DOM.h5('Check available flights and register new flight'));

    displayDiv.append(section);
}

function addFlight(flight, timestamp) {
    let displayDiv = DOM.elid("display-flight");
    let section = DOM.section();
    section.appendChild(DOM.span(flight + ' ' + timestamp));
    displayDiv.append(section);
}






