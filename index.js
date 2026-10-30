
require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Events,
    REST,
    Routes,
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const discordTranscripts = require('discord-html-transcripts');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});
const fs = require('node:fs');
const path = require('node:path');
// QUEUE SYSTEM
const QUEUE_FILE = path.join(__dirname, 'queue-data.json');

let queueData = {
    current: [],
    waiting: [],
    messageId: null
};

if (fs.existsSync(QUEUE_FILE)) {
    try {
        queueData = {
            ...queueData,
            ...JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'))
        };
    } catch (error) {
        console.error('Could not load queue data:', error);
    }
}

function saveQueueData() {
    fs.writeFileSync(
        QUEUE_FILE,
        JSON.stringify(queueData, null, 2)
    );
}

async function updateQueueEmbed(guild) {
    const queueChannelId = process.env.QUEUE_CHANNEL_ID;

    if (!queueChannelId) {
        throw new Error('QUEUE_CHANNEL_ID is missing from .env');
    }

    const queueChannel = await guild.channels.fetch(queueChannelId);

    if (!queueChannel || !queueChannel.isTextBased()) {
        throw new Error('Queue channel is invalid.');
    }

    const currentText = queueData.current.length
        ? queueData.current.map((item, index) =>
            `${index + 1}. <@${item.userId}>`
        ).join('\n')
        : 'text';

    const waitingText = queueData.waiting.length
        ? queueData.waiting.map((item, index) =>
            `${index + 1}. <@${item.userId}>`
        ).join('\n')
        : 'text';

    const embed = new EmbedBuilder()
        .setColor(COLORS.pink)
        .setDescription(
            `queue\n\n` +
            `currently in queue\n${currentText}\n\n` +
            `waiting clients\n${waitingText}`
        );

    let message = null;

    if (queueData.messageId) {
        message = await queueChannel.messages
            .fetch(queueData.messageId)
            .catch(() => null);
    }

    if (message) {
        await message.edit({ embeds: [embed] });
    } else {
        message = await queueChannel.send({ embeds: [embed] });
        queueData.messageId = message.id;
    }

    saveQueueData();
}
const { joinVoiceChannel } = require('@discordjs/voice');
// LOVE LINE LOYALTY SYSTEM
const LOYALTY_FILE = path.join(__dirname, 'loyalty-data.json');

let loyaltyData = {};

if (fs.existsSync(LOYALTY_FILE)) {
    try {
        loyaltyData = JSON.parse(
            fs.readFileSync(LOYALTY_FILE, 'utf8')
        );
    } catch (error) {
        console.error('Could not load loyalty data:', error);
    }
}

function saveLoyaltyData() {
    fs.writeFileSync(
        LOYALTY_FILE,
        JSON.stringify(loyaltyData, null, 2)
    );
}

function getLoyaltyCard(userId) {
    if (!loyaltyData[userId]) {
        loyaltyData[userId] = {
            stamps: 0,
            claimedRewards: [],
            completedCards: 0
        };
    }

    return loyaltyData[userId];
}
const { getUserLevel, addXP } = require('./xp-system');
const museImages = [
    'https://media.discordapp.net/attachments/1564662346557816913/1565293659220476047/140d262e6f670f591413ea5820403f04.jpg?ex=6ae460d2&is=6ae30f52&hm=b23e4c40edb1049b21576a6d37ad8eca5dcdfff8d96a5256f18e74ee1539ed66&=&format=webp',
    'https://media.discordapp.net/attachments/1564662346557816913/1565293658658316330/90bb6fedeb49f0a8a4318d21c0b163f2.jpg?ex=6ae460d1&is=6ae30f51&hm=d23b1182106fbba5218a101bb5d77333c7baef806f8487fffe13b2f77a8da736&=&format=webp',
    'https://media.discordapp.net/attachments/1564662346557816913/1565293660763988048/01a1e36756c650e8dad82e9f709e90e5.jpg?ex=6ae460d2&is=6ae30f52&hm=f92aed24e39bf6a1b843ee220c557540171e3046b9bdca08db1dee74a5d745aa&=&format=webp',
    'https://media.discordapp.net/attachments/1564662346557816913/1565293659539247114/593bc6f7e6829711dcb033dda6a5b70d.jpg?ex=6ae460d2&is=6ae30f52&hm=026773da1df4ba4d9783db1dfe3ccc5b6b57c57ce1b8454ba972c3fcfb296f94&=&format=webp',
    'https://media.discordapp.net/attachments/1564662346557816913/1565293704007254116/6b9cbd9854148ca1d13ae1d6aa58858b.jpg?ex=6ae460dc&is=6ae30f5c&hm=2179cacdcd6ac6e42b497f85361ba81c28d79e3531a0aaa578552217c6f39309&=&format=webp',
    'https://media.discordapp.net/attachments/1564662346557816913/1565293658914164736/a2f23b53fa8b9cae3ff1c670d4cda2b1.jpg?ex=6ae460d2&is=6ae30f52&hm=f16a619bcc6eacfd2e52b2aed33fa2f3d22ccbc6f87d349b3b7c0d213b43cf11&=&format=webp'
];
// LOVE LINE COLORS
const COLORS = {
    pink: 0xF4A7C5,
    purple: 0xB9A3E3,
    green: 0x57F287,
    red: 0xED4245,
    blue: 0x5865F2,
    gold: 0xFEE75C
};

const STATUS_CHOICES = [
    { name: 'Pending', value: 'pending' },
    { name: 'In Progress', value: 'in_progress' },
    { name: 'Completed', value: 'completed' },
    { name: 'Cancelled', value: 'cancelled' }
];

const PAYMENT_CHOICES = [
    { name: 'Unpaid', value: 'unpaid' },
    { name: 'Paid', value: 'paid' }
];

const STATUS_LABELS = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
};

const PAYMENT_LABELS = {
    unpaid: 'Unpaid',
    paid: 'Paid'
};

// LOGGING
async function sendOrderLog(
    guild,
    title,
    description,
    color = COLORS.purple,
    files = []
) {
    const logChannelId = process.env.LOG_CHANNEL_ID;

    if (!logChannelId) {
        console.error('LOG_CHANNEL_ID is missing in .env.');
        return false;
    }

    try {
        const logChannel = await guild.channels.fetch(logChannelId);

        if (!logChannel || !logChannel.isTextBased()) {
            console.error('Order log channel was not found.');
            return false;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: '♡ Love Line • Shop Logs' })
            .setTimestamp();

        await logChannel.send({
            embeds: [embed],
            files
        });

        return true;
    } catch (error) {
        console.error('Failed to send order log:', error);
        return false;
    }
}

// TICKET INFORMATION HELPERS
function isTicketChannel(channel) {
    return Boolean(
        channel &&
        channel.type === ChannelType.GuildText &&
        channel.topic?.includes('ticket-owner:')
    );
}

function getTicketValue(channel, key) {
    const topic = channel.topic || '';
    const match = topic.match(
        new RegExp(`(?:^|;)${key}:([^;]*)`)
    );

    return match ? match[1] : null;
}

async function updateTicketValue(channel, key, value) {
    const topic = channel.topic || '';
    const pattern = new RegExp(`(^|;)${key}:[^;]*`);

    let updatedTopic;

    if (pattern.test(topic)) {
        updatedTopic = topic.replace(
            pattern,
            (_, prefix) => `${prefix}${key}:${value}`
        );
    } else {
        updatedTopic =
            `${topic}${topic ? ';' : ''}${key}:${value}`;
    }

    if (updatedTopic.length > 1024) {
        throw new Error('Ticket information exceeds the channel topic limit.');
    }

    await channel.setTopic(updatedTopic);
}

