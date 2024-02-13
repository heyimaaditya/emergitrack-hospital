import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import fetch from "node-fetch";
import session from "express-session";
import axios from "axios";
import http from "https";
import { State } from "country-state-city";
import { Vonage } from "@vonage/server-sdk";
import { City } from "country-state-city";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("public"));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true
}));
mongoose.connect("mongodb+srv://aadityatyagi975:" + process.env.ATLAS_PASS + "@cluster0.n76ryam.mongodb.net/emergitrack", {
  useNewUrlParser: true,
  //useUnifiedTopology: true,
  //useCreateIndex: true,
});

const db = mongoose.connection;

// Event listeners
db.on('connected', () => {
  console.log('MongoDB connected successfully');
});

db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

db.on('disconnected', () => {
  console.log('MongoDB disconnected');
});
const hospitalUserSchema=new mongoose.Schema({
  name:String,
  email:String
})
const RegisteredHospital=new mongoose.Schema({
  hospitalName:String,
  hospitalAddress:String,
  password:String,
  patient:[{
    patientName:String,
    patientNum:String,
    patientAddress:String,
    patientStatus:String,
    ambuTrack:String
  }],
  driver:[{
    driverName:String,
    driverNum:String,
    driverId:String,
    driverPass:String,
    driverStatus:String,
    patientAssign:String
  }]
});
const hospitalUser=mongoose.model("hospitalUser",hospitalUserSchema);
const hospitallist=mongoose.model("hospitallist",RegisteredHospital);
app.get("/",(req,res)=>{
  var allState=(State.getStatesOfCountry("IN"));
  var allCities={};
  for(var i=0;i<allState.length;i++){
    var city=City.getCitiesOfState("IN",allState[i].isoCode);
    allCities[allState[i].name]=city;
  }
  var allCitiesString=JSON.stringify(allCities);
  res.render("hospital-home",{allState:allState,allCitiesString:allCitiesString})
});
var latitude;
var longitude;
app.post("/",async(req,res)=>{
  try{
    var state=req.body.state;
    var city=req.body.city;
    var apiUrl="https://nominatim.openstreetmap.org/search";
    var params={
      q:city + ", " + state,
      format:"json",
      limit:1
    };
    var queryString=Object.keys(params).map(function(key){
      return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    }).join("&");
    var url=apiUrl + "?" + queryString;
    var response=await fetch(url);
    const data=await response.json();
    if(data.length>0){
      latitude=data[0].lat;
      longitude=data[0].lon;
    }else{
      console.log("Coordinates not found for the specified location.");
    }
    res.redirect("hospital");
  }catch(error){
    console.log("An error occured: "+error);

  }
});
app.get("/hospital",(req,res)=>{
  const options={
    method:'GET',
    hostname:'api.foursquare.com',
    port:null,
    path:'/v3/places/search?ll='+latitude+'%2C'+longitude+'&radius=100000&categories=15000&limit=50',
    headers:{
      accept:'application/json',
      Authorization:process.env.FOURSQUARE_AUTH
    }
  };
  const apiRequest=http.request(options,function(apiResponse){
    let responseBody='';
    apiResponse.on('data',function(chunk){
      responseBody+=chunk;
    });
    apiResponse.on('end',function(){
      const data=JSON.parse(responseBody);
      const hospitals=data['results'];
      const filteredHospitals=hospitals.map(hospital=>{
        return{
          name:hospital['name'],
          address:hospital['location']['formatted_address']
        };
      });
      res.render("hospital",{hospital:filteredHospitals});
    });
  });
  apiRequest.end();
});
app.post("/hospital",(req,res)=>{
  var hospitalName=req.body.hospitalName;
  var hospitalAdd=req.body.hospitalAddress;
  res.render("login",{hospitalName:hospitalName,hospitalAddress:hospitalAddress});
});
app.post("/message",(req,res)=>{
  const name=req.body.name;
  const email=req.body.email;
  const msg=req.body.msg;
  const transporter=nodemailer.createTransport({
    service:'gmail',
    auth:{
      user:process.env.NODEMAILER_EMAIL,
      pass:process.env.NODEMAILER_PASS
    },
    port:465,
    host:'smtp.gmail.com'
  })
  const mailOption1={
    from:process.env.NODEMAILER_EMAIL,
    to:`${email}`,
    subject:"Ambulance Tracker customer care",
    text:"tanks for Contacting Us "+`${name}`
  };
  const mailOption2={
    from:process.env.NODEMAILER_EMAIL,
    to:process.env.SECOND_EMAIL,
    subject:`${name}`,
    text:"name:- "+`${name}`+"\n email:- "+`${email}`+"\n message:- "+`${msg}`
  }
  transporter.sendMail(mailOption1,(error,info)=>{
    if(error){
      console.log(error);
      res.send("error sending email");
    }else{
      console.log("email sent: "+info.response);
      res.send("email sent successfully");
    }
  });
  hospitalUser.findOne({email:email}).then(function(elem){
    if(!elem){
      const newUser=new hospitalUser({
        name:name,
        email:email
      });
      newUser.save();
    }
  }).catch((err)=>{
    console.log(err);
  });
  res.render("message");
});
app.get("/message",(req,res)=>{
  res.render("message");
});
var hospitalName;
var hospitalAddress;
app.post("/login",async(req,res)=>{
  function getvalue(){
    hospitalName=req.body.hospitalName;
    hospitalAddress=req.body.hospitalAddress;
  }
  await getvalue();
  hospitallist.findOne({ hospitalName:hospitalName , hospitalAddress:hospitalAddress,password:req.body.password }).then(function(elem) {
    if (!elem) {
       res.render("login",{hospitalName:req.body.hospitalName,hospitalAddress:req.body.hospitalAddress});
    }
    else{
        res.render("home",{hospitalName:hospitalName,hospitalAddress:hospitalAddress});
    }
  }).catch((err) => {
    console.log(err);
  });
});
app.post("/signup",(req,res)=>{
  hospitalName=req.body.hospitalName;
  hospitalAddress=req.body.hospitalAddress;
  res.render("signup",{hospitalName:hospitalName,hospitalAddress:hospitalAddress});
});
app.post("/register",(req,res)=>{
  hospitalName=req.body.hospitalName;
  hospitalAddress=req.body.hospitalAddress;
  hospitallist.findOne({ hospitalName:hospitalName , hospitalAddress:hospitalAddress}).then(function(elem) {
      if (!elem) {
          const newHospital = new hospitallist({
              hospitalName:req.body.hospitalName,
              hospitalAddress:req.body.hospitalAddress,
              password:req.body.password
            });
            newHospital.save();
            res.render("home",{hospitalName:hospitalName,hospitalAddress:hospitalAddress});
      }
      else{
          res.render("login",{hospitalName:req.body.hospitalName,hospitalAddress:req.body.hospitalAddress})
      }
    }).catch((err) => {
      console.log(err);
    });
});
