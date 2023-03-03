import { oraPromise as oraP } from "ora";
import type { CommandsRun } from "./";

export async function startCommand(cr: CommandsRun) {
  try {
    const { bot, msg, describe } = cr;
    const res = await bot.sendMessage(msg.chat.id, `typing...`);

    return await oraP(
      bot.editMessageText(`🤖 ${describe} 🤖`, {
        chat_id: msg.chat.id,
        message_id: res.message_id,
      }),
      {
        text: "/help...",
      }
    );
  } catch (e) {
    console.log("helpCommand error");
  }
}

export async function helpCommand(cr: CommandsRun) {
  const { commands, bot, msg } = cr;
  const res = await bot.sendMessage(msg.chat.id, `typing...`);

  const introduction = `🤖 Here is a list of supported commands 🤖: \n\n`;
  const messageContent = Array.from(commands.values()).reduce((a, b) => {
    return a + b.describe + "\n";
  }, introduction);

  try {
    return await oraP(
      bot.editMessageText(messageContent, {
        chat_id: msg.chat.id,
        message_id: res.message_id,
      }),
      {
        text: "/help...",
      }
    );
  } catch (e) {
    console.log("helpCommand error", e);
  }
}

// (WIP)
export async function clearCommand({ bot, msg }: CommandsRun) {
  try {
    if (!msg.reply_to_message) return;

    return await oraP(
      bot.deleteMessage(msg.chat.id, msg.reply_to_message.message_id),
      {
        text: "/clear...",
      }
    );
  } catch (e) {
    console.log("clearCommand error", e);
  }
}
