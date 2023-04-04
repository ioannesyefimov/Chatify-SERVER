import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login,Channel,Permission,Role, Message} from '../../MongoDb/index.js'
import { capitalize, createDate, populateCollection, throwErr, validateIsEmpty, verifyAccessToken } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { Errors, checkError } from "../../utils.js"

dotenv.config()
const router = express.Router()



router.route('/create').post(async(req,res) =>{
    
    try {
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

        return await conn.transaction(async(session)=>{
            
            const newMessage =  new Message({
                message
            },{session});

            // isCreated = await Channel.findOneAndUpdate({channelName,"members.member": LoggedUser._id}, {$push: {messages: newMessage}}, {session});
            // isCreated?.messages.push(newMessage)
            newMessage.user = LoggedUser
            newMessage.channelAt = isCreated
            newMessage.createdAt = createDate()
            await newMessage.save({session})
            isCreated?.messages.push(newMessage)
            await isCreated.save({session})
            
            console.log(`newMessage:`, newMessage)
            // isCreatedawait ?.save({session})

        // let PopulatedUser = await populateCollection(LoggedUser, "User");
        let populatedMessages = await populateCollection(isCreated,"Channel");

        console.log(`channels:`, populatedMessages)
        // console.log(`user:`, PopulatedUser)

        res.status(200).send({success:true, data: {message:`${capitalize(LoggedUser?.userName)} has sent "${message}" to channel "${isCreated?.channelName}"`, channel: populatedMessages}})
        })

    } catch (error) {
         checkError(error,res)
    } 
})

router.route('/delete').delete(async(req,res)=>{

    try {
        const {userEmail,accessToken,channelName,message,timeStamp} = req.query
        // const  isValidToken = await verifyAccessToken(accessToken) 
        let messageDate
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})
        let ARGUMENTS = {channelName,userEmail,accessToken,message}
        console.log(`reqQuery:`, req.query)
        if(timeStamp){
            messageDate = JSON?.parse(timeStamp.replaceAll('/', '.'))
        }
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        console.log(`time:`, messageDate?.time);
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
        return await conn.transaction(async (session)=>{

            let LoggedUser = await User.findOne({email:userEmail}).session(session);
            if(!LoggedUser ) 
            {
                throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
            }
            let msg = await Message.findOne({message,user:LoggedUser._id}).session(session);
            if(!msg){
                throwErr({name:Errors.NOT_FOUND,code:400, arguments: {message, by: LoggedUser?.userName}})

            }
            let isMember = await Channel.findOne({channelName, "members.member": LoggedUser._id}).session(session);
            console.log(isMember)
            if(!isMember){
                throwErr({name:Errors.NOT_A_MEMBER,code:400})
            }
          
    
            console.log(`USER:`, LoggedUser)
            // console.log(`Channel:`, channel)
            let populatedChannel = await populateCollection(isMember, "Channel")
            // console.log('messages, ', populatedMessages)
            // console.log(`populateMessages`, populatedMessages)
            // let messageInChat = populatedMessages?.messages?.filter(msg=>msg?.message===message && msg?.user.equals(LoggedUser._id))
            // console.log(`BEFORE, `, messageInChat);
            if(messageDate?.day){
                // messageInChat.filter(msg=>msg.createdAt.day===messageDate.day&&msg.createdAt.time===messageDate.time)
                msg = await Message.findOne({createdAt: {day: messageDate.day,time:messageDate.time},message,user:LoggedUser._id});
                await Message.findOneAndDelete({message,user:LoggedUser._id,createdAt: messageDate}).session(session).then(data=>console.log(`message: `, data)).catch(err=>console.log(`ERROR MESSAGE:` , err))

            } else if (!messageDate){
                await Message.findOneAndDelete({message,user:LoggedUser._id}).session(session).then(data=>console.log(`message: `, data)).catch(err=>console.log(`ERROR MESSAGE:` , err))

            }
            if(!msg && messageDate?.day){
                throwErr({name:Errors.NOT_FOUND,code:400, arguments: {message, by: LoggedUser?.userName, time: messageDate ?? messageDate}})

            }
        
            // if(!messageInChat.length){
            //     // let possibleMessages = await Message.find({'user': LoggedUser._id});
            //     // console.log(`possibleMessages`, possibleMessages)
            //     // if(possibleMessages.length > 1){
            //     //     let result = [ ]
            //     //     for(let msg of possibleMessages){
            //     //         await populateCollection(msg,"Message").then(data=>result.push(data))

            //     //     }
            //     //     throwErr({name:Errors.NOT_FOUND,arguments: {userMessages:result,message, by: LoggedUser?.userName, time: messageDate ?? messageDate }})
            //     // }
            //     throwErr({name: Errors.NOT_FOUND, arguments: {message, by: LoggedUser?.userName, time: messageDate ?? messageDate }})
            // }
    
            isMember.messages?.pull(message)
            await isMember.save({session})

      
            return res.status(200).send({success:true,data:{message:`"${message}" has been deleted from "${isMember?.channelName}"`, channel: populatedChannel}})
        })

    } catch (error) {
         checkError(error,res)
    } 
})



