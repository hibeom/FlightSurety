var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "awake more legal butter slim attract reopen radio title theme special notable";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*',
      gas: 5500000
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};