//This returns all weapons AND perks/traits
const manifest = require("./get_manifest_and_build");
const fs = require('fs');
/* old
const weapon_and_perk_bucket_hashes = [
    953998645, //power
    1498876634, //kinetic
    2465295065, //energy
    1469714392 //perk
]*/
const weapon_and_perk_bucket_hashes = [
    2, //kinetic
    3, //energy
    4, //power
    610365472 //perk
]
/*
item categories 1 weapon 2 kinetic 3 energy 4 power 3708671066 perks
*/
var webserver_startup;

function weapon_db_startup(server_startup) {
    webserver_startup = server_startup;
    manifest.check_manifest(weapon_db_runtime);
}

function weapon_db_runtime() {
    let item_db = require("./manifest/DestinyInventoryItemDefinition");

    let weapons = [];

    for(let i = 0; i < item_db.length; i++) {
        let item = item_db[i];
        let itemJson = JSON.parse(item.json);

        if(itemJson.itemCategoryHashes == undefined) {
            continue;
        }

        let match_count = 0;
        for(let j = 0; j < itemJson.itemCategoryHashes.length; j++) {
            if(weapon_and_perk_bucket_hashes.includes(itemJson.itemCategoryHashes[j])) {
                match_count++;
            }
        }

        if(match_count == 0) {
            continue;
        }

        /*if(!weapon_and_perk_bucket_hashes.includes(itemJson.inventory.bucketTypeHash)) {
            continue;
        }*/

        weapons.push(itemJson);
    }

    fs.writeFile("./weapon_collection.json", JSON.stringify(weapons), (error) => {
        if(error) {
            throw error;
        }

        console.log("Saved weapon collection.");
        webserver_startup();
    });
}

function get_random_perks(id) {
    let weapon = JSON.parse(manifest.hash_lookup("DestinyInventoryItemDefinition", id).json);

    let weapon_perks = [];

    for(let i = 0; i < weapon.sockets.socketEntries.length; i++) {
        if(weapon.sockets.socketEntries[i].plugSources != 2) {
            continue;
        }

        if(weapon.sockets.socketEntries[i].randomizedPlugSetHash == undefined) {
            continue;
        }
        
        let plug_set = JSON.parse(manifest.hash_lookup("DestinyPlugSetDefinition", weapon.sockets.socketEntries[i].randomizedPlugSetHash).json);

        weapon_perks.push(plug_set.reusablePlugItems);
    }

    return weapon_perks;
}

module.exports.weapon_db_startup = weapon_db_startup;
module.exports.get_random_perks = get_random_perks;