const request = require('request');
const fs = require('fs');
const extract = require('extract-zip');
const sqlite = require('sqlite3');
require('dotenv').config();

//Random necessary stuff to use... I should probably make the stored version something that can be generated on first time run
const bungie_base_url = "https://www.bungie.net";
const downloaded_manifest_file = "./downloaded_manifest_version.json";
const api_headers = {"X-API-Key" : process.env.API_KEY};
const magic_number_for_id = 4294967296;

//Info to be used
var manifest_path;
var db;

//startup();
var runtime_callback_function;

var manifest_dictionary = {};
function initialize_manifest_dicionary() {
    console.log("Building database...");
    fs.readdir("./manifest", (error, filenames) => {
        if(error) {
            throw error;
        }

        for(let i = 0; i < filenames.length; i++) {
            let filename = filenames[i].split(".")[0];
            manifest_dictionary[filename] = require(`./manifest/${filenames[i]}`);
        }
        
        console.log("Database built.");
        runtime_callback_function();
    });
}

function hash_lookup(table, id)
{
    let result = manifest_dictionary[table].find(item => item.id == id);

    if(result == undefined) {
        result = manifest_dictionary[table].find(item => item.id == (id - magic_number_for_id));
    }

    return result;
}

async function compare_manifest_versions(downloaded_manifest, manifest_info) {
    if(downloaded_manifest.version != manifest_info.Response.version) {
        console.log("Need to update manifest version '" + downloaded_manifest.version + "' vs latest version '" + manifest_info.Response.version + "'.");

        request({ url: bungie_base_url + manifest_path, encoding: null }, (err, rsp, body) => {
            console.log("Downloading manifest.zip...");

            fs.writeFile("manifest.zip", body, "binary", async (err) => {
                console.log("Downloaded manifest.zip.");

                console.log("Extracting manifest.zip...");
                await extract("manifest.zip", { dir: __dirname }, (err) => {});
                console.log("Extracted manifest.zip.");

                downloaded_manifest.version = manifest_info.Response.version;
    
                console.log("Updating downloaded manifest version...");
                fs.writeFile(downloaded_manifest_file, JSON.stringify(downloaded_manifest), (error) => {
                    if(error) {
                        throw error;
                    }
                    console.log("Updated manifest version.");

                    build_db();
                });
            });
        });
    }
    else {
        console.log("Downloaded manifest is up to date.");

        initialize_manifest_dicionary();
    }
}

function build_db() {
    console.log("Extracting manifest tables...");
    let manifest_path_array = manifest_path.split('/');
    db = new sqlite.Database("./" + manifest_path_array[manifest_path_array.length - 1]);

    
    db.serialize(() => {
		let query = "SELECT name FROM sqlite_master WHERE type='table'";

		db.all(query, (error, rows) => {
			if(error) {
                throw error;
            }

            process_names(rows);
		});
    });
}

function process_names(names) {
    let processed_name = [];
    for (let i = 0; i < names.length; i++) {
        processed_name[i] = false;
        let query = `SELECT * FROM ${names[i].name}`;

        db.all(query, (error, rows) => {
            if (error) {
                throw error;
            }

            write_database_in_json(names[i].name, rows, () => {
                processed_name[i] = true;
                
                if(!processed_name.includes(false)) {
                    console.log("All tables extracted.");
                    db.close((error) => {
                        if(error) {
                            throw error;
                        }

                        let manifest_path_array = manifest_path.split('/');
                        try {
                            fs.unlinkSync("./" + manifest_path_array[manifest_path_array.length - 1]);
                            fs.unlinkSync("./manifest.zip");
    
                            console.log("Deleted downloaded manifest.");
                            initialize_manifest_dicionary();
                        }
                        catch (error) {
                            throw error;
                        }
                    });
                }
            });
        });
    }
}

function write_database_in_json(name, rows, callback) {
    fs.writeFile(`./manifest/${name}.json`, JSON.stringify(rows), (error) => {
        if (error) {
            throw error;
        }

        console.log(`Extracted ${name}`);

        callback();
    });
}

//Let's check the manifest info to see if it has been updated since we last downloaded it.
function check_manifest(runtime_callback) {
    runtime_callback_function = runtime_callback;
    console.log("Checking latest manifest version...");
    request({ url: bungie_base_url + "/Platform/Destiny2/Manifest", headers: api_headers}, (error, response, body) => {
        if(error) {
            throw error;
        }

        let manifest_info = JSON.parse(body);
        manifest_path = manifest_info.Response.mobileWorldContentPaths.en;
    
        console.log("Checking downloaded manifest version...");
        fs.readFile(downloaded_manifest_file, (error, data) => {
            if(error) {
                if(error.errno = -4058) {
                    console.log("No downloaded manifest version saved, writing...");
                    fs.writeFile(downloaded_manifest_file, JSON.stringify({version:''}), (error) => {
                        if(error) {
                            throw error;
                        }

                        console.log("Downloaded manifest version saved.");
                        compare_manifest_versions({version:''}, manifest_info);
                    });
                }
                else {
                    throw error;
                }
            }
            else {
                compare_manifest_versions(JSON.parse(data), manifest_info);
            }
        })
    });
}

module.exports.check_manifest = check_manifest;
module.exports.hash_lookup = hash_lookup;