async function hasStaffRole(interaction) {
    const staffRoleId = process.env.STAFF_ROLE_ID;

    if (!staffRoleId || !interaction.guild) {
        return false;
    }

    const member = await interaction.guild.members.fetch(
        interaction.user.id
    );

    return member.roles.cache.has(staffRoleId);
}

// ORDER DETAILS EMBED
function makeOrderEmbed(channel) {
    const category = getTicketValue(channel, 'category') || 'others';
    const status = getTicketValue(channel, 'status') || 'pending';
    const payment = getTicketValue(channel, 'payment') || 'unpaid';
    const assigned = getTicketValue(channel, 'assigned') || 'none';

    return new EmbedBuilder()
        .setColor(COLORS.pink)
        .setTitle('♡ Love Line Order Details')
        .addFields(
            {
                name: 'Service',
                value: category.replace(/_/g, ' '),
                inline: true
            },
            {
                name: 'Order Status',
                value: STATUS_LABELS[status] || status,
                inline: true
            },
            {
                name: 'Payment',
                value: PAYMENT_LABELS[payment] || payment,
                inline: true
            },
            {
                name: 'Assigned Staff',
                value: assigned === 'none' ? 'Not assigned' : `<@${assigned}>`,
                inline: false
            },
            {
                name: 'Payment Amount',
                value: getTicketValue(channel, 'payamount') || 'Not recorded',
                inline: true
            },
            {
                name: 'Payment Method',
                value: getTicketValue(channel, 'paymethod') || 'Not recorded',
                inline: true
            },
            {
                name: 'Payment Reference',
                value: getTicketValue(channel, 'payreference') || 'Not provided',
                inline: false
            }
        )
        .setFooter({ text: '♡ Thank you for choosing Love Line!' })
        .setTimestamp();
}

// SLASH COMMANDS

// LOVE LINE AUTOMATIC STATUS SYSTEM
const STATUS_FILE = path.join(__dirname, 'status-data.json');
const STATUS_TIMEZONE = 'Asia/Manila';

let statusData = {
    messageId: null,
    manualOverride: null
};

if (fs.existsSync(STATUS_FILE)) {
    try {
        statusData = {
            ...statusData,
            ...JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'))
        };
    } catch (error) {
        console.error('Could not load status data:', error);
    }
}

function saveStatusData() {
    fs.writeFileSync(
        STATUS_FILE,
        JSON.stringify(statusData, null, 2)
    );
}

function getScheduledStatus() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: STATUS_TIMEZONE,
        hour: 'numeric',
        hourCycle: 'h23'
    }).formatToParts(new Date());

    const hour = Number(parts.find(part => part.type === 'hour').value);

    return hour >= 10 && hour < 22 ? 'open' : 'closed';
}

function getNextStatusSwitch() {
    const now = new Date();
    const localNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const next = new Date(Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        localNow.getUTCHours() < 10 ? 10 :
            localNow.getUTCHours() < 22 ? 22 : 34
    ));

    return next.getTime() - 8 * 60 * 60 * 1000;
}

function getStatusContent(status) {
    if (status === 'open') {
        return [
            '_ _',
            '###  _ _            <a:32525325:1564654610856157214>   `상태`    **ℓ𑄝vꫀ﹒ℓιnꫀ！**',
            ' _ _                   ***is __ σpꫀꪀιꫀ __   <:bunmorning:1563743755431968908> <:000_dots:1564314545759981759>***',
            '-# _ _               <:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126>',
            '',
            '-# _ _          <:00_arrow:1563744958626795590> αvαιℓαᑲιℓtყ    (__GMT +8__) ：',
            '-# _ _                 <a:emoji_68:1564654538752004308>     `10AM - 10PM`     *!*',
            '',
            '-# _ _             **check these channels <a:a_mpawpink:1564457429402390660>  :**',
            '-# _ _               **https://discord.com/channels/1563736869362081935/1563738507573203076ㆍhttps://discord.com/channels/1563736869362081935/1564294893935927496**',
            '-# _ _                           https://discord.com/channels/1563736869362081935/1564093854842622112',
            '',
            '-# _ _           **responses CAN delay in   open**',
            '-# _ _           **hrs, tysm for ur support   <a:111_pinkbonet:1564313750109028402>  !**',
            '',
            '',
            '> <@&1565394653581418696>',
            '',
            '_ _'
        ].join('\n');
    }

    return [
        '_ _',
        '###  _ _            <a:32525325:1564654610856157214>   `상태`    **ℓ𑄝vꫀ﹒ℓιnꫀ！**',
        ' _ _                   ***is cℓσsιꫀ   <:bunflop:1563743732996513803> <:000_dots:1564314545759981759>***',
        '-# _ _               <:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126>',
        '',
        '',
        '-# _ _          <:00_arrow:1563744958626795590> αvαιℓαᑲιℓtყ (__GMT+8__) ：',
        '-# _ _                 <a:emoji_68:1564654538752004308>     `10AM - 10PM`     *!*',
        '',
        '',
        '-# _ _           **tickies will delay until opening**',
        '-# _ _           **hrs, tysm for ur support   <a:111_pinkbonet:1564313750109028402>  !**',
        '',
        '',
        '> <@&1565394653581418696>',
        '',
        '_ _'
    ].join('\n');
}

async function updateShopStatus(requestedStatus = null) {
    const channelId = process.env.STATUS_CHANNEL_ID;

    if (!channelId) {
        throw new Error('STATUS_CHANNEL_ID is missing from .env');
    }

    if (requestedStatus) {
        statusData.manualOverride = {
            status: requestedStatus,
            expiresAt: getNextStatusSwitch()
        };
    }

    if (
        statusData.manualOverride &&
        Date.now() >= statusData.manualOverride.expiresAt
    ) {
        statusData.manualOverride = null;
    }

    const status = statusData.manualOverride?.status ||
        getScheduledStatus();

    const channel = await client.channels.fetch(channelId);

    if (!channel || !channel.isTextBased() || !channel.messages) {
        throw new Error('Status channel is invalid.');
    }

    let message = null;

    if (statusData.messageId) {
        message = await channel.messages.fetch(
            statusData.messageId
        ).catch(() => null);
    }

    const payload = {
        content: getStatusContent(status),
        allowedMentions: { parse: [] }
    };

    if (message) {
        await message.edit(payload);
    } else {
        message = await channel.send(payload);
        statusData.messageId = message.id;
    }

    saveStatusData();

    console.log(`Shop status updated: ${status.toUpperCase()}`);
}

async function checkShopStatus() {
    try {
        await updateShopStatus();
    } catch (error) {
        console.error('Shop status update failed:', error);
    }
}

