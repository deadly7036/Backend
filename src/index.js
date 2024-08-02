import { connectDB } from "./db/index.js";
import { app } from "./app.js";
//import {User} from "./models/user.model.js";

/*console.log("Cloudinary Config:", {
  cloud_name: process.env.name ? "SET" : "NOT SET",
  api_key: process.env.Key ? "SET" : "NOT SET",
  api_secret: process.env.Secret ? "SET" : "NOT SET",
});
*/


/*const testMatchPassword = async () => {
  try {
    const user = await User.findOne({ username: "deadly7036" });
  if (user) {
    const isMatch = await user.matchPassword("deadly7036");
    console.log(isMatch ? "Password match" : "Password does not match");
  }
  } catch (err) {
    console.log(err);
  }
  
};

testMatchPassword();


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
