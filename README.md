# d2-inventory-watcher
This is a two part app for Destiny 2: a website to construct a watch list, a Discord bot to use the watch list.

The website allows for users to create a list of weapons found through the manifest and selected desirable perks for them. The website supports uploading and downloading watch list .json's.

Then, the user can send the .json of their watch list to the Discord bot which will check against their inventory to see if they have the items with the desired perks, and then check every three seconds to see if amongst their new items is what they are looking for.
