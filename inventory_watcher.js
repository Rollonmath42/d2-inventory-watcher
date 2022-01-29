const manifest = require("./get_manifest_and_build");
const request = require('request');
require('dotenv').config();

const bungie_base_url = "https://www.bungie.net";
const api_headers = {"X-API-Key" : process.env.API_KEY};

'use strict';
class inventory_watcher_class {
    constructor(watch_list, discord_id, bungie_profile) {
        this.watch_list = watch_list;
        this.discord_id = discord_id;
        this.bungie_profile = bungie_profile;
        this.first_watch = true;
        this.seen_items = [];
    }

    start_watcher_loop = (function(instance) {
        watcher_loop(instance);
        setTimeout(this.start_watcher_loop, 3000, this);
    }).bind(this);

    update_watch_list(watch_list) {
        this.watch_list = watch_list;
        this.first_watch = true;
        this.seen_items = [];
    }

    update_bungie_profile(bungie_profile) {
        this.bungie_profile = bungie_profile;
        this.first_watch = true;
        this.seen_items = [];
    }
}

/////////////////////////////////////////
//This section includes information that can be fed into the program; user based info.

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

let discord_id;

/////////////////////////////////////////
//ID definitions
/*
bucketHashes:
215593132 - Postmaster
138197802 - Vault (General)
3448274439 - Helmet
3551918588 - Gauntlets
14239492 - Chest Armor
20886954 - Leg Armor
1585787867 - Class Armor
1498876634 - Kinetic Weapons
2465295065 - Energy Weapons
953998645 - Power Weapons
*/
const class_ids = {
    0: "Titan",
    1: "Hunter",
    2: "Warlock"
}

const weapon_buckets = [
    1498876634, //Kinetic
    2465295065, //Energy
    953998645, //Power
    215593132, //Postmaster
    138197802
];

const bucket_dictionary = {
    1498876634 : "Kinetic Slot",
    2465295065 : "Energy Slot",
    953998645 : "Power Slot",
    215593132 : "Postmaster",
    138197802 : "Vault"
}

/////////////////////////////////////////

var postmaster_message;
var weapon_notification;

function watcher_startup(discord_postmaster_notification, discord_weapon_notification) {
    postmaster_message = discord_postmaster_notification;
    weapon_notification = discord_weapon_notification;
    manifest.check_manifest(watcher_runtime);
}

function watcher_runtime() {
    console.log("Inventory Watcher has been initialized!");
}

function watcher_loop(watcher_instance) {
    request({ url: bungie_base_url + `/Platform/Destiny2/${watcher_instance.bungie_profile.membership}/Profile/${watcher_instance.bungie_profile.profile_id}/?components=CharacterInventories,Characters,ProfileInventories,CharacterEquipment`,
        headers: api_headers}, (error, response, body) => {
            read_character_inventories(error, response, body, watcher_instance);
    });
}

function read_character_inventories(error, response, body, watcher_instance) {
    if(error) {
        throw error;
    }

    let JSON_response = JSON.parse(body).Response;

    if(JSON_response == undefined || JSON_response.characters == undefined) {
        console.log(JSON_response);
        return;
    }

    let character_information = JSON_response.characters.data;

    if(watcher_instance.first_watch) {
        watcher_instance.first_watch = false;

        //Vault Check - this should only be done on load
        let profile_inventory = JSON_response.profileInventory.data.items;
        process_items(profile_inventory, false, undefined, "Vault", watcher_instance);

        //Current Equipment Check - this should only be done on load... could see why to do it on every run though
        let character_equipment = JSON_response.characterEquipment.data;
    
        let keys = Object.keys(character_equipment);
        for(let i = 0; i < keys.length; i++) {
            let items = character_equipment[keys[i]].items;
            process_items(items, true, character_information[keys[i]], `${class_ids[character_information[keys[i]].classType]}'s Equipment`, watcher_instance);
        }
    }

    //Individual Character Inventory and Postmaster Check - these should happen every time
    let character_inventories = JSON_response.characterInventories.data;
    let keys = Object.keys(character_inventories);
    for(let i = 0; i < keys.length; i++) {
        let items = character_inventories[keys[i]].items;
        process_items(items, true, character_information[keys[i]], undefined, watcher_instance);
    }

    for(let i = 0; i < keys.length; i++) {
        if(watcher_instance.bungie_profile.postmaster[keys[i]].count < 15) {
            watcher_instance.bungie_profile.postmaster[keys[i]].first_postmaster_notify = false;
            watcher_instance.bungie_profile.postmaster[keys[i]].second_postmaster_notify = false;
        }
    }
}

