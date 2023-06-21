import { APIRole, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, CommandInteraction, ComponentType, Role, RoleSelectMenuBuilder, SlashCommandBuilder } from "discord.js";
import { assignReactionRole, fetchMessage } from "../reaction-roles";

const data = new SlashCommandBuilder()
    .setName("rr")
    .setDescription("Commands for managing reaction roles.")
    .addSubcommand(cmd =>
        cmd.setName("assign")
            .setDescription("Assign reaction roles to a message. Uses the reactions already present on the message")
            .addStringOption(opt => opt.setName("message-id").setDescription("The message id to assign reaction roles to.").setRequired(true))
            .addChannelOption(opt => opt.setName("channel").setDescription("The channel the message is in."))
    );

async function handleAssign(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const message = await fetchMessage(interaction.client, interaction.guildId, interaction.options.get('message-id')?.value as string, interaction.options.get('channel')?.channel?.id)
    if (!message) {
        return await interaction.reply({
            content: 'Message not found :(',
            ephemeral: true,
        });
    }
    
    await interaction.reply('Starting...');

    let history = ''; 
    let role: Role | APIRole | undefined;

    for (const [_, rxn] of message.reactions.cache) {
        const response = await interaction.editReply({
            content: `${history}Choose a role to assign when the user reacts with ${rxn.emoji} on message ${message.url}`,
            components: [
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('role')
                        .setPlaceholder('Choose a role to assign!')) as any,
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm')
                        .setStyle(ButtonStyle.Success)
                        .setLabel('Confirm Role'),
                    new ButtonBuilder()
                        .setCustomId('skip')
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel('Skip (Don\'t Add or Change Role)'),
                    new ButtonBuilder()
                        .setCustomId('cancel')
                        .setStyle(ButtonStyle.Danger)
                        .setLabel('Exit (Skip to End)'),
                )
            ],
        });

        try {
            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                componentType: ComponentType.RoleSelect,
            });

            collector.on('collect', async coll => {
                coll.update({});
            });

            collector.on('end', async coll => {
                role = coll.last()?.roles.at(0) || role;
            });

            const confirmation = await response.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, componentType: ComponentType.Button });

            collector.stop();

            switch (confirmation.customId) {
                case 'confirm':
                    // add role
                    history += `${rxn.emoji} -> ${role}\n`;
                    await assignReactionRole(interaction.guildId!, message, rxn.emoji, role!);
                    await confirmation.update({});
                    break;
                case 'skip':
                    await confirmation.update({});
                    continue;
                case 'cancel':
                    return await interaction.editReply({
                        content: `${history}All done!`,
                        components: [],
                    });
                default:
                    throw new Error('unrecognized customId: ' + confirmation.customId);
            }
        } catch (e) {
            if ((e as any).code === 'InteractionCollectorError') {
                return await interaction.editReply({
                    content: 'Took too long to respond, canceling.',
                    components: [],
                });
            } else {
                return await interaction.editReply({
                    content: 'Something went wrong: ' + e,
                    components: [],
                });
            }
        }
    }

    await interaction.editReply({
        content: `${history}All done!`,
        components: [],
    });
}

async function execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
        case 'assign': handleAssign(interaction); break;
        default:
            await interaction.reply({ ephemeral: true, content: 'Unrecognized subcommand: ' + subcommand });
    }
}

export default { data, execute };
