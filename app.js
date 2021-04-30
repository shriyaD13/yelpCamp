if(process.env.NODE_ENV !== 'prodcution')
{
    require('dotenv').config();
}
const { urlencoded } = require('express');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const methodOverride = require('method-override')
const ejsMate = require('ejs-mate')
const ExpressError = require('./utilities/expressError');
const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes= require('./routes/reviews');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const localStartegy = require('passport-local');
const User = require('./models/user')  
const userRoutes = require('./routes/user')
const mongoSantize = require('express-mongo-sanitize')
const MongoDBStore = require('connect-mongo')
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp'


mongoose.connect(dbUrl,{
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
})

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open" , () => {
    console.log("database connected");
});

const app = express(); 
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname,'views'));


app.use(urlencoded({extended: true}));
app.use(methodOverride('_method'));

const secret = process.env.SECRET || 'thisissecret';

const store = new MongoDBStore({
    mongoUrl: dbUrl,
    secret: secret,
    touchAfter: 24*60*60
})

store.on("error", function(e){
    console.log("SESSION STORE ERROR", e)
})

app.use(express.static(path.join(__dirname,'public')));

const sessionConfig = {
    store,
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000*60*60*24*7,
        maxAge: 1000*60*60*24*7
    }
}
app.use(session(sessionConfig));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session())
passport.use(new localStartegy(User.authenticate()))

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) =>{
    res.locals.currentUser = req.user;
    res.locals.success= req.flash('success')
    res.locals.error = req.flash('error');
    next();
})

app.get('/', (req,res) => {
    res.render('campgrounds/home') 
    // res.render('campgrounds/home')
})


app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:id/reviews', reviewRoutes)
app.use('/',userRoutes);
app.use(mongoSantize);



app.all('*', (req,res,next)=>{
    next(new ExpressError('Page Not Found', 404))
})

app.use((err,req,res,next) =>{
    const {statusCode = 500} = err; 
    if(!err.message) err.message = "OH no something went wrong";
    res.status(statusCode).render('error', {err});
})

const port = process.env.PORT || 3000;
app.listen(3000, ()=>{
    console.log(`serving on port ${port}`);
})