function process_items(items, is_character, character, location, watcher_instance) {
    let class_name = "undefined name";
    let current_item_location = location;
    if(is_character) {
        watcher_instance.bungie_profile.postmaster[character.characterId].count = 0;
        class_name = class_ids[character.classType];
    }


    for(let i = 0; i < items.length; i++) {
        if(items[i].itemInstanceId == undefined) {
            continue;
        }

        if(!weapon_buckets.includes(items[i].bucketHash)) {
            continue;
        }

        //Postmaster check
        if(is_character) {
            if(items[i].bucketHash == 215593132) {
                watcher_instance.bungie_profile.postmaster[character.characterId].count++;
            }
    
            if(watcher_instance.bungie_profile.postmaster[character.characterId].count > 15 && !watcher_instance.bungie_profile.postmaster[character.characterId].first_postmaster_notify) {
                watcher_instance.bungie_profile.postmaster[character.characterId].first_postmaster_notify = true;
                postmaster_notification(`Your ${class_name}'s postmaster is entering a danger zone!`, discord_id);
            }
    
            if(watcher_instance.bungie_profile.postmaster[character.characterId].count > 18 && !watcher_instance.bungie_profile.postmaster[character.characterId].second_postmaster_notify) {
                watcher_instance.bungie_profile.postmaster[character.characterId].second_postmaster_notify = true;
                postmaster_notification(`Your ${class_name}'s postmaster is in critical state! Transfer items out of there as soon as possible, or else you may start losing items!`, discord_id);
            }
        }

        if(watcher_instance.seen_items.includes(items[i].itemInstanceId)) {
            continue;
        }

        watcher_instance.seen_items.push(items[i].itemInstanceId);

        let items_of_interest = watcher_instance.watch_list.filter(entry => entry.gun_id == items[i].itemHash);

        if(items_of_interest.length <= 0) {
            continue;
        }

        let item = manifest.hash_lookup("DestinyInventoryItemDefinition", items[i].itemHash);
        let itemJson = JSON.parse(item.json);
        
        current_item_location = location == undefined ? `${class_name}'s ${bucket_dictionary[items[i].bucketHash]}` : location;
        
        for(let j = 0; j < items_of_interest.length; j++) {
            request_item_sockets(itemJson, items[i].itemInstanceId, current_item_location, items_of_interest[j], watcher_instance);
        }
    }
}

function request_item_sockets(item, instance_id, bucket, wish_list_entry, watcher_instance) {
    request({ url: bungie_base_url + `/Platform/Destiny2/${watcher_instance.bungie_profile.membership}/Profile/${watcher_instance.bungie_profile.profile_id}/Item/${instance_id}/?components=ItemSockets,ItemReusablePlugs`,
        headers: api_headers}, (error, response, body) => {
            check_if_item_matches_criteria(error, body, item, bucket, wish_list_entry, watcher_instance);
    });
}

function check_if_item_matches_criteria(error, body, item, bucket, wish_list_entry, watcher_instance) {
    if(error) {
        throw error;
    }

    if(JSON.parse(body).Response == undefined) {
        return;
    }

    if(item.sockets == undefined || JSON.parse(body).Response.sockets == undefined) {
        return;
    }

    let sockets = JSON.parse(body).Response.reusablePlugs.data.plugs;

    let wish_item_perks = wish_list_entry.perk_combo;

    let counter = 0;

    for(let i = 0; i < wish_item_perks.length; i++) {
        let current_perk_set = wish_item_perks[i];

        if(current_perk_set.perk_ids.length == 0) {
            continue;
        }

        counter = 0;
        let keys = Object.keys(sockets);
        for(let j = 0; j < keys.length; j++) {
            for(let k = 0; k < sockets[keys[j]].length; k++) {
                if(current_perk_set.perk_ids.includes(sockets[keys[j]][k].plugItemHash)) {
                    counter++;
                }
            }
        }

        if(current_perk_set.must_have_all && counter != current_perk_set.perk_ids.length) {
            return;
        }

        if(counter == 0) {
            return;
        }
    }

    let found_perks = {};

    let keys = Object.keys(sockets);
    for(let i = 0; i < keys.length; i++) {
        found_perks[keys[i]] = [];
        for(let j = 0; j < sockets[keys[i]].length; j++) {
            let perk = JSON.parse(manifest.hash_lookup("DestinyInventoryItemDefinition", sockets[keys[i]][j].plugItemHash).json);

            if(perk.inventory.bucketTypeHash != 1469714392) {
                continue;
            }

            found_perks[keys[i]].push({
                name: perk.displayProperties.name,
                description: perk.displayProperties.description
            });
        }
    }

    weapon_notification(bucket, item, found_perks, watcher_instance.discord_id, wish_list_entry);
}

module.exports.watcher_startup = watcher_startup;
module.exports.inventory_watcher_class = inventory_watcher_class;