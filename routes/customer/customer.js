const db = require("../../db/db_customer.js");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodeMailer=require("./emailSender.js")
const auth = require("../../middleWare/customer_middleWare.js");
const multer = require("multer");
const env = require("dotenv");
const router = express.Router();
env.config({ path: "config.env" });

const storage = multer.memoryStorage(); // Store the file in memory as a Buffer
const upload = multer({ storage: storage });

router.get("/customer/home", auth, (req, res) => {
  res.status(200).json({ message: "welcom to customer side ..........." });
});

router.post("/customer/register", async (req, res) => {
  try {
    const data = req.body;
    const email = data.email;
    console.log(data);
    if (data.password == data.confirmPassword) {
      const find = await db.loginDbCustomer.findOne({ email });
      if (find) {
        res.status(400).json({ message: "user already registered" });
      } else {
        delete data.confirmPassword;
        data.password = await bcrypt.hash(data.password, 12);
        //console.log(data.password);
        const doc = new db.loginDbCustomer(data);
        const result = await doc.save();
        if (result)
          res.status(200).json({ message: "registration successful" });
        else res.status(404).json({ message: "user registration failed" });
      }
    } else {
      res.status(400).json({ message: "wrong CredentialsContainer.." });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(error);
  }
});

router.post("/customer/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const findUser = await db.loginDbCustomer.findOne({ email });
    if (findUser) {
      const compare = await bcrypt.compare(password, findUser.password);
      if (compare) {
        const loginToken = await jwt.sign(
          { email: findUser.email },
          process.env.jwtKey
        );
        //console.log(loginToken);
        res.cookie("CustomerLogin", loginToken, {
          expires: new Date(Date.now() + 10000 * 60000),
          httpOnly: true,
        });
        res.status(200).json({ message: "Login successful" });
      } else res.status(404).json({ message: "inValid credentials" });
    } else res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.log(`error in login customer ${error.message}`);
    res.status(400).send(error.message);
  }
});
router.post("/customer/updatePassword", async (req, res) => {
  try {
    const data=req.body;
    const email=data.email;
    const password=data.password;
    var newPassword=data.newPassword;
    const result=await db.loginDbCustomer.findOne({email});
    if(result)
    {
      const comp=await bcrypt.compare(password, result.password);
      if(comp)
      {
        result.password=await bcrypt.hash(newPassword,12);
        const ans=await result.save();
        if(ans)res.status(200).json({message:"password changed"});
        else res.status(404).json({message:"password not changed"});
      }
      else res.status(404).json({message:"password not changed"});
    }else res.status(404).json({message:"password not changed"});
     
  } catch (error) {
    res.status(400).send(error);
  }
});
router.post("/customer/updatePhoto",async (req,res)=>{
  try {
    const data=req.body;
    const email=data.email;
    const password=data.password;
    const photo=data.photo //mutler add file in request.file path
    //console.log(data);
    const result=await db.loginDbCustomer.findOne({email});
    if(result)
    {
      const comp=await bcrypt.compare(password, result.password);
      if(comp)
      {
        if (photo) {
          //console.log("i am here");
          result.photo=photo;
        }
        //console.log(result);
        const ans=await result.save();
        memoizeCustomerDetails.invalidate(email);
        if(ans)res.status(200).json({message:"photo changed"});
        else res.status(404).json({message:"photo not changed"});
      }
      else res.status(404).json({message:"photo not changed"});
    }else res.status(404).json({message:"photo not changed"});
     
  } catch (error) {
    res.status(400).send(error);
    console.log(error);
  }
})

router.post("/customer/forgotPassword",async (req,res)=>{
  try {
    const email=req.body.email;
    //console.log(email);
    const doc=await db.loginDbCustomer.findOne({email});
    //console.log(doc);
    if(doc)
    {
      const randomSixDigitNumber = Math.floor(100000 + Math.random() * 900000);
      doc.token=randomSixDigitNumber.toString();
      doc.ExpiryToken=Date.now()+5*60*1000;
      const result =await doc.save();
      const mailOptions = {
        from: "bookbarbernow@gmail.com",
        to: email,
        subject: "Password Reset",
        text: `reset code is ${randomSixDigitNumber} valid for 10 minutes`,
      };
    
      nodeMailer.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
          res.status(200).json({message:"sending email sucessfully"});
        }
      });
      res.status(200).json({message:"successFully send"})
    }else res.status(404).json({message:"user not found"});
  } catch (error) {
    
  }
})
router.post("/customer/resetPassword",async (req,res)=>{
  try {
    const email=req.body.email;
    const token=req.body.otp;
    var newPassword=req.body.newPassword;
    const doc=await db.loginDbCustomer.findOne({email});
    console.log(doc);
    if(doc.token&&doc.token==token)
    {
      if(doc.ExpiryToken>Date.now())
      {  
        doc.password=await bcrypt.hash(newPassword,12); 
        doc.token="";
        doc.ExpiryToken="";
        const result=await doc.save();
        //console.log("token is :"+token);
        if(result)res.status(200).json({message:"password changed successfully"});
        else res.status(400).json({message:"password not changed successfully"});
      }
      else res.status(400).json({message:"token not valid"});
    }else res.status(400).json({message:"token not valid"});
  } catch (error) {
    res.status(400).send(error);
  }
})

router.get("/customer/logout", (req, res) => {
  res.clearCookie("CustomerLogin");
  res.status(200).json({ messageL: "Logout successfully" });
});


const memoizeCustomerDetails = {
  cache: new Map(),
  async get(email) {
    try {
      if (this.cache.has(email)) 
      return this.cache.get(email);

      const data = await db.sellerLoginData.findOne({ email });

      if (data) 
      this.cache.set(email, data);

      return data;
    } catch (error) {
      throw error;
    }
  },
  invalidate(email)
  {
    this.cache.delete(email);
  }
};

router.get("/customer/details/:email", async (req, res) => {
  try {
    try {
      const email=req.params.email;
      const data=await memoizeCustomerDetails.get(email);
      res.status(200).send(data);
    } catch (error) {
      res.status(404).send(error);
    }
  } catch (error) {
    res.status(400).send(error);
  }
});
module.exports = router;
