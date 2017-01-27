var MongoClient = require('mongodb').MongoClient;
var ObjectID=require('mongodb').ObjectID;
let db;
let dbUrl=process.env.PROD_DB||'mongodb://localhost:27017/ndlrn';

function connect(callback) {
  if (db===undefined) {
    MongoClient.connect(dbUrl, function(err, database){
      if(err) { return callback(err) };
      db=database;
      callback(null, db);
  });
  }
  else { callback(null, db); }
}

connect(function(d){console.log(d);});

/*NIGHTLIFE*/
//BARS
exports.addBarGuest = function(data, cb) {
  db.collection("bars").find({barID:data}).toArray(function(err, docs) {
    if(err) { cb(null); }
    else {
      if(docs[0]) { //bar exists, increment
        cb(db.collection("bars").update({barID:data},{'$inc':{visitorCt:1}}));
      }
      else { //bar doesn't exist, add and increment
        cb(db.collection("bars").insert({barID:data, visitorCt:1}));
      }
    }
  });
}

exports.removeBarGuest = function(data, cb) {
  db.collection("bars").find({barID:data.barName}).toArray(function(err, docs) {
    if (docs[0]) {
      if (docs[0].hasOwnProperty(data.barName)) { cb(db.collection("bars").update({barID:data},{'$inc':{visitorCt:-1}})); }
        }
      });
    }

//USERS
exports.addBarToUser = function(data, cb) {
  db.collection("users").find({username:data.username}).toArray(function(err, docs) {
    if (docs[0]) {
      let bar=`bars.${data.barName}`;
      cb(db.collection("users").update({username:data.username},{'$inc':{[bar]:1}}));
        }
      });
    }

exports.removeBarFromUser = function(data, cb) {
  db.collection("users").find({username:data.username}).toArray(function(err, docs) {
    if (docs[0].bars) {
      if (docs[0].bars.hasOwnProperty(data.barName)) { // if bar exists then remove
        let bar=`bars.${data.barName}`;
        cb(db.collection("users").update({username:data.username},{'$inc':{[bar]:-1}}));
      }
    }
  });
}

exports.getUserBars = function(data, cb) {
  db.collection("users").find({username:data.username}).toArray(function(err, docs) {
    if (!err) { (docs.length>0) ? cb(docs) : cb(null); }
    });
  }

//USER update and add
//RETRIEVAL
exports.fetchUser = function(query,cb) { //find a user in the DB given a username, return row
  if (!query.username) { return false; }
  db.collection("users").find({username:query.username}).toArray(function(err, docs) {
    if (!err) {
      db.collection("users").updateOne({username:query.username}, {$set:{lastIn:new Date()}});
      (docs.length>0) ? cb(docs) : cb(false);
      }
    });
  }

exports.findUser = function(query,cb) { //find a user in the DB given a username, return row
  db.collection("users").find({username:query.username}).toArray(function(err, docs) {
    if (!err) { (docs.length>0) ? cb(docs) : cb(false); }
  });
}

exports.saveUser = function(data,cb) { //save a new user in the DB
  db.collection("users").insert({username:data.username,password:data.password,lastIn:new Date(),lastSearch:''});
  cb();
  }

exports.saveLastUserSearch = function(data,cb) {
  db.collection("users").update({username:data.username},{$set:{lastSearch:data.search}});
  cb();
}

exports.fetchLastUserSearch = function(data,cb) {
  db.collection("users").find({username:data.username}).toArray(function(err, docs) {
  if (!err) { (docs.length>0) ? cb(docs) : cb(false); }
  });
}

exports.fetchTopNBars = function(num,cb) { //fetch top-<num> bars sorted desc by visitorCt, max:20
  let numResults=Math.min(num,20);
  db.collection("bars").find({visitorCt:{$ne:0}}).sort({visitorCt:-1}).limit(numResults).toArray(function(err, docs) {
    if (!err) { (docs.length>0) ? cb(docs) : cb(false); }
  });
}

exports.fetchBars = function(cb) { //fetch a list of bars
  db.collection("bars").find({visitorCt:{$ne:0}}).toArray(function(err, docs) {
    if (!err) { (docs.length>0) ? cb(docs) : cb(false); }
    });
  }
