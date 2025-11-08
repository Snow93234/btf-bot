require("dotenv").config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

// Web
const app = express();
app.get("/", (req, res) => res.send("✅ BTF Bot Online"));
app.listen(process.env.PORT || 3000);

// Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// CONFIG
const STAFF_ROLE_ID = "1436399739397603428";
const AVALIACAO_CHANNEL_ID = "1436393631790403796";
const STAR = "<:972699744675717230:1436410165594423387>"; // estrela

// Online
client.on("ready", () => {
  client.user.setPresence({
    status: "online",
    activities: [{ name: "🎟️ Bot Oficial da BTF", type: 0 }],
  });
  console.log(`✅ Logado como ${client.user.tag}`);
});

// Painel
client.on("messageCreate", async (message) => {
  if (message.author.bot || message.content !== "!painel") return;

  const embed = new EmbedBuilder()
    .setTitle("🎫 BTF - Suporte")
    .setDescription(
      "**BTF - Suporte**\n" +
      "Bem-vindo ao suporte oficial da BTF.\n\n" +
      "Para agilizar o atendimento, selecione abaixo a categoria que melhor corresponde à sua solicitação.\n\n" +
      "**Observações importantes:**\n" +
      "- Quanto mais detalhes forem informados, mais eficiente será o atendimento.\n" +
      "- O atendimento é realizado por ordem de chegada.\n" +
      "- Resposta em até **2 dias úteis**.\n\n" +
      "**Selecione abaixo:**"
    )
    .setColor("#9b59b6")
    .setImage("https://media.discordapp.net/attachments/1436387855759835136/1436705826554380389/Captura_de_tela_2025-11-07_140150.png");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("menu_ticket")
    .setPlaceholder("Escolha uma categoria")
    .addOptions(
      { label: "Dúvidas", value: "duvida", emoji: "<a:duvidas:1436670233556422656>" },
      { label: "Reportar alguém", value: "report", emoji: "<:report:1436670286996045885>" },
      { label: "Ownar um time", value: "ownar", emoji: "<:bf1308afd6136988eb568df66534354b:1436387023333228594>" },
      { label: "Outros assuntos", value: "outros", emoji: "📋" }
    );

  await message.channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  });
});

// Tickets
client.on("interactionCreate", async (interaction) => {

  // Abrir ticket
  if (interaction.isStringSelectMenu() && interaction.customId === "menu_ticket") {
    await interaction.deferReply({ ephemeral: true });

    const tipo = interaction.values[0];

    // verifica se já tem ticket
    const jaExiste = interaction.guild.channels.cache.find(
      (c) => c.topic && c.topic.includes(`Dono: ${interaction.user.id}`)
    );
    if (jaExiste)
      return interaction.editReply({ content: `⚠️ Você já possui um ticket: ${jaExiste}` });

    const canal = await interaction.guild.channels.create({
      name: `ticket-${tipo}-${interaction.user.username}`,
      type: 0,
      topic: `Dono: ${interaction.user.id} | Atendido por: Ninguém`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("fechar_ticket").setLabel("Fechar Ticket").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("resgatar_ticket").setLabel("Resgatar Ticket").setStyle(ButtonStyle.Success)
    );

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎫 Ticket Aberto")
          .setDescription(`Olá ${interaction.user}, descreva o problema:`)
          .setColor("#9b59b6")
      ],
      components: [botoes],
    });

    interaction.editReply({ content: `✅ Ticket criado: ${canal}` });
  }

  // Resgatar ticket (corrigido)
  if (interaction.isButton() && interaction.customId === "resgatar_ticket") {
    const canal = interaction.channel;
    const donoId = canal.topic.match(/Dono: (\d+)/)[1];
    const atendenteAtual = canal.topic.split("Atendido por: ")[1];

    if (atendenteAtual !== "Ninguém")
      return interaction.reply({ content: `⚠️ Já está sendo atendido por <@${atendenteAtual}>.`, ephemeral: true });

    canal.setTopic(`Dono: ${donoId} | Atendido por: ${interaction.user.id}`);

    const mensagem = await canal.messages.fetch({ limit: 1 }).then(msg => msg.first());
    const row = mensagem.components[0];
    row.components[1].data.disabled = true;
    await mensagem.edit({ components: [row] });

    return interaction.reply(`✅ Ticket agora está sendo atendido por **${interaction.user}**`);
  }

  // Fechar -> avaliação
  if (interaction.isButton() && interaction.customId === "fechar_ticket") {
    const canal = interaction.channel;
    const donoId = canal.topic.match(/Dono: (\d+)/)[1];
    const atendenteId = canal.topic.split("Atendido por: ")[1];
    const dono = await client.users.fetch(donoId).catch(() => null);

    if (dono) {
      const row = new ActionRowBuilder().addComponents(
        ...[1,2,3,4,5].map(n =>
          new ButtonBuilder()
            .setCustomId(`avaliacao_${n}_${atendenteId}`)
            .setLabel(`${n} ${STAR}`)
            .setStyle(ButtonStyle.Secondary)
        )
      );

      await dono.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📋 Avaliação - BTF")
            .setDescription("Avalie o atendimento clicando nos botões abaixo:")
            .setColor("#9b59b6")
        ],
        components: [row]
      }).catch(() => {});
    }

    await interaction.reply({ content: "⏳ Fechando ticket em 5s...", ephemeral: true });
    setTimeout(() => canal.delete().catch(() => {}), 5000);
  }

  // Registrar avaliação
  if (interaction.isButton() && interaction.customId.startsWith("avaliacao_")) {
    const [, nota, atendenteId] = interaction.customId.split("_");
    const canal = client.channels.cache.get(AVALIACAO_CHANNEL_ID);

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📥 Nova Avaliação")
          .setDescription(`👤 Usuário: ${interaction.user}\n🧑‍💼 Atendente: <@${atendenteId}>\n⭐ Nota: ${STAR.repeat(nota)}`)
          .setColor("#9b59b6")
      ]
    });

    await interaction.reply({ content: "✅ Avaliação registrada!", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
