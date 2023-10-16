export default {
  routes: [
    { 
      method: 'GET',
      path: '/wallet',
      handler: 'wallet.getUserWallet',
    },
    { 
      method: 'GET',
      path: '/wallet/transactions',
      handler: 'wallet.getWalletTransactions',
    },
    { 
      method: 'POST',
      path: '/wallet/top-up',
      handler: 'wallet.paymentTopUp',
    },
    { 
      method: 'POST',
      path: '/paystack/webhook',
      handler: 'wallet.paystackWebhook',
    },
  ]
}