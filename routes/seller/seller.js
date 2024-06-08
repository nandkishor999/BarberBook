const db = require("../../db/db_seller.js");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodeMailer = require("../customer/emailSender.js");
const auth = require("../../middleWare/seller_middleWare.js");
const multer = require("multer");
const env = require("dotenv");
const router = express.Router();
env.config({ path: "config.env" });

router.post("/seller/register", async (req, res) => {
  try {
    const data = req.body;
    const email = req.body.email;

    const result = await db.sellerLoginData.findOne({ email });
    if (result) {
      res.status(400).json({ message: "user already registered" });
    } else {
      if (data.password == data.confirmPassword) {
        data.password = await bcrypt.hash(data.password, 12);
        delete data.confirmPassword;
        const doc = new db.sellerLoginData(data);

        const result = await doc.save();
        if (result) res.status(200).json({ message: "success in upload" });
        else res.status(404).json({ message: "error in upload" });
      } else res.status(404).json({ message: "error in upload" });
    }
  } catch (error) {
    res.status(404).json({ message: `error in upload in seller ${error}` });
  }
});

router.post("/seller/login", async (req, res) => {
  try {
    const data = req.body;
    const email = data.email;
    const result = await db.sellerLoginData.findOne({ email });
    if (result) {
      var compare = await bcrypt.compare(data.password, result.password);
      if (compare) {
        const loginCookie = await jwt.sign(
          { email: result.email },
          process.env.jwtKey
        );
        res.cookie("sellerLogin", loginCookie, {
          expires: new Date(Date.now() + 1000 * 60 * 50),
          httpOnly: true,
        });
        const data = await db.sellerLoginData.findOne({ email });
        res.status(200).send(data);
      } else res.status(400).json({ message: "bad request" });
    } else res.status(400).json({ message: "user does not exist" });
  } catch (error) {
    res.status(404).json({ message: `error in login seller ${message}` });
  }
});

const updatePassword= async (data) => {
  try {
    const email = data.email;
    const password = data.password;
    const newPassword = data.newPassword;
    const user = await db.sellerLoginData.findOne({ email });
    if (user) {
      var compare = await bcrypt.compare(password, user.password);
      return compare;
      } else return false;
  } catch (error) {
    throw error;
  }
}
router.post("/seller/updateDetails", async (req, res) => {
  try {
    const email = req.body.email;
    const photo = req.body.photo;
    const name = req.body.name;
    const findPerson = await db.sellerLoginData.findOne({ email });
    if (findPerson) {
      if (photo) findPerson.photo = photo;
      if (name) findPerson.name = name;
      if(req.body.password)
      {
         var ans=updatePassword(req.body);
         if(ans)findPerson.password = await bcrypt.hash(req.body.newPassword,12);
      }
      const result = await findPerson.save();
      memoizesellerDetails.invalidate(email);

      const data = await db.sellerLoginData.findOne({ email });
      res.status(200).send(data);
    } else res.status(404).json({ message: "error saving photo" });
  } catch (error) {
    res.status(400).send(`error in saving photo: ${error}`);
  }
});

router.post("/seller/forgotPassword", async (req, res) => {
  try {
    const email = req.body.email;
    const doc = await db.sellerLoginData.findOne({ email });
    if (doc) {
      const randomSixDigitNumber = Math.floor(100000 + Math.random() * 900000);
      doc.token = randomSixDigitNumber.toString();
      doc.ExpiryToken = Date.now() + 5 * 60 * 1000;
      const result = await doc.save();
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
          res.status(200).json({ message: "sending email sucessfully" });
        }
      });
      res.status(200).json({ message: "successFully send" });
    } else res.status(404).json({ message: "user not found" });
  } catch (error) {}
});

router.post("/seller/resetPassword", async (req, res) => {
  try {
    const email = req.body.email;
    const token = req.body.otp;
    var newPassword = req.body.newPassword;
    console.log(newPassword);
    const doc = await db.sellerLoginData.findOne({ email });
    console.log(doc);
    if (doc.token && doc.token == token) {
      if (doc.ExpiryToken > Date.now()) {
        doc.password = await bcrypt.hash(newPassword, 12);
        doc.token = "";
        doc.ExpiryToken = "";
        const result = await doc.save();
        if (result)
          res.status(200).json({ message: "password changed successfully" });
        else
          res
            .status(400)
            .json({ message: "password not changed successfully" });
      } else res.status(400).json({ message: "token not valid" });
    } else res.status(400).json({ message: "token not valid" });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.get("/seller/logout", (req, res) => {
  res.clearCookie("sellerLogin");
  res.status(200).json({ messageL: "Logout successfully" });
});

const memoizesellerDetails = {
  cache: new Map(),
  async get(email) {
    try {
      if (this.cache.has(email)) return this.cache.get(email);

      const data = await db.sellerLoginData.findOne({ email });
      if (data) delete data.password;

      if (data) this.cache.set(email, data);

      return data;
    } catch (error) {
      throw error;
    }
  },
  invalidate(email) {
    this.cache.delete(email);
  },
};

router.get("/seller/details/:email", async (req, res) => {
  try {
    try {
      const email = req.params.email;
      const data = await memoizesellerDetails.get(email);
      res.status(200).send(data);
    } catch (error) {
      res.status(404).send(error);
    }
  } catch (error) {}
});
module.exports = router;
