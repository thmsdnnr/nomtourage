const express=require('express');
const bodyParser=require('body-parser');
const path=require('path');
const cookieParser=require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const Db=require('./nightlifeDb.js');
let Yelp=require('yelp');

const app=express();
app.use(cookieParser());
app.use(session({
  store: new MongoStore({
    url: process.env.PROD_DB||'mongodb://localhost:27017/ndlrn',
    ttl: 14 * 24 * 60 * 60 // = 14 days. Default
  }), //https://github.com/jdesboeufs/connect-mongo
  secret: process.env.SESSION_SECRET || 'DREAMSBEDREAMS',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge:(60*60*1000) } //1 hour max age -> DOESN'T WORK WITH SECURE:TRUE ON NON-HTTPS LOCALHOST
}));

app.use(express.static(path.join(__dirname+'/static')));
app.use(['/vote','/add','/login','/register','/b','/s'],bodyParser.urlencoded({extended:true}));
app.use(['/v','/','/update'],bodyParser.json({extended:true}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname+'/views'));

let yelp = new Yelp({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET
});

app.get('/', function(req,res) {
  req.session.lastSearch={};
  res.render('index',{data:{user:req.session.user}});
});

app.get('/display', function(req,res) {
  if (!req.session.user) {res.redirect('/login'); return false;}
  Db.fetchUser({username:req.session.user}, function(data){
    console.log(data[0].bars);
    Db.fetchBars(function(bars) {
      let payload={data:sample.businesses,userBars:data[0].bars,barData:bars,user:req.session.user};
      res.render('list', {data:payload});
    });
  });
});

app.get('/logout', function(req,res){
  req.session.destroy();
  let payload={header:'Goodbye.', message:`Thank you for stopping by. Come again soon!`};
  res.render('message',{data:payload});
});
app.get('/login', function(req,res) { res.render('login',{data:{warning:false,user:req.session.user}}); });
app.get('/register', function(req,res) { res.render('register', {data:{warning:false,user:req.session.user}}); });

app.get('/mine', function(req,res) {
  let bizList=[];
    Db.fetchBars(function(bars) {
      Db.fetchUser({username:req.session.user}, function(userData){
        Object.keys(userData[0].bars).forEach((bar)=>{
          console.log(bar);
          bizList.push(yelp.business(bar)); //an array of promises
        });
        Promise.all(bizList).then(function(d){
          let payload={data:d,userBars:userData[0].bars,barData:bars,user:req.session.user};
          res.render('list', {data:payload});
        });
      });
    });
  });

app.get('/popular', function(req,res) {
  let bizList=[];
  Db.fetchTopNBars(10,function(bars) { //grab top-10
    Db.fetchUser({username:req.session.user}, function(userData){
      bars.forEach((bar)=>{
      //  bizList.push(yelp.business(bar.barID)); //an array of promises
      });
      Promise.all(bizList).then(function(d){
        console.log(d);
        let payload={data:d,userBars:userData[0].bars,barData:bars,user:req.session.user};
        res.render('list', {data:payload});
      });
    });
  });
});

//TODO clean up this route
app.post('/s', function(req,res) { //can also take a saved sObj from the db from a previous search in the request
  let sObj={};
  console.log(Object.keys(req.session.lastSearch));
  console.log('rslS');
  if (Object.keys(req.session.lastSearch).length) {
    Object.keys(req.session.lastSearch).forEach((key)=>sObj[key]=req.session.lastSearch[key]);
    req.session.lastSearch={}; //reset to empty, because we only want to repeat a login search ONCE
  }
  else if (req.body.optLoc||(req.body.lat&&req.body.lon)) {
    let location;
    let distance=Math.min(Number(req.body.distance*1000),20000) || 5000; //distance away in m
    sObj.term=req.body.bars;
    sObj.radius_filter=distance;
    (req.body.optLoc!=='') ? sObj.location=req.body.optLoc : sObj.ll=`${req.body.lat},${req.body.lon}`;
  }
  else { res.redirect('/'); return false; }
  console.log(sObj);
  console.log('^sObj');
  if (sObj) {
  yelp.search(sObj)
      .then(function(yelpData) {
        if(yelpData) {
          Db.fetchBars(function(bars) {
            if(req.session.user) {
              Db.saveLastUserSearch({username:req.session.user, search:sObj}, function(){
                Db.fetchUser({username:req.session.user}, function(userData){
                  let payload={data:yelpData,userBars:userData[0].bars,barData:bars,user:req.session.user};
                  res.render('list', {data:payload});
                });
              });
            }
          else { //user is not logged in
              let payload={data:yelpData,userBars:'',barData:bars,user:''};
              res.render('list', {data:payload});
            }
          });
        }
        else { throw (err); res.send('a fatal error occurred');}
      }).catch(function(err) { console.dir(err); });
    }
    else {
      console.log('its empty');
      console.log(req.body);
    }
    });

