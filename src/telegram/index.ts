import TelegramBot from "node-telegram-bot-api";
import { ChatGPTAPI, ChatGPTUnofficialProxyAPI } from "chatgpt";
import { oraPromise } from "ora";
import { JsonDB } from "node-json-db";
import Queue from "bee-queue";
import { clearCommand, helpCommand, startCommand } from "./command";

export type CommandsRun = {
  bot: TelegramBot;
  msg: TelegramBot.Message;
  args: string[];
  chatAPI: ChatGPTAPI | ChatGPTUnofficialProxyAPI;
  commands: Map<string, any>;
  describe: string;
};

export type RegistrationCommand = {
  name: string;
  describe: string;
  handler: (
    args: CommandsRun
  ) => Promise<TelegramBot.Message | boolean | undefined>;
  isArgs?: boolean;
  commands?: Map<string, any>;
};

type TGWrapperConstructor = {
  api: ChatGPTAPI | ChatGPTUnofficialProxyAPI;
  queue?: Queue;
  db?: JsonDB;
};

export class TGWrapper {
  public readonly bot!: TelegramBot;
  private readonly chatAPI: ChatGPTAPI | ChatGPTUnofficialProxyAPI;
  private readonly queue: Queue;
  private readonly db: JsonDB;
  private commands: Map<string, any>;
  private registerCommandsFailedMap: Map<string, any>;

  constructor({ api, queue, db }: TGWrapperConstructor) {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
      polling: true,
    });
    this.commands = new Map();
    this.registerCommandsFailedMap = new Map();
    this.chatAPI = api;
    this.queue = queue!;
    this.db = db!;
  }

  public async start() {
    this.initQueueEvent();
    this.registerBotCommands();
    this.registerBotEvent();
  }

  // register bot command
  registerBotCommands() {
    const regCommands: RegistrationCommand[] = [
      {
        name: "start",
        describe: "/start - A'yo, a'yo it's Leo Baby",
        handler: startCommand,
        isArgs: false,
      },
      {
        name: "help",
        describe: "/help - display help information",
        handler: helpCommand,
        isArgs: false,
      },
      {
        name: "clear",
        describe: "/clear - clear conversation history",
        handler: clearCommand,
        isArgs: false,
      },
    ];

    regCommands.map((item) => ({
      name: item.name,
      state: this.registerCommand(item),
    }));

    // catch error
    this.registerCommandsFailedMap.forEach((item) => {
      console.log(`${item.name} failed :`, item.reason);
    });
    this.registerCommandsFailedMap.clear();
  }

  // register command, return true if success, otherwise false
  registerCommand(regCommand: RegistrationCommand): boolean {
    const name = regCommand.name;
    let prefixCommand = name.toLocaleLowerCase();
    if (!name.startsWith("/")) {
      prefixCommand = `/${prefixCommand}`;
    }

    if (this.commands.get(prefixCommand)) {
      this.registerCommandsFailedMap.set(prefixCommand, {
        name: prefixCommand,
        reason: `The command "${prefixCommand}" has been registered, please use another command`,
      });
      return false;
    }

    this.commands.set(prefixCommand, regCommand);

    return true;
  }

  // listen for bot event
  registerBotEvent() {
    this.bot.on("message", this.handleMessage.bind(this));
    this.bot.on("polling_error", this.handleError.bind(this));
  }

  async handleMessage(msg: TelegramBot.Message) {
    const prompt = msg.text?.trim();
    if (!prompt) return;

    const chatId = msg.chat.id;

    // check if the message is a command
    if (prompt.startsWith("/")) {
      const [command, ...args] = prompt.split(" ");

      // guaranteed `command` case compatibility
      const prefixCommand = command.toLocaleLowerCase();

      if (this.commands.get(prefixCommand)) {
        await this.executeCommand(prefixCommand, args, msg);
      } else {
        await this.unknownCommand(chatId);
      }
    } else {
      const job = await this.queue.createJob({ ...msg, text: prompt }).save();
      job.on("failed", async () => {
        await job.retries(1).save();
      });
    }
  }

  async executeCommand(
    command: string,
    args: string[],
    msg: TelegramBot.Message
  ): Promise<TelegramBot.Message> {
    let prefixCommand = command;
    const commandInfo = this.commands.get(prefixCommand);

    // check if not exits
    if (!commandInfo) {
      return await this.unknownCommand(msg.chat.id);
    }

    // execute the command
    return await commandInfo.handler({
      ...commandInfo,
      bot: this.bot,
      msg,
      args,
      chatAPI: this.chatAPI,
      commands: this.commands,
    });
  }

  async unknownCommand(chatId: string | number): Promise<TelegramBot.Message> {
    return await this.bot.sendMessage(
      chatId,
      "I don't understand your command. Please enter /help for help"
    );
  }

  // initzational queue event
  initQueueEvent() {
    this.queue.process(
      async (job: { data: TelegramBot.Message }, done: any) => {
        try {
          const msg = job.data;
          const chatGPTAnswer = await oraPromise(
            this.chatAPI.sendMessage(msg.text!),
            {
              text: `chatGPT is generation answers ...`,
            }
          );

          // send the response back to the user
          const botResult = await oraPromise(
            this.bot.sendMessage(
              msg.chat.id,
              `Hi ${msg.from!.first_name}! Below is my answers: \n
                ${chatGPTAnswer.text}
              `,
              {
                reply_to_message_id: msg.chat.id,
              }
            ),
            {
              text: `replying to ${msg.from?.first_name}`,
            }
          );

          this.db.push(`/conversation_${msg.chat.id}`, {
            conversationId: botResult.message_id,
            parentMessageId: botResult.from?.id,
            prompt: botResult.text,
          });

          return done();
        } catch (e) {
          console.log("startQueueProcessing error", e);
        }
      }
    );
  }

  handleError() {
    // start the bot
    this.bot.on("polling_error", (error) => {
      console.log(error);
    });
  }
}
