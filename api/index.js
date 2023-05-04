const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const Place = require("./models/Place.js");
const Booking = require("./models/Booking");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const fs = require("fs");
// fs to remane files on the server
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime=require('mime-types')

app.use(express.json());

//for hash passwords
const bcryptSalt = bcrypt.genSaltSync(10);
//for cookie
const jwtSecret = "fasefraw4r5r3wq45wdfgw34twdfg";
app.use(cookieParser());
//for photos S3
const bucket='airbnb-clone-project'


// to upload the image
app.use("/api/uploads", express.static(__dirname + "/uploads"));

//connect frontend with backend
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);



//test for backend
app.get("/api/test", (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);
  res.json("test ok");
});

function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      resolve(userData);
    });
  });
}


//upload photos to S3
async function uploadToS3(path, originalFilename, mimetype){
  const client=new S3Client({
    region:'eu-north-1',
    credentials:{
      accessKeyId:process.env.S3_ACCESS_KEY,
      secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,
    }
  })

  const parts=originalFilename.split('.')
  const ext=parts[parts.length-1]
  const newFilename=Date.now()+'.'+ext

 const data= await client.send(new PutObjectCommand({
    Bucket:bucket,
    Body:fs.readFileSync(path),
    Key:newFilename,
    ContentType:mimetype,
    ACL:'public-read',

  }))
  return `https://${bucket}.s3.amazonaws.com/${newFilename}`
}


//register
app.post("/api/register", async (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);

  const { name, email, password } = req.body;
  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(422).json(e);
  }
});

// Login
app.post("/api/login", async (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);
  const { email, password } = req.body;

  const userDoc = await User.findOne({ email: email });
  //daca o gaist cont dupa adresa de mail face if
  if (userDoc) {
    // compara parola criptata din database cu cea intodusa
    const passOk = bcrypt.compareSync(password, userDoc.password);
    //daca ii true atunci se face un cookie
    if (passOk) {
      jwt.sign(
        {
          email: userDoc.email,
          id: userDoc._id,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json(userDoc);
        }
      );
    } else {
      res.status(422).json("pass not ok");
    }
  } else {
    res.status(422).json("adresa mail gresita");
  }
});

//verifica daca esti log-at si se foloseste de cookie
app.get("/api/profile", (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);

  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const { name, email, _id } = await User.findById(userData.id);
      res.json({ name, email, _id });
    });
  } else {
    res.json(null);
  }
});

//logout
app.post("/api/logout", (req, res) => {
  res.cookie("token", "").json(true);
});

// upload-by-link
app.post("/api/upload-by-link", async (req, res) => {

  const { link } = req.body;
  const newName = "photo" + Date.now() + ".jpg";
  await imageDownloader.image({
    url: link,
    dest: "/tmp/" + newName,
  });
  const url= await uploadToS3('/tmp/'+newName, newName, mime.lookup("/tmp/" + newName))
  res.json(url);
});

// upload from PC
const photosMiddleware = multer({ dest: "/tmp" });
app.post("/api/upload",photosMiddleware.array("photos", 100) ,async (req, res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname, mimemtype } = req.files[i];
    const url=await uploadToS3(path, originalname, mimemtype)
    uploadedFiles.push(url)
    
  }
  res.json(uploadedFiles);
});

// add new place
app.post("/api/places", async (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);

  const { token } = req.cookies;
  const {
    title,
    address,
    addedPhotos,
    description,
    price,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;
    const placeDoc = await Place.create({
      owner: userData.id,
      title: title,
      address: address,
      addedPhotos: addedPhotos,
      description: description,
      price: price,
      perks: perks,
      extraInfo: extraInfo,
      checkIn: checkIn,
      checkOut: checkOut,
      maxGuests: maxGuests,
    });
    res.json(placeDoc);
  });
});

// get list of all user places
app.get("/api/user-places", async (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);

  const { token } = req.cookies;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    const { id } = userData;
    res.json(await Place.find({ owner: id }));
  });
});

//get data to fill the form so you can edit
app.get("/api/places/:id", async (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);

  const { id } = req.params;
  res.json(await Place.findById(id));
});

//update data
app.put("/api/places", async (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);

  const { token } = req.cookies;
  const {
    id,
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;

  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;
    const placeDoc = await Place.findById(id);
    if (userData.id === placeDoc.owner.toString()) {
      placeDoc.set({
        title,
        address,
        photos: addedPhotos,
        description,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        price,
      });
      await placeDoc.save();
      res.json("ok");
    }
  });
});

//show all acomadation for index page
app.get("/api/places", async (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);

  res.json(await Place.find());
});

//booking a place
app.post("/api/bookings", async (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);

  const userData = await getUserDataFromReq(req);
  const { place, checkIn, checkOut, numberOfGuests, name, phone, price } =
    req.body;
  const data = await Booking.create({
    place,
    checkIn,
    checkOut,
    numberOfGuests,
    name,
    phone,
    price,
    user:userData.id,
  });
  res.json(data);
});

//get all bookings
app.get("/api/bookings", async (req, res) => {
  //connect to data base
  mongoose.connect(process.env.MONGO_URL);
  const userData = await getUserDataFromReq(req);
  res.json(await Booking.find({ user: userData.id }).populate("place"));
});

//delete/cancel booking
app.delete('/api/account/bookings/:id', async (req, res)=>{
  const{id}=req.params
  res.json(await Booking.findByIdAndDelete({_id:id}))
})

//get all booking for a place
app.get('/api/place/:id',async(req,res)=>{
  const{id}=req.params
  res.json(await Booking.find({place:id}))
})

//delete accommodation
app.delete('/api/account/places/:id',async (req, res)=>{
  const {id}=req.params
  res.json(await Place.findByIdAndDelete({_id:id}))
})

//start backend
app.listen(4000, () => {
  console.log(`Example app listening on port 4000`);
});
