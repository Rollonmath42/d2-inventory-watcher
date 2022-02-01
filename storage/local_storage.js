const fs = require('fs');
const path = require("path");
const local_storage = "storage/local_db.json";
const local_write_storage = "local_db.json";
let db = {};

function initialize_db(callback) {
    read_db((database) => {
        callback(database);
    });

    loop_save_db(true);
}

function loop_save_db(first_run) {
    if(!first_run) {
        console.log("Saving DB...");
        write_db();
    }

    setTimeout(loop_save_db, 30 * (1000), false);
}

const write_db = (() => {
    fs.writeFile(path.join(__dirname, local_write_storage), JSON.stringify(db), (error) => {
        if(error) {
            throw error;
        }
        
        console.log("Saved DB");
    });
}).bind(this);

function read_db(callback) {
    fs.readFile(local_storage, (error, data) => {
        if(error) {
            if(error.errno = -4058) {
                write_db();
            }
            else {
                console.log(error);
            }
        }

        db = !error ? JSON.parse(data) : [];
        callback(db);
    });
}

function add_to_db(entry) {
    let modified_entry = entry;
    modified_entry.watcher = undefined;
    db[modified_entry.discord_id] = modified_entry;
}

module.exports.initialize_db = initialize_db;
module.exports.add_to_db = add_to_db;