require('dotenv').config()

const mongo = require('mongodb').MongoClient
const Discord = require('discord.js')
const franc = require('franc')
const translate = require('google-translate-api')
// const Markov = require('simple-markov')
const MarkovGen = require('markov-generator')

const client = new Discord.Client()
const REPLY = 0
const SEND = 1

const MESSAGE = 0
const TIME = 1
const INTERVAL = 20000

const mongoURL = 'mongodb://localhost:27017/tokusentai'

const mostUsedWords = /(\begentlig\b|\bkanskje\b|\bfaktisk\b|\bsikkert\b|\bsteike\b|\bkoffor\b|\bganske\b|\bskulle\b|\bfordi\b|\bnåken\b|\bikkje\b|\bkjøpe\b|\bkjeme\b|\bhekje\b|\bheile\b|\bmykje\b|\bigjen\b|\bheilt\b|\bhadde\b|\bberre\b|\beller\b|\btrur\b|\bvære\b|\bfikk\b|\blitt\b|\bsånn\b|\bmeir\b|\bblei\b|\bskal\b|\bgjer\b|\bover\b|\bogså\b|\bekje\b|\bblir\b|\bsann\b|\bfolk\b|\bveit\b|\balle\b|\bnåke\b|\bfrå\b|\bkan\b|\bmed\b|\binn\b|\bnår\b|\bmin\b|\bher\b|\benn\b|\bden\b|\bser\b|\btil\b|\bvil\b|\bder\b|\bbra\b|\bsom\b|\bkom\b|\bsej\b|\bopp\b|\bbli\b|\bmej\b|\bman\b|\bgår\b|\bfor\b|\bnei\b|\bdag\b|\bfør\b|\bsjå\b|\bkor\b|\bdej\b|\bsei\b|\bhan\b|\bhar\b|\bmen\b|\bdei\b|\bdet\b|\bja\b|\bva\b|\bom\b|\bas\b|\bmb\b|\bsa\b|\bta\b|\bfe\b|\bfå\b|\bto\b|\bej\b|\bså\b|\bvi\b|\bet\b|\bhe\b|\bat\b|\bei\b|\bso\b|\but\b|\bno\b|\bpå\b|\bjo\b|\bha\b|\boi\b|\bmå\b|\bda\b|\bgå\b|\ben\b|\bdu\b|\bgm\b|\bho\b|\bka\b|\bog\b|\bav\b|\bme\b|\bdå\b|\bi\b|\bå\b|\ba\b|\be\b)/g

var disabled = 0 // 0 => not disabled, 1 => will disable after this message, 2 => disabled
var now = (new Date()).getTime()

var emojis = {}
var lastChannel
var messages // mongoDb collection of message history

var simpleMsgReply = []
var simpleMsg = []
var reactions = []
var markovMessages = []
var userMarkovs = {}
var markovs = []
// var messageHistory = []

function chunkArray (arr, chunkCount) {
  var chunks = []
  while (arr.length) {
    const chunkSize = Math.ceil(arr.length / chunkCount)
    const chunk = arr.slice(0, chunkSize)
    chunks.push(chunk)
    chunkCount -= 1
    arr = arr.slice(chunkSize)
  }
  return chunks
}

const endSign = ['.', '?', '??', '???', '?!', '??!', '??!!', '!', '!!', '!!!', '...', '-.-', ' :)', '', ' (:', ' :(', '!!!!!!!!', '!!!!!!!!111']

