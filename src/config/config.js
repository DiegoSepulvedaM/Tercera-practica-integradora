import dotenv from "dotenv";

dotenv.config({
});

const URL = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster1ds.czhv5gd.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`;

export default {
  mongoUrl: URL,
  jwtPrivate: process.env.JWT_PRIVATE_KEY,
  persistence: process.env.PERSISTENCE,
};