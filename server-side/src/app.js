require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", require("./routes/auth"));
app.use("/public", require("./routes/public"));
app.use("/admin", require("./routes/admin"));
app.use("/doctor", require("./routes/doctor"));
app.use("/patient", require("./routes/patient"));

module.exports = app;
