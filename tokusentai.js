require('dotenv').config()

const fs = require('fs')
const mongo = require('mongodb').MongoClient
const Discord = require('discord.js')
const franc = require('franc')
const translate = require('@vitalets/google-translate-api')
const chain = require('easy-markov-chain')
const YAML = require('yaml')
const isOnline = require('is-online')

var client
const REPLY = 0
const SEND = 1

const ONLINE_CHECK_INTERVAL = 60000
const ONLINE_CHECK_MAX_FAILURES = 5

var onlineCheckFailures = 0

const DISABLED = 2
const DISABLE_AFTER_THIS = 1
const NOT_DISABLED = 0

var disabled = 0

const mongoURL = 'mongodb://localhost:27017/tokusentai'

var emojis = {}
var lastChannel
var messages // mongoDb collection of message history

var simpleMessageReplies = YAML.parse(fs.readFileSync('./simple-message-replies.yml', 'utf-8'))
const simpleMessages = YAML.parse(fs.readFileSync('./simple-messages.yml', 'utf-8'))
const simpleFuzzyMessages = YAML.parse(fs.readFileSync('./simple-fuzzy-messages.yml', 'utf-8'))

var reactions = []


const endSign = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '', '', '', '', '', '', '', '', '', '?', '?', '?', '?!', '?!', '?!', '!', '!', '!', '...']

const responseStrategies = [
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
            .then(response => {
                return Promise.resolve(
                    `Moonrunes ${emojis.RRRREEEE} \n` +
                    response.text + '\n' +
                    `${emojis.RRRREEEE} ${emojis.RRRREEEE} ${emojis.RRRREEEE} ${emojis.RRRREEEE} ${emojis.RRRREEEE} ${emojis.RRRREEEE}`
                )
            })
            .catch(error => {
                console.error(error)
            })
        },
        responseType: REPLY,
        lastSentAt: 0,
        timeout: 10000
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
        responseType: SEND,
        lastSentAt: 0,
        timeout: 3600000
    },
    {
        trigger: () => {
            let date = new Date()
            return date.getHours() === 13 && date.getMinutes() === 37
        },
        response: () => {
            return new Promise(resolve => {
                resolve('leet :wink:')
            })
        },
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
        responseType: REPLY,
        lastSentAt: 0,
        timeout: 10000
    },
    {
        trigger: () => {
            let date = new Date()
            return date.getDay() === 27 && date.getMonth() === 7 && date.getFullYear() === 2027
        },
        response: () => {
            return new Promise(resolve => {
                resolve(`Sjuesjuende i sjuende sjuesjuesju ${emojis.yeye}`)
            })
        },
        responseType: SEND,
        lastSentAt: 0,
        timeout: 3600000
    },
    {
        trigger: message => {
            return message.includes(`<@${process.env.CLIENT_ID}>`) && message.includes('github')
        },
        response: message => {
            message = message.content
            return new Promise(resolve => {
                resolve('https://github.com/Markussss/tokusentai bare å klone og endre og sende pull requests kompis')
            })
        },
        responseType: REPLY,
        lastSentAt: 0,
        timeout: 10000
    },
    {
        trigger: message => {
            return message.includes(`<@${process.env.CLIENT_ID}> `)
        },
        response: message => {
            message = message.content
            return new Promise((resolve, reject) => {
                message = message.replace(`<@${process.env.CLIENT_ID}>`, '').trim()
                let response = simpleMessageReplies[message]

                if (Array.isArray(response)) {
                    response = randomArrayEntry(response)
                }
                resolve(response)
            })
        },
        responseType: REPLY,
        lastSentAt: 0,
        timeout: 0
    },
    {
        trigger: message => {
            return !!simpleMessages[message]
        },
        response: message => {
            message = message.content
            return new Promise(resolve => {
                let response = simpleMessages[message]

                if (Array.isArray(response)) {
                    response = randomArrayEntry(response)
                }

                resolve(response)
            })
        },
        responseType: SEND,
        lastSentAt: 0,
        timeout: 10000
    },
    {
        trigger: message => {
            return Object.keys(simpleFuzzyMessages).find(trigger => message.includes(trigger))
        },
        response: message => {
            message = message.content
            return new Promise(resolve => {
                let response = simpleFuzzyMessages[Object.keys(simpleFuzzyMessages).find(trigger => message.includes(trigger))]

                if (Array.isArray(response)) {
                    response = randomArrayEntry(response)
                }

                resolve(response)
            })
        },
        responseType: SEND,
        lastSentAt: 0,
        timeout: 10000
    },
    {
        trigger: message => {
            return message.toLowerCase().includes(process.env.BOT_NAME)
        },
        response: message => {
            return new Promise(resolve => {
                let startWord = randomArrayEntry(message.content.replace(process.env.BOT_NAME, '').split(' ').filter(word => word))

                resolve(chain.generate(randNum(5, 40), startWord) + randomArrayEntry(endSign))
            })
        },
        responseType: SEND,
        lastSentAt: 0,
        timeout: 0
    },
]