const commands = [
    new SlashCommandBuilder()
        .setName('ticketpanel')
        .setDescription('Post the Love Line shop ticket panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
        .setName('ticketstatus')
        .setDescription('Update the order status in a ticket')
        .addStringOption(option =>
            option
                .setName('status')
                .setDescription('Choose the order status')
                .setRequired(true)
                .addChoices(...STATUS_CHOICES)
        ),
            new SlashCommandBuilder()
        .setName('status')
        .setDescription('Manually change the shop availability status')
        .addStringOption(option =>
            option
                .setName('status')
                .setDescription('Choose the shop status')
                .setRequired(true)
                .addChoices(
                    { name: 'Open', value: 'open' },
                    { name: 'Closed', value: 'closed' }
                )
        ),

    new SlashCommandBuilder()
        .setName('payment')
        .setDescription('Update the payment status in a ticket')
        .addStringOption(option =>
            option
                .setName('status')
                .setDescription('Choose the payment status')
                .setRequired(true)
                .addChoices(...PAYMENT_CHOICES)
        ),

    new SlashCommandBuilder()
        .setName('assign')
        .setDescription('Assign a staff member to this ticket')
        .addUserOption(option =>
            option
                .setName('staff')
                .setDescription('The staff member to assign')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('reopen')
        .setDescription('Reopen an archived ticket'),

    new SlashCommandBuilder()
        .setName('paymentdetails')
        .setDescription('Record payment details for an order')
        .addStringOption(option =>
            option
                .setName('amount')
                .setDescription('Payment amount, e.g. PHP 500')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('method')
                .setDescription('Payment method, e.g. GCash')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reference')
                .setDescription('Transaction reference number')
                .setRequired(false)
        ),
            new SlashCommandBuilder()
        .setName('accept')
        .setDescription('Accept an order and add the client to waiting'),

    new SlashCommandBuilder()
        .setName('start')
        .setDescription('Move a client into the current queue'),

    new SlashCommandBuilder()
        .setName('complete')
        .setDescription('Remove a completed order from the queue'),

    new SlashCommandBuilder()
        .setName('cancel')
        .setDescription('Remove a cancelled order from the queue'),
    new SlashCommandBuilder()
        .setName('tippie')
        .setDescription('Send a thank-you message for a client gift')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The client who gave the gift')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('gift')
                .setDescription('What the client gave')
                .setRequired(true)
        ),
        new SlashCommandBuilder()
    .setName('stamp')
    .setDescription('Give a customer one loyalty stamp.')
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The customer receiving the stamp')
            .setRequired(true)
    ),

new SlashCommandBuilder()
    .setName('loyalty')
    .setDescription('View a customer’s loyalty card.')
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The customer whose card you want to view')
            .setRequired(false)
    ),
    new SlashCommandBuilder()
    .setName('claimreward')
    .setDescription('Record a customer’s loyalty reward.')
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The customer claiming the reward')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('category')
            .setDescription('The reward category chosen by the customer')
            .setRequired(true)
            .addChoices(
                { name: 'GFX', value: 'gfx' },
                { name: 'Piloting', value: 'piloting' },
                { name: 'Rent-A-GF', value: 'ekitten' },
                { name: 'Carrd', value: 'carrd' },
                { name: 'Server Setup', value: 'server_setup' }
            )
    )
    .addStringOption(option =>
        option
            .setName('details')
            .setDescription('Specific reward chosen or extra details (optional)')
            .setRequired(false)
    ),
    ];

const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_TOKEN);

// SERVICE ORDER FORMS
const orderForms = {
    piloting:
        'PILOTING ORDER FORM\n' +
        'Game:\nServer / Region:\nService Needed:\n' +
        'Deadline:\nBudget:\nAdditional Notes:',

    gfx:
        'GFX ORDER FORM\nType of GFX:\nDimensions / Size:\n' +
        'Theme / Vibe:\nPreferred Colors:\nText to Include:\n' +
        'References:\nDeadline:\nBudget:\nAdditional Notes:',

    carrd_commissions:
        'CARRD COMMISSION FORM\nPurpose of Carrd:\n' +
        'Number of Sections:\nTheme / Aesthetic:\n' +
        'Preferred Colors:\nInformation to Include:\n' +
        'References:\nDeadline:\nBudget:\nAdditional Notes:',

    server_setup:
        'SERVER SETUP ORDER FORM\nServer Purpose:\n' +
        'Server Name / Theme:\nChannels / Categories Needed:\n' +
        'Roles Needed:\nBots / Features Needed:\n' +
        'Reference Servers:\nDeadline:\nBudget:\nAdditional Notes:',

    rent_a_gf:
        'RENT A GF SERVICE FORM\nService / Activity Requested:\n' +
        'Preferred Date and Time:\nTimezone:\nDuration:\n' +
        'Preferences / Boundaries:\nBudget:\nAdditional Notes:',

    others:
        'CUSTOM REQUEST FORM\nService Requested:\nOrder Details:\n' +
        'References:\nDeadline:\nBudget:\nAdditional Notes:'

    };

// REGISTER COMMANDS

function createTicketPanelPayload() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category')
        .setPlaceholder('♡ Choose a shop service...')
        .addOptions(
            {
                label: 'Piloting',
                value: 'piloting',
                description: 'Game account piloting services'
            },
            {
                label: 'GFX',
                value: 'gfx',
                description: 'Banners, profile pictures, and more'
            },
            {
                label: 'Carrd Commissions',
                value: 'carrd_commissions',
                description: 'Carrd website design'
            },
            {
                label: 'Server Setup',
                value: 'server_setup',
                description: 'Discord server setup'
            },
            {
                label: 'Rent A Girlfriend',
                value: 'rent_a_gf',
                description: 'Rent a GF service inquiries'
            },
            {
                label: 'Others',
                value: 'others',
                description: 'Other services and requests'
            }
        );

   
const textEmbed = new EmbedBuilder()
    .setColor(COLORS.pink)
    .setDescription(
        'sꫀℓꫀct ur dꫀsιrꫀd sꫀrvιcꫀ <:00whiteheart:1563743634904326315>\n' +
        '-# _ _ <:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402>\n' +
        '-# _ _ <a:pinkwarn:1564477948294332466> ： https://discord.com/channels/1563736869362081935/1563738507573203076 <:000_dots:1564314545759981759>\n' +
        '-# <a:a_mpawpink:1564457429402390660> NO opening ticket w doubt!'
    );

const embed = new EmbedBuilder()
    .setColor(COLORS.pink)
    .setImage('https://media.discordapp.net/attachments/1564662346557816913/1565311189330690068/Untitled443_20261028094113.png?ex=6ae47125&is=6ae31fa5&hm=54b7306324627fbc42a8ec28d559d16bb39634a8c875c9e3ad847a5502fd5bb2&=&format=webp&quality=lossless');
        return {
        embeds: [textEmbed, embed],
        components: [
            new ActionRowBuilder().addComponents(menu)
        ]
    };
}
// VERIFICATION TOGGLE
const VERIFICATION_ENABLED = false;
function createVerificationPanelPayload () {
    const embed = new EmbedBuilder ()
    .setColor (COLORS.pink)
    .setDescription([
        `**⌗vꫀrιfιcatισn** <a:f_heartlock:1564456324232904744> *! ~*`,
        `-# <:00_arrow:1563744958626795590> we are **happi** to have ***u*** here >< <:000_dots:1564314545759981759>`,
        ``,
        `-# _ _   click the button below __unlock__`,
        `-# _ _   __access__ to our server.`,
        ``,
        `<:m_pinkheart1:1564456803696119928> we hope u enjoy ur stayy`
    ].join(`\n`))
    .setFooter({
        text: `ℓ𑄝vꫀ﹒ℓιnꫀ ! Member Verification ⪩ ⪨ ꠹`
    });

const button = new ButtonBuilder()
    .setCustomId('verify_member')
    .setLabel('touch my paw !')
    .setEmoji({
        id: '1564457429402390660',
        name: 'a_mpawpink',
        animated: true
    })
    .setStyle(ButtonStyle.Success);

return {
    embeds: [embed],
    components: [
        new ActionRowBuilder().addComponents(button)
    ]
};
}

