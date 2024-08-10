import mongoose, {isValidObjectId} from "mongoose"
//import {User} from "../models/user.model.js";

import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription


    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }

     const findChannel = await Subscription.findOne({
         subscriber:req.user?_id,
         channel:channelId
     })

    if(findChannel) {
    await findByIdAndDelete(findChannel?._id)

        return res.status(201).json(new ApiResponse(200,{
            isSubcribred: false
        },"Successfully UnSubscribed The Channel"))

    }


    await Subscription.create({
        channel: channelId,
        subscriber: req.user?._id,
    })


    return res.status(201).json(new ApiResponse(201,{
        isSubcribred:true
    },"Subscription added successfully"))



    




    
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }


    const subscriberList = await Subscription.aggregate([
        {
     $match: {
channel: new mongoose.Types.ObjectId(channelId)
     }
        },{
        $lookup:{
      from : "users",
      localField: "subscriber",
      foreignField: "_id",
      as: "subscriber",
      pipeline: [{
          $lookup:{
          from:"subscriptions",
          localField:"channel",
         foreignField:"_id",
          as: "subscribedToSubscriber"
          }
      },{
        $addFields: {
            totalSubscribers: {
                $size: "$subscribedToSubscriber"
            },
          isSubscribed: {
              $cond: {
            $if: {
           $in: [channelId,"$subscribedToSubscriber.subscriber"]
            },
        then:true,
       else: false
              }
          }
        }
      }]
        }
        },{
        $unwind: "$subscriber"
        },{
    $project: {
        _id:0,
        subscriber: {
        username:1,
         fullName:1,
         "avatar.url":1,
        totalSubscribers:1,
        isSubscribed:1,
        }
    }
        }
    ])


    return res.status(201).json(new ApiResponse(201, subscriberList, "Successfully fetched subscriber list"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params


const subscribedChannels = await Subscription.aggregate([
    {
  $match: {
     subscriber: new mongoose.Types.ObjectId(subscriberId)
  }
    },{
     $lookup: {
        from: "users",
         localField:"channel",
         foreignField:"_id",
         as: "subscribedChannel",
         pipeline: [{
             $lookup: {
         from: "videos",
          localField:"_id",
         foriegnField:"owner",
         as:"videos"
             }
         },{
     $addFields: {
         latestVideo: {
             $last : "$videos"
         }
     }
         }]
     }
    },{
    $unwind: "$subscribedChannel"
    },{
      $project: {
          _id:0,
          subscribedChannel: {
              _id:1,
              username:1,
              fullName:1,
              "avatar.url":1,
              latestVideo: {
               title:1,
            description:1,
             "videoFile.url":1,
             "thumbnail.url":1,
              views:1,
                duration:1,
                createdAt:1
              }
          }
      }
    }
])

    if(!subscribedChannels?.length) {
        throw new ApiError(404, "No channels found")
    }


return res.status(200).json(new ApiResponse(200, subscribedChannels, "Successfully fetched subscribed channels"))

    
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}