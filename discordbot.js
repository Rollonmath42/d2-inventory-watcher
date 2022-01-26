// Require the necessary discord.js classes
const { Client, Intents, Guild, Interaction, Message, MessageEmbed } = require("discord.js");
const request = require('request');
require("dotenv").config();

const inventory_watcher = require("./inventory_watcher");
let watcher_dictionary = {};

const its_me = {
    membership: "3",
    profile_id: "4611686018468393987",
    postmaster: {
        "2305843009394751671" : {
            first_postmaster_notify: false,
            second_postmaster_notify: false,
            count: 0
        },
        "2305843009432475159" : {
            first_postmaster_notify: false,
            second_postmaster_notify: false,
            count: 0
        },
        "2305843009764984617" : {
            first_postmaster_notify: false,
            second_postmaster_notify: false,
            count: 0
        }
    }
}

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_PRESENCES], partials: ['MESSAGE', 'CHANNEL', 'USER'] });

// When the client is ready, run this code (only once)
client.once("ready", () => {
    console.log("Discord Bot active!");
    client.user.setPresence({activities: [{name: "your inventory", type: "Stalking"}], status:"online"});
    inventory_watcher.watcher_startup(postmaster_warning, weapon_notification);
});

client.on("messageCreate", (message) => {
    if(message.author.bot) {
        return;
    }
    if(message.attachments.size == 1) {
        handle_user_message(message);
    }
});

function handle_user_message(message) {
    if(watcher_dictionary[message.author.id] == undefined) {
        request({ url: message.attachments.at(0).attachment }, (error, response, body) => {
            if(error) {
                throw error;
            }

            watcher_dictionary[message.author.id] = new inventory_watcher.inventory_watcher_class(JSON.parse(body), message.author.id, its_me);
            watcher_dictionary[message.author.id].start_watcher_loop(watcher_dictionary[message.author.id]);
        });

        return;
    }

    request({ url: message.attachments.at(0).attachment }, (error, response, body) => {
        if(error) {
            throw error;
        }

        watcher_dictionary[message.author.id].update_watch_list(JSON.parse(body));
    });
}

async function postmaster_warning(message, user_id) {
    const user = await client.users.fetch(user_id);
    const weaponMessage = new MessageEmbed()
        .setColor('RED')
        .setTitle('Postmaster Warning!')
        .setDescription(message)
        .setThumbnail("https://www.bungie.net/common/destiny2_content/icons/58e0868540ff4053d1a1f10f2dd959dd.png");
    user.send(message);
}

async function weapon_notification(location, item, found_perks, user_id) {
    const user = await client.users.fetch(user_id);
    const weaponMessage = new MessageEmbed()
        .setColor('LUMINOUS_VIVID_PINK')
        .setTitle('New Weapon Notification!')
        .setDescription(`A weapon located in your ${location} matches a listing on your watch list!`)
        .setThumbnail(`https://www.bungie.net${item.displayProperties.icon}`);

    let keys = Object.keys(found_perks);
    for(let i = 0; i < keys.length; i++) {
        let inner_counter = 3;
        for(let j = 0; j < found_perks[keys[i]].length; j++) {
            weaponMessage.addField(found_perks[keys[i]][j].name, found_perks[keys[i]][j].description, true);
            inner_counter--;
        }

        while(inner_counter > 0 && i < keys.length - 1) {
            weaponMessage.addField('\u200B', '\u200B', true);
            inner_counter--;
        }
    }

    user.send({embeds: [weaponMessage]});
}

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);