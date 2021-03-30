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
- Stop spamming and repeating
  - Keep a list of the last 10 (maybe more?) responses
  - Don't send the response if the current response is in the list
- Store messages as they arrive
- Simple chat command interface for adding/editing/removing responses
- Make more bot data easier to access in the responder functions
- Add reactions
- Add memoji support
- Port most, if not all, functionality from [tokusentai.js](tokusentai.js) and [toFile.js](toFile.js)
- Cleanup, refactor, document

### Thoughts
- Migrate the storage of the markov chain into sqlite database
- Tell the bot to update itself
  - Just do `git pull` and restart (pull `master` or a specific tag/release?)