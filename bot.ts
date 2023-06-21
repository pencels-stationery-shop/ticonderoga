// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { getBotToken } from './auth';
import { registerCommands } from './commands';
import { registerReactionRoles } from './reaction-roles';

export async function start() {
    // Create a new client instance
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });

    // Log in to Discord with your client's token
    const token = await getBotToken();
    await client.login(token);

    // When the client is ready, run this code (only once)
    // We use 'c' for the event parameter to keep it separate from the already defined 'client'
    client.once(Events.ClientReady, c => {
        console.log(`Ready! Logged in as ${c.user.tag}`);
    });

    registerCommands(client);

    const guilds = await client.guilds.fetch();
    for (const guildId of guilds.keys()) {
        await registerReactionRoles(client, guildId);
    }
}
