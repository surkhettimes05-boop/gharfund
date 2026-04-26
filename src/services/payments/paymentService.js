// Payment Abstraction Layer
// Provides a unified interface for payment providers (IME Pay, PrabhuPay)

const imepayProvider = require('./providers/imepayProvider');
const prabhupayProvider = require('./providers/prabhupayProvider');

// Set default provider (can be switched easily)
let currentProvider = imepayProvider;

function setProvider(providerName) {
  if (providerName === 'imepay') currentProvider = imepayProvider;
  else if (providerName === 'prabhupay') currentProvider = prabhupayProvider;
  else throw new Error('Unknown provider');
}

async function initiateTransfer(params) {
  return currentProvider.initiateTransfer(params);
}

async function checkTransferStatus(transferId) {
  return currentProvider.checkTransferStatus(transferId);
}

async function getExchangeRate(params) {
  return currentProvider.getExchangeRate(params);
}

module.exports = {
  setProvider,
  initiateTransfer,
  checkTransferStatus,
  getExchangeRate,
};
