 import express from "express";
import cookieParser from "cookie-parser";

//import {errorHandler} from "./utils/errorHandler.js"


const app = express();

app.use(express.json({limit:"16kb"})) 
app.use(express.urlencoded({limit:"16kb",extended:true}));
app.use(express.static("public"))
app.use(cookieParser());

// **********

import userRoute from "./routes/user.route.js";
import dashboardRouter from "./routes/dashboard.route.js";

import videoRouter from "./routes/video.route.js";

import likeRouter from "./routes/like.route.js";

import commentRouter from "./routes/comment.route.js"


import playlistRouter from "./routes/playlist.route.js"

import tweetRouter from "./routes/tweet.route.js"

import subscriptionRouter from "./routes/subscription.route.js"


app.use("/api/v1/user",userRoute);
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/playlists", playlistRouter)
app.use("/api/v1/tweet",tweetRouter)
app.use("/api/v1/subscription",subscriptionRouter)



//app.use(errorHandler)
export {app}