const msg = [
  {
    trigger: message => {
      var francMessage = franc(message)
      if (francMessage === 'und') {
        return ['cmn', 'kor', 'jpn', 'rus'].indexOf(franc(`${message} ${message} ${message} ${message} ${message} ${message} ${message} ${message} ${message} ${message}`)) > -1
      }
      return ['cmn', 'kor', 'jpn', 'rus'].indexOf(francMessage) > -1
    },
    response: message => {
      message = message.content
      return translate(message, {to: 'no'})
      .then(function (response) {
        return new Promise(function (resolve, reject) {
          resolve(
            `Moonrunes ${emojis.RRRREEEE} \n` +
            response.text + '\n' +
            `${emojis.RRRREEEE} ${emojis.RRRREEEE} ${emojis.RRRREEEE} ${emojis.RRRREEEE} ${emojis.RRRREEEE} ${emojis.RRRREEEE}`
          )
        })
      })
      .catch(error => {
        console.log(error)
      })
    },
    triggerType: MESSAGE,
    responseType: REPLY,
    lastSentAt: 0,
    timeout: 10000
  },
  {
    trigger: message => {
      return (
        message.indexOf('REE') > -1 ||
        message.indexOf('FAEN') < -1 ||
        message.toLowerCase().indexOf('grr') > -1 ||
        message.toLowerCase().indexOf('jesus fucking christ') > -1 ||
        (
          (((message.length - message.replace(/[A-ZÆØÅ]/g, '').length) / message.length) > 0.45) &&
          message.length > 10
        )
      )
    },
    response: message => {
      message = message.content
      return new Promise(resolve => {
        resolve('Tell til ti, kompis. :slight_smile:')
      })
    },
    triggerType: MESSAGE,
    responseType: REPLY,
    lastSentAt: 0,
    timeout: 30000
  },
  {
    trigger: message => {
      return message.toLowerCase().indexOf('fitte') > -1
    },
    response: message => {
      message = message.content
      return new Promise(resolve => {
        resolve(`Fitte ${emojis.yeye}`)
      })
    },
    triggerType: MESSAGE,
    responseType: SEND,
    lastSentAt: 0,
    timeout: 30000
  },
  {
  // mb this fit more here
    trigger: message => {
      return (
        message.toLowerCase().indexOf('runescape') > -1 ||
        message.toLowerCase().indexOf(' rs ') > -1 ||
        message.toLowerCase().indexOf(' rs') > -1 ||
        message.toLowerCase().indexOf(' osrs ') > -1 ||
        message.toLowerCase().indexOf(' osrs') > -1 ||
        message.toLowerCase().indexOf(' rs3 ') > -1 ||
        message.toLowerCase().indexOf(' rs3') > -1 ||
        message.toLowerCase().indexOf(' bgrs') > -1 ||
        message.toLowerCase().indexOf(' bgrs ') > -1
      )
    },
    response: message => {
      return new Promise(resolve => {
        resolve(`Bad Game! Run! Escape!`)
      })
    },
    triggerType: MESSAGE,
    responseType: SEND,
    lastSentAt: 0,
    timeout: 30000
  },
  {
    trigger: message => {
      return (
        message.toLowerCase().indexOf('weed') > -1 ||
        message.toLowerCase().indexOf('weeb') > -1
      )
    },
    response: message => {
      message = message.content
      return new Promise(resolve => {
        resolve(`weed ${emojis.yeye}\nweeb ${emojis.nono}`)
      })
    },
    responseType: SEND,
    triggerType: MESSAGE,
    lastSentAt: 0,
    timeout: 10000
  },
  {
    trigger: message => {
      return (
        message.toLowerCase().indexOf('get it') > -1
      )
    },
    response: message => {
      message = message.content
      return new Promise(resolve => {
        resolve(`get it <@${236919129641058305}> ${emojis.wink}`)
      })
    },
    responseType: SEND,
    triggerType: MESSAGE,
    lastSentAt: 0,
    timeout: 10000
  },
  {
    trigger: message => {
      let date = new Date()
      return (
        date.getHours() >= 6 &&
        date.getHours() < 12 &&
        (
          message.toLowerCase() === 'gm' ||
          message.toLowerCase() === `<@${process.env.CLIENT_ID}> gm`
        )
      )
    },
    response: () => {
      return new Promise(resolve => {
        resolve('gm')
      })
    },
    triggerType: MESSAGE,
    responseType: SEND,
    lastSentAt: 0,
    timeout: 3600000
  },
  {
    trigger: message => {
      let date = new Date()
      return (
        date.getHours() > 21 &&
        date.getHours() < 6 &&
        (
          message.toLowerCase() === 'gn' ||
          message.toLowerCase() === `<@${process.env.CLIENT_ID}> gn`
        )
      )
    },
    response: () => {
      return new Promise(resolve => {
        resolve('gn')
      })
    },
    triggerType: MESSAGE,
    responseType: SEND,
    lastSentAt: 0,
    timeout: 3600000
  },
  {
    trigger: message => {
      let date = new Date()
      return (
        (date.getHours() === 4 && date.getMinutes() === 20) ||
        (date.getHours() === 16 && date.getMinutes() === 20)
      )
    },
    response: message => {
      return message.react(emojis.weed)
      .then(() => {
        return message.react(emojis.four)
      })
      .then(() => {
        return message.react(emojis.two)
      })
      .then(() => {
        return message.react(emojis.zero)
      })
      .then(() => {
        return new Promise(resolve => {
          resolve({})
        })
      })
      .catch(error => {
        console.log(error)
      })
    },
    triggerType: MESSAGE,
    responseType: SEND,
    lastSentAt: 0,
    timeout: 10000
  },
  {
    trigger: message => {
      let date = new Date()
      return date.getHours() === 13 && date.getMinutes() === 37
    },
    response: () => {
      return new Promise(resolve => {
        resolve('leet :wink:')
      })
    },
    triggerType: MESSAGE,
    responseType: SEND,
    lastSentAt: 0,
    timeout: 3600000
  },
  {
    trigger: message => {
      return message === `<@${process.env.CLIENT_ID}> hold kjeft`
    },
    response: message => {
      message = message.content
      disabled = 1
      return new Promise(resolve => {
        resolve('oki brosjan')
      })
    },
    triggerType: MESSAGE,
    responseType: REPLY,
    lastSentAt: 0,
    timeout: 10000
  },
  {
    trigger: message => {
      let date = new Date()
      return date.getDay() === 27 && date.getMonth() === 7 && date.getFullYear === 2027
    },
    response: () => {
      return new Promise(resolve => {
        resolve(`Sjuesjuende i sjuende sjuesjuesju ${emojis.yeye}`)
      })
    },
    triggerType: MESSAGE,
    responseType: SEND,
    lastSentAt: 0,
    timeout: 3600000
  },
  {
    trigger: message => {
      return message === `<@${process.env.CLIENT_ID}> github`
    },
    response: message => {
      message = message.content
      return new Promise(resolve => {
        resolve('https://github.com/Markussss/tokusentai bare å klone og endre og sende pull requests kompis')
      })
    },
    triggerType: MESSAGE,
    responseType: REPLY,
    lastSentAt: 0,
    timeout: 10000
  },
  {
    trigger: message => {
      return message.indexOf(`<@${process.env.CLIENT_ID}>`) > -1
    },
    response: message => {
      message = message.content
      disabled = 0
      console.log(message)
      return new Promise(resolve => {
        var response = (simpleMsgReply.filter(msg => message.toLowerCase().indexOf(msg.trigger) > -1)[0] || {response: 'hey'}).response
        if (response.length) {
          response = response.split('|')
          response = response[[(Math.floor(Math.random() * response.length))]]
        }
        resolve(response)
      })
    },
    triggerType: MESSAGE,
    responseType: REPLY,
    lastSentAt: 0,
    timeout: 10000
  },
  {
    trigger: message => {
      return simpleMsg.filter(msg => message.toLowerCase().trim() === msg.trigger).length === 1
    },
    response: message => {
      message = message.content
      return new Promise(resolve => {
        var response = (simpleMsg.filter(msg => message.toLowerCase().indexOf(msg.trigger) > -1)[0] || {response: `${emojis.nani}`}).response
        if (response.length) {
          response = response.split('|')
          response = response[[(Math.floor(Math.random() * response.length))]]
        }
        resolve(response)
      })
    },
    triggerType: MESSAGE,
    responseType: SEND,
    lastSentAt: 0,
    timeout: 10000
  },
  {
    trigger: message => {
      return message.toLowerCase().indexOf('bra bot') > -1
    },
    response: () => {
      return new Promise(resolve => {
        resolve('hø snakka du om mj')
      })
    },
    triggerType: MESSAGE,
    responseType: REPLY,
    lastSentAt: 0,
    timeout: 10000
  }
]

