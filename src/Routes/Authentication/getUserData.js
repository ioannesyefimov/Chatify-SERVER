import express from 'express'
import * as dotenv from "dotenv"

import User from '../../MongoDb/models/user.js'

import { checkError, checkErrWithoutRes, Errors, populateCollection, throwErr, verifyAccessToken } from '../../utils.js'
import { generateAccessToken } from './tokenRoute.js'
import { Channel } from '../../MongoDb/index.js'

dotenv.config();
 

const router = express.Router()

export const handleUserData = async(req) => {
    try {
        let {accessToken,loggedThrough} = req.query
        if(!accessToken ) throwErr({name:MISSING_ARGUMENTS,arguments:'access token'})
        
        const  isValidToken = await verifyAccessToken(accessToken);
        console.log(`isvalid: `,isValidToken)
        
        if(!isValidToken?.success || !isValidToken?.result?.email) throwErr({success:false, message: isValidToken.err?.message || isValidToken?.err})
        
        const USER = await User.findOne({email: isValidToken?.result.email})
        console.log(`USER`, USER);
        if(USER?.loggedThrough?.toLowerCase !== loggedThrough?.toLowerCase){
            throwErr({success:false,err:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: USER.loggedThrough})
        }
        let populatedUser = await populateCollection(USER,'User')
    
        console.log(`POPULATED`, populatedUser);
        if(!USER)throwErr({success:false,message:`NOT_FOUND`})
        let channels = populatedUser.channels.map(channel=>{
           return channel.channel
        })
        const user = {
            userName: populatedUser?.userName  ,
            email: populatedUser.email,
            picture: populatedUser?.picture ?? null,
            bio: populatedUser?.bio ?? null,
            phone: populatedUser?.phone ?? null,
            loggedThrough: populatedUser?.loggedThrough,
            _id:populatedUser._id,
            channels
            }
            console.log(populatedUser)
            
            let welcomeChannel = await Channel.findOne({"members.member":user.id,channelName:'Welcome'})
            let redirectUrl = welcomeChannel ? `/chat?channel=${welcomeChannel?._id}` : null
            const GeneratedAccessToken =await generateAccessToken({email: user?.email}) 
            return {
                success:true,
                data: {user,redirectUrl, loggedThrough: populatedUser?.loggedThrough, accessToken: GeneratedAccessToken}
            }
            
    }catch(err){
        console.log(err);
        return checkErrWithoutRes(err)
    }
    }


router.route('/').get(async(req,res)=>{
    let  response = await handleUserData(req);
    if(response.success){
        res.status(200).send(response)
    } else {
        res.status(500).send(response)
    }
})


export default router
