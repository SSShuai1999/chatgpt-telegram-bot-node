// import { ChatGPTUnofficialProxyAPI } from "chatgpt";
import { ChatGPTAPI } from "chatgpt";
import * as dotenv from "dotenv";
import { TGWrapper } from "./telegram";
import Queue from "bee-queue";
import { JsonDB, Config } from "node-json-db";

dotenv.config();

async function main() {
  // create chatgpt proxy api
  // const api = new ChatGPTUnofficialProxyAPI({
  //   accessToken: getAccessToken(),
  //   debug: false,
  //   model: getBuiltInLM(),
  // });

  const api = new ChatGPTAPI({
    // get your Telegram Bot token from BotFather and OpenAI API key
    apiKey: process.env.OPENAI_API_KEY!,
    debug: false,
  });

  // Tasks used to monitor and process chatgpt
  const queue = new Queue("chatgpt");
  // for model training
  const db = new JsonDB(
    new Config("./src/database/cache.json", true, false, "/")
  );

  // TG bot starts working
  new TGWrapper({
    api,
    queue,
    db,
  }).start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
