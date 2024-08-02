 import express from "express";
import cookieParser from "cookie-parser";
const app = express();

app.use(express.json({limit:"16kb"})) 
app.use(express.urlencoded({limit:"16kb",extended:true}));
app.use(express.static("public"))
app.use(cookieParser());

// **********

import userRoute from "./routes/user.route.js";
import dashboardRouter from "./routes/dashboard.route.js";

app.use("/api/v1/user",userRoute);
app.use("/api/v1/dashboard", dashboardRouter)
export {app}