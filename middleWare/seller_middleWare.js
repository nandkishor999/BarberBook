const jwt=require("jsonwebtoken");
const env=require("dotenv");
env.config({path:"config.env"});
var auth=async (req, res, next) => {
    try {
        //console.log(req.cookies.CustomerLogin);
        //console.log(process.env.jwtKey);
        const compare=await jwt.verify(req.cookies.sellerLogin,process.env.jwtKey);
        next();
    } catch (error) {
        res.status(400).json({message:`${error.message}`});
    }
}

module.exports =auth;