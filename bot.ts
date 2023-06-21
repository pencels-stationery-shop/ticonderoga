// Require the necessary discord.js classes
import discord, { Client, Emoji, Events, GatewayIntentBits, Message, Partials, parseEmoji } from 'discord.js';
import { getBotToken } from './auth';
import store from './db';
import commands from './commands';

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

    const commandsCollection = new discord.Collection<string, any>(); // bleh
    for (const command of commands) {
        commandsCollection.set(command.data.name, command);
    }

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        const command = commandsCollection.get(interaction.commandName);

        try {
            await command.execute(interaction);
        } catch (e) {
            console.log(e);
            const oopsies = {
                content: 'oops',
                ephemeral: true,
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(oopsies);
            } else {
                await interaction.reply(oopsies);
            }
        }
    });

    const guilds = await client.guilds.fetch();
    for (const guildId of guilds.keys()) {
        await registerReactionRoles(client, guildId);
    }
}

async function fetchMessage(client: Client, guildId: string, channelId: string, messageId: string): Promise<Message | null> {
    const guild = client.guilds.resolve(guildId);
    const channel = await guild?.channels.fetch(channelId);
    if (channel?.viewable && channel.isTextBased()) {
        return await channel.messages.fetch(messageId);
    } else {
        return null;
    }
}

interface ReactionRoleRule {
    channelId: string;
    messageId: string;
    roles: EmoteRolePair[];
}

interface EmoteRolePair {
    emote: string;
    roleId: string;
}

async function registerReactionRoles(client: Client, guildId: string) {
    const reactionRolesColl = store.collection(`guilds/${guildId}/reaction-roles`);

    // React to changes in the rules and reset message reactions.
    reactionRolesColl.onSnapshot(async snapshot => {
        const reactionRoles = snapshot.docs.map(doc => doc.data() as ReactionRoleRule);

        // Add default reactions to message.
        for (const rule of reactionRoles) {
            const message = await fetchMessage(client, guildId, rule.channelId, rule.messageId);
            if (!message) continue;

            // FIXME: Find a better way to do cleanup :)
            // Clean up reactions first.
            // await Promise.all(
            //     message.reactions.cache.map(rxn => rxn.users.remove(client.user!))
            // );

            // React with new emotes.
            for (const { emote } of rule.roles) {
                try {
                    await message?.react(emote);
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });

    // Adding roles.
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (user.bot) return; // Exclude bots.

        const record = await reactionRolesColl.where('messageId', '==', reaction.message.id).get();
        if (record.empty) return;

        // FIXME: Assume there's only one rule per message.
        const rule = record.docs[0].data() as ReactionRoleRule;

        const entry = rule.roles.find(pair => emotesEqual(pair.emote, reaction.emoji));
        if (entry) {
            await reaction.message.guild?.members.addRole({
                role: entry.roleId,
                user: user.id,
            });
        }
    });

    // Removing roles.
    client.on(Events.MessageReactionRemove, async (reaction, user) => {
        if (user.bot) return; // Exclude bots.

        const record = await reactionRolesColl.where('messageId', '==', reaction.message.id).get();
        if (record.empty) return;

        // FIXME: Assume there's only one rule per message.
        const rule = record.docs[0].data() as ReactionRoleRule;

        const entry = rule.roles.find(pair => emotesEqual(pair.emote, reaction.emoji));
        if (entry) {
            await reaction.message.guild?.members.removeRole({
                role: entry.roleId,
                user: user.id,
            });
        }
    });
}

function emotesEqual(dbEmote: string, reactionEmote: Emoji): boolean {
    const emote = parseEmoji(dbEmote);
    if (!emote) return false;

    if (emote.id) {
        return emote.id === reactionEmote.id;
    } else {
        return emote.name === reactionEmote.name;
    }
}