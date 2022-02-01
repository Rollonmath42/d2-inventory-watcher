// Require the necessary discord.js classes
const { Client, Intents, Guild, Interaction, Message, MessageEmbed } = require("discord.js");
const request = require('request');
require("dotenv").config();

const bungie_base_url = "https://www.bungie.net";
const api_headers = {"X-API-Key" : process.env.API_KEY};

const inventory_watcher = require("./inventory_watcher");
const local_database = require("./storage/local_storage");

let watcher_dictionary = {};
let setup_complete = false;

// Create a new client instance
//const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_PRESENCES], partials: ['MESSAGE', 'CHANNEL', 'USER'] });
const client = new Client({ intents: [Intents.FLAGS.DIRECT_MESSAGES], partials: ['MESSAGE', 'CHANNEL', 'USER'] });

// When the client is ready, run this code (only once)
client.once("ready", () => {
    console.log("Discord Bot active!");
    client.user.setPresence({activities: [{name: "your inventory", type: "Watching"}], status:"online"});
    inventory_watcher.watcher_startup(postmaster_warning, weapon_notification, inventory_watcher_ready);
});

client.on("messageCreate", (message) => {
    if(message.author.bot) {
        return;
    }

    if(!setup_complete) {
        simple_message("Hold on, still getting ready...", message.author.id);
        return;
    }

    if(message.attachments.size == 1) {
        handle_user_message(message);
    }

    if(message.content.includes("/")) {
        let bungie_id = message.content.split("/");
        request({ url: bungie_base_url + `/Platform/Destiny2/${bungie_id[0]}/Profile/${bungie_id[1]}/?components=Characters`,
        headers: api_headers}, (error, response, body) => {
            if(!error) {
                process_character_info(message, body, bungie_id);
                return;
            }

            console.log(error);
        });
    }
});

function inventory_watcher_ready() {
    local_database.initialize_db(db_initialized);
}

function db_initialized(database) {
    let keys = Object.keys(database);
    for(let i = 0; i < keys.length; i++) {
        watcher_dictionary[database[keys[i]].discord_id] = {
            discord_id: database[keys[i]].discord_id,
            bungie_profile: database[keys[i]].bungie_profile,
            watcher: undefined,
            watch_list: database[keys[i]].watch_list
        };

        check_watcher_definition(database[keys[i]].discord_id);
    }

    console.log("Setup complete, watchers have been deployed (if any).");
    setup_complete = true;
}

async function process_character_info(message, body, bungie_id) {
    let response = JSON.parse(body);
    if(response.ErrorCode != 1) {
        simple_message(`From Bungie: ${response.Response}`, message.author.id);
        return;
    }

    let characters = response.Response.characters.data;

    let bungie_profile = {
        membership: bungie_id[0],
        profile_id: bungie_id[1],
        postmaster: {}
    };

    let keys = Object.keys(characters);

    for(let i = 0; i < keys.length; i++) {
        bungie_profile.postmaster[keys[i]] = {
            first_postmaster_notify: false,
            second_postmaster_notify: false,
            count: 0
        };
    }

    if(watcher_dictionary[message.author.id] == undefined) {
        watcher_dictionary[message.author.id] = {
            discord_id: message.author.id,
            bungie_profile: bungie_profile,
            watcher: undefined,
            watch_list: undefined
        };

        local_database.add_to_db(watcher_dictionary[message.author.id]);
        simple_message("Successfully registered that Bungie ID", message.author.id);
        return;
    }

    watcher_dictionary[message.author.id].bungie_profile = bungie_profile;
    local_database.add_to_db(watcher_dictionary[message.author.id]);
    simple_message("Successfully registered that Bungie ID", message.author.id);
    check_watcher_definition(message.author.id);
}

async function handle_user_message(message) {
    if(watcher_dictionary[message.author.id] == undefined) {
        watcher_dictionary[message.author.id] = {
            discord_id: message.author.id,
            bungie_profile: undefined,
            watcher: undefined,
            watch_list: undefined
        };

        local_database.add_to_db(watcher_dictionary[message.author.id]);
    }

    request({ url: message.attachments.at(0).attachment }, (error, response, body) => {
        if(error) {
            throw error;
        }

        watcher_dictionary[message.author.id].watch_list = JSON.parse(body);
        local_database.add_to_db(watcher_dictionary[message.author.id]);
        simple_message("Successfully added that watch list", message.author.id);
        check_watcher_definition(message.author.id);
    });
}

function check_watcher_definition(user_id) {
    if(watcher_dictionary[user_id].watch_list == undefined
            || watcher_dictionary[user_id].bungie_profile == undefined) {
        return;
    }

    if(watcher_dictionary[user_id].watcher == undefined) {
        watcher_dictionary[user_id].watcher = 
            new inventory_watcher.inventory_watcher_class(watcher_dictionary[user_id].watch_list, user_id, watcher_dictionary[user_id].bungie_profile);
        watcher_dictionary[user_id].watcher.start_watcher_loop(watcher_dictionary[user_id].watcher);

        local_database.add_to_db(watcher_dictionary[user_id]);
        simple_message("Initializing watcher", user_id);
        return;
    }

    watcher_dictionary[user_id].watcher.update_watch_list(watcher_dictionary[user_id].watch_list);
    watcher_dictionary[user_id].watcher.update_bungie_profile(watcher_dictionary[user_id].bungie_profile);
    local_database.add_to_db(watcher_dictionary[user_id]);
    simple_message("Updated watcher information", user_id);
}

async function simple_message(message, user_id) {
    const user = await client.users.fetch(user_id);
    user.send(message);
}

async function postmaster_warning(message, user_id) {
    const user = await client.users.fetch(user_id);
    const postmaster_message = new MessageEmbed()
        .setColor('RED')
        .setTitle('Postmaster Warning!')
        .setDescription(message)
        .setThumbnail("https://www.bungie.net/common/destiny2_content/icons/58e0868540ff4053d1a1f10f2dd959dd.png");
    user.send({embeds: [postmaster_message]});
}

async function weapon_notification(location, item, found_perks, user_id, wish_list_entry) {
    const user = await client.users.fetch(user_id);
    const weapon_message = new MessageEmbed()
        .setColor('LUMINOUS_VIVID_PINK')
        .setTitle('New Weapon Notification!')
        .setDescription(`A weapon located in your ${location} matches a listing on your watch list!`)
        .setThumbnail(`https://www.bungie.net${item.displayProperties.icon}`);

    let keys = Object.keys(found_perks);
    for(let i = 0; i < keys.length; i++) {
        let inner_counter = 3;
        for(let j = 0; j < found_perks[keys[i]].length; j++) {
            weapon_message.addField(found_perks[keys[i]][j].name, found_perks[keys[i]][j].description, true);
            inner_counter--;
        }

        while(inner_counter > 0) {
            weapon_message.addField('\u200B', '\u200B', true);
            inner_counter--;
        }
    }

    if(wish_list_entry.title != undefined && wish_list_entry.description != undefined) {
        weapon_message.addField("Watch List Item Title: " + wish_list_entry.title, "Watch List Item Description: " + wish_list_entry.description, false);
    }

    user.send({embeds: [weapon_message]});
}

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
