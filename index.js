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