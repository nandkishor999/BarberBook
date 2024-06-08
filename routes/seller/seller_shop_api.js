const db = require("../../db/db_seller.js");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodeMailer = require("../customer/emailSender.js");
const auth = require("../../middleWare/seller_middleWare.js");
const multer = require("multer");
const { Mutex } = require("async-mutex");
const env = require("dotenv");
const router = express.Router();
env.config({ path: "config.env" });

const storage = multer.memoryStorage(); // Store the file in memory as a Buffer
const upload = multer({ storage: storage });

const registerSeats = async (data, start) => {
  try {
    const email = data.email;
    const numSeats = data.numSeats;
    for (let i = start; i < numSeats; i++) {
      const newSeat = {
        seatNumber: i,
        email: email,
        bookings: new Array(11).fill(true), // Initialize bookings with 11 elements
      };

      const doc = new db.seat(newSeat);
      await doc.save();
    }
  } catch (error) {
    throw error;
  }
};
router.post("/seller/shop/registerShop", async (req, res) => {
  try {
    const data = req.body;
    const email = data.email;
    const shop = await db.barberShop.findOne({ email });
    if (shop) {
      res.status(400).json({ message: "shop already registered" });
    } else {
      const newShop = new db.barberShop(data);
      await newShop.save();
      await registerSeats(data, 0);
      memoizeAllShopDetails.invalidateCache();
      memoizeShopDetails.invalidate(email);
      memoizeQueryResult.invalidateCache();
      res.status(200).json({ message: "success in register" });
    }
  } catch (error) {
    res.status(400).send(error);
    console.log(error);
  }
});

router.post("/seller/shop/editDetails", async (req, res) => {
  try {
    const data = req.body;
    const email = data.email;
    var shop = await db.barberShop.findOne({ email });
    if (shop) {
      await db.barberShop.deleteOne({ email });
      await db.seat.deleteMany({email});
      const doc=new db.barberShop(data);
      await doc.save();
      await registerSeats(data, 0);
      var shopDetails = await db.barberShop.findOne({ email });

      memoizeAllShopDetails.invalidateCache();
      memoizeShopDetails.invalidate(email);
      memoizeQueryResult.invalidateCache();
      res.status(200).send(shopDetails);
    }
    else res.status(400).json({ message:"shop not found"});
  } catch (error) {
    res.status(404).send(error);
  }
});

router.get("/seller/shop/deleteShop/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const findShop = await db.barberShop.findOne({ email });
    if (findShop) {
      const data = await db.barberShop.deleteOne({ email });
      memoizeAllShopDetails.invalidateCache();
      memoizeShopDetails.invalidate(email);
      memoizeQueryResult.invalidateCache();
      res.status(200).json({ message: "data deleted successfully" });
    } else res.status(400).json({ message: "shop not found" });
  } catch (error) {
    res.status(404).send(error);
  }
});

router.get("/seller/deleteUser/:email",async (req,res)=>{
  try {
      const email=req.params.email;
      const data=await db.sellerLoginData.deleteOne({email});
      await db.barberShop.deleteOne({email});
      await db.seat.deleteMany({email});
      memoizeAllShopDetails.invalidateCache();
      memoizeShopDetails.invalidate(email);
      memoizeQueryResult.invalidateCache();
      res.status(200).json({message:"data deleted successfully"});
  } catch (error) {
    res.status(400).send(error);
  }
})
// api for particular shop details
const memoizeShopDetails = {
  cache: new Map(),
  async get(email) {
    try {
      if (this.cache.has(email)) return this.cache.get(email);

      const data = await db.barberShop.findOne({ email });
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

router.get("/seller/shop/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const data = await memoizeShopDetails.get(email);
    res.status(200).send(data);
  } catch (error) {
    res.status(400).send(error);
  }
});

//api for all shop details
const memoizeAllShopDetails = {
  cache: [],
  async get() {
    try {
      if (this.cache.length) return this.cache;
      this.cache = await db.barberShop.find();
      return this.cache;
    } catch (error) {
      throw error;
    }
  },
  invalidateCache() {
    cache = [];
  },
};

router.get("/seller/allShopData", async (req, res) => {
  try {
    const data = await memoizeAllShopDetails.get();
    res.status(200).send(data);
  } catch (error) {
    res.status(400).send(error);
  }
});

//query for shops
const memoizeQueryResult = {
  cache: new Map(),
  async get(key, filter) {
    try {
      if (memoizeQueryResult.cache.has(key)) {
        return memoizeQueryResult.cache.get(key);
      }

      const barberShops = await db.barberShop.find(filter);

      if (barberShops.length > 0) {
        memoizeQueryResult.cache.set(key, barberShops);
        return barberShops;
      }

      return null;
    } catch (error) {
      throw error;
    }
  },
  invalidateCache() {
    memoizeQueryResult.cache.clear();
  },
};

router.get("/barber-shops", async (req, res) => {
  try {
    const { name, address, services } = req.query;
    const filter = {};

    if (name) {
      filter.name = new RegExp(name, "i");
    }

    if (address) {
      // Search for any of the address fields
      filter["$or"] = [
        { "address.street": new RegExp(address, "i") },
        { "address.city": new RegExp(address, "i") },
        { "address.landmark": new RegExp(address, "i") },
        { "address.state": new RegExp(address, "i") },
        { "address.pinCode": new RegExp(address, "i") },
      ];
    }

    if (services) {
      filter["services.name"] = new RegExp(services, "i");
    }

    const key = `name:${name || ""}_address:${address || ""}_services:${
      services || ""
    }`;
    const barberShops = await memoizeQueryResult.get(key, filter);

    if (barberShops) {
      res.status(200).json(barberShops);
    } else {
      res.status(404).json({ message: "No Barber Shops found" });
    }
  } catch (error) {
    console.error(`Error in getting Barber Shops: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
