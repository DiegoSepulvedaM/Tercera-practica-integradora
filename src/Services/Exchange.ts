import * as Sentry from "@sentry/node";
import { Collection } from "mongodb";
import config from "../config/config";
import { getDBConnection } from "../config/database";
import { HapiHandler } from "../Types/Hapi";
import { ExchangeRequest, RateDocument } from "../Types/Exchange";
import logger from "../config/logger";

Sentry.init({
  dsn: config.app.sentry_dns,
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

function validateCurrency(currency: string): string {
  const currencies = [
    "DOP",
    "PEN",
    "COP",
    "ARS",
    "PAB",
    "USD",
    "CLP",
    "CAD",
    "CLF",
  ];

  if (!currencies.includes(currency)) {
    throw new Error("The currency is not valid");
  }

  return currency.toUpperCase();
}

function validateAmount(amount: number): number {
  if (typeof amount !== "number" || amount < 0) {
    throw new Error(`invalid amount`);
  }

  return amount;
}

export default class Exchange {
  static exchange: HapiHandler = async (request, h) => {
    try {
      const exchangeRequest: ExchangeRequest = JSON.parse(
        JSON.stringify(request.payload)
      );

      logger.info("Obteniendo Payload");

      const from = {
        currency: validateCurrency(
          exchangeRequest.from.currency.toUpperCase()
        ) as string,
        amount: validateAmount(exchangeRequest.from.amount) as number,
      };

      const to = {
        currency: validateCurrency(
          exchangeRequest.to.currency.toUpperCase()
        ) as string,
        amount: 0,
      };

      to.amount = from.amount;

      const toSameCurrency = from.currency === to.currency;

      const conversionRate = toSameCurrency ? 1 : null;
      const timestamp = toSameCurrency ? Math.floor(Date.now() / 1000) : null;

      if (!toSameCurrency) {
        logger.info("Conectando A base de datos");

        const db = await getDBConnection();

        if (db) {
          const ratesCollection: Collection<RateDocument> =
            db.collection("rates");

          const ratesFromDB: RateDocument[] = await ratesCollection
            .find({
              currency_code_from: from.currency,
              currency_code_to: to.currency,
            })
            .toArray();

          // Convertir los documentos a objetos con propiedades 'rate' y 'timestamp'
          const rates: { rate: number; timestamp: number }[] = ratesFromDB.map(
            (doc) => ({ rate: doc.rate, timestamp: doc.timestamp })
          );

          // Buscar el rate correspondiente
          const rate = rates.find((rateObj) => rateObj.rate === conversionRate);

          if (rate) {
            to.amount *= rate.rate; // Utilizar la variable 'rate' en lugar de 'rates'
            to.amount = Number.parseFloat(to.amount.toFixed(2));
          } else {
            return h
              .response({
                success: false,
                message: "Rate not found.",
              })
              .code(404);
          }
        } else {
          return h
            .response({
              success: false,
              message: "Failed to connect to the database.",
            })
            .code(500);
        }
      }

      return h
        .response({
          success: true,
          data: {
            from,
            to,
            rate: conversionRate,
            timestamp,
          },
        })
        .code(200);
    } catch (err) {
      Sentry.captureException(err);

      throw err;
    }
  };
}
