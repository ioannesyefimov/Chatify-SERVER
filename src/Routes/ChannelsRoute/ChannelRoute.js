import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login,Channel,Permission,Role} from '../../MongoDb/index.js'
import { throwErr, validateIsEmpty, verifyAccessToken } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { Errors, checkError,populateCollection } from "../../utils.js"


dotenv.config()
const router = express.Router()


router.route('/create').post(async(req,res) =>{
    const session = await conn.startSession()
    session.startTransaction()
    try{
        const {userEmail,accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {channelName,userEmail,accessToken}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
       
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ){
            throwErr({name:Errors.NOT_SIGNED_UP,code:404 })
        } 
        let isCreated = await Channel.findOne({channelName});
        if(isCreated) {
            throwErr({name: Errors.ALREADY_EXISTS,code:400,arguments: isCreated })
        }
        console.log(`ISCREATED: `,isCreated)
        const newChannel =  new Channel({
            channelName
        },{session});

        console.log(`newchannel:`, newChannel)
        if(!newChannel){
            throwErr(newChannel)
            return console.log(`err not thrown`)
        }

        let creatorRole = await Role.findOne({name:"Creator"});
        if(!creatorRole){
            throwErr({name:`ROLE NOT FOUND`, code:404})
        } 
        newChannel?.members?.push({member:LoggedUser,roles:[creatorRole]})
        LoggedUser?.channels?.push({channel:newChannel})
        newChannel?.save({session})
        LoggedUser?.save({session})
        console.log(newChannel.members)
        let PopulatedUser = await populateCollection(LoggedUser, "User");
        let PopulatedChannels =await populateCollection(newChannel, "Channel");
            res.status(200).send({success:true, data: {PopulatedUser,PopulatedChannels}})

    } catch (error) {
        await session.abortTransaction();
        session.endSession()
         checkError(error,res)
    } finally {
        if(session.inTransaction() === true){
            console.log(`commiting trasaction`)
            await session.commitTransaction()
            session.endSession()
        } else {
            console.log(`session was aborted`);
        }
    }
})

router.route('/join').post(async(req,res)=>{
    const session = await conn.startSession()
    session.startTransaction()
    try {
        const {userEmail,accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {channelName,userEmail,accessToken}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
       
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) 
        {
            throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
        }
        const joiningChannel = await Channel.findOne({channelName});
        if(!joiningChannel){
            throwErr({name:Errors.CHANNEL_NOT_FOUND,code: 404})
        } 

        console.log(`USER:`, LoggedUser)
        console.log(`Channel:`, joiningChannel)
        let isAlreadyAmember = await Channel.findOne({channelName, "members.member": LoggedUser._id});
        console.log(`IS ALREADY A MEMBER: `, isAlreadyAmember)
        if(isAlreadyAmember){
            throwErr({name:Errors.ALREADY_MEMBER,code:400})
        }
        let memberRole = await Role.findOne({name:'Member'});
        LoggedUser?.channels.push({channel:joiningChannel, roles:[memberRole]})
        joiningChannel?.members.push({member:LoggedUser,roles: [memberRole]})
        
        LoggedUser.save()
        joiningChannel.save()
        let PopulatedUser = await populateCollection(LoggedUser,'User');
        let PopulatedChannels = await populateCollection(joiningChannel,'Channel');
        return res.status(200).send({success:true,data:{user: PopulatedUser,channel: PopulatedChannels}})
    } catch (error) {
        await session.abortTransaction();
        session.endSession()
         checkError(error,res)
    } finally {
        if(session.inTransaction() === true){
            console.log(`commiting trasaction`)
            await session.commitTransaction()
            session.endSession()
        } else {
            console.log(`session was aborted`);
        }
    }
})

