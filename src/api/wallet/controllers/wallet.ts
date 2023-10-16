/**
 * wallet controller
 */
import { factories } from '@strapi/strapi'
import PayStack, { PaystackEventEnum } from 'paystack-api-ts';

export default factories.createCoreController('api::wallet.wallet', ({strapi}) => {
  const paystack = new PayStack(process.env.PAYSTACK_SECRET_KEY)
  return {
    async getUserWallet(ctx) {
      const [wallet] = await strapi.entityService.findMany("api::wallet.wallet", {
        filters: {
          user: ctx.state.user.id
        }
      })
      return { wallet };
    },

    async getWalletTransactions(ctx) {
      const [wallet] = await strapi.entityService.findMany("api::wallet.wallet", {
        filters: {
          user: ctx.state.user.id
        }
      })

      const transactions = await strapi.entityService.findMany("api::transaction.transaction", {
        filters: {
          wallet: wallet.id as any
        }
      });

      return {transactions}
    },

    async paymentTopUp(ctx) {
      const {body} = ctx.request;
      const {user} = ctx.state;
  
      const [wallet] = await strapi.entityService.findMany("api::wallet.wallet", {
        filters: {
          user: user.id
        }
      });

      const intent = await paystack.transactions.initialize({
        metadata: { walletId: wallet?.id, isDebit: false },
        amount: `${body.amount * 100}`,
        email: user.email,
      });

      return {
        authorizationUrl: intent.authorizationUrl,
        accessCode: intent.accessCode,
        reference: intent.reference,
      }
    },
    
    async paystackWebhook(ctx) {
      const event = paystack.webhook.handler<{ 
        walletId: string, 
        isDebit: string,
      }>(ctx.request);

      if (!event) return ctx.badRequest();
      if (event.event !== PaystackEventEnum.CHARGE_SUCCESS) {
        return ctx.send({}, 200);
      }

      const wallet = await strapi.entityService.findOne("api::wallet.wallet", +event.data.metadata?.walletId);

      if (!wallet) {
        console.log("no wallet found for event:", event.data);
        return ctx.send({}, 200);
      }

      const realAmount = event.data.amount / 100;
      const isDebit = event.data.metadata.isDebit === "true" ? true : false;

      await strapi.entityService.create("api::transaction.transaction", {
        data: {
          wallet: wallet.id,
          amount: realAmount,
          isDebit,
        }
      });

      if (isDebit) {
        wallet.balance -= realAmount
      } else {
        wallet.balance += realAmount
      }

      await strapi.entityService.update("api::wallet.wallet", wallet.id, {
        data: {
          balance: wallet.balance
        } 
      })

      ctx.send({}, 200);
    }
  }
});
