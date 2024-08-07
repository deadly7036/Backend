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
      resource_type: "auto",
    });
    
    console.log("Response:::::", response);
     fs.unlinkSync(localFile);
    return response;
  } catch (err) {
    fs.unlinkSync(localFile);
    console.log(err);
  }
};
const deleteOnCloudinary = async (public_id, resource_type="image") => {
    try {
        if (!public_id) return null;

        //delete file from cloudinary
        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: `${resource_type}`
        });
    } catch (error) {
        return error;
        console.log("delete on cloudinary failed", error);
    }
};


export { cloudinaryUpload ,deleteOnCloudinary};
