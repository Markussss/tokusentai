require('dotenv').config()

const franc = require('franc')
const Discord = require('discord.js')
const sqlite3 = require('sqlite3').verbose()

const channelId = process.argv[2]

const DEBUG = false
const LIMIT = 100

let db = new sqlite3.Database(process.env.DBPATH, err => {
    if (err) {
        console.error(err)
    }
})
db.serialize(() => {
    if (DEBUG) {
        db.exec(`drop table messages`)
        console.log('dropped message table')
    }
    let sql = `create table if not exists messages (
        id varchar(64) primary key,
        username varchar(255),
        author varchar(64),
        message text,
        channel varchar(64),
        length integer unsigned,
        timestamp integer unsigned,
        lang char(3),
        wordcount integer unsigned
    )`
    db.exec(sql)
    console.log('connected to database and message table exists')
    init()
})

async function init() {
    // let before = await getMinId(channelId)
    let after = await getMaxId(channelId)

    let client = new Discord.Client()
    await client.login(process.env.TOKEN)

    let channel
    let channelIds = client.channels.keyArray()
    for(let i = 0; i < channelIds.length; i++) {
        let cid = channelIds[i]
        let c = client.channels.get(cid)
        if (c.id === channelId) {
            channel = c
        } else if (c.type === 'text') {
            after = await getMaxId(c.id)
            await storeNewMessages(c, after)
        }
    }
    // storeMessageHistory(channel, before)
    // storeNewMessages(channel, after)
    db.close()
    process.exit(0)
}

async function getMinId (channelId) {
    return new Promise((resolve, reject) => {
        db.get(`select min(id) id from messages where channel = ?`, [channelId],  (err, min) => {
            if (err) {
                reject(err)
            }
            resolve(min.id)
        })
    })
}

async function getMaxId (channelId) {
    return new Promise((resolve, reject) => {
        db.get(`select max(id) id from messages where channel = ?`, [channelId],  (err, max) => {
            if (err) {
                reject(err)
            }
            resolve(max.id)
        })
    })
}

function getMessageHistory(channel, before) {
    if (before) {
        return channel.fetchMessages({ limit: LIMIT, before })
    }
    return channel.fetchMessages({ limit: LIMIT })
}

function getNewMessages(channel, after) {
    return channel.fetchMessages({ limit: LIMIT, after }).catch(err => {
        return {
            size: 0,
            forEach: () => {}
        }
    })
}

function storeMessage(message) {
    let sql = `insert into messages (id, username, author, message, channel, length, timestamp, lang) values (?, ?, ?, ?, ?, ?, ?, ?)`

    let lang = franc(message.content.repeat(10))

    db.run(
        sql,
        [
            message.id,
            message.author.username,
            message.author.id,
            message.content,
            message.channel.id,
            message.content.length,
            message.createdTimestamp,
            lang,
        ],
        err => {
            if (err) {
                console.log(err)
            }
        })
}

async function storeMessageHistory (channel, before, ts) {
    if (ts) {
        console.log(`spent ${(new Date().getTime() - ts)} milliseconds…\n`)
    }
    ts = (new Date()).getTime()
    let message = `getting messages`
    if (before) {
        message += ` before ${Discord.SnowflakeUtil.deconstruct(before).date}`
    }
    message += ` from ${channel.name}`
    console.log(message)

    let history = await getMessageHistory(channel, before)

    if (history.size === 0) {
        console.log('finished!')
        return
    }

    history.forEach(message => {
        storeMessage(message)
        before = message.id
    })

    if (history.size === LIMIT) {
        setTimeout(() => {
            storeMessageHistory(channel, before, ts)
        })
    } else {
        console.log('finished storing messages')
        db.close()
        process.exit(0)
    }
}

async function storeNewMessages (channel, after, ts) {
    if (ts) {
        console.log(`spent ${(new Date().getTime() - ts)} milliseconds…\n`)
    }
    ts = (new Date()).getTime()
    let message = `getting messages`
    if (after) {
        message += ` after ${Discord.SnowflakeUtil.deconstruct(after).date}`
    }
    message += ` from ${channel.name}`
    console.log(message)

    let history = await getNewMessages(channel, after)

    if (history.size === 0) {
        console.log('finished!')
        return
    }

    history.forEach(message => {
        storeMessage(message)
    })
    after = history.first().id

    if (history.size === LIMIT) {
        setTimeout(() => {
            storeNewMessages(channel, after, ts)
        }, 500)
    } else {
        console.log('finished storing messages')
    }
}


// db.all(`select * from messages where lang is null`, [], (e, rows) => {
//     if (e) {
//         throw e
//     }
//     rows.forEach((row, i) => {
//         if (i === 40) {
//             db.close()
//             process.exit(0)
//         }
//         db.run(
//             `update messages set lang = ? where id = ?`,
//             [
//                'und',
//                row.id
//             ],
//             err => {
//                 if (err) {
//                    //  db.run('rollback transaction')
//                     throw e
//                 }
//             })
//     })
// })