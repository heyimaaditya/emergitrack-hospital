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