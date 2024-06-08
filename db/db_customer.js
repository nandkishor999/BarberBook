const mongoose = require("./db_main.js");
const loginSchema = new mongoose.Schema({
  name :{
    type :String,
    required :true
  },
  email: {
    type: String,
    required: true,
    unique :true
  },
  password: {
    type: String,
    required: true,
  },
  photo: {
     type: String
  },
  token: String, 
  ExpiryToken: Date
});

const loginDbCustomer = new mongoose.model("loginDbCustomer", loginSchema);

module.exports = {
  loginDbCustomer
};
