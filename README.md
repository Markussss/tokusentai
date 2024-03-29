# tokusentai
simple Discord chat bot lmao

using [discord.js](https://discord.js.org) for communicating with discord

Runs nicely on Node 14.

To set up your own developing environment do this:
  1. `git clone https://github.com/Markussss/tokusentai`
  2. Create a copy of `.env_example` named and name it `.env` and fill your `.env` file with the `CLIENT_ID` and the `TOKEN` of your bot
  3. Run `yarn install`
     1. You might run into problems with installing sqlite, as there isn't always a precompiled binary available. In that case, I've found that the following packages are required for building sqlite: `make gcc g++`, although they might be called something else on your system, or you might need even more packages.
  4. Start by running `yarn start`. This will give you a gui, with a few options.
  5. Start a fake bot by running `yarn bot:fake`
  5. Start a real bot by running `yarn bot:start`

## To do

### Plans
- Store messages as they arrive
  - Create `storeMessage`, use this to import messages from both csv, API and live channel
    - Use transactions (maybe with "chunked committing"(?) - every nth insert, commit and start new transaction) for speed
- Simple chat command interface
  - Talk with bot in DMs? Tag the bot? Inquirer questionaire?
  - Adding/editing/removing responses
  - Tell the bot to be quiet
  - Show help, commands, responses, etc
- Make more bot data easier to access in the responder functions
  - Pass the message object to the responder functions, instead of the message text
    - Need to make sure that `bot:fake` is not too different from `bot:start`
- Add memoji support
  - `memoji('yeye')`?
  - `memojis.yeye`?
  - Look in [tokusentai.js](tokusentai.js) for tips
- Add reactions
  - Should be implemented as a responder
- More and better logging
  - Move feedback (bot responses, selected operation finished, etc) into `info`-calls
  - Add `warn`-calls to inform about missing data (missing NAME, CLIENT_ID, TOKEN, entries in `messages`-table, entries in `responses`-table, etc)
- Port most, if not all, functionality from [tokusentai.js](tokusentai.js) and [toFile.js](toFile.js)
  - Tell the bot to shut up
  - Add timeout to message responder (can only respond every n seconds)
  - Send messages as bot from admin interface
  - Moonrunes
  - Memoji triggers for messages and reactions
  - Ignore messages from other bots
- Cleanup, refactor, document

### Thoughts
- Migrate the storage of the markov chain into sqlite database
- Tell the bot to update itself
  - Just do `git pull` and restart (pull `master` or a specific tag/release?)