import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login,Channel,Permission,Role, Message} from '../../MongoDb/index.js'
import { capitalize, checkErrWithoutRes, createDate, populateCollection, throwErr, validateIsEmpty, verifyAccessToken } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { Errors, checkError } from "../../utils.js"

dotenv.config()
const router = express.Router()

export const createMessage = async(req)=>{
    
    try {
        console.log(`body:`, req.body);
        const session = await conn.startSession()
        const {userEmail,accessToken,channelId,message,date} = req.body // Bearer ACCESSTOKEN
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ){
            throwErr({name:Errors.NOT_SIGNED_UP,code:404 })
        } 
        let isCreated = await Channel.findOne({_id:channelId});
        if(!isCreated) {
            throwErr({name: Errors.CHANNEL_NOT_FOUND, code:404})
        }
        isCreated = await Channel.findOne({_id:channelId,"members.member": LoggedUser._id});
        if(!isCreated){
            throwErr({name: Errors.NOT_A_MEMBER, code:404})
        }
        let response 
         await conn.transaction(async()=>{
            
            const newMessage =  new Message({
                message
            },{session});

            newMessage.user = LoggedUser
            newMessage.channelAt = isCreated
            if(date) {
                newMessage.createdAt = createDate(date)
            }else {
                newMessage.createdAt= createDate()
            }
            await newMessage.save(session)
            isCreated?.messages.push(newMessage)
            await isCreated.save(session)
            console.log(`newMessage:`, newMessage)
            // isCreatedawait ?.save({session})
        // let PopulatedUser = await populateCollection(LoggedUser, "User");
        let populatedMessages = await populateCollection(isCreated,"Channel");
        console.log(`channels:`, populatedMessages)
        // console.log(`user:`, PopulatedUser)


        response= {success:true, data: {message:newMessage, channel: populatedMessages}}

        await session.endSession()

    })

    return response ?? throwErr({name:'Transaction failed', code:500})
} catch (error) {
        return checkErrWithoutRes(error)
    } 
}


router.route('/create').post(async(req,res) =>{
  let response = await createMessage(req)
  if(response?.success){
      res.status(200).send(response)  
      
    }else {
        res.status(500).send(response)  
    }
})


export const deleteMessage = async(req)=>{
    try {
        const {userEmail,accessToken,channel_id,message_id} = req.query
        const session = await conn.startSession()
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})
        let ARGUMENTS = {channel_id,message_id}
        console.log(`reqQuery:`, req.query)
      
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }

        let response

         await conn.transaction(async ()=>{

            let LoggedUser = await User.findOne({email:userEmail}).session(session);
            if(!LoggedUser ) 
            {
                throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
            }
            let msg = await Message.findOne({_id:message_id,user:LoggedUser._id}).session(session);
            let isMember = await Channel.findOne({_id:channel_id, "members.member": LoggedUser._id}).session(session);
            console.log(isMember)
            if(!isMember){
                throwErr({name:Errors.NOT_A_MEMBER,code:400})
            }
            if(!msg){
                throwErr({name:Errors.NOT_FOUND,code:400, arguments: {message_id, by: LoggedUser?.userName}})

            }
            

            console.log(`USER:`, LoggedUser)
            // console.log(`Channel:`, channel)
            let populatedChannel = await populateCollection(isMember, "Channel")
            // if(messageDate?.day){
                // messageInChat.filter(msg=>msg.createdAt.day===messageDate.day&&msg.createdAt.time===messageDate.time)
                // msg = await Message.findOne({createdAt: {day: messageDate.day,time:messageDate.time},message,user:LoggedUser._id});
                // await Message.findOneAndDelete({message,user:LoggedUser._id,createdAt: messageDate}).session(session).then(data=>console.log(`message: `, data)).catch(err=>console.log(`ERROR MESSAGE:` , err))

            // } else if (!messageDate){
                let deleted=  await Message.findOneAndDelete({_id:message_id,user:LoggedUser}).session(session)
                // if(!deleted) throwErr(deleted)
            // }
            if(!msg && messageDate?.day){
                throwErr({name:Errors.NOT_FOUND,code:400, arguments: {message_id, by: LoggedUser?.userName, time: messageDate ?? messageDate}})
            }
            isMember.messages?.pull(message_id)
            await isMember.save({session})
            response =  {success:true,data:{message:deleted, channel: populatedChannel}}
        })

        return response ?? throwErr({name:'Transaction failed', code:500})
    } catch (error) {
        return checkErrWithoutRes(error)
    } 
}
router.route('/delete').delete(async(req,res)=>{
    let response = await deleteMessage(req);
    if(response?.success){
        res.status(200).send(response)
    }else {
        res.status(500).send(response)
    }
})

export const getMessages = async(req) =>{
    try {
        const session = await conn.startSession()

        const {userEmail} = req.query  
        if(!userEmail){
            throwErr({name:Errors.MISSING_ARGUMENTS,code:404,arguments:'email'})
        }
        // const  isValidToken = await verifyAccessToken(accessToken) 
        console.log(userEmail)
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        console.log(`USER`,LoggedUser);
        if(!LoggedUser ) {
            throwErr({name: Errors.NOT_SIGNED_UP, arguments:userEmail})

        }
        let messages = await Message.find({"user": LoggedUser._id });
        console.log(messages)
        if(messages.length === 0) throwErr({name: Errors.NOT_FOUND, arguments:userEmail,message:'Such user has not sent any messages'})
        if(messages.length > 1){
            let MESSAGES = []
            for(let message of messages){
                let result =await populateCollection(message,"Message"); 
                let filteredMessage = result?.user?.equals(LoggedUser?._id) ? result : null
                if(filteredMessage){
                    MESSAGES.push(filteredMessage)
                }
            }
            
            console.log(`MESSAGES: `,MESSAGES)

            
            return {success:true,data: MESSAGES}
            
        }
        console.log(`channels:`, messages)
       
        let PopulatedUser = await populateCollection(LoggedUser,"User")
        let populatedMessages = await populateCollection(messages[0],"Message");
        console.log(`MESSAGES:::`, populatedMessages)
        let filteredMessages = populatedMessages.messages?.filter(message=> message?.user?.equals(LoggedUser._id))
        console.log(populatedMessages)
        return {success:true,data:{user: PopulatedUser,messages:populatedMessages}}

    } catch (error) {
         return checkErrWithoutRes(error)
    }
}




router.route('/').get(async(req,res)=>{
    let response = await getMessages(req);
    console.log(`RESPONSE:`, response);
    if(response?.success){
        res.status(200).send(response)
    }else {
        res.status(500).send(response)
    }
}

)

export default router