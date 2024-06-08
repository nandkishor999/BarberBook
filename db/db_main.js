const mongoose=require('mongoose');
const env=require("dotenv");
env.config({ path: "config.env" });

//console.log(process.env.database);
const mdb=process.env.database;
mongoose.connect(mdb,{useNewUrlParser:true,useUnifiedTopology:true}).then(()=>{
    console.log('Connected to MongoDB');
}).catch((error)=>{
    console.log(error.message);
});

module.exports=mongoose;