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

### Bugs
- `bot:start` isn't responding properly to messages that `bot:fake` is responding to

### Plans
- Store messages as they arrive
  - Create `storeMessage`, use this to import messages from both csv, API and live channel
    - Use transactions (maybe with "chunked committing"(?) - every nth insert, commit and start new transaction) for speed
- More and better logging
  - Move feedback (bot responses, selected operation finished, etc) into `info`-calls
  - Add `warn`-calls to inform about missing data (missing NAME, CLIENT_ID, TOKEN, entries in `messages`-table, entries in `responses`-table, etc)
- Simple chat command interface for adding/editing/removing responses
  - Talk with bot in DMs? Tag the bot? Inquirer questionaire?
  - Could be implemented as a response in [responses.js](responses.js), but should it...?
- Make more bot data easier to access in the responder functions
  - Pass the message object to the responder functions, instead of the message text
    - Need to make sure that `bot:fake` is not too different from `bot:start`
- Add reactions
  - Should be implemented as a responder
- Add memoji support
  - `memoji('yeye')`?
  - `memojis.yeye`?
  - Look in [tokusentai.js](tokusentai.js) for tips
- Port most, if not all, functionality from [tokusentai.js](tokusentai.js) and [toFile.js](toFile.js)
- Cleanup, refactor, document

### Thoughts
- Migrate the storage of the markov chain into sqlite database
- Tell the bot to update itself
  - Just do `git pull` and restart (pull `master` or a specific tag/release?)