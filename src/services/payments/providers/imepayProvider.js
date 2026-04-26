// IME Pay Mock Provider

async function initiateTransfer(params) {
  // Simulate API call
  return {
    status: 'pending',
    amount: params.amount,
    fee: 10,
    fx_rate: 132.5,
    provider: 'imepay',
    mock: true,
  };
}

async function checkTransferStatus(transferId) {
  // Simulate status check
  return {
    status: 'completed',
    transferId,
    provider: 'imepay',
    mock: true,
  };
}

async function getExchangeRate(params) {
  // Simulate FX rate
  return {
    fx_rate: 132.5,
    provider: 'imepay',
    mock: true,
  };
}

module.exports = {
  initiateTransfer,
  checkTransferStatus,
  getExchangeRate,
};
