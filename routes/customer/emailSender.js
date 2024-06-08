const nodemailer = require("nodemailer");
const env = require("dotenv");
env.config({ path: "config.env" });

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  logger: true,
  debug: false,
  secureConnection: false,
  auth: {
    user: "bookbarbernow@gmail.com",
    pass: process.env.password,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

module.exports = transporter;
