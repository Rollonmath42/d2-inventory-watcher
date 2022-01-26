const path = require("path");
const express = require("express");
const app = express();
const LISTEN_PORT = process.env.PORT || 80;
const weapon_db_init = require("./weapon_db_init");
const cors = require('cors');
const fs = require('fs');
var favicon = require('serve-favicon');

app.use("/css", express.static(__dirname + "/css"));
app.use("/js", express.static(__dirname + "/js"));
app.use("/", express.static(__dirname + "/"));

app.use(cors());

app.get("/favicon.ico", (req, res) => res.sendFile("favicon.ico"));


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/weaponCollection", (req, res) =>{
    fs.readFile("./weapon_collection.json", (error, data) => {
        if(error) {
            throw error;
        }

        res.send(JSON.parse(data));
    })
});

app.get("/weapon/:id", (req, res) => {
    res.send(weapon_db_init.get_random_perks(req.params.id));
});

weapon_db_init.weapon_db_startup(web_server_runtime);

function web_server_runtime() {
    app.listen(LISTEN_PORT);
    console.log("Web server active");
}
