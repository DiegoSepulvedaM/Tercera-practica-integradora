import * as Sentry from "@sentry/node";
import axios from "axios";
import config from "../config/config";
import { getDBConnection } from "../config/database";
import { HapiHandler } from "../Types/Hapi";
import { Rates, updateRequest } from "../Types/Exchange";

Sentry.init({
  dsn: config.app.sentry_dns,
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

export default class Update {
  static update: HapiHandler = async (request, h) => {
    try {
      const db = await getDBConnection();

      const exchangeRequest: updateRequest = JSON.parse(
        JSON.stringify(request.payload)
      );

      console.log(exchangeRequest);

      const pairs = exchangeRequest.currencies.map((v) => `USD${v}`);

      try {
        const endpoint = `https://www.freeforexapi.com/api/live?pairs=${pairs.join(
          ","
        )}`;

        const response = await axios.get(endpoint);

        const rates: Rates[] = [];

        exchangeRequest.currencies.forEach((fromCurrency) => {
          exchangeRequest.currencies.forEach((toCurrency) => {
            if (fromCurrency === toCurrency) {
              return;
            }

            // If USD is not in From currency or To currency, we need to transform to USD first
            // and then to the To currency because the rates are USD-based
            if (fromCurrency !== "USD" && toCurrency !== "USD") {
              const fromUSDRate =
                1 / response.data.rates[`USD${fromCurrency}`].rate;
              const USDToRate = response.data.rates[`USD${toCurrency}`].rate;

              const rate = fromUSDRate * USDToRate;

              rates.push({
                currency_code_from: fromCurrency,
                currency_code_to: toCurrency,
                rate,
                timestamp: Math.min(
                  response.data.rates[`USD${fromCurrency}`].timestamp,
                  response.data.rates[`USD${fromCurrency}`].timestamp
                ),
              });

              return;
            }

            const nonUSDcurrency =
              fromCurrency === "USD" ? toCurrency : fromCurrency;

            const rate =
              fromCurrency === "USD"
                ? response.data.rates[`USD${nonUSDcurrency}`].rate
                : 1 / response.data.rates[`USD${nonUSDcurrency}`].rate;

            rates.push({
              currency_code_from: fromCurrency,
              currency_code_to: toCurrency,
              rate,
              timestamp: response.data.rates[`USD${nonUSDcurrency}`].timestamp,
            });
          });
        });

        const ratesOps = rates.map((rate) => {
          return {
            updateOne: {
              filter: {
                currency_code_from: rate.currency_code_from,
                currency_code_to: rate.currency_code_to,
              },
              update: {
                $set: rate,
              },
              upsert: true,
            },
          };
        });

        console.log(ratesOps);

        await db.collection("rates").bulkWrite(ratesOps);

        return h
          .response({
            success: true,
            message: "Rates updated successfully",
          })
          .code(200);
      } catch (error) {
        console.error(error);

        return h
          .response({
            success: false,
            message: "An error occurred.",
          })
          .code(500);
      }
    } catch (err) {
      Sentry.captureException(err);

      throw err;
    }
  };
}