mongo.connect(mongoURL, (err, db) => {
    if (err) {
        console.log('mongodb is not started')
        throw err
    }
    messages = db.collection('messages')
    messages.find(
        {
            author: {$nin: [`${process.env.CLIENT_ID}`]},
            lang: {$in: ['nno', 'nob', 'swe', 'dan', 'und']},
            wordCount: {
                // $lte: 6,
                $gt: 6
            }
        }, {
            _id: 0,
            message: 1
        }
    ).sort({timestamp: 1}).toArray((err, res) => {
        if (err) throw err
        if (res && res.length > 0) {
            console.log(`creating markov chain out, weeeee~`)
            res.forEach(message => {
                chain.learn(message.message)
            })
            chain.normalize()
            console.log(`created markov chain, jiihhaaa!`)
        }
    })
})

process.stdin.on('readable', () => {
    const chunk = process.stdin.read()
    if (chunk !== null) {
        if (chunk.toString().indexOf('history') > -1) {
            try {
                storeMessageHistory()
            } catch (err) {
                console.error(err)
            }
        } else if (lastChannel) {
            try {
                eval(chunk.toString())
            } catch (err) {
                console.error(err)
                lastChannel.send(chunk.toString())
            }
        }
    }
})

function randNum(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min // The maximum is inclusive and the minimum is inclusive
}

function randomArrayEntry(array) {
    return array[randNum(0, array.length - 1)]
}

function storeMessageHistory (before) {
    if (!lastChannel) throw new Error('No channel')
    if (!messages) throw new Error('Can\'t establish connection to MongoDB')

    let messageHistory = []

    console.log('fetching message history...')
    if (before) console.log('before: ' + before)
    return (() => {
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

function run () {
    client = new Discord.Client()

    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`)
        emojis = client.emojis.reduce((emojis, emoji) => {
            emojis[emoji.name] = emoji
            return emojis
        }, emojis)

        /** basic settings for the server */
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

        reactions = [
            {
                trigger: ':hm thinking:',
                react: message => {
                    message.react(emojis.thinking)
                }
            },
            {
                trigger: emojis.bae.toString(),
                react: message => {
                    message.react(emojis.bae)
                    .then(() => {
                        return message.react(emojis.helmax)
                    })
                    .then(() => {
                        return message.react(emojis.hundred)
                    })
                    .catch(error => {
                        console.error(error)
                    })
                }
            },
            {
                trigger: emojis.helmax.toString(),
                react: message => {
                    message.react(emojis.helmax)
                    .then(() => {
                        return message.react(emojis.helmax)
                    })
                    .then(() => {
                        return message.react(emojis.hundred)
                    })
                    .catch(error => {
                        console.error(error)
                    })
                }
            },
            {
                trigger: emojis.hundred.toString(),
                react: message => {
                    message.react(emojis.hundred)
                    .then(() => {
                        return message.react(emojis.helmax)
                    })
                    .then(() => {
                        return message.react(emojis.hundred)
                    })
                    .catch(error => {
                        console.error(error)
                    })
                }
            },
            {
                trigger: emojis.thinking.toString(),
                react: message => {
                    message.react(emojis.thinking)
                }
            },
            {
                trigger: emojis.weed.toString(),
                react: message => {
                    message.react(emojis.yeye)
                    .catch(error => {
                        console.error(error)
                    })
                }
            },
            {
                trigger: emojis.weed.toString(),
                react: message => {
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
                        console.error(error)
                    })
                }
            },
            {
                trigger: 'kuk',
                react: message => {
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
                        console.error(error)
                    })
                }
            },
            {
                trigger: 'elska hars',
                react: message => {
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
                        console.error(error)
                    })
                }
            },
            {
                trigger: 'smoke weed everyday',
                react: message => {
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
                        console.error(error)
                    })
                }
            },
            {
                trigger: 'fitte penga hars',
                react: message => {
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
                        console.error(error)
                    })
                }
            }
        ]
    })

    client.on('message', incomingMessage => {
        if (incomingMessage.author.bot) {
            return
        }

        if (incomingMessage.content.length > 10 && !incomingMessage.content.includes(process.env.BOT_NAME)) {
            chain.learn(incomingMessage.content)
        }

        console.log(`${incomingMessage.author.username}: ${incomingMessage.content}`)

        lastChannel = incomingMessage.channel

        reactions.filter(reaction => {
            return incomingMessage.content.toLowerCase().includes(reaction.trigger)
        }).forEach(reaction => {
            reaction.react(incomingMessage)
        })

        let responseStrategy = responseStrategies.find(responseStrategy => {
            return (
                responseStrategy.lastSentAt + responseStrategy.timeout <= (new Date()).getTime() &&
                responseStrategy.trigger(incomingMessage.content)
            )
        })

        if (!responseStrategy) {
            return
        }

        responseStrategy.response(incomingMessage)
            .then(reply => {
                console.log(reply)
                if (disabled === DISABLED) {
                    return
                }
                if (disabled === DISABLE_AFTER_THIS) {
                    disabled = DISABLED
                }

                if (responseStrategy.responseType === REPLY) {
                    reply = `${incomingMessage.author} ${reply}`
                }
                responseStrategy.lastSentAt = (new Date()).getTime()
                return incomingMessage.channel.send(reply)
            })
            .catch(error => {
                console.error(error)
            })
        console.log(responseStrategy)
    })

    client.login(process.env.TOKEN)
}

function runForever () {
    try {
        run()
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
    setInterval(async () => {
        let online = await isOnline()
        if (!online) {
            onlineCheckFailures += 1
            if (onlineCheckFailures >= ONLINE_CHECK_MAX_FAILURES) {
                process.exit(1)
            }
        } else {
            onlineCheckFailures = 0
        }
    }, ONLINE_CHECK_INTERVAL)
}

runForever()
