import * as Sentry from "@sentry/node";
import axios from "axios";
import moment from "moment";
import config from "../config/config";
import { getDBConnection } from "../config/database";
import { HapiHandler } from "../Types/Hapi";
import logger from "../config/logger";
import { Rates } from "../Types/Exchange";

Sentry.init({
  dsn: config.app.sentry_dns,
  tracesSampleRate: 1.0,
});

export default class UpdateUF {
  static updateUF: HapiHandler = async (request, h) => {
    try {
      logger.info("Obteniendo Payload");

      const rates: Rates[] = [];

      const db = await getDBConnection();

      const endpointUF = `https://mindicador.cl/api`;

      const response = await axios.get(endpointUF);

      const clf = "CLF";
      const clp = "CLP";

      rates.push({
        currency_code_from: clf,
        currency_code_to: clp,
        rate: response.data.uf.valor,
        timestamp: parseInt(moment(response.data.uf.fecha).format("X"), 10),
      });

      rates.push({
        currency_code_from: clp,
        currency_code_to: clf,
        rate: 1 / response.data.uf.valor,
        timestamp: parseInt(moment(response.data.uf.fecha).format("X"), 10),
      });

      const ratesOps = rates.map(
        (rate: { currency_code_from: string; currency_code_to: string }) => ({
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
        })
      );

      await db?.collection("rates").bulkWrite(ratesOps);

      logger.info("Conexion Exitosa");

      return h.response({
        success: true,
        message: "Rates updated successfully",
      });
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      throw new Error("An error occurred.");
    }
  };
}
