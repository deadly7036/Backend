import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.name,
  api_key: process.env.Key,
  api_secret: process.env.Secret,
});



const cloudinaryUpload = async (localFile) => {
  try {
    if (!localFile) {
      return new Error("No file found");
    }

    const response = await cloudinary.uploader.upload(localFile, {
      resource_type: "image",
    });
    if(!response) {
      throw new Error("No response from cloudinary");
    }
    console.log("Response:::::", response);
    return response.url;
  } catch (err) {
    fs.unlinkSync(localFile);
    console.log(err);
  }
};

export { cloudinaryUpload };
