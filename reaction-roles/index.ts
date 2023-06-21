import { Client, Message, Events, Emoji, parseEmoji, GuildBasedChannel, TextBasedChannel, APIRole, GuildEmoji, ReactionEmoji, Role } from "discord.js";
import store from "../db";

export async function fetchMessage(client: Client, guildId: string, messageId: string, channelId?: string): Promise<Message | null> {
    const guild = client.guilds.resolve(guildId);

    // If channel id given, just beeline straight for the message with it.
    if (channelId) {
        const channel = await guild?.channels.fetch(channelId);
        if (channel?.viewable && channel.isTextBased()) {
            return await channel.messages.fetch(messageId);
        }

        return null;
    }

    // Otherwise, search all channels in the current guild for the message id.
    const channels = await guild?.channels.fetch();
    if (!channels) {
        throw new Error("Could not fetch channels to search for message");
    }

    try {
        return await Promise.any(
            channels
                .filter(chan => chan?.viewable && chan.isTextBased())
                .map(chan => {
                    const textChan = chan as GuildBasedChannel & TextBasedChannel;
                    return textChan.messages.fetch(messageId);
                })
        )
    } catch (e) {
        // If anything goes wrong, just count the message as not existing.
        console.error(e);
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

export async function assignReactionRole(guildId: string, message: Message, emoji: GuildEmoji | ReactionEmoji, role: Role | APIRole): Promise<void> {
    const messageRef = store.collection(`guilds/${guildId}/reaction-roles`).doc(message.id);
    const doc = await messageRef.get();
    const data: ReactionRoleRule = doc.exists ? doc.data() as ReactionRoleRule : {
        channelId: message.channelId,
        messageId: message.id,
        roles: [],
    };

    let rule = data.roles.find(rule => emotesEqual(rule.emote, emoji));
    if (!rule) {
        rule = {
            emote: emoji.toString(),
            roleId: role.id,
        };
        data.roles.push(rule);
    } else {
        rule.emote = emoji.toString();
        rule.roleId = role.id;
    }

    messageRef.set(data);
}

export async function registerReactionRoles(client: Client, guildId: string) {
    const reactionRolesColl = store.collection(`guilds/${guildId}/reaction-roles`);

    // React to changes in the rules and reset message reactions.
    reactionRolesColl.onSnapshot(async snapshot => {
        const reactionRoles = snapshot.docs.map(doc => doc.data() as ReactionRoleRule);

        // Add default reactions to message.
        for (const rule of reactionRoles) {
            const message = await fetchMessage(client, guildId, rule.messageId, rule.channelId);
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

export function emoteCode(emoji: Emoji): string {
    if (emoji.id) {
        return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
    } else {
        return emoji.name!;
    }
}