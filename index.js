require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");

// Servidor Web (Render)
const app = express();
app.get("/", (req, res) => {
  res.send("✅ BTF Bot está online e funcionando!");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor ativo na porta ${PORT}`));

// Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const STAFF_ROLE_ID = "1436399739397603428";
const AVALIACAO_CHANNEL_ID = "1436393631790403796";

client.once("ready", () => {
  client.user.setPresence({
    status: "online",
    activities: [{ name: "🎟️ Bot Oficial da BTF", type: 0 }],
  });
  console.log(`✅ Logado como ${client.user.tag}`);
});

// Painel
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content !== "!painel") return;

  const embed = new EmbedBuilder()
    .setTitle("🎫 BTF - Suporte")
    .setDescription("Selecione abaixo a categoria do atendimento que você precisa.")
    .setImage("https://media.discordapp.net/attachments/1436393272611176648/1436400284359332041/image.png")
    .setColor("#2b2d31");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("menu_ticket")
    .setPlaceholder("Selecione uma categoria")
    .addOptions(
      { label: "Dúvidas", value: "duvida", emoji: "<:bf1308afd6136988eb568df66534354b:1436387023333228594>" },
      { label: "Reportar alguém", value: "report", emoji: "<:bf1308afd6136988eb568df66534354b:1436387023333228594>" },
      { label: "Ownar um time", value: "ownar", emoji: "<:bf1308afd6136988eb568df66534354b:1436387023333228594>" },
      { label: "Outros assuntos", value: "outros", emoji: "<:bf1308afd6136988eb568df66534354b:1436387023333228594>" }
    );

  await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
});

// Ticket
client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === "menu_ticket") {

    const tipo = interaction.values[0];
    await interaction.reply({ content: "✅ Ticket sendo criado...", ephemeral: true });

    const canal = await interaction.guild.channels.create({
      name: `ticket-${tipo}-${interaction.user.username}`,
      type: 0,
      topic: `Dono: ${interaction.user.id}`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Aberto")
      .setDescription(`Olá ${interaction.user}, explique sua solicitação.`)
      .setColor("#2b2d31");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("fechar_ticket").setLabel("Fechar").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("resgatar_ticket").setLabel("Resgatar").setStyle(ButtonStyle.Secondary)
    );

    await canal.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `✅ Ticket criado em ${canal}` });
  }

  // Fechar Ticket
  if (interaction.isButton() && interaction.customId === "fechar_ticket") {
    const donoId = interaction.channel.topic?.match(/Dono: (\d+)/)?.[1];
    if (donoId) {
      const estrela = "<:972699744675717230:1436410165594423387>";
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("avaliacao_1").setLabel(`${estrela}`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("avaliacao_2").setLabel(`${estrela.repeat(2)}`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("avaliacao_3").setLabel(`${estrela.repeat(3)}`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("avaliacao_4").setLabel(`${estrela.repeat(4)}`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("avaliacao_5").setLabel(`${estrela.repeat(5)}`).setStyle(ButtonStyle.Secondary),
      );

      await client.users.send(donoId, {
        embeds: [
          new EmbedBuilder()
            .setTitle("📋 Avalie o atendimento")
            .setDescription("Clique na quantidade de estrelas que representa sua experiência.")
            .setColor("#2b2d31")
        ],
        components: [row],
      }).catch(() => {});
    }

    await interaction.reply({ content: "⏳ Fechando...", ephemeral: true });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
  }

  // Avaliação
  if (interaction.isButton() && interaction.customId.startsWith("avaliacao_")) {
    const nota = interaction.customId.split("_")[1];
    const estrela = "<:972699744675717230:1436410165594423387>";
    const canal = client.channels.cache.get(AVALIACAO_CHANNEL_ID);

    await canal.send({
      content: `**${estrela} Nova Avaliação Recebida ${estrela}**
Usuário: <@${interaction.user.id}>
Nota: ${estrela.repeat(nota)}`
    });

    await interaction.reply({ content: "✅ Avaliação registrada!", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
