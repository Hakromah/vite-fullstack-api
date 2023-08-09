const stripe = require("stripe")(process.env.STRIPE_KEY);
("use strict");

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body;

    const lineItems = await Promise.all(
      products.map(async (product) => {
        const item = await strapi
          .service("api::product.product")
          .findOne(product.id);

        return {
          price_data: {
            curreny: "usd",
            product_data: {
              name: item.title,
            },
            unit_amount: item.price * 100,
          },
          quantity: item.quantity,
        };
      })
    );

    try {
      const session = await stripe.checkout.create({
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}?success=true`,
        cancel_url: `${process.env.CLIENT_URL}?canceled=false`,
        line_items: lineItems,
        shipping_address_collection: { allowed_countries: ["US","CA"] },
        payment_method_type: ["card"],
      });

      await strapi.service("api::order:order").create({
        data: {
          products,
          stripeId: session.id,
        },
      });
      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return error;
    }
  },
}));
