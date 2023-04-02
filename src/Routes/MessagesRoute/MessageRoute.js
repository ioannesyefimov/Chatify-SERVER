import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login,Channel,Permission,Role, Message} from '../../MongoDb/index.js'
import { capitalize, populateCollection, throwErr, validateIsEmpty, verifyAccessToken } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { Errors, checkError } from "../../utils.js"

dotenv.config()
const router = express.Router()



router.route('/create').post(async(req,res) =>{
    
    try {
        const session = await conn.startSession()
        const {userEmail,accessToken,channelName,message} = req.body  // Bearer ACCESSTOKEN
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ){
            throwErr({name:Errors.NOT_SIGNED_UP,code:404 })
        } 
        let isCreated = await Channel.findOne({channelName});
        if(!isCreated) {
            throwErr({name: Errors.CHANNEL_NOT_FOUND, code:404})
        }
        isCreated = await Channel.findOne({channelName,"members.member": LoggedUser._id});
        if(!isCreated){
            throwErr({name: Errors.NOT_A_MEMBER, code:404})
        }

        return await session.withTransaction(async()=>{
            
            const newMessage =  new Message({
                message,user: LoggedUser,channelAt: isCreated
            },{session});

            console.log(`newMessage:`, newMessage)
            isCreated = await Channel.findOneAndUpdate({channelName,"members.member": LoggedUser._id}, {$push: {messages: newMessage}}, {session});
            // isCreated?.messages.push(newMessage)

            // isCreated?.save({session})

        // let PopulatedUser = await populateCollection(LoggedUser, "User");
        let populatedMessages = await populateCollection(isCreated,"Message");

        console.log(`channels:`, populatedMessages)
        // console.log(`user:`, PopulatedUser)
        await session.commitTransaction()
        session.endSession()
        res.status(200).send({success:true, data: {message:`${capitalize(LoggedUser?.userName)} has sent "${message}" to channel "${isCreated?.channelName}"`, channel: populatedMessages}})
        })

    } catch (error) {
         checkError(error,res)
    } 
})

router.route('/delete').delete(async(req,res)=>{

    try {
        const {userEmail,accessToken,channelName,message} = req.query
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})
        let ARGUMENTS = {channelName,userEmail,accessToken,message}
        console.log(`reqQuery:`, req.query)
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) 
        {
            throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
        }
        let channel = await Channel.findOne({channelName});
        if(!channel){
            throwErr({name:Errors.CHANNEL_NOT_FOUND,code: 404})
        } 

        console.log(`USER:`, LoggedUser)
        console.log(`Channel:`, channel)
        let isMember = await Channel.findOne({channelName, "members.member": LoggedUser._id});
        console.log(isMember)
        if(!isMember){
            throwErr({name:Errors.NOT_A_MEMBER,code:400})
        }
        let populatedMessages = await populateCollection(isMember, "Message")
        console.log(`populateMessages`, populatedMessages)
        let messageInChat = populatedMessages?.messages?.find(msg=>msg?.message===message && msg?.user.equals(LoggedUser._id))
            
        if(!messageInChat){
            throwErr({name: Errors.NOT_FOUND, arguments: {message, by: LoggedUser?.userName}})
        }

        channel.messages?.pull(messageInChat)
        channel.save()
        
  
        return res.status(200).send({success:true,data:{message:`"${message}" has been deleted from "${channel?.channelName}"`, channel: populatedMessages}})

    } catch (error) {
         checkError(error,res)
    } 
})


router.route('/').get(async(req,res) =>{
    try {
        const {userEmail} = req.query  // Bearer ACCESSTOKEN
        // const  isValidToken = await verifyAccessToken(accessToken) 
        console.log(userEmail)
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) return res.status(404).send({success:false,message:Errors.NOT_SIGNED_UP})

        let channels = await Channel.find({"members.member": LoggedUser._id });
        console.log(channels)
        if(channels.length === 0) throwErr({name: Errors.CHANNELS_NOT_FOUND, arguments:userEmail})
        if(channels.length > 1){
            let MESSAGES = []
            for(let channel of channels){
                return await populateCollection(channel,"Message").then(data=>MESSAGES.push(data?.messages?.filter(message=>message?.user.equals(LoggedUser?._id))))
            }
            
            console.log(`MESSAGES: `,MESSAGES)

            
            return res.status(200).send({success:true,data: MESSAGES})
            
        }
        console.log(`channels:`, channels)
        let PopulatedUser = await populateCollection(LoggedUser,"User");
        let populatedMessages = await populateCollection(channels[0],"Message").then(data=>data?.messages.filter(message=> message?.user.equals(LoggedUser._id)))
        console.log(populatedMessages)
        return res.status(200).send({success:true,data:{user: PopulatedUser,messages:populatedMessages}})

    } catch (error) {
         checkError(error,res)
    }
}




)

export default router