async function sendBookieRulebook() {
    const channelId = process.env.BOOKIE_CHANNEL_ID;
    const markerFile = path.join(
        __dirname,
        'bookie-rulebook-sent.txt'
    );

    // Don't send the rulebook again after the first successful send
    if (fs.existsSync(markerFile)) {
        console.log('Bookie rulebook already sent!');
        return;
    }

    if (!channelId) {
        console.error('BOOKIE_CHANNEL_ID is missing from .env');
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);

        if (!channel || !channel.isTextBased() || !channel.send) {
            console.error('Bookie channel is invalid.');
            return;
        }

        const rulebook = [
            '- <:m_pinkheart1:1564456803696119928> · ***pαymꫀnts***',
            '-# <:ley3:1563744444480487526> ﹒ *full payment firsthand* · **refunds** will',
            '-# _ _ subject to $0.55 · **Gcash, Wise, &**',
            '-# _ _ **PayPal** only · __receipt__ must be sent.',
            '',
            '- <:00whiteheart:1563743634904326315> · ***αvaιlabιlιtყ***',
            '-# <:ley3:1563744444480487526> ﹒ always check <#1564300042502938694> · I am a',
            '-# _ _ student, so please expect *POSSIBLE*',
            '-# _ _ **delays**..',
            '',
            '- <:m_pinkheart1:1564456803696119928> · ***vσuchιꫀs***',
            '-# <:ley3:1563744444480487526> ﹒ *AFTER SERVICES* · only within 24 hrs..',
            '',
            '- <:00whiteheart:1563743634904326315> · ***prιvαcч***',
            '-# <:ley3:1563744444480487526> ﹒ ur private details will stay confidential.',
            '-# _ _ we avoid call-outs, unless if we',
            '-# _ _ encounter major & affecting behaviors',
            '',
            '- <:m_pinkheart1:1564456803696119928> · ***sꫀrvιcꫀs***',
            '-# <:ley3:1563744444480487526> ﹒ genshin piloting · graphic design · carrd',
            '-# _ _ · caption · serv set · more special req',
            '',
            ' ִֶָ 𓂃 ࣪˖ ִֶָ<a:pi_bunny:1564456973293068328> ་༘࿐ 𖾕𖾝𖽙𖾟'
        ].join('\n');

        await channel.send({
            content: rulebook,
            allowedMentions: { parse: [] }
        });

        // Save the marker only after the message sends successfully
        fs.writeFileSync(markerFile, 'Rulebook sent successfully.');

        console.log('Bookie rulebook sent successfully!');
    } catch (error) {
        console.error('Failed to send bookie rulebook:', error);
    }
}

client.once(Events.ClientReady, async () => {
    console.log(`Bot is online as ${client.user.tag}!`);

    try {
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: commands.map(command => command.toJSON())
            }
        );

        console.log('Love Line commands registered!');
    } catch (error) {
        console.error('Command registration failed:', error);
    }
    
    try {
        const panelChannelId = process.env.TICKET_PANEL_CHANNEL_ID;

        if (!panelChannelId) {
            throw new Error('TICKET_PANEL_CHANNEL_ID is missing from .env');
        }

        const channel = await client.channels.fetch(panelChannelId);

        if (!channel || !channel.isTextBased() || !channel.messages) {
            throw new Error('Ticket panel channel is invalid.');
        }

        const messages = await channel.messages.fetch({ limit: 100 });

        const existingPanel = messages.find(message =>
    message.author.id === client.user.id &&
    message.components.some(row =>
        row.components.some(component =>
            component.customId === 'ticket_category'
        )
    )
);

        if (existingPanel) {
            console.log('Ticket panel already exists!');
        } else {
            await channel.send(createTicketPanelPayload());
            console.log('Ticket panel posted automatically!');
        }
    } catch (error) {
        console.error('Ticket panel setup failed:', error);
    }

    // AUTOMATIC VERIFICATION PANEL
if (VERIFICATION_ENABLED) {
    try {
        const verifyChannel = await client.channels.fetch(
            process.env.VERIFY_CHANNEL_ID
        );

        if (!verifyChannel || !verifyChannel.isTextBased() ||
            !verifyChannel.messages) {
            throw new Error('Verification channel is invalid.');
        }

        const messages = await verifyChannel.messages.fetch({
            limit: 100
        });

        const existingVerificationPanel = messages.find(message =>
            message.author.id === client.user.id &&
            message.components.some(row =>
                row.components.some(component =>
                    component.customId === 'verify_member'
                )
            )
        );

        if (!existingVerificationPanel) {
            await verifyChannel.send(
                createVerificationPanelPayload()
            );
            console.log('Verification panel posted!');
        } else {
            console.log('Verification panel already exists!');
        }
    } catch (error) {
        console.error('Verification panel setup failed:', error);
    }
} else {
    console.log('Automatic verification panel is disabled.');
}

       
    await sendBookieRulebook();
    // RESTORE INQUIRY STICKY NOTE ON STARTUP
try {
    const inquiryChannel = await client.channels.fetch(
        INQUIRY_CHANNEL_ID
    );

    if (inquiryChannel && inquiryChannel.isTextBased()) {
        const recentMessages = await inquiryChannel.messages.fetch({
            limit: 20
        });

        const existingSticky = recentMessages.find(message =>
            message.author.id === client.user.id &&
            message.content === inquiryStickyMessage
        );

        if (existingSticky) {
            inquiryStickyMessageId = existingSticky.id;
        } else {
            const newSticky = await inquiryChannel.send({
                content: inquiryStickyMessage,
                allowedMentions: { parse: [] }
            });

            inquiryStickyMessageId = newSticky.id;
        }
    }
} catch (error) {
    console.error('Inquiry sticky startup failed:', error);
}

});

 

