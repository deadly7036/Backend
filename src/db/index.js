import mongoose from "mongoose"



export  const connectDB = async() => {
  try {
  const connected =  await mongoose.connect(`mongodb+srv://${process.env['Mongo_Name']}:${process.env['Mongo_pass']}@cluster0.dm1o2j4.mongodb.net/YT`)
  console.log("MongodB connection succeed !!!!!!",connected.connection.host)
  } catch(err) {
    console.log("Mongoose Connection Failed !!!!!",err)
    process.exit(1)
  }
}