function usefullMessage (str) {
  // \b(\w+)\s+\1\b
  if (str.match(/\b(\w+)\s+\1\b/)) {
    str = str.replace(/(\b(\w+))\s+\1\b/, '$1')
  }
  return str
    .replace(/<.*>/g, '')
    .replace(/:.*:/g, '')
    .replace(/[^a-zA-ZæøåÆØÅ.@:/\-(),!?=&\s]+/g, '')
    // .trim().split(' ').filter(t => t.length < 15).join(' ')
    .trim()
    .toLowerCase()
}

mongo.connect(mongoURL, (err, db) => {
  if (err) throw err
  messages = db.collection('messages')
  messages.find(
    {
      author: {$nin: [`${process.env.CLIENT_ID}`]},
      lang: {$in: ['nno', 'nob', 'swe', 'dan', 'und']}
    }, {
      _id: 0,
      message: 1
    }
  ).sort({timestamp: 1}).toArray((err, res) => {
    if (err) throw err
    if (res && res.length > 0) {
      res.forEach(message => {
        let betterMessage = usefullMessage(message.message)
        if (betterMessage.length > 1) {
          markovMessages.push(betterMessage)
        }
      })

      let targetMarkovs = Math.ceil(markovMessages.length / 1000)
      let time
      let length
      let messagesLength = markovMessages.length
      markovMessages = chunkArray(markovMessages, targetMarkovs)

      console.log(`learning ${messagesLength} messages. this might take a while...`)
      console.log(`splitting messages into ${targetMarkovs} different chains`)

      for (let i = 0; i < targetMarkovs; i++) {
        // let markov = new Markov(length, markovMessages[i][0])
        time = Date.now()
        length = (i % 2 === 0 ? 2 : 8)

        // markovMessages[i].forEach((message, i) => {
        //   if (i === 0) return
        //   markov.learn(message)
        // })
        markovs.push(
          // markov
          new MarkovGen({
            input: markovMessages[i],
            minLength: length
          })
        )
        console.log(`learned ${markovMessages[i].length} messages in ${Date.now() - time}ms. this chain has a minlength of ${length}`)
      }
      console.log(`created ${markovs.length} makrov chains!`)
    }
  })
  messages.aggregate([
    { $match: {
      author: {$nin: [`${process.env.CLIENT_ID}`]},
      lang: {
        $in: ['nno', 'nob', 'swe', 'dan', 'und']
      }
    }}, {
      $sort: {timestamp: -1}
    }, { $group: {
      _id: '$username',
      messages: {
        $push: '$message'
      }
    }}
  ]).toArray((err, users) => {
    if (err) throw err
    if (users && users.length > 0) {
      console.log('creating specialized markovs for each user with over 150 messages')
      users.forEach(user => {
        let messages = user.messages
        if (messages.length > 150) {
          messages.forEach(message => {
            let betterMessage = usefullMessage(message)
            if (betterMessage.length > 1) {
              if (!userMarkovs[user._id]) userMarkovs[user._id] = []
              userMarkovs[user._id].push(betterMessage)
            }
          })
          if (userMarkovs[user._id].length > 0) {
            if (userMarkovs[user._id].length > 1000) userMarkovs[user._id] = userMarkovs[user._id].slice(0, 1000)
            markovs.push(
              new MarkovGen({
                input: userMarkovs[user._id],
                minLength: 5
              })
            )
            console.log('pushed 1 new userMarkov to markovs!')
          }
        }
      })
      console.log('finished! ready for use!')
    }
  })
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
  emojis = client.emojis.reduce((emojis, emoji) => {
    emojis[emoji.name] = emoji
    return emojis
  }, emojis)
  emojis.thinking = '🤔'
  emojis.bae = '😂'
  emojis.helmax = '👌'
  emojis.hundred = '💯'
  emojis.wink = '😉'
  emojis.smirk = '😏'
  emojis.one = '1⃣'
  emojis.two = '2⃣'
  emojis.three = '3⃣'
  emojis.four = '4⃣'
  emojis.five = '5⃣'
  emojis.six = '6⃣'
  emojis.seven = '7⃣'
  emojis.eight = '8⃣'
  emojis.nine = '9⃣'
  emojis.zero = '0⃣'

  simpleMsgReply = [
    // simple message-to-response mapping, all messages has to be prefixed with @bot (in chat) / <@${process.env.CLIENT_ID}> (in code)
    {
      trigger: 'hey',
      response: 'hey|hei|hallo'
    },
    {
      trigger: 'nice',
      response: 'takk|ye'
    },
    {
      trigger: 'jp|ka skjer',
      response: 'ins dd|ins dd|ins dd|ins dd|ins dd|fingre dd|ins dd|ronke dd|ronke dd|ronke dd'
    },
    {
      trigger: 'ins dd',
      response: 'ins dd|ins dd|ins dd|ins dd|ins dd|fingre dd|ins dd|ronke dd|ronke dd|ronke dd'
    },
    {
      trigger: 'ins',
      response: 'ok|oki|oja|ronke du|ka e din fav porno side'
    },
    {
      trigger: 'ja',
      response: 'ok|oki|oki broshan'
    },
    {
      trigger: 'koffor|kaffor|hvorfor',
      response: 'fordi|derfor'
    },
    {
      trigger: 'nei nekta',
      response: 'tvinga dj'
    },
    {
      trigger: 'ok|oki|k',
      response: ':slight_smile:'
    },
    {
      trigger: `${emojis.nani}`,
      response: `${emojis.nani}`
    }
  ]

  simpleMsg = [
    // simple message-to-response mapping, compares trigger to all messages, but will only react if the message is exactly the same as the trigger
    {
      trigger: 'kennis',
      response: 'rip in peace kennis som havna i fengsel'
    },
    {
      trigger: `${emojis.nani}`,
      response: `${emojis.nani}`
    },
    {
      trigger: 'hey kara',
      response: 'hey kar'
    },
    {
      trigger: 'nok en gang',
      response: 'nok en gang ser vi behovet for en legalisering av marihuana i norge i dag|nok en gang ser vi behovet for et forbud mot anime i norge i dag|nok en gang ser vi behovet for en legalisering av marihuana i norge|nok en gang ser vi behovet for et forbud mot anime i norge'
    },
    {
      trigger: 'endelig',
      response: 'endelig. få det jævla korset vekk. ønsk revolusjonen velkommen, kamerater, endelig får vi oppleve ekte kommunisme!'
    },
    {
      trigger: 'mynt',
      response: 'e det noen som har kukmarinert no mynta i det siste da eller?'
    },
    {
      trigger: 'he lokt',
      response: 'i tissn etter å ha ha ronka'
    },
    {
      trigger: 'hade a',
      response: 'hade a'
    },
    {
      trigger: 'nei',
      response: 'eigd'
    },
    {
      trigger: 'eigd',
      response: 'eigd'
    }
  ]

  reactions = [
    {
      trigger: ':hm thinking:',
      reaction: message => {
        message.react(emojis.thinking)
      }
    },
    {
      trigger: emojis.bae.toString(),
      reaction: message => {
        message.react(emojis.bae)
        .then(() => {
          return message.react(emojis.helmax)
        })
        .then(() => {
          return message.react(emojis.hundred)
        })
        .catch(error => {
          console.log(error)
        })
      }
    },
    {
      trigger: emojis.helmax.toString(),
      reaction: message => {
        message.react(emojis.helmax)
        .then(() => {
          return message.react(emojis.helmax)
        })
        .then(() => {
          return message.react(emojis.hundred)
        })
        .catch(error => {
          console.log(error)
        })
      }
    },
    {
      trigger: emojis.hundred.toString(),
      reaction: message => {
        message.react(emojis.hundred)
        .then(() => {
          return message.react(emojis.helmax)
        })
        .then(() => {
          return message.react(emojis.hundred)
        })
        .catch(error => {
          console.log(error)
        })
      }
    },
    {
      trigger: emojis.thinking.toString(),
      reaction: message => {
        message.react(emojis.thinking)
      }
    },
    {
      trigger: emojis.weed.toString(),
      reaction: message => {
        message.react(emojis.yeye)
        .catch(error => {
          console.log(error)
        })
      }
    },
    {
      trigger: emojis.weed.toString(),
      reaction: message => {
        message.react(emojis.weed)
        .then(() => {
          return message.react(emojis.four)
        })
        .then(() => {
          return message.react(emojis.two)
        })
        .then(() => {
          return message.react(emojis.zero)
        })
        .catch(error => {
          console.log(error)
        })
      }
    },
    {
      trigger: 'kuk',
      reaction: message => {
        message.react(emojis.p1)
        .then(() => {
          return message.react(emojis.p2)
        })
        .then(() => {
          return message.react(emojis.p3)
        })
        .then(() => {
          return message.react(emojis.sd)
        })
        .then(() => {
          return message.react(emojis.jiss)
        })
        .catch(error => {
          console.log(error)
        })
      }
    },
    {
      trigger: 'elska hars',
      reaction: message => {
        message.react(emojis.weed)
        .then(() => {
          return message.react(emojis.four)
        })
        .then(() => {
          return message.react(emojis.two)
        })
        .then(() => {
          return message.react(emojis.zero)
        })
        .catch(error => {
          console.log(error)
        })
      }
    },
    {
      trigger: 'smoke weed everyday',
      reaction: message => {
        message.react(emojis.weed)
        .then(() => {
          return message.react(emojis.four)
        })
        .then(() => {
          return message.react(emojis.two)
        })
        .then(() => {
          return message.react(emojis.zero)
        })
        .catch(error => {
          console.log(error)
        })
      }
    },
    {
      trigger: 'fitte penga hars',
      reaction: message => {
        message.react(emojis.weed)
        .then(() => {
          return message.react(emojis.four)
        })
        .then(() => {
          return message.react(emojis.two)
        })
        .then(() => {
          return message.react(emojis.zero)
        })
        .catch(error => {
          console.log(error)
        })
      }
    }
  ]
})