// INTERACTIONS
client.on(Events.InteractionCreate, async interaction => {   if (
        interaction.isButton() &&
        interaction.customId === 'verify_member'
    ) {
            await interaction.reply({
        content: '♡ Verification is temporarily unavailable. Please wait for staff assistance!',
        ephemeral: true
    });

    return;
        try {
            const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
            const unverifiedRoleId = process.env.UNVERIFIED_ROLE_ID;

            if (!interaction.inGuild() || !verifiedRoleId ||
                !unverifiedRoleId) {
                await interaction.reply({
                    content: 'Verification is not configured correctly. Please contact staff.',
                    ephemeral: true
                });
                return;
            }

            const member = await interaction.guild.members.fetch(
                interaction.user.id
            );

            if (member.roles.cache.has(verifiedRoleId)) {
                await interaction.reply({
                    content: '♡ You are already verified!',
                    ephemeral: true
                });
                return;
            }

            await member.roles.add(verifiedRoleId);

            if (member.roles.cache.has(unverifiedRoleId)) {
                await member.roles.remove(unverifiedRoleId);
            }

            await interaction.reply({
                content: '♡ You are now verified! Welcome to Love Line!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Verification failed:', error);

            const response = {
                content: 'Something went wrong with verification. Please contact staff.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(response);
            } else {
                await interaction.reply(response);
            }
        }

        return;
    }
    try {
        // SLASH COMMANDS
        if (interaction.isChatInputCommand()) {
            const command = interaction.commandName;

            // TICKET PANEL
           
if (command === 'ticketpanel') {
    await interaction.reply({
        content: '♡ Your ticket panel is managed automatically!',
        ephemeral: true
    });

    return;
}
// TIPPIE MESSAGE
if (command === 'tippie') {
    await interaction.deferReply({ ephemeral: true });

    if (!(await hasStaffRole(interaction))) {
        await interaction.editReply('♡ This command is for staff only.');
        return;
    }

    const user = interaction.options.getUser('user', true);
    const gift = interaction.options.getString('gift', true);

    const tippieChannel = await interaction.guild.channels.fetch(
        '1564094284339351653'
    ).catch(() => null);

    if (!tippieChannel || !tippieChannel.isTextBased()) {
        await interaction.editReply('♡ I could not find the Tippie channel.');
        return;
    }

    await tippieChannel.send({
        content:
            '_ _\n' +
            `_ _       \`선물\` **thank u**, <@${user.id}>   <a:a_mpawpink:1564457429402390660> ~\n` +
            `_ _       for <:000_dots:1564314545759981759>      **__${gift}__** !!\n` +
            '-# _ _         ❝   my heart is so full <a:torohearteyes:1564456489391759445> !  ❞',
        allowedMentions: { users: [user.id] }
    });

    await interaction.editReply('♡ Tippie message sent successfully!');
    return;
}
// LOYALTY STAMP COMMAND
if (command === 'stamp') {
    if (!hasStaffRole(interaction)) {
        return interaction.reply({
            content: 'You do not have permission to give loyalty stamps.',
            ephemeral: true
        });
    }

    const user = interaction.options.getUser('user');
    const card = getLoyaltyCard(user.id);

    if (card.stamps >= 8) {
        return interaction.reply({
            content: `${user} has already completed all 8 stamps. Claim any remaining rewards first.`,
            ephemeral: true
        });
    }

    card.stamps += 1;
    saveLoyaltyData();

    const rewardPositions = [2, 5, 8];
    const isReward = rewardPositions.includes(card.stamps);

    return interaction.reply({
        content: isReward
            ? `🎉 ${user} received stamp **${card.stamps}/8**! This is a **REWARD STAMP**. They can choose one reward category!`
            : `♡ ${user} received a loyalty stamp! Progress: **${card.stamps}/8**.`,
    });
}

// LOYALTY CARD VIEW COMMAND
if (command === 'loyalty') {
    const user = interaction.options.getUser('user') || interaction.user;

    if (user.id !== interaction.user.id && !hasStaffRole(interaction)) {
        return interaction.reply({
            content: 'You can only view your own loyalty card.',
            ephemeral: true
        });
    }

    const card = getLoyaltyCard(user.id);
    const rewardPositions = [2, 5, 8];

    const slots = Array.from({ length: 8 }, (_, index) => {
        const position = index + 1;

        if (position > card.stamps) return '☰';
        if (rewardPositions.includes(position)) return '☆';
        return '𖹭';
    });

    const firstRow = slots.slice(0, 4).join(' ');
    const secondRow = slots.slice(4, 8).join(' ');

    return interaction.reply({
        content:
            `♡ **${user.username}'s Love Line Loyalty Card** ♡\n\n` +
            `${firstRow}\n${secondRow}\n\n` +
            `**Stamps:** ${card.stamps}/8\n` +
            `**Rewards claimed:** ${card.claimedRewards.length}/3\n` +
            `**Completed cards:** ${card.completedCards}`,
        ephemeral: true
    });
}
// LOYALTY REWARD CLAIM COMMAND
if (command === 'claimreward') {
    if (!hasStaffRole(interaction)) {
        return interaction.reply({
            content: 'You do not have permission to claim loyalty rewards.',
            ephemeral: true
        });
    }

    const user = interaction.options.getUser('user');
    const category = interaction.options.getString('category');
    const details = interaction.options.getString('details');
    const card = getLoyaltyCard(user.id);

    const rewardPositions = [2, 5, 8];

    // Find the earliest available reward stamp
    const availableReward = rewardPositions.find(position =>
        card.stamps >= position &&
        !card.claimedRewards.includes(position)
    );

    if (!availableReward) {
        return interaction.reply({
            content: `${user} has no available reward stamps to claim yet.`,
            ephemeral: true
        });
    }

    // Determine the reward quantity for GFX
    let rewardMessage = '';

    if (category === 'gfx') {
        const gfxQuantity = availableReward === 8 ? 2 : 1;
        rewardMessage = `${gfxQuantity} GFX reward${gfxQuantity > 1 ? 's' : ''}`;
    } else {
        const categoryNames = {
            piloting: 'Piloting reward',
            ekitten: 'E-kitten reward',
            carrd: 'Carrd reward',
            server_setup: 'Server Setup reward'
        };

        rewardMessage = categoryNames[category];
    }

    card.claimedRewards.push(availableReward);

    // Reset only after all 8 stamps and all 3 rewards are completed
    const cardCompleted =
        card.stamps === 8 &&
        rewardPositions.every(position =>
            card.claimedRewards.includes(position)
        );

    if (cardCompleted) {
        card.completedCards += 1;
        card.stamps = 0;
        card.claimedRewards = [];
    }

    saveLoyaltyData();

    return interaction.reply({
        content:
            `🎁 **Loyalty reward recorded!**\n` +
            `Customer: ${user}\n` +
            `Reward stamp: **${availableReward}/8**\n` +
            `Category: **${category}**\n` +
            `Reward: **${rewardMessage}**\n` +
            (details ? `Details: ${details}\n` : '') +
            (cardCompleted
                ? `\n♡ All 8 stamps and 3 rewards are complete! ${user}'s card has been reset. They can start a new card!`
                : `\nRewards claimed: **${card.claimedRewards.length}/3**`)
    });
}
// SHOP STATUS COMMAND
if (command === 'status') {
    await interaction.deferReply({ ephemeral: true });

    if (!(await hasStaffRole(interaction))) {
        await interaction.editReply('♡ This command is for staff only.');
        return;
    }

    const selectedStatus = interaction.options.getString('status', true);

    await updateShopStatus(selectedStatus);

    await interaction.editReply(
        `♡ Shop status manually changed to **${selectedStatus.toUpperCase()}**! It will return to automatic updates at the next scheduled switch.`
    );

    return;
}
            // STAFF COMMANDS
            const staffCommands = [
    'ticketstatus',
    'payment',
    'assign',
    'reopen',
    'paymentdetails',
    'accept',
    'start',
    'complete',
    'cancel'
];

            if (staffCommands.includes(command)) {
                await interaction.deferReply({ ephemeral: true });

                const channel = interaction.channel;

                if (!isTicketChannel(channel)) {
                    await interaction.editReply(
                        '♡ Please use this command inside a ticket.'
                    );
                    return;
                }

                if (!(await hasStaffRole(interaction))) {
                    await interaction.editReply(
                        '♡ This command is for staff only.'
                    );
                    return;
                }
                // QUEUE COMMANDS
if (['accept', 'start', 'complete', 'cancel'].includes(command)) {
    const userId = getTicketValue(channel, 'ticket-owner');
    const category = getTicketValue(channel, 'category') || 'others';

    if (!userId) {
        await interaction.editReply('♡ Could not find the ticket owner.');
        return;
    }

    const existingWaiting = queueData.waiting.find(
        item => item.channelId === channel.id
    );

    const existingCurrent = queueData.current.find(
        item => item.channelId === channel.id
    );

    if (command === 'accept') {
        if (existingWaiting || existingCurrent) {
            await interaction.editReply('♡ This order is already in the queue.');
            return;
        }

        queueData.waiting.push({
            channelId: channel.id,
            userId,
            category
        });
    }

    if (command === 'start') {
        if (!existingWaiting) {
            await interaction.editReply('♡ This order is not in the waiting list.');
            return;
        }

        queueData.waiting = queueData.waiting.filter(
            item => item.channelId !== channel.id
        );

        queueData.current.push(existingWaiting);
        await updateTicketValue(channel, 'status', 'in_progress');
    }

    if (command === 'complete') {
        if (!existingWaiting && !existingCurrent) {
            await interaction.editReply('♡ This order is not in the queue.');
            return;
        }

        queueData.waiting = queueData.waiting.filter(
            item => item.channelId !== channel.id
        );

        queueData.current = queueData.current.filter(
            item => item.channelId !== channel.id
        );

        await updateTicketValue(channel, 'status', 'completed');
    }

    if (command === 'cancel') {
        if (!existingWaiting && !existingCurrent) {
            await interaction.editReply('♡ This order is not in the queue.');
            return;
        }

        queueData.waiting = queueData.waiting.filter(
            item => item.channelId !== channel.id
        );

        queueData.current = queueData.current.filter(
            item => item.channelId !== channel.id
        );

        await updateTicketValue(channel, 'status', 'cancelled');
    }

    saveQueueData();
    await updateQueueEmbed(interaction.guild);

    await interaction.editReply(
        command === 'accept' ? '♡ Order added to waiting clients!' :
        command === 'start' ? '♡ Order moved to currently in queue!' :
        command === 'complete' ? '♡ Completed order removed from queue!' :
        '♡ Cancelled order removed from queue!'
    );

    return;
}

                // REOPEN TICKET
                if (command === 'reopen') {
                    if (getTicketValue(channel, 'closed') !== 'true') {
                        await interaction.editReply(
                            '♡ This ticket is not archived.'
                        );
                        return;
                    }

                    const ownerId = getTicketValue(
                        channel,
                        'ticket-owner'
                    );

                    if (!ownerId) {
                        await interaction.editReply(
                            '♡ I could not find the ticket owner.'
                        );
                        return;
                    }

                    await channel.permissionOverwrites.edit(ownerId, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        AttachFiles: true
                    });

                    await updateTicketValue(channel, 'closed', 'false');

                    const newName = channel.name
                        .replace(/^closed-/, '')
                        .slice(0, 100);

                    await channel.setName(newName);

                    await channel.send({
                        content:
                            `♡ Welcome back, <@${ownerId}>! ` +
                            'Your ticket has been reopened by staff.',
                        allowedMentions: { users: [ownerId] }
                    });

                    await sendOrderLog(
                        interaction.guild,
                        '♡ Ticket Reopened',
                        `**Ticket:** #${channel.name}\n` +
                        `**Reopened by:** ${interaction.user}`,
                        COLORS.green
                    );

                    await interaction.editReply(
                        '♡ Ticket reopened successfully!'
                    );

                    return;
                }

                // PAYMENT DETAILS
                if (command === 'paymentdetails') {
                    const clean = value =>
                        value.replace(/[;\n\r]/g, ' ').slice(0, 100);

                    const amount = clean(
                        interaction.options.getString('amount', true)
                    );

                    const method = clean(
                        interaction.options.getString('method', true)
                    );

                    const reference = clean(
                        interaction.options.getString('reference') ||
                        'Not provided'
                    );

                    await updateTicketValue(channel, 'payamount', amount);
                    await updateTicketValue(channel, 'paymethod', method);
                    await updateTicketValue(channel, 'payreference', reference);

                    const ownerId = getTicketValue(
                        channel,
                        'ticket-owner'
                    );

                    await channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(COLORS.pink)
                                .setTitle('♡ Payment Details Updated')
                                .addFields(
                                    {
                                        name: 'Amount',
                                        value: amount,
                                        inline: true
                                    },
                                    {
                                        name: 'Method',
                                        value: method,
                                        inline: true
                                    },
                                    {
                                        name: 'Reference',
                                        value: reference,
                                        inline: false
                                    }
                                )
                                .setTimestamp()
                        ]
                    });

                    if (ownerId) {
                        await channel.send({
                            content:
                                `♡ <@${ownerId}>, the payment details ` +
                                'for your order have been updated.',
                            allowedMentions: { users: [ownerId] }
                        });
                    }

                    await channel.send({
                        embeds: [makeOrderEmbed(channel)]
                    });

                    await sendOrderLog(
                        interaction.guild,
                        '♡ Payment Details Recorded',
                        `**Ticket:** #${channel.name}\n` +
                        `**Amount:** ${amount}\n` +
                        `**Method:** ${method}\n` +
                        `**Reference:** ${reference}\n` +
                        `**Updated by:** ${interaction.user}`,
                        COLORS.purple
                    );

                    await interaction.editReply(
                        '♡ Payment details saved!'
                    );

                    return;
                }

                // UPDATE ORDER STATUS
                if (command === 'ticketstatus') {
                    const status = interaction.options.getString(
                        'status',
                        true
                    );

                    await updateTicketValue(channel, 'status', status);

                    const ownerId = getTicketValue(
                        channel,
                        'ticket-owner'
                    );

                    if (ownerId) {
                        await channel.send({
                            content:
                                `♡ <@${ownerId}>, your order status has ` +
                                `been updated to **${STATUS_LABELS[status]}**!`,
                            allowedMentions: { users: [ownerId] }
                        });
                    }

                    await channel.send({
                        embeds: [makeOrderEmbed(channel)]
                    });

                    await sendOrderLog(
                        interaction.guild,
                        '♡ Order Status Updated',
                        `**Ticket:** #${channel.name}\n` +
                        `**New status:** ${STATUS_LABELS[status]}\n` +
                        `**Updated by:** ${interaction.user}`,
                        COLORS.purple
                    );

                    await interaction.editReply(
                        `♡ Order status changed to **${STATUS_LABELS[status]}**.`
                    );

                    return;
                }

                // UPDATE PAYMENT STATUS
                if (command === 'payment') {
                    const payment = interaction.options.getString(
                        'status',
                        true
                    );

                    await updateTicketValue(channel, 'payment', payment);

                    const ownerId = getTicketValue(
                        channel,
                        'ticket-owner'
                    );

                    if (ownerId) {
                        await channel.send({
                            content:
                                `♡ <@${ownerId}>, your payment status has ` +
                                `been updated to **${PAYMENT_LABELS[payment]}**!`,
                            allowedMentions: { users: [ownerId] }
                        });
                    }

                    await channel.send({
                        embeds: [makeOrderEmbed(channel)]
                    });

                    await sendOrderLog(
                        interaction.guild,
                        '♡ Payment Status Updated',
                        `**Ticket:** #${channel.name}\n` +
                        `**Payment:** ${PAYMENT_LABELS[payment]}\n` +
                        `**Updated by:** ${interaction.user}`,
                        payment === 'paid' ? COLORS.green : COLORS.gold
                    );

                    await interaction.editReply(
                        `♡ Payment status changed to **${PAYMENT_LABELS[payment]}**.`
                    );

                    return;
                }

                // ASSIGN STAFF
                if (command === 'assign') {
                    const staffUser = interaction.options.getUser(
                        'staff',
                        true
                    );

                    const staffRoleId = process.env.STAFF_ROLE_ID;

                    const staffMember = await interaction.guild.members.fetch(
                        staffUser.id
                    );

                    if (
                        !staffRoleId ||
                        !staffMember.roles.cache.has(staffRoleId)
                    ) {
                        await interaction.editReply(
                            '♡ You can only assign a member who has the staff role.'
                        );
                        return;
                    }

                    await channel.permissionOverwrites.edit(staffUser.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        AttachFiles: true
                    });

                    await updateTicketValue(
                        channel,
                        'assigned',
                        staffUser.id
                    );

                    await channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(COLORS.purple)
                                .setTitle('♡ Staff Assigned')
                                .setDescription(
                                    `${staffUser} has been assigned to this order.`
                                )
                                .setFooter({
                                    text: '♡ Love Line • Shop Support'
                                })
                                .setTimestamp()
                        ]
                    });

                    await channel.send({
                        embeds: [makeOrderEmbed(channel)]
                    });

                    await sendOrderLog(
                        interaction.guild,
                        '♡ Staff Assigned',
                        `**Ticket:** #${channel.name}\n` +
                        `**Assigned staff:** ${staffUser}\n` +
                        `**Assigned by:** ${interaction.user}`,
                        COLORS.purple
                    );

                    await interaction.editReply(
                        `♡ ${staffUser} has been assigned to this ticket!`
                    );

                    return;
                }
            }

            return;
        }

        // BUTTONS
        if (interaction.isButton()) {
            // CLAIM TICKET
            if (interaction.customId === 'claim_ticket') {
                if (!isTicketChannel(interaction.channel)) {
                    await interaction.reply({
                        content: '♡ This is not a valid ticket.',
                        ephemeral: true
                    });
                    return;
                }

                if (!(await hasStaffRole(interaction))) {
                    await interaction.reply({
                        content: '♡ Only staff can claim tickets.',
                        ephemeral: true
                    });
                    return;
                }

                const claimedButton = new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel(
                        `Claimed by ${interaction.user.username}`.slice(0, 80)
                    )
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true);

                const closeButton = new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger);

                await interaction.update({
                    components: [
                        new ActionRowBuilder().addComponents(
                            claimedButton,
                            closeButton
                        )
                    ]
                });

                await updateTicketValue(
                    interaction.channel,
                    'claimed',
                    interaction.user.id
                );

                await sendOrderLog(
                    interaction.guild,
                    '♡ Ticket Claimed',
                    `**Ticket:** #${interaction.channel.name}\n` +
                    `**Claimed by:** ${interaction.user}`,
                    COLORS.green
                );

                return;
            }

            // CLOSE AND ARCHIVE TICKET
            if (interaction.customId === 'close_ticket') {
                if (!(await hasStaffRole(interaction))) {
                    await interaction.reply({
                        content: '♡ Only staff can close tickets.',
                        ephemeral: true
                    });
                    return;
                }

                const channel = interaction.channel;

                if (!isTicketChannel(channel)) {
                    await interaction.reply({
                        content: '♡ This is not a valid ticket.',
                        ephemeral: true
                    });
                    return;
                }

                if (getTicketValue(channel, 'closed') === 'true') {
                    await interaction.reply({
                        content: '♡ This ticket is already archived.',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferReply({ ephemeral: true });

                try {
                    const transcript =
                        await discordTranscripts.createTranscript(channel, {
                            limit: -1,
                            filename: `${channel.name}.html`,
                            saveImages: false
                        });

                    const ownerId = getTicketValue(
                        channel,
                        'ticket-owner'
                    );

                    const transcriptSaved = await sendOrderLog(
                        interaction.guild,
                        '♡ Ticket Closed',
                        `**Ticket:** #${channel.name}\n` +
                        `**Customer:** ${ownerId ? `<@${ownerId}>` : 'Unknown'}\n` +
                        `**Service:** ${getTicketValue(channel, 'category') || 'others'}\n` +
                        `**Order status:** ${STATUS_LABELS[getTicketValue(channel, 'status')] || 'Pending'}\n` +
                        `**Payment:** ${PAYMENT_LABELS[getTicketValue(channel, 'payment')] || 'Unpaid'}\n` +
                        `**Closed by:** ${interaction.user}\n\n` +
                        'The HTML transcript is attached to this log.',
                        COLORS.red,
                        [transcript]
                    );

                    if (!transcriptSaved) {
                        await interaction.editReply(
                            '♡ I could not save the transcript. The ticket ' +
                            'will remain open. Please check the log channel setup.'
                        );
                        return;
                    }

                    await updateTicketValue(channel, 'closed', 'true');

                    if (ownerId) {
                        await channel.permissionOverwrites.edit(ownerId, {
                            ViewChannel: false,
                            SendMessages: false,
                            ReadMessageHistory: false
                        });
                    }

                    await channel.setName(
                        `closed-${channel.name}`.slice(0, 100)
                    );

                    await channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(COLORS.purple)
                                .setTitle('♡ Ticket Archived')
                                .setDescription(
                                    'This ticket has been archived. Staff can reopen it using `/reopen`.'
                                )
                        ]
                    });

                    await interaction.editReply(
                        '♡ Transcript saved! The ticket has been archived.'
                    );
                } catch (error) {
                    console.error('Ticket closing failed:', error);

                    await interaction.editReply(
                        '♡ I could not archive the ticket. Check the terminal and bot permissions.'
                    ).catch(() => {});
                }

                return;
            }
        }

        // CREATE TICKET FROM MENU
        if (
            interaction.isStringSelectMenu() &&
            interaction.customId === 'ticket_category'
        ) {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            const staffRoleId = process.env.STAFF_ROLE_ID;
            const category = interaction.values[0];
            const categoryId = process.env.TICKET_CATEGORY_ID;

            if (
                !staffRoleId ||
                !guild.roles.cache.has(staffRoleId)
            ) {
                await interaction.editReply(
                    '♡ Please configure a valid STAFF_ROLE_ID in .env.'
                );
                return;
            }

            const parent = categoryId
                ? await guild.channels.fetch(categoryId).catch(() => null)
                : null;

            if (!parent || parent.type !== ChannelType.GuildCategory) {
                await interaction.editReply(
                    '♡ Please check TICKET_CATEGORY_ID in your .env file.'
                );
                return;
            }

            

            const channel = await guild.channels.create({
                name: `ticket-${category}-${interaction.user.username}`
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .slice(0, 90),
                type: ChannelType.GuildText,
                parent: categoryId,
                topic:
                    `ticket-owner:${interaction.user.id};` +
                    `category:${category};status:pending;` +
                    `payment:unpaid;assigned:none;claimed:none`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles
                        ]
                    },
                    {
                        id: staffRoleId,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles
                        ]
                    }
                ]
            });

            const claimButton = new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Success);

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger);

            await channel.send({
                content: `${interaction.user} <@&${staffRoleId}>`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.pink)
                        .setTitle('♡ Welcome to Your Love Line Ticket!')
                        .setDescription(
                            `**Service:** ${category.replace(/_/g, ' ')}\n` +
                            `**Customer:** ${interaction.user}\n\n` +
                            'Please copy the order form in the next message, ' +
                            'fill it in, and send it here.\n\n' +
                            'Our staff will assist you as soon as possible. ♡'
                        )
                        .setFooter({
                            text: '♡ Love Line • Shop Support'
                        })
                ],
                components: [
                    new ActionRowBuilder().addComponents(
                        claimButton,
                        closeButton
                    )
                ]
            });

            await channel.send({
                content:
                    '```text\n' +
                    (orderForms[category] || orderForms.others) +
                    '\n```'
            });

            await channel.send({
                embeds: [makeOrderEmbed(channel)]
            });

            await interaction.editReply(
                `♡ Your private ticket has been created: ${channel}`
            );

            await sendOrderLog(
                guild,
                '♡ New Ticket Opened',
                `**Ticket:** #${channel.name}\n` +
                `**Customer:** ${interaction.user}\n` +
                `**Service:** ${category.replace(/_/g, ' ')}\n` +
                '**Order status:** Pending\n' +
                '**Payment:** Unpaid',
                COLORS.pink
            );
        }
    } catch (error) {
        console.error('Interaction failed:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '♡ Something went wrong. Please tell the shop staff.',
                ephemeral: true
            }).catch(() => {});
        } else if (interaction.deferred) {
            await interaction.editReply(
                '♡ Something went wrong. Please check the terminal.'
            ).catch(() => {});
        }
    }
});


