# Lost Ark LFG

This Discord bot was created to assist in the formation and organization of end game groups for Lost Ark. This bot is focused on providing an easily accessible interface without the need for users to input chat commands.

## Getting Started

### Invite the bot to your server

> invite link

### Environment setup
Note: If using npm, this will require C++ buildtools

1. Clone this repository 
2. Create a config.json file using the example provided
3. run `npm install` to install dependencies
4. run `node ./bot.js` to begin the bot

### Chat Command
`!setup` - in the create channel is all you need to start the bot once it has joined.

## Usage

### Creating a Party
In the create channel, begin your party listing by clicking the <span style="background:#3ba55d;color:white;border-radius:2px;padding:2px 5px;">Create Party</span> button and selecting the chosen activity in the dropdowns before confirming.

This will create a party listing and thread in the LFG listing channel which other users can join and leave.

<img src="https://i.imgur.com/20rpMmN.gif">

### Joining a Party
Users may join the listed parties up to the predefined party size limits in `gamemodes.json`. The party listing will be removed once all member slots  have been filled and everyone will be pinged with a ready-check, with the thread remaining for party members to chat in.

<img src="https://i.imgur.com/ruJxex5.png">

### Managing a Party
Additional options are provided for the party leader inside of the created thread to further customize a listing or modify the existing party.

- **Finalize** - Begins the activity whether the party is full or not.
- **Customize** - Opens a form to customize the party title and or description.
- **Kick** - Forcibly removes a party member from the party.
- **Archive** - Removes the listing from LFG and archives the thread, recommended after completing activities.

![custom-party2](https://user-images.githubusercontent.com/18094002/162097669-8fd2030b-e740-420e-b2f7-2beb31779e9d.gif)

## Bugs
Feel free to submit any bugs or issues if you encounter any to this repo. 
