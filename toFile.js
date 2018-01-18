require('dotenv').config()

// const mysql = require('mysql2')
const mongo = require('mongodb').MongoClient
const mongoURL = 'mongodb://localhost:27017/tokusentai'

var messages // mongoDb collection

// const connection = mysql.createConnection({
//   host: process.env.MYSQL_HOST,
//   user: process.env.MYSQL_USER,
//   password: process.env.MYSQL_PASS,
//   database: 'messages'
// })

function usefullMessage (str) {
  if (str.match(/\b(\w+)\s+\1\b/)) {
    str = str.replace(/(\b(\w+))\s+\1\b/, '$1')
  }
  if (str.indexOf('http') > -1) return ''

  return str
    .replace(/<.*>/g, ' ')
    .replace(/:.*:/g, ' ')
    .replace(/[^a-zA-ZæøåÆØÅ./\-(),!?=&\s]+/g, ' ')
    .replace(/^[.:/\-(),!?=&\s]+/g, ' ')
    .replace(/[\r\n]/g, ' ')
    .replace(/ +/g, ' ')
    // .replace('ronkus', '')
    // .trim().split(' ').filter(t => t.length < 15).join(' ')
    .trim()
    .toLowerCase()
}
var query = []

mongo.connect(mongoURL, (err, db) => {
  if (err) throw err
  messages = db.collection('messages')
  messages.find({}).sort({timestamp: 1}).toArray((err, res) => {
    if (err) throw err
    if (res && res.length > 0) {
      res.forEach(m => {
        m = usefullMessage(m.message)
        if (m.length > 0) console.log(m)
      })
      // to sql:
      // res.forEach(m => {
      //   query.push([
      //     connection.escape(m.id),
      //     connection.escape(m.message),
      //     connection.escape(m.author),
      //     connection.escape(m.username),
      //     m.timestamp,
      //     m.wordCount,
      //     connection.escape(m.lang)
      //   ])
      // })
      // connection.connect()
      // console.log('insert into messages (message_id, message, author, username, timestamp, wordcount, lang) values \n' +
      // query.reduce((query, row) => {
      //   if (query.length > 0) {
      //     query += ',\n'
      //   }
      //   query += '(' + row.join(', ') + ')'
      //   return query
      // }, ''))
      // end sql

      // connection.query('insert into messages (message_id, message, author, username, timestamp, wordcount, lang) values ' +
      //   query.reduce((query, row) => {
      //     if (query.length > 0) {
      //       query += ', '
      //     }
      //     query += '(' + row.join(', ') + ')'
      //     return query
      //   }, ''), (err, res) => {
      //   console.log(err)
      //   console.log(res)
      // })
      // connection.end()
      process.exit(0)
    }
  })
})