client.on(Events.GuildMemberAdd, async member => {
    // Give the new member the Unverified role
    const unverifiedRoleId = process.env.UNVERIFIED_ROLE_ID;

    if (unverifiedRoleId) {
        try {
            await member.roles.add(unverifiedRoleId);
            console.log(`Assigned Unverified role to ${member.user.tag}`);
        } catch (error) {
            console.error('Failed to assign Unverified role:', error);
        }
    }

    // Send the welcome message
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
    const verifyChannelId = process.env.VERIFY_CHANNEL_ID;

    if (!welcomeChannelId) {
        console.error('WELCOME_CHANNEL_ID is missing from .env');
        return;
    }

    try {
        const channel = await member.client.channels.fetch(
            welcomeChannelId
        );

        if (!channel || !channel.isTextBased() || !channel.send) {
            console.error('Welcome channel is invalid.');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.pink)

           
.setDescription(
    `_ _\n` +
    `-# _ _ \`눈짓\` *thꫀ wιnd chιmꫀ swayꫀd as*\n` +
    `-# _ _ *anσther frιꫀnd waℓkꫀd ιn* *!*\n\n` +
    `  wꫀℓc tσ σur **shσp**，<@${member.id}>﹒\n` +
    `  enjσყ ყσur staყ hꫀrꫀ     <:000_dots:1564314545759981759>\n\n` +
    `-# _ _ <:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402>\n\n` +
    `-# _ _ <a:f_heartlock:1564456324232904744> .      https://discord.com/channels/1563736869362081935/1564899705463242783\n` +
    `-# _ _ <a:f_pinknotebook:1564469459849187369> .      https://discord.com/channels/1563736869362081935/1563738507573203076\n` +
    `-# _ _ <a:a_mpawpink:1564457429402390660> .      https://discord.com/channels/1563736869362081935/1564305285940781116\n\n` +
    `_ _`
)

            .setThumbnail(
    museImages[Math.floor(Math.random() * museImages.length)]
)

            .setFooter({
                text: `Member #${member.guild.memberCount} •  ℓ𑄝vꫀ﹒ℓιnꫀ ! ⪩ ⪨ ꠹`
            })
            .setTimestamp();

       
const welcomeMessage = await channel.send({
    embeds: [embed],
    allowedMentions: { parse: [] }
});




// Make the bot react to its own welcome message
try {
    await welcomeMessage.react('<a:a_mpawpink:1564457429402390660>');
    await welcomeMessage.react('<:111smalhear:1563744457894133880>');
} catch (error) {
    console.error('Failed to add welcome reactions:', error);
}


        console.log(`Welcome message sent for ${member.user.tag}`);
    } catch (error) {
        console.error('Failed to send welcome message:', error);
    }
});

