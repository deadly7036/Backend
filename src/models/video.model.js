import mongoose,{Schema} from "mongoose";

//import mongoosePaginate  from "mongoose-paginate-v2";

const videoSchema = new Schema({
   videofile: {
     type: {
       url:String,
       public_id:String
     },
     required:true
   },
   thumbnail: {
     type: {
       url:String,
       public_id:String
     },
     required:true
   },
  title: {
     type: String,
     required:true
   },
   description: {
     type: String,
     required:true
   },
   duration: {
     type: Number,  //cloudinary
     required:true
   },
  views: {
    type: Number,
    default:0
  },
  isPublished: {
    type: Boolean,
    default:true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref:"User"
  },
},{timestamps:true});

//videoSchema.plugin(mongoosePaginate);

export const Video = mongoose.model("Video",videoSchema);


