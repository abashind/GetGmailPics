const express = require('express');
const getPics = require('./get_pics.js');
const https = require('https');
const fs = require('fs');
const Getter = require('./PicsGetter');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const db = require('./db');
const ensLog = require('connect-ensure-login');
const bcrypt = require('bcryptjs');
const favicon = require('serve-favicon')

passport.use(new Strategy( (username, password, cb) => {
        db.users.findByUsername(username, (err, user) => {
            if (err) { return cb(err); }
            if (!user) { return cb(null, false); }
            if (!bcrypt.compareSync(password, user.password)) {
                 return cb(null, false);
            }
            return cb(null, user);
        });
    }));
passport.serializeUser(function (user, cb) {
    cb(null, user.id);
});
passport.deserializeUser(function (id, cb) {
    db.users.findById(id, function (err, user) {
        if (err) { return cb(err); }
        cb(null, user);
    });
});

var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('express-session')({
    secret: 'odfjibenhvo;jweopcvi564sc9456sd4c5s4acd54asd5v44asfvdfv',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(favicon(__dirname +'/views/favicon.ico'))


let result = null;
let isBusy = false;
let action = 'watch';
let del = undefined;

app.get('/',
    ensLog.ensureLoggedIn(),
    (req, res) => {
    res.sendFile(__dirname + '/views/app.html', { user: req.user });
  });

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
    });

app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login' }),
    (req, res) => {res.redirect('/');
    });

app.get('/logout',
    ensLog.ensureLoggedIn(),
    (req, res) => {
        req.logout();
        res.redirect('/');
    });

app.get('/get_status', (req, res) => {
    let hasResult;
    if (result === null)
        hasResult = false;
    else
        hasResult = true;
    res.send({ hasResult: hasResult, isBusy: isBusy });
    res.end();
});

app.get('/pictures',
    ensLog.ensureLoggedIn(),
    async (req, res) => {
        isBusy = true;
        if (action === 'watch') {
            res.set('Content-Type', 'text/html');
            res.send(result);
            res.end();
        }
        if (action === 'getzip') {
            const stream = result.stream;
            stream.pipe(res);
        }
        if (del === '1') {
            deleteMails()
        }
        action = 'watch';
        del = undefined;
        console.log('Result was sended to a client.');
        isBusy = false;
});

async function deleteMails(){
    const getter = await new Getter();
    const mailsHeaders = result.mails;
    for (let i = 0; i < mailsHeaders.length; i++) {
        isBusy = true;
        await getter.trashMail(mailsHeaders[i].id);
        console.log(`Was deleted ${i} messages.`);
    }
    isBusy = false;
}

app.post('/pictures',
    ensLog.ensureLoggedIn(),
    async (req, res) => {
    action = req.body.action;
    del = req.body.deleteMails;

    const amount = req.body.amount;
    const subj = req.body.subj_part;
    const type = req.body.type;
    console.log(`Got params: Subject:${subj} Amount:${amount} Type:${type} Delete:${del} Action: ${action}`);

    runPicsGetting(amount, subj, type);
    res.end();
});

async function runPicsGetting(amount, subj, type) {
    isBusy = true;
    if (action === 'watch') {
        result = await getPics.getPicsAsPage(amount, subj, type);
    }
    if (action === 'getzip') {
        result = await getPics.getPicsAsZip(amount, subj, type);
    }
    isBusy = false;
}

app.delete('/pictures',
    ensLog.ensureLoggedIn(),
    (req, res) => {
    result = null;
    res.end();
    console.log('Result was deleted by a client.');
});

app.get('/genHash',
    ensLog.ensureLoggedIn(),
    async (req, res) => {
        const hash = bcrypt.hashSync(req.query.t, 10);
        res.send(hash);
    });

https.createServer({
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert')
    },
    app).listen(443, () => {
    console.log('listening');
});
