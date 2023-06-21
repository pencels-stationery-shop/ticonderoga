import * as bot from "./bot";
import config from 'config';
import { deployCommands } from "./commands";

(async () => {
    const botName = config.get('botName');
    console.log(`[${botName}] Deploying commands.`)
    await deployCommands();
    console.log(`[${botName}] Starting bot.`)
    await bot.start();
})();