router.route('/leave').post(async(req,res)=>{
    const session = await conn.startSession()
    session.startTransaction()
        try {
        console.log(`body:`, req.body)
        const {userEmail,accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {accessToken,userEmail,channelName}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser )
        { 
            throwErr({name: Errors.NOT_SIGNED_UP,code: 404})
        }  
        let channel = await Channel.findOne({channelName});
        if(!channel){
            throwErr({name: Errors.CHANNEL_NOT_FOUND,code: 404})

        }

            channel = await Channel.findOne({"members.member": LoggedUser?._id, channelName:channelName},{},{session});
            if(!channel) 
            {
                throwErr({name:Errors.NOT_A_MEMBER,code: 400})
            }
            console.log(`LoggedUser:`, LoggedUser)
            console.log(`leavingChannel:`, channel)
            let member = channel.members.find(member=>member.member.toString()===LoggedUser._id.toString())
            await channel.members.pull(member)
            await LoggedUser.channels.pull({channel: channel._id});
            await channel.save({session});
            await LoggedUser.save({session});
            // let updatedChannel = await Channel.findOne({channelName});
            let updatedChannel = channel
            if(updatedChannel.members.length === 0){
                console.log(`DELETING CHANNEL`)
               return await Channel.findOneAndDelete({_id:updatedChannel._id},{session})
               .then(channel=>res.status(200).send({success:true,data: `CHANNEL "${channel?.channelName}" HAS BEEN DELETED DUE TO LACK OF MEMBERS`}))
               .catch(err=>throwErr(err)) 
            }
        

            // filter channel and check whether it includes a role that is higher than Member.
            let isThereAdmins = updatedChannel.members.some(member=> member.roles.some(role=> role.name === 'Admin' || role.name === 'Creator') === true) 
            console.log(`isthereadmins:`, isThereAdmins)
            //if there are no admins give someone an Admin Role
            if(!isThereAdmins) {
                let CreatorRole = await Role.findOne({name: 'Creator'});
                let randomUserInd = Math.floor(Math.random()* updatedChannel.members.length)
                let randomUser = updatedChannel.members[randomUserInd]

                console.log(`RANDOM indx: `, randomUserInd)
                console.log(`RANDOM user: `, updatedChannel.members[randomUserInd])
                let memberRole = await Role.findOne({name: 'Member'});
                updatedChannel.members[randomUserInd]?.roles?.pull(memberRole)
                updatedChannel.members[randomUserInd]?.roles?.push(CreatorRole)
               
                
                updatedChannel.save({session})
                console.log(`updatedChannel with new Creator:`, updatedChannel)
            }
            let PopulatedUser = await populateCollection(LoggedUser,'User');
       
            let PopulatedChannel = await populateCollection(updatedChannel, 'Channel')
           

         
            return res.status(200).send({success:true,data: {user:PopulatedUser, channel:PopulatedChannel, message:`${LoggedUser?.userName} HAS LEFT CHANNEL "${channel?.channelName}"`}})

    } catch (error) {
        await session.abortTransaction();
        session.endSession()
         checkError(error,res)
    } finally {
        if(session.inTransaction() === true){
            console.log(`commiting trasaction`)
            await session.commitTransaction()
            session.endSession()
        } else {
            console.log(`session was aborted`);
        }
    }
})



router.route('/delete').delete(async(req,res)=>{
    const session = await conn.startSession()
    session.startTransaction()

    try {
        const {accessToken, channelName, userEmail} = req.query
        let ARGUMENTS = {accessToken,channelName,userEmail}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
          let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) {
            throwErr({name:Errors.NOT_FOUND, code:404})
        }
        let channel = await Channel.findOne({channelName});
        if(!channel){
            throwErr({name:Errors.CHANNEL_NOT_FOUND, code: 404})
        }
        // Compare member's id with user's id to check whether they are in a channel
         else if(!channel.members.some(member=> member.member.toString() === LoggedUser._id.toString())){
            throwErr({name:Errors.NOT_A_MEMBER, code: 404})
         }

        console.log(`DELETING CHANNEL: `, channel)
        console.log(`CHANNEL DELETING USER: `, LoggedUser)
        let PopulatedChannel = await populateCollection(channel,'Channel'); 
        
         
        // find users' roles in a chat and if they have role "Admin" delete channel
        let isAdmin = PopulatedChannel.members?.find(member => member.member?.email === userEmail)
        console.log(`isAdmin: `, isAdmin)
        isAdmin = isAdmin?.roles?.some((role)=> 
        {console.log(role);return role.name === 'Admin'|| role.name === 'Creator'}
        )
     
     
        console.log(`isAdmin: ${isAdmin}`)
        if(!isAdmin){
            throwErr({name: Errors.NOT_HAVE_PERMISSION, code: 400})
        }
        
        let deletedChannel = await Channel.findOneAndDelete({channelName},{session});
       await  User.find({"channels.channel": deletedChannel?._id})
       .then(async users=>{
            for (let user of users){
                user.channels.pull({channel: deletedChannel._id})
                await user.save({session})
            }
       })
       .catch(err=>throwErr(err))
        
            

            console.log(`deletedChannel: ` ,deletedChannel)

            return res.status(200).send({success:true,data: {message:`CHANNEL "${deletedChannel?.channelName}" HAS BEEN DELETED`}})

    } catch (error) {
        await session.abortTransaction();
        session.endSession()
         checkError(error,res)
    } finally {
        if(session.inTransaction() === true){
            console.log(`commiting trasaction`)
            await session.commitTransaction()
            session.endSession()
        } else {
            console.log(`session was aborted`);
        }
    }
})



router.route('/').get(async(req,res) =>{
    try {
        const {userEmail} = req.query  // Bearer ACCESSTOKEN
        if(!userEmail){
            throwErr({name:Errors.MISSING_ARGUMENTS,code:400})
        }
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) return res.status(404).send({success:false,message:Errors.NOT_FOUND})

        let channels = await Channel.find({"members.member": LoggedUser._id });
        console.log(channels)
        if(channels.length === 0) throwErr({name: Errors.CHANNELS_NOT_FOUND,code:404})
        if(channels.length > 1){
            // loop through every channel that user is member of and then send it 
            let PopulatedChannels = await Promise.all(channels.map(async channel=>populateCollection(channel,'Channel')))
            return res.status(200).send({success:true,data:{user: LoggedUser,channels: PopulatedChannels}})
        }
        let PopulatedUser = await populateCollection(LoggedUser,'User');
       
        let PopulatedChannels = await populateCollection(channels[0], 'Channel')
       
        return res.status(200).send({success:true,data:{user:PopulatedUser,channels: PopulatedChannels}})

    } catch (error) {
         checkError(error,res)
    }
}


)

export default router