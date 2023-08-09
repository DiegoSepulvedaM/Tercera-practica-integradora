import { MongoClient, Db } from "mongodb";
import config from "./config";
import logger from "./logger";

export async function getDBConnection(): Promise<Db> {
  const { host } = config.db;
  const { port } = config.db;
  const { database } = config.db;
  const { username } = config.db;
  const { password } = config.db;

  const connectionURI = `mongodb://${username}:${password}@${host}:${port}/${database}`;

  logger.info("trying connaction");

  const client = new MongoClient(connectionURI);

  let db: Db;

  try {
    await client.connect();
    db = client.db(database);
  } catch (error) {
    console.error(error);
    throw error;
  }

  logger.info("Connection success");

  return db;
}

export function sleep(ms: number): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve("done"), ms);
  });
}
