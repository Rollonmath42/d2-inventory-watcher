let search_text = document.getElementById("search_box");
let search_results = document.getElementById("search_results");
let item_screenshot = document.getElementById("item_screenshot");
let watch_list = document.getElementById("watch_list");
let perk_list = document.getElementById("perk_list");
let import_json = document.getElementById("import_json");
let export_button = document.getElementById("export_button");
let export_name = document.getElementById("export_name");
let remove_current_button = document.getElementById("remove_current_item");
let item_title_box = document.getElementById("item_title");
let item_description_box = document.getElementById("item_description");

let background_watch_list = [];
let weapon_and_perk_db;
let running_index = 0;

httpGetAsync("/weaponCollection", on_weapon_db_callback);

export_button.addEventListener("click", download_watch_list);
remove_current_button.addEventListener("click", remove_current_item);
import_json.addEventListener("click", () => { import_json.value = null });
import_json.addEventListener("change", load_wish_list);
item_title_box.addEventListener("input", update_title_field);
item_description_box.addEventListener("input", update_description_field);

function update_title_field() {
    if(item_screenshot.index == -1) {
        return;
    }

    for(let i = 0; i < background_watch_list.length; i++) {
        if(background_watch_list[i].watch_list_index == item_screenshot.index) {
            background_watch_list[i].title = item_title_box.value;
            break;
        }
    }
}

function update_description_field() {
    if(item_screenshot.index == -1) {
        return;
    }

    for(let i = 0; i < background_watch_list.length; i++) {
        if(background_watch_list[i].watch_list_index == item_screenshot.index) {
            background_watch_list[i].description = item_description_box.value;
            break;
        }
    }
}

function load_wish_list() {
    if(import_json.files.item(0) == undefined) {
        return;
    }

    let file_reader = new FileReader();
    file_reader.onload = set_wish_list;
    file_reader.readAsText(import_json.files.item(0));
}

function set_wish_list(event) {
    let data = JSON.parse(event.target.result);
    background_watch_list = data;

    //Clear all old stuff
    
    while(watch_list.firstChild) {
        watch_list.removeChild(watch_list.lastChild);
    }

    item_screenshot.src = "./no_item.jpg";
    item_screenshot.screenshot = "";
    item_screenshot.hash = 0;
    item_screenshot.index = -1;

    item_title_box.value = "";
    item_description_box.value = "";
    item_title_box.contentEditable = "false";
    item_description_box.contentEditable = "false";

    while(perk_list.firstChild) {
        perk_list.removeChild(perk_list.lastChild);
    }

    //Set new watch list
    let max_index = background_watch_list.length;

    for(let i = 0; i < background_watch_list.length; i++) {
        if(background_watch_list[i].watch_list_index >= max_index) {
            max_index = background_watch_list[i].watch_list_index + 1;
        }

        let item = weapon_and_perk_db.find(element => element.hash == background_watch_list[i].gun_id);

        let watch_item = document.createElement("li");
        watch_item.innerText = item.displayProperties.name;
        watch_item.id = item.hash;
        watch_item.index = background_watch_list[i].watch_list_index;
        watch_item.addEventListener("click", () => {
            display_item(item, true, watch_item.index);
        });

        watch_list.appendChild(watch_item);
    }

    running_index = max_index;
}

function remove_current_item() {
    if(item_screenshot.hash == 0) {
        return;
    }

    for(let i = 0; i < background_watch_list.length; i++) {
        if(background_watch_list[i].watch_list_index == item_screenshot.index) {
            background_watch_list.splice(i, 1);
            break;
        }
    }

    while(perk_list.firstChild) {
        perk_list.removeChild(perk_list.lastChild);
    }

    for(let i = 0; i < watch_list.childElementCount; i++) {
        if(watch_list.childNodes[i].index == item_screenshot.index) {
            watch_list.removeChild(watch_list.childNodes[i]);
            break;
        }
    }

    item_screenshot.src = "./no_item.jpg";
    item_screenshot.screenshot = "";
    item_screenshot.hash = 0;
    item_screenshot.index = -1;
    item_title_box.value = "";
    item_description_box.value = "";
    item_title_box.contentEditable = "false";
    item_description_box.contentEditable = "false";
}

function download_watch_list() {
    let file_name = "watch_list";
    if(export_name.value != "") {
        file_name = export_name.value;
    }

    let a = document.createElement('a');
    a.download = `${file_name}.json`;
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(background_watch_list));
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function on_weapon_db_callback(response) {
    weapon_and_perk_db = JSON.parse(response);
    search_text.addEventListener("input", search_for_suggestions);
}