// router.route('/delete').delete(async(req,res)=>{

//     try {
//         const {userEmail,accessToken,channelName,message} = req.query
//         // const  isValidToken = await verifyAccessToken(accessToken) 
//         // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})
//         let ARGUMENTS = {channelName,userEmail,accessToken,message}
//         console.log(`reqQuery:`, req.query)
//         const isEmpty = await validateIsEmpty(ARGUMENTS);
        
//         if(!isEmpty.success){
//             throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
//         }
//         return await conn.transaction(async (session)=>{

//             let LoggedUser = await User.findOne({email:userEmail}).session(session);
//             if(!LoggedUser ) 
//             {
//                 throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
//             }
//             let channel = await Channel.findOne({channelName}).session(session);
//             if(!channel){
//                 throwErr({name:Errors.CHANNEL_NOT_FOUND,code: 404})
//             } 
    
//             console.log(`USER:`, LoggedUser)
//             console.log(`Channel:`, channel)
//             let isMember = await Channel.findOne({channelName, "members.member": LoggedUser._id}).session(session);
//             console.log(isMember)
//             if(!isMember){
//                 throwErr({name:Errors.NOT_A_MEMBER,code:400})
//             }
//             let populatedMessages = await populateCollection(isMember, "Message")
//             console.log('messages, ', populatedMessages)
//             console.log(`populateMessages`, populatedMessages)
//             let messageInChat = populatedMessages?.messages?.find(msg=>msg?.message===message && msg?.user.equals(LoggedUser._id))
//                 console.log(`MESSAGE IN CHAT`, messageInChat)
//             if(!messageInChat){
//                 throwErr({name: Errors.NOT_FOUND, arguments: {message, by: LoggedUser?.userName}})
//             }
    
//             channel.messages?.pull(messageInChat)
//             await channel.save({session})
            
      
//             return res.status(200).send({success:true,data:{message:`"${message}" has been deleted from "${channel?.channelName}"`, channel: populatedMessages}})
//         })

//     } catch (error) {
//          checkError(error,res)
//     } 
// })


router.route('/').get(async(req,res) =>{
    try {
        const {userEmail} = req.query  
        // const  isValidToken = await verifyAccessToken(accessToken) 
        console.log(userEmail)
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) {
            throwErr({name: Errors.NOT_SIGNED_UP, arguments:userEmail})

        }
        let messages = await Message.find({"user": LoggedUser._id });
        console.log(messages)
        if(messages.length === 0) throwErr({name: Errors.NOT_FOUND, arguments:userEmail})
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

            
            return res.status(200).send({success:true,data: MESSAGES})
            
        }
        console.log(`channels:`, messages)
       
        let PopulatedUser = await populateCollection(LoggedUser,"User")
        let populatedMessages = await populateCollection(messages[0],"Message");
        console.log(`MESSAGES:::`, populatedMessages)
        let filteredMessages = populatedMessages.messages?.filter(message=> message?.user?.equals(LoggedUser._id))
        console.log(populatedMessages)
        return res.status(200).send({success:true,data:{user: PopulatedUser?.userName,messages:populatedMessages}})

    } catch (error) {
         checkError(error,res)
    }
}




)

export default router