client.on('message', message => {
  console.log(`${message.author.username}: ${message.content}`)
  if (message.author.bot) return
  lastChannel = message.channel
  if (message.content.indexOf('ronkus') === 0) {
    let startWord
    let startWords
    let markovMessage
    if (message.content.indexOf(' ') > -1) {
      startWords = message.content.replace(mostUsedWords, '').split(' ').filter(word => word.length > 0)
      startWord = startWords[Math.floor(Math.random() * startWords.length)]
      for (let i = 0; i < markovs.length; i++) {
        if (markovs[i].hasStartWord(startWord)) {
          markovMessage = markovs[i].makeChain(startWord)
          break
        }
      }
      if (!markovMessage) markovMessage = markovs[Math.floor(Math.random() * markovs.length)].makeChain(startWord)
    } else {
      markovMessage = markovs[Math.floor(Math.random() * markovs.length)].makeChain(startWord)
    }
    lastChannel.send(markovMessage + endSign[Math.floor(Math.random() * (endSign.length - 1))])
    markovs = markovs.sort(() => Math.floor(Math.random() * 3) - 1)
  }
  if ((Math.floor(Math.random() * 4) + 1) > 1) return
  now = (new Date()).getTime()

  /**
   * Do reactions
   */
  if (reactions.filter(msg => message.content.toLowerCase().indexOf(msg.trigger) > -1).length > 0) {
    reactions.filter(msg => message.content.toLowerCase().indexOf(msg.trigger) > -1)
    .forEach(reaction => {
      reaction.reaction(message)
    })
  }

  /**
   * Respond to messages
   */
  msg.filter(thisMessage => {
    return (
      thisMessage.triggerType === MESSAGE &&
      thisMessage.lastSentAt + thisMessage.timeout <= now
    )
  }).some((thisMessage, i) => {
    if (thisMessage.trigger(message.content)) {
      thisMessage.response(message)
      .then(reply => {
        if (disabled === 0 || disabled === 1) {
          if (disabled === 1) disabled = 2
          if (thisMessage.responseType === REPLY) {
            reply = `${message.author} ${reply}`
          }
          msg[i].lastSentAt = now
          return message.channel.send(reply)
        }
      })
      .catch(error => {
        console.log(error)
      })
      console.log(msg[i])
      return true
    }
  })
})

