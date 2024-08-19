/*import {ApiError} from "./ApiError.js"





const errorHandler = (err,_,res,next) => {

  
  if(err)  {
    return res.status(err.statusCode ).json(new ApiError({
      status:err.statusCode,
      message:err.message,
    }))
  } 
  
    return res.status(500).json(new ApiError({
      status:500,
      message:"Internal Sever Error"
    }))


  
}



export {errorHandler}*/