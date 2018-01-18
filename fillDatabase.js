require('dotenv').config()

const mongo = require('mongodb').MongoClient
const franc = require('franc')
const mongoURL = 'mongodb://localhost:27017/tokusentai'

var messages // mongoDb collection

mongo.connect(mongoURL, (err, db) => {
  if (err) throw err
  messages = db.collection('messages')
  // addLength(messages) // 1
  // addLangGuess(messages) // 2
  // addWordCount(messages) // 3
  // fixLangGuess(messages) // 4
  // getMostUsedWords(messages) //
})

function fixLangGuess (messages) {
  messages.find(
    {}, {
      _id: 1,
      message: 1,
      lang: 1,
      wordCount: 1
    }
  ).toArray((err, res) => {
    if (err) throw err
    console.log(`fixLangGuess: updating ${res.length} entries`)
    let it = 0
    let allowedLanguages = ['nno', 'nob', 'swe', 'eng', 'dan', 'jpn', 'kor', 'rus']
    if (res && res.length > 0) {
      res.forEach((el, i) => {
        let message = el.message
        if (el.wordCount < 100) {
          message = `${message} `.repeat(Math.ceil(100 / el.wordCount))
        }
        let langGuess = franc(message)
        if (allowedLanguages.indexOf(langGuess) < 0) {
          langGuess = 'und'
        }
        if (langGuess !== el.lang) {
          messages.updateOne(
            {_id: el._id},
            {
              $set: {
                lang: langGuess
              }
            },
            {
              upsert: false,
              multi: false
            },
            (err, data) => {
              if (err) throw err
              process.stdout.clearLine()
              process.stdout.cursorTo(0)
              process.stdout.write(`${Math.ceil((it / res.length) * 100)}%`)
              it++
              if (it === res.length - 1) {
                console.log('finished')
              }
            }
          )
        } else {
          it++
        }
      })
    }
  })
}

function addWordCount (messages) {
  messages.find(
    {
      wordCount: undefined
    }, {
      _id: 1,
      message: 1
    }
  ).toArray((err, res) => {
    if (err) throw err
    console.log(`addWordCount: updating ${res.length} entries`)
    console.log()
    let it = 0
    if (res && res.length > 0) {
      res.forEach((el, i) => {
        messages.updateOne(
          {_id: el._id},
          {
            $set: {
              wordCount: el.message.split(' ').length
            }
          },
          {
            upsert: false,
            multi: false
          },
          (err, data) => {
            if (err) throw err
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
            process.stdout.write(`${Math.ceil((it / res.length) * 100)}%`)
            it++
            if (it === res.length - 1) {
              console.log('finished')
            }
          }
        )
      })
    }
  })
}

function addLangGuess (messages) {
  messages.find(
    {
      lang: undefined
    }, {
      _id: 1,
      message: 1
    }
  ).toArray((err, res) => {
    if (err) throw err
    console.log(`addLangGuess: updating ${res.length} entries`)
    let it = 0
    if (res && res.length > 0) {
      res.forEach((el, i) => {
        messages.updateOne(
          {_id: el._id},
          {
            $set: {
              lang: franc(`${el.message} ${el.message} ${el.message}`)
            }
          },
          {
            upsert: false,
            multi: false
          },
          (err, data) => {
            if (err) throw err
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
            process.stdout.write(`${Math.ceil((it / res.length) * 100)}%`)
            it++
            if (it === res.length - 1) {
              console.log('finished')
            }
          }
        )
      })
    }
  })
}

function addLength (messages) {
  messages.find(
    {
      length: undefined
    }, {
      _id: 1,
      message: 1
    }
  ).toArray((err, res) => {
    if (err) throw err
    console.log(`addLength: updating ${res.length} entries`)
    console.log()
    let it = 0
    if (res && res.length > 0) {
      res.forEach((el, i) => {
        messages.updateOne(
          {_id: el._id},
          {
            $set: {
              length: el.message.length
            }
          },
          {
            upsert: false,
            multi: false
          },
          (err, data) => {
            if (err) throw err
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
            process.stdout.write(`${Math.ceil((it / res.length) * 100)}%`)
            it++
            if (it === res.length - 1) {
              console.log('finished')
            }
          }
        )
      })
    }
  })
}

function getMostUsedWords(messages) {
  var wordCounts = {}
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
        message.message.trim().toLowerCase().split(' ').forEach(word => {
          if (word.length === 0) return
          if (!wordCounts[word]) wordCounts[word] = 0
          wordCounts[word] += 1
        })
      })
    }
    Object.keys(wordCounts).sort((a, b) => {
      return wordCounts[b] - wordCounts[a]
    }).filter(word => wordCounts[word] > 500).sort((a, b) => b.length - a.length).forEach(word => {
      console.log(word)
    })
  })
}

// saved for later
// function storeMessageHistory (before) {
//   if (!lastChannel) throw new Error('No channel')
//   if (!messages) throw new Error('Can\'t establish connection to MongoDB')

//   let messageHistory = []

//   console.log('fetching message history...')
//   if (before) console.log('before: ' + before)
//   return (function () {
//     if (before) return lastChannel.fetchMessages({ limit: 100, before: before })
//     return lastChannel.fetchMessages({ limit: 100 })
//   })()
//   .then(history => {
//     if (history.size === 0) {
//       console.log('finished!')
//       return
//     }
//     console.log('messagehistory length: ' + history.size)
//     history.forEach(message => {
//       let messageObject = {
//         id: message.id,
//         username: message.author.username,
//         author: message.author.id,
//         message: message.content,
//         length: message.content.length,
//         timestamp: message.createdTimestamp
//       }
//       messageHistory.push(messageObject)
//     })

//     var fetchMore = true

//     messageHistory.forEach(message => {
//       return messages.find({id: message.id})
//       .toArray((err, res) => {
//         if (err) throw err
//         if (res && res.length === 0) {
//           messages.insertOne(message, (err, data) => {
//             if (err) throw err
//           })
//         }
//         fetchMore = false
//       })
//     })
//     console.log(`saved messages in the database`)
//     if (fetchMore) {
//       setTimeout(() => {
//         storeMessageHistory(messageHistory[messageHistory.length - 1].id)
//       }, 500)
//     }
//   })
//   .catch(console.error)
// }