client.setInterval(() => {
  if (!lastChannel) return
  msg.filter(msg => msg.triggerType === TIME).some((msg, i) => {
    if (msg.trigger()) {
      msg.response()
      .then(reply => {
        if (disabled === 0 || disabled === 1) {
          lastChannel.send(reply)
          .catch(error => {
            console.log(error)
          })
        }
        if (disabled === 1) disabled = 2
      })
      .catch(error => {
        console.log(error)
      })
    }
  })
}, INTERVAL)

client.login(process.env.TOKEN)
.catch(err => {
  console.log(err)
})

function storeMessageHistory (before) {
  if (!lastChannel) throw new Error('No channel')
  if (!messages) throw new Error('Can\'t establish connection to MongoDB')

  let messageHistory = []

  console.log('fetching message history...')
  if (before) console.log('before: ' + before)
  return (function () {
    if (before) return lastChannel.fetchMessages({ limit: 100, before: before })
    return lastChannel.fetchMessages({ limit: 100 })
  })()
  .then(history => {
    if (history.size === 0) {
      console.log('finished!')
      return
    }
    console.log('messagehistory length: ' + history.size)
    history.forEach(message => {
      let messageObject = {
        id: message.id,
        username: message.author.username,
        author: message.author.id,
        message: message.content,
        legnth: message.content.length,
        timestamp: message.createdTimestamp
      }
      messageHistory.push(messageObject)
    })

    var fetchMore = true

    messageHistory.forEach(message => {
      return messages.find({id: message.id})
      .toArray((err, res) => {
        if (err) throw err
        if (res && res.length === 0) {
          messages.insertOne(message, (err, data) => {
            if (err) throw err
          })
        }
        fetchMore = false
      })
    })
    console.log(`saved messages in the database`)
    if (fetchMore) {
      setTimeout(() => {
        storeMessageHistory(messageHistory[messageHistory.length - 1].id)
      }, 500)
    }
  })
  .catch(console.error)
}

process.stdin.on('readable', () => {
  const chunk = process.stdin.read()
  if (chunk !== null) {
    if (chunk.toString().indexOf('history') > -1) {
      try {
        storeMessageHistory()
      } catch (e) {
        console.log(e)
      }
    } else if (lastChannel) {
      try {
        eval(chunk.toString())
      } catch (e) {
        console.log(e)
        lastChannel.send(chunk.toString())
      }
    }
  }
})
