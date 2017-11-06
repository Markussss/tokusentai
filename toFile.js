const mongo = require('mongodb').MongoClient
const mongoURL = 'mongodb://localhost:27017/tokusentai'

var messages // mongoDb collection

function usefullMessage (str) {
  return str
    .replace(/<.*>/g, ' ')
    .replace(/:.*:/g, ' ')
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
          console.log(betterMessage)
        }
      })
    }
  })
})

