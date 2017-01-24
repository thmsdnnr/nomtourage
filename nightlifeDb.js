var MongoClient = require('mongodb').MongoClient;
var ObjectID=require('mongodb').ObjectID;
let dbCon;
let dbUrl=process.env.PROD_DB||'mongodb://localhost:27017/ndlrn';

/*NIGHTLIFE*/
//BARS
exports.addBarGuest = function(data, cb) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (!err) {
      db.collection("bars").find({barID:data}).toArray(function(err, docs) {
        if(!err) {
          if(docs[0]) { //bar exists, increment
            console.log('adding one');
            cb(db.collection("bars").update({barID:data},{'$inc':{visitorCt:1}}));
          }
          else { //bar doesn't exist, add and increment
            cb(db.collection("bars").insert({barID:data, visitorCt:1}));
            db.close();
          }
        }
        else {
          cb(null);
        }
      });
    }
    else {
      cb(null);
    }
  });
}

exports.removeBarGuest = function(data, cb) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (!err) {
      db.collection("bars").find({barID:data.barName}).toArray(function(err, docs) {
        if (docs[0]) {
          if (docs[0].hasOwnProperty(data.barName)) {
      cb(db.collection("bars").update({barID:data},{'$inc':{visitorCt:-1}}));
      db.close();
        }
      }
    });
    }
  });
}

//USERS
exports.addBarToUser = function(data, cb) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (!err) {
      db.collection("users").find({username:data.username}).toArray(function(err, docs) {
        if (docs[0]) {
          let bar=`bars.${data.barName}`;
          cb(db.collection("users").update({username:data.username},{'$inc':{[bar]:1}}));
          db.close();
        }
      })
    }
  });
}

exports.removeBarFromUser = function(data, cb) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (!err) {
      db.collection("users").find({username:data.username}).toArray(function(err, docs) {
        if (docs[0].bars) {
          if (docs[0].bars.hasOwnProperty(data.barName)) { // if bar exists then remove
            let bar=`bars.${data.barName}`;
            cb(db.collection("users").update({username:data.username},{'$inc':{[bar]:-1}}));
            db.close();
          }
          else { //otherwise there's nothing to remove
            db.close();
          }
        }
        });
      }
    });
  }

  exports.getUserBars = function(data, cb) {
    MongoClient.connect(dbUrl, function(err, db) {
      if (!err) {
        db.collection("users").find({username:data.username}).toArray(function(err, docs) {
          if (!err) {
            (docs.length>0) ? cb(docs) : cb(false);
            db.close();
          }
      });
    }
  });
}

//USER update and add
//RETRIEVAL
exports.fetchUser = function(query,cb) { //find a user in the DB given a username, return row
  if (!query.username) { return false; }
  MongoClient.connect(dbUrl, function(err, db){
    db.collection("users").find({username:query.username}).toArray(function(err, docs) {
      if (!err) {
        db.collection("users").updateOne({username:query.username}, {$set:{lastIn:new Date()}});
        (docs.length>0) ? cb(docs) : cb(false);
        db.close();
      }
    });
  });
}

exports.findUser = function(query,cb) { //find a user in the DB given a username, return row
  MongoClient.connect(dbUrl, function(err, db){
    db.collection("users").find({username:query.username}).toArray(function(err, docs) {
      if (!err) {
        (docs.length>0) ? cb(docs) : cb(false);
        db.close();
      }
    });
  });
}

exports.saveUser = function(data,cb) { //save a new user in the DB
  MongoClient.connect(dbUrl, function(err, db){
    if (!err) {
      db.collection("users").insert({username:data.username,password:data.password,lastIn:new Date(),lastSearch:''});
      cb();
    }
  db.close();
  });
}

exports.saveLastUserSearch = function(data,cb) {
  MongoClient.connect(dbUrl, function(err, db){
    if (!err) {
      db.collection("users").update({username:data.username},{$set:{lastSearch:data.search}});
      cb();
    }
  db.close();
  });
}

exports.fetchLastUserSearch = function(data,cb) {
  MongoClient.connect(dbUrl, function(err, db){
    if (!err) {
      db.collection("users").find({username:data.username}).toArray(function(err, docs){
        (docs.length>0) ? cb(docs) : cb(false);
      });
    }
  db.close();
  });
}

exports.fetchTopNBars = function(num,cb) { //fetch top-<num> bars sorted desc by visitorCt, max:20
  let numResults=Math.min(num,20);
  MongoClient.connect(dbUrl, function(err, db){
    db.collection("bars").find({visitorCt:{$ne:0}}).sort({visitorCt:-1}).limit(numResults).toArray(function(err, docs) {
      if (!err) {
        (docs.length>0) ? cb(docs) : cb(false);
        db.close();
      }
    });
  });
}

exports.fetchBars = function(cb) { //fetch a list of bars
  MongoClient.connect(dbUrl, function(err, db){
    db.collection("bars").find({visitorCt:{$ne:0}}).toArray(function(err, docs) {
      if (!err) {
        (docs.length>0) ? cb(docs) : cb(false);
        db.close();
      }
    });
//TODO i get an "unhandled data pool killed hting if i call db.close here!   db.close();
//http://stackoverflow.com/questions/39029893/why-is-the-mongodb-node-driver-generating-instance-pool-destroyed-errors
  });
}
