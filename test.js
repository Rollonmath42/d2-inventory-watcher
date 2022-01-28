const manifest = require("./get_manifest_and_build");

manifest.check_manifest(runtime);

function runtime() {
    console.log(JSON.parse(manifest.hash_lookup("DestinyInventoryItemDefinition", 3513791699).json));
}