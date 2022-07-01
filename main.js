var express = require('express')
var session = require('express-session')
var bodyParser = require('body-parser')


var multer = require('multer')
var upload = multer({ dest: 'public/' })

const { MongoClient } = require('mongodb')
var mongoClient = require('mongodb').MongoClient
var url = 'mongodb+srv://tungnmgch:01274277604@cluster0.hxlsr.mongodb.net/test'
const ObjectId = require('mongodb').ObjectId;

var app = express()

var publicDir = require('path').join(__dirname, '/public');
app.use(express.static(publicDir));


app.set('view engine', 'hbs')
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: 'Toy',
    resave: false
}))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

function isAuthenticated(req, res, next) {
    let login = !req.session.userName
    if (login)
        res.redirect('/login')
    else
        next()
}

app.get('/login', (req, res) => {
    res.render('login')
})
app.post('/checkLogin', async(req, res) => {
    let name = req.body.user
    let pass = req.body.pass
    let server = await MongoClient.connect(url)
    let dbo = server.db("Toy")
    req.session.userName = name
    let user = await dbo.collection("account").find({ $and: [{ 'username': name }, { 'password': pass }] }).toArray()
    if (user.length > 0) {
        res.redirect('/home')
    } else {
        let mes = "Username or password is invalid"
        res.render('login', { "message": mes, "username": name, "password": pass })
    }
})

app.get('/home', isAuthenticated, async(req, res) => {
    let server = await MongoClient.connect(url)
    let dbo = server.db("Toy")
    let user = await dbo.collection("account").find({ 'username': req.session.userName }).toArray()
    res.render('home', { "user": user[0] })
})

app.get('/logout', (req, res) => {
    req.session.userName = null
    req.session.save((err) => {
        req.session.regenerate((err2) => {
            res.redirect('/login')
        })
    })
})

app.get('/signup', (req, res) => {
    res.render('signup')
})
app.post('/login', async(req, res) => {
    let user = req.body.user
    let pass = req.body.pass
    let name = req.body.name
    let phone = req.body.phone
    if (user == "" || name == "" || phone == "" || pass == "") {
        let mes = "Please enter full information"
        res.render('signup', { 'user': user, 'name': name, 'phone': phone, 'mes': mes })
        return
    }
    let server = await MongoClient.connect(url)
    let dbo = server.db("Toy")

    let check = await dbo.collection("account").find({ 'username': user }).toArray()
    if (check.length > 0) {
        let mes = "Username is existed"
        res.render('signup', { 'user': user, 'name': name, 'phone': phone, 'mes': mes })
        return
    } else if (user.length < 3) {
        let mes = "User name >3 word"
        res.render('signup', { 'user': user, 'name': name, 'phone': phone, 'mes': mes })
        return
    } else {
        let account = {
            'username': user,
            'password': pass,
            'name': name,
            'phone': phone
        }

        await dbo.collection("account").insertOne(account)
        res.redirect('/login')
    }

})

app.get('/ViewProduct', isAuthenticated, async(req, res) => {
    let server = await MongoClient.connect(url)
    let dbo = server.db("Toy")
    let products = await dbo.collection('product').find().toArray()
    res.render('pro/AllProduct', { 'products': products })
})

app.get('/add', isAuthenticated, (req, res) => {
    res.render('pro/addNew')
})

app.post('/insert', isAuthenticated, upload.single('img'), async(req, res) => {
    let name = req.body.name
    let pub = req.body.pub
    let price = req.body.price
    let cate = req.body.cate
    if (name == "" || pub == "" || price == "" || cate == "") {
        res.render('pro/addNew', { 'error': "Please enter full information", 'name': name, 'pub': pub, 'price': price, 'cate': cate })
        return

    } else if (name.length < 3) {
        res.render('pro/addNew', { 'error': "The name is so short", 'name': name, 'pub': pub, 'price': price, 'cate': cate })
        return
    }
    let product = {
        'name': name,
        'price': price,
        'category': cate,
        'publisher': pub,
        'url': req.file.path.slice(7)
    }
    let server = await MongoClient.connect(url)
    let dbo = server.db("Toy")
    await dbo.collection("product").insertOne(product)
    res.redirect('/ViewProduct')
})
app.post('/search', async(req, res) => {
    let key = req.body.key
    let server = await MongoClient.connect(url)
    let dbo = server.db("Toy")
    let products = await dbo.collection('product').find({ 'name': new RegExp(key, 'i') }).toArray()
    res.render('pro/AllProduct', { 'products': products, "key": key })
})

app.get('/update/', isAuthenticated, async(req, res) => {
    var id = req.query.id
    var uId = new ObjectId(id)
    let server = await MongoClient.connect(url)
    let dbo = server.db("Toy")
    let product = await dbo.collection('product').find({ '_id': uId }).toArray()
    res.render('pro/update', { 'product': product[0] })
})

app.post('/edit/:_id', async(req, res) => {
    let name = req.body.name
    let pub = req.body.pub
    let price = req.body.price
    let cate = req.body.cate
    let img = req.body.img

    var id = req.params._id
    var uid = new ObjectId(id)
    let product = {
        'name': name,
        'price': price,
        'category': cate,
        'publisher': pub,
        'url': img,
        '_id': id

    }
    if (name == "" || pub == "" || price == "" || cate == "") {
        res.render('pro/update', { 'error': "Please enter full information", 'product': product })
        return
    } else if (name.length <= 3) {
        res.render('pro/update', { 'error': "The name is so short", 'product': product })
        return
    }
    let server = await MongoClient.connect(url)

    let dbo = server.db("Toy")
    await dbo.collection('product').updateOne({ '_id': uid }, { $set: { '_id': uid, 'name': name, 'price': price, 'category': cate, 'publisher': pub, 'url': img } })
    res.redirect('/ViewProduct')
})

app.post('/delete/:_id', isAuthenticated, async(req, res) => {
    var id = req.params._id;
    var uid = new ObjectId(id);
    let server = await MongoClient.connect(url)

    let dbo = server.db("Toy")
    await dbo.collection('product').deleteOne({ '_id': uid })
    res.redirect('/ViewProduct')
})
const PORT = process.env.PORT || 5000
app.listen(PORT)
console.log('Runningggg')