# d2-inventory-watcher
This is a two part app for Destiny 2: a website to construct a watch list, a Discord bot to use the watch list.

The website allows for users to create a list of weapons found through the manifest and selected desirable perks for them. The website supports uploading and downloading watch list .json's.

Then, the user can send the .json of their watch list to the Discord bot which will check against their inventory to see if they have the items with the desired perks, and then check every three seconds to see if amongst their new items is what they are looking for.


# How it all links together

So there's two main components:

- discordbot.js
- webserver.js

# discordbot.js

This has a dependency on inventory_watcher.js, which has a dependency on get_manifest_and_build.js

get_manifest_and_build.js is a utility module to get the latest manifest (think of it as a database) from Bungie's API, and then create a locally stored version of the manifest as individual .json files.

Think of the inventory_watcher.js file as the actual "watcher" class that everyone wants a copy of. Most of the functionality in there is used by the class definition to actually process the information from Bungie about a player's items and where they are stored.

As for the main discordbot.js, similar to express and how to configure the actual server, you have to configure the bot to do actions based on key states such as 'once the bot is ready' or 'one when a message is sent to the bot'. Similar to inventory_watcher.js, most of the code is utility functionality to parse the info from Bungie or from the user.

One common key functionality is when users type a command with a specific character to start the command (!hi, !help). As of the last time I was working on this, I came up with a way that I liked for keeping those kinds of commands split off into their own files, which is what the message.content[0] == "!" section is doing. Since Discord has implemented slash commands, odds are it would be much better to implement any sort of command functionality through that setup... But I'm a stubborn person at times, and like doing stuff in my own way :)

# webserver.js

This has a dependency on weapon_db_init.js, which has a dependency on get_manifest_and_build.js

weapon_db_init.js specifically searches through every single item defined in the manifest and sees if it matches something I want to feed back to the website as a part of it's own database in memory for accessing the various items in Destiny. It also has a specific function the website needs to use to get what the actual perk sets are for weapons, since those are mapped across two different tables in the manifest.