const VOUCH_CHANNEL_ID = process.env.VOUCH_CHANNEL_ID;

const vouchTemplate = [
    '_ _',
    '<:333b:1563756647543869575> **vσuchιꫀs** for HELPER <:m_pinkheart1:1564456803696119928> *! ~*',
    '-# _ _      <:111pin:1563743656698056767>  TYPE  ﹒.  service',
    '',
    '`키스` <:000White_Dot2:1563756643894824963> *COMMENTS* ﹕',
    '-# text text text text',
    '',
    '**R__ATIN__G** — <:000:1563743666332242020> / <:000:1563743673546448936> or <:000:1563743666332242020> + <:000:1563743673546448936>',
    '_ _'
].join('\n');

let vouchTemplateMessages = [];

client.on(Events.MessageCreate, async message => {
    console.log(
        'Message detected:',
        message.channel.id,
        message.author.tag,
        message.content
    );

    if (message.channel.id !== VOUCH_CHANNEL_ID) return;
    if (message.author.bot) return;

    try {
        for (const oldMessage of vouchTemplateMessages) {
            await oldMessage.delete().catch(() => {});
        }

        const firstMessage = await message.channel.send({
            content: vouchTemplate,
            allowedMentions: { parse: [] }
        });

        const secondMessage = await message.channel.send({
            content: vouchReminder,
            allowedMentions: { parse: [] }
        });

        vouchTemplateMessages = [firstMessage, secondMessage];

    } catch (error) {
        console.error('Failed to refresh vouch template:', error);
    }
});
// INQUIRY REMINDER STICKY NOTE
const INQUIRY_CHANNEL_ID = '1564294893935927496';

