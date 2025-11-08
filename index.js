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

// ==============================
// 🌐 Servidor Web para Render / UptimeRobot
// ==============================
const app = express();

app.get("/", (req, res) => {
  res.send("✅ BTF Bot está online e funcionando!");
});

// 🔥 Porta fixa (ou automática, se no Render)
const PORT = process.env.PORT || 18012;
app.listen(PORT, () => {
  console.log(`🌐 Servidor web ativo na porta ${PORT}`);
});

// ==============================
// 🤖 Inicialização do Bot Discord
// ==============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const STAFF_ROLE_ID = "1436399739397603428";
const AVALIACAO_CHANNEL_ID = "1436393631790403796";

// ==============================
// 🟣 Status do Bot
// ==============================
client.once("ready", () => {
  client.user.setPresence({
    status: "online",
    activities: [{ name: "🎟️ Bot Oficial da BTF", type: 0 }]
  });
  console.log(`✅ Bot logado como ${client.user.tag}`);
});

// ==============================
// 🎫 Sistema de Tickets - BTF
// ==============================
client.on("messageCreate", async (message) => {
  if (message.content === "!painel") {
    const embed = new EmbedBuilder()
      .setTitle("🎫 BTF - Suporte")
      .setDescription(
        "<:bf1308afd6136988eb568df66534354b:1436387023333228594> - Bem-vindo ao suporte oficial da **BTF**.\n\n" +
        "Para agilizar o atendimento, selecione abaixo a **categoria** que melhor corresponde à sua solicitação.\n\n" +
        "Observações importantes:\n" +
        "- Quanto mais detalhes forem informados, mais eficiente será o atendimento.\n" +
        "- O atendimento é realizado por ordem de chegada.\n" +
        "- O prazo máximo de resposta é de até **2 dias úteis**.\n\n" +
        "Selecione a categoria desejada abaixo:"
      )
      .setImage("https://media.discordapp.net/attachments/1436393272611176648/1436400284359332041/image.png")
      .setColor("#2b2d31");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("menu_ticket")
      .setPlaceholder("Selecione uma categoria de atendimento")
      .addOptions(
        {
          label: "Dúvidas",
          description: "Tire dúvidas sobre a liga ou servidor.",
          value: "duvida",
          emoji: "❓"
        },
        {
          label: "Reportar alguém",
          description: "Reporte um jogador.",
          value: "report",
          emoji: "⚠️"
        },
        {
          label: "Ownar um time",
          description: "Solicite a criação de um time.",
          value: "ownar",
          emoji: "🏆"
        },
        {
          label: "Outros assuntos",
          description: "Para solicitações diversas.",
          value: "outros",
          emoji: "📋"
        }
      );

    const row = new ActionRowBuilder().addComponents(menu);
    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ==============================
// 🎟️ Interações (Tickets + Avaliações)
// ==============================
client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === "menu_ticket") {
    await interaction.deferReply({ ephemeral: true });

    const tipo = interaction.values[0];
    const existente = interaction.guild.channels.cache.find(
      (c) => c.topic && c.topic.includes(`Dono: ${interaction.user.id}`)
    );

    if (existente)
      return interaction.editReply({
        content: `Você já possui um ticket aberto em ${existente}.`
      });

    const canal = await interaction.guild.channels.create({
      name: `ticket-${tipo}-${interaction.user.username}`,
      type: 0,
      topic: `Dono: ${interaction.user.id} | Atendido por: Ninguém ainda`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("fechar_ticket")
        .setLabel("Fechar Ticket")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("resgatar_ticket")
        .setLabel("Resgatar Ticket")
        .setStyle(ButtonStyle.Secondary)
    );

    const embedTicket = new EmbedBuilder()
      .setTitle("🎫 Ticket Aberto")
      .setDescription(
        `Olá ${interaction.user},\n\nSeu ticket foi aberto na categoria **${tipo.toUpperCase()}**.\n\n` +
        "Por favor, descreva sua solicitação de forma clara e objetiva. Um membro da equipe responderá assim que possível.\n\n" +
        "Atenciosamente,\nEquipe BTF."
      )
      .setColor("#2b2d31");

    await canal.send({ embeds: [embedTicket], components: [botoes] });
    await interaction.editReply({ content: `Seu ticket foi criado com sucesso em ${canal}.` });
  }

  // ======== RESGATAR TICKET ========
  if (interaction.isButton() && interaction.customId === "resgatar_ticket") {
    const canal = interaction.channel;
    const staff = interaction.member;

    if (!staff.roles.cache.has(STAFF_ROLE_ID))
      return interaction.reply({
        content: "Apenas membros da equipe BTF podem resgatar tickets.",
        ephemeral: true
      });

    await canal.setTopic(`Dono: ${canal.topic.split(" | ")[0].replace("Dono: ", "")} | Atendido por: ${staff.user.tag}`);
    await interaction.reply({ content: `O ticket foi assumido por ${staff}.` });
  }

  // ======== FECHAR TICKET ========
  if (interaction.isButton() && interaction.customId === "fechar_ticket") {
    const canal = interaction.channel;
    const donoId = canal.topic?.match(/Dono: (\d+)/)?.[1];
    const staff = canal.topic?.match(/Atendido por: (.+)/)?.[1] || "Ninguém";

    if (!donoId)
      return interaction.reply({ content: "Erro ao identificar o dono do ticket.", ephemeral: true });

    const dono = await client.users.fetch(donoId).catch(() => null);
    if (dono) {
      const dmEmbed = new EmbedBuilder()
        .setTitle("📋 Avaliação de Atendimento - BTF")
        .setDescription(
          `Seu atendimento foi encerrado.\n\nAtendente: **${staff}**\n\n` +
          "Por favor, avalie seu atendimento clicando em uma das estrelas abaixo:\n\n" +
          "⭐ ⭐ ⭐ ⭐ ⭐"
        )
        .setColor("#2b2d31");

      const row = new ActionRowBuilder().addComponents(
        [1, 2, 3, 4, 5].map((n) =>
          new ButtonBuilder()
            .setCustomId(`avaliacao_${n}`)
            .setLabel("★".repeat(n))
            .setStyle(ButtonStyle.Secondary)
        )
      );

      await dono.send({ embeds: [dmEmbed], components: [row] }).catch(() => {});
    }

    await interaction.reply({ content: "O ticket será encerrado em 5 segundos.", ephemeral: true });
    setTimeout(() => canal.delete().catch(() => {}), 5000);
  }

  // ======== AVALIAÇÃO ========
  if (interaction.isButton() && interaction.customId.startsWith("avaliacao_")) {
    const nota = interaction.customId.split("_")[1];
    const user = interaction.user;
    const avaliacoes = client.channels.cache.get(AVALIACAO_CHANNEL_ID);
    if (!avaliacoes) return;

    const estrelas = "⭐ ".repeat(nota);
    const embed = new EmbedBuilder()
      .setTitle("⭐ Nova Avaliação Recebida - BTF")
      .setDescription(`Usuário: ${user}\nAvaliação: ${estrelas}`)
      .setColor("#2b2d31");

    await avaliacoes.send({ embeds: [embed] });
    await interaction.reply({ content: "Avaliação registrada com sucesso. Obrigado!", ephemeral: true });
  }
});

// ==============================
// 🚀 Login do Bot
// ==============================
setTimeout(() => {
  client.login(process.env.TOKEN);
}, 3000);
