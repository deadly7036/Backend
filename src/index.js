import { connectDB } from "./db/index.js";
import { app } from "./app.js";


/*console.log("Cloudinary Config:", {
  cloud_name: process.env.name ? "SET" : "NOT SET",
  api_key: process.env.Key ? "SET" : "NOT SET",
  api_secret: process.env.Secret ? "SET" : "NOT SET",
});
*/
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("Connecting Error!!!!", error);
    });

    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  })
  .catch((err) => {
    console.log(err, "Error in connecting to DB");
  });
