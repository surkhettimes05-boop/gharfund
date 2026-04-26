// PrabhuPay Mock Provider

async function initiateTransfer(params) {
  // Simulate API call
  return {
    status: 'pending',
    amount: params.amount,
    fee: 12,
    fx_rate: 132.0,
    provider: 'prabhupay',
    mock: true,
  };
}

async function checkTransferStatus(transferId) {
  // Simulate status check
  return {
    status: 'completed',
    transferId,
    provider: 'prabhupay',
    mock: true,
  };
}

async function getExchangeRate(params) {
  // Simulate FX rate
  return {
    fx_rate: 132.0,
    provider: 'prabhupay',
    mock: true,
  };
}

module.exports = {
  initiateTransfer,
  checkTransferStatus,
  getExchangeRate,
};