const inquiryStickyMessage =
    '_ _\n' +
    '-# _ _                   `사랑`    **／ℓ𑄝vꫀ﹒ℓιnꫀ！**\n' +
    '-# _ _                     ***rꫀmι𝓃dꫀrs   <a:f_pinkcamera:1564540513821138975> <:000_dots:1564314545759981759>***\n' +
    '-# _ _               <:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126><:333c:1563761973840187402><:333c:1563762035978797126>\n\n' +
    '-# _ _             . **pι𝓃g <@1548264732291498004> fσr     __assιst__**\n' +
    '-# _ _             . cꫀ𝓃s*w*σr st*w*σcks   p*w*ꫀasꫀ\n' +
    '-# _ _             . [(⁠´⁠∩⁠｡⁠•⁠ ᵕ⁠ •⁠｡⁠∩⁠`⁠) pℓꫀasꫀ rꫀadd   !](https://discord.com/channels/1563736869362081935/1563738507573203076)\n\n' +
    '_ _';

let inquiryStickyMessageId = null;

client.on(Events.MessageCreate, async message => {
    if (message.channel.id !== INQUIRY_CHANNEL_ID) return;
    if (message.author.bot) return;

    try {
        if (inquiryStickyMessageId) {
            const oldSticky = await message.channel.messages
                .fetch(inquiryStickyMessageId)
                .catch(() => null);

            if (oldSticky) {
                await oldSticky.delete().catch(() => {});
            }
        }

        const newSticky = await message.channel.send({
            content: inquiryStickyMessage,
            allowedMentions: { parse: [] }
        });

        inquiryStickyMessageId = newSticky.id;

    } catch (error) {
        console.error('Inquiry sticky note failed:', error);
    }
});
client.once(Events.ClientReady, async () => {
    try {
        const channelId = process.env.VOICE_CHANNEL_ID;
        const channel = await client.channels.fetch(channelId);

        if (!channel || !channel.isVoiceBased()) {
            console.error('Voice channel not found. Check VOICE_CHANNEL_ID.');
            return;
        }

        joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfMute: true,
            selfDeaf: true
        });

        console.log(`Joined voice channel: ${channel.name}`);
    } catch (error) {
        console.error('Failed to join voice channel:', error);
    }
    try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await updateQueueEmbed(guild);
    console.log('Queue embed initialized!');
} catch (error) {
    console.error('Queue setup failed:', error);
}

// Initialize and automatically check shop status
await checkShopStatus();

setInterval(checkShopStatus, 30 * 1000);
});

client.on(Events.MessageCreate, async message => {
    if (!message.guild || message.author.bot) return;

    // Give XP only once every 60 seconds per member
    if (!client.xpCooldowns) {
        client.xpCooldowns = new Map();
    }

    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    const lastMessage = client.xpCooldowns.get(cooldownKey) || 0;

    if (now - lastMessage < 5000) return;

    client.xpCooldowns.set(cooldownKey, now);

    const xpAmount = Math.floor(Math.random() * 11) + 10;
    const result = addXP(
        message.author.id,
        message.guild.id,
        xpAmount
    );

        if (result.leveledUp) {
        const levelUpChannel = await client.channels.fetch(
            process.env.LEVEL_UP_CHANNEL_ID
        ).catch(() => null);

        if (levelUpChannel && levelUpChannel.isTextBased()) {
            await levelUpChannel.send({
                content: `୨୧ ₊˚ ♡ congratulations, <@${message.author.id}>! you've reached **level ${result.level}**! 🎀 keep chatting and spreading love!`,
                allowedMentions: { users: [message.author.id] }
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