app.post('/login', function(req,res) {
    let inputUser=req.body.username;
    let inputPwd=req.body.password;
    if (inputUser===''||inputPwd==='') { res.render('login',{data:{warning:true,user:req.session.user}}); return false;}
    else {
      Db.fetchUser({'username':inputUser},function(data){
        console.log(data+"data");
        if(data) {
          if ((data[0].username===inputUser)&&(data[0].password===inputPwd)) //it's a match
          {
            req.session.user=inputUser;
            req.session.lastSearch={};
            Db.fetchLastUserSearch({username:req.session.user}, function(uData){
              let lastS=uData[0].lastSearch;
              console.log();
              console.log('astsearch from login post');
              if (lastS) { //it's an OBJECT so we have to deep copy
                console.log(lastS);
                Object.keys(lastS).forEach((k)=>req.session.lastSearch[k]=lastS[k]);
                console.log(req.session.lastSearch);
              }
              res.redirect(307,'/s');
            });
          }
          else {
            req.session.user='';
            res.render('login',{data:{warning:true,user:req.session.user}});
          }
        }
        else
          {
            req.session.user='';
            res.render('login',{data:{warning:true,user:req.session.user}});
          }
        });
      }
    });

app.post('/register', function(req,res) {
  let inputUser=req.body.username;
  let inputPwd=req.body.password;
  Db.findUser({'username':inputUser},function(data){
    if (!data[0]) {
      if (inputPwd!=="") {
        Db.saveUser({'username':inputUser,'password':inputPwd},function(){
          req.session.user=inputUser;
          console.log(req.session.user+"sessionuser");
          let payload={header:'Welcome to Votive!', message:`Welcome, ${inputUser}.`,link:'/login'};
          res.render('message',{data:payload});
      });
      }
      else {
        let payload={header:'There is no try.', message:`Password cannot be blank.`, link:null};
        res.render('message',{data:payload});
      }
    }
    else {
      let payload={header:'There is no try.', message:`${inputUser} is taken.`, link:null};
      res.render('message',{data:payload});
    }
  });
});

app.post('/update', function(req,res) {
  let user=req.session.user||'guest';
  console.log(user);
  if (req.body.action==='addOne') {
    Db.addBarGuest(req.body.barID, function(success) {
      success.then(function(s){console.log(s.result);});
    });
    Db.addBarToUser({username:user,barName:req.body.barID}, function(success) {
      success.then(function(s){console.log(s.result);});
    });
  }
  else if (req.body.action==='removeOne') {
    Db.removeBarGuest(req.body.barID, function(success) {
      success.then(function(s){console.log(s.result);});
    });
    Db.removeBarFromUser({username:user,barName:req.body.barID}, function(success) {
      success.then(function(s){console.log(s.result);});
    });
  }
});

app.post('/', function(req,res) {
  console.log(req.body);
/*  if(req.body) {
    yelp.search({term: 'beer', ll:`${req.body.lat},${req.body.lon}`, radius_filter:5000})
        .then(function(data) {
          console.log(data);
          res.send(data);
    })
    .catch(function(err) {
      console.dir(err);
    });
  }*/
  });

app.get('*', function(req,res) {
  res.status('400');
  res.send('Invalid path! Sorry.');
});

app.listen(process.env.PORT);
console.log('listening to you.');
