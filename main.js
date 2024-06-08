const express=require("express");
const db=require("./db/db_main.js");
const cors=require("cors");
const cookieParser=require("cookie-parser");
require("./db/db_customer.js");
const app= new express();

const corsOptions = {
    origin: [
      'http://localhost:5173',
     "https://bbn-barber.onrender.com"
    ],
  };
  
app.use(cors(corsOptions));
app.use(express.json()); //used to parse json data into js object
app.use(cookieParser());
app.use(require("./routes/customer/customer.js"));
app.use(require("./routes/seller/seller.js"));
app.use(require("./routes/seller/seller_shop_api.js"));
app.use(require("./routes/seller/seatBooking.js"));
//app.use(require("./routes/customer/customer_api.js"));

const port=process.env.PORT ||9050;

app.get("/",(req,res)=>{
    res.json({message:"helo from server side"});
})
app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
})