function search_for_suggestions() {
    while(search_results.firstChild) {
        search_results.removeChild(search_results.lastChild);
    }

    let text = search_text.value;

    let suggestions = weapon_and_perk_db.filter(element => element.displayProperties.name.toLowerCase().includes(text.toLowerCase()) 
    && element.screenshot != undefined
    && element.inventory.tierTypeName != "Exotic"
    && element.inventory.bucketTypeHash != 1469714392);

    for(let i = 0; i < suggestions.length && i < 10; i++) {
        let result = document.createElement("li");
        result.innerText = suggestions[i].displayProperties.name;
        result.id = suggestions[i].hash;
        result.addEventListener("click", () => {
            display_item(suggestions[i], false);
        });

        search_results.appendChild(result);
    }
}

function display_item(item, from_watch_list, watch_list_unique_index) {
    search_text.value = "";

    while(search_results.firstChild) {
        search_results.removeChild(search_results.lastChild);
    }
    
    while(perk_list.firstChild) {
        perk_list.removeChild(perk_list.lastChild);
    }

    item_screenshot.src = "https://www.bungie.net" + item.screenshot;
    item_screenshot.screenshot = item.screenshot;
    item_screenshot.hash = item.hash;
    item_title_box.value = "";
    item_description_box.value = "";
    item_title_box.contentEditable = "true";
    item_description_box.contentEditable = "true";

    httpGetAsync(`/weapon/${item.hash}`, display_perks);

    if(from_watch_list) {
        item_screenshot.index = watch_list_unique_index;
        
        for(let i = 0; i < background_watch_list.length; i++) {
            if(background_watch_list[i].watch_list_index == item_screenshot.index) {
                item_title_box.value = background_watch_list[i].title;
                item_description_box.value = background_watch_list[i].description;
                break;
            }
        }
        return;
    }
    
    let watch_item = document.createElement("li");
    watch_item.innerText = item.displayProperties.name;
    watch_item.id = item.hash;
    watch_item.index = running_index;
    watch_item.addEventListener("click", () => {
        display_item(item, true, watch_item.index);
    });

    item_screenshot.index = watch_item.index;

    watch_list.appendChild(watch_item);

    background_watch_list.push({
        watch_list_index : watch_item.index,
        gun_id : item.hash,
        description : "",
        title : "",
        perk_combo : [
            {
                perk_ids : []
            },
            {
                perk_ids : []
            },
            {
                perk_ids : []
            },
            {
                perk_ids : []
            }
        ]
    });

    running_index++;
}

function display_perks(response) {
    let perk_columns = JSON.parse(response);
    for(let i = 0; i < perk_columns.length; i++) {
        process_perk_column(perk_columns[i], i);
    }
}

function process_perk_column(perk_set, column) {
    let proper_count = 0;
    for(let i = 0; i < perk_set.length; i++) {
        if(!perk_set[i].currentlyCanRoll) {
            continue;
        }
        console.log(perk_set[i].plugItemHash);
        let perk = weapon_and_perk_db.find(perk => perk.hash == perk_set[i].plugItemHash);
        if(perk == undefined) {
            console.log("Hey, if you see this, DM Rollon#1111 on Discord this: " + perk_set[i].plugItemHash);
            continue;
        }
        let perk_img = document.createElement("img");
        perk_img.src = `https://bungie.net${perk.displayProperties.icon}`;
        perk_img.className = "perk_icon";
        perk_img.style.gridColumn = column + 1;
        perk_img.style.gridRow = proper_count + 1;
        perk_img.info = perk;
        perk_img.title = perk.displayProperties.name + "\n" + perk.displayProperties.description;
        perk_img.addEventListener("click", () => {
            toggle_perk(perk_img, column);
        });
        perk_list.appendChild(perk_img);
        set_perk_background(perk_img, column);
        proper_count++;
    }
}

function toggle_perk(perk_img, column) {
    for(let i = 0; i < background_watch_list.length; i++) {
        if(background_watch_list[i].watch_list_index != item_screenshot.index) {
            continue;
        }
        //Since we're toggling the perk, we need to see if it ISN'T selected to make it selected now!
        if(!is_perk_selected(perk_img.info.hash, column)) {
            background_watch_list[i].perk_combo[column].perk_ids.push(perk_img.info.hash);
            break;
        }

        let perk_index = background_watch_list[i].perk_combo[column].perk_ids.indexOf(perk_img.info.hash);
        background_watch_list[i].perk_combo[column].perk_ids.splice(perk_index, 1);
        break;
    }
    //Calling this here guarantees that it will be set correctly now
    set_perk_background(perk_img, column);
}

function set_perk_background(perk_img, column) {
    perk_img.style.background = is_perk_selected(perk_img.info.hash, column) ? "#00ff22" : "";
}

function is_perk_selected(hash, column) {
    for(let i = 0; i < background_watch_list.length; i++) {
        if(background_watch_list[i].watch_list_index != item_screenshot.index) {
            continue;
        }

        if(background_watch_list[i].perk_combo[column].perk_ids.includes(hash)) {
            return true;
        }
    }

    return false;
}

function httpGetAsync(url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4) {
            callback(xmlHttp.responseText);
        }
    }
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
}