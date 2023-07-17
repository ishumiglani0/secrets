//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose')
const encrypt = require('mongoose-encryption')

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


mongoose.connect('mongodb://127.0.0.1:27017/userDB',{
    useNewUrlParser:true,
}).then(()=>{
    console.log('Connected to database Successfully !!!.')
}).catch((err)=>{
    console.log('Cannot connected to the database : '+err)
})

const userSchema = new mongoose.Schema({
    email:{
        type : String
    },
    password:{
        type :String
    }
})

userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields: ['password']})
const User = mongoose.model("User",userSchema);


app.get("/",(req,res)=>{
    res.render("home")
})
app.route('/login').get((req,res)=>{
    res.render("login")
}).post((req,res)=>{
    User.findOne({email:req.body.username}).then((user)=>{
        if(user){
            if(user.password===req.body.password){
                res.render("secrets")
            }
            else{
                res.redirect('/')
            }
        } else{
            res.redirect('/register')
        }

    }).catch((err)=>{})
})


app.route('/register').get((req,res)=>{
    res.render("register")
}).post((req,res)=>{
    const userData= new User({
        "email": req.body.username,
        "password" : req.body.password
    })
    userData.save().then(()=>{
        res.render("secrets")
    }).catch((err)=>{
        res.redirect('/')
    })
})


let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, function() {
    console.log("Server started on port 3000 : \nhttp://localhost:3000");
});