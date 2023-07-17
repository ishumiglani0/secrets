//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose')
const bcrypt = require('bcrypt');
const saltRounds = 10;

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

const User = mongoose.model("User",userSchema);


app.get("/",(req,res)=>{
    res.render("home")
})
app.route('/login').get((req,res)=>{
    res.render("login")
}).post((req,res)=>{
    User.findOne({email:req.body.username}).then((user)=>{
        if(user){
            bcrypt.compare(req.body.password, user.password, function(err, result) {
                if(result){
                    res.render('secrets')
                }
                else{
                    res.redirect('/')
                }
            });
        } else{
            res.redirect('/register')
        }

    }).catch((err)=>{})
})


app.route('/register').get((req,res)=>{
    res.render("register")
}).post((req,res)=>{
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        if(!err){
            const userData= new User({
                "email": req.body.username,
                "password" : hash
            })
            userData.save().then(()=>{
                res.render("secrets")
            }).catch((err)=>{
                res.redirect('/')
            })
        }
        else{
            res.send(err)
        }
    });
})


let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, function() {
    console.log("Server started on port 3000 : \nhttp://localhost:3000");
});