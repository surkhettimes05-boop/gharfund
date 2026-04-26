// Payment Abstraction Layer
// Provides a unified interface for payment providers (IME Pay, PrabhuPay)


import imepayProvider from './providers/imepayProvider.js';
import prabhupayProvider from './providers/prabhupayProvider.js';

// Set default provider (can be switched easily)
let currentProvider = imepayProvider;

function setProvider(providerName) {
  if (providerName === 'imepay') currentProvider = imepayProvider;
  else if (providerName === 'prabhupay') currentProvider = prabhupayProvider;
  else throw new Error('Unknown provider');
}

async function initiateTransfer(params) {
  // Add a mock transaction_id for real execution
  const resp = await currentProvider.initiateTransfer(params);
  if (!resp.transaction_id) {
    resp.transaction_id = 'mock-' + Math.random().toString(36).substring(2, 12);
  }
  return resp;
}

async function checkTransferStatus(transferId) {
  return currentProvider.checkTransferStatus(transferId);
}

async function getExchangeRate(params) {
  return currentProvider.getExchangeRate(params);
}

export default {
  setProvider,
  initiateTransfer,
  checkTransferStatus,
  getExchangeRate,
};
