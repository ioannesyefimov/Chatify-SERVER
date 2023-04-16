import express from 'express';
import * as dotenv from 'dotenv';
import {User,conn,Login,Channel,Permission,Role} from '../../MongoDb/index.js'
import {  Errors, checkError,populateCollection , capitalize, throwErr, validateIsEmpty, verifyAccessToken, containsEncodedComponents } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { handleUploadPicture } from '../uploadRoute/uploadRoute.js';


dotenv.config()
const router = express.Router()


router.route('/create').post(async(req,res) =>{
    try{
        const session = await conn.startSession()
        const {accessToken,channelDiscription, channelName,channelAvatar} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {channelName,accessToken}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
       
        const  isValidToken = await verifyAccessToken(accessToken) 
        if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:isValidToken?.result?.email});
        if(!LoggedUser ){
            throwErr({name:Errors.NOT_SIGNED_UP,code:404 })
        } 
        let isCreated = await Channel.findOne({channelName});
        if(isCreated) {
            throwErr({name: Errors.ALREADY_EXISTS,code:400,arguments: isCreated })
        }

        return await session.withTransaction(async()=>{


            console.log(`ISCREATED: `,isCreated)
            const newChannel =  new Channel({
                channelName
            },{session});

            if(channelAvatar){
                let uploadPicture = await handleUploadPicture(channelAvatar);
                if(!uploadPicture?.success) throwErr(uploadPicture.message)
                newChannel.channelAvatar = uploadPicture?.url
                await newChannel.save({session})
            }
    
            if(channelDiscription){
                newChannel.channelDiscription = channelDiscription
                await newChannel.save({session})


            }
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
           await newChannel?.save({session})
           await LoggedUser?.save({session})
            console.log(newChannel.members)
            // let PopulatedUser = await populateCollection(LoggedUser, "User");
            let PopulatedChannels =await populateCollection(newChannel, "Channel");
            await session.commitTransaction()
            session.endSession()
            return res.status(200).send({success:true, data: PopulatedChannels})
        })

    } catch (error) {
         checkError(error,res)
    }
})

router.route('/join').post(async(req,res)=>{
    try {
        const session = await conn.startSession()
        const {accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {channelName,accessToken}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
       
        const  isValidToken = await verifyAccessToken(accessToken) 
        if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:isValidToken?.result.email});
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
        return await session.withTransaction(async()=>{

            let memberRole = await Role.findOne({name:'Member'});
            LoggedUser?.channels.push({channel:joiningChannel, roles:[memberRole]})
            joiningChannel?.members.push({member:LoggedUser,roles: [memberRole]})
            
            LoggedUser.save()
            joiningChannel.save()
            let PopulatedUser = await populateCollection(LoggedUser,'User');
            let PopulatedChannels = await populateCollection(joiningChannel,'Channel');
            await session.commitTransaction()
            session.endSession()
            return res.status(200).send({success:true,data:{user: PopulatedUser?.userName,channel: PopulatedChannels}})
        })
    } catch (error) {
         checkError(error,res)
    }
})

router.route('/leave').post(async(req,res)=>{
    try {
        const session = await conn.startSession
        console.log(`body:`, req.body)
        const {accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {accessToken,channelName}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
        const  isValidToken = await verifyAccessToken(accessToken) 
        if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        
        return await conn.transaction(async(session)=>{
            let LoggedUser = await User.findOne({email:isValidToken?.result.email}).session(session);
            if(!LoggedUser )
            { 
                throwErr({name: Errors.NOT_SIGNED_UP,code: 404})
            }  
            let channel = await Channel.findOne({channelName}).session(session);
            if(!channel){
                throwErr({name: Errors.CHANNEL_NOT_FOUND,code: 404})
    
            }
            channel = await Channel.findOne({"members.member": LoggedUser?._id, channelName:channelName},{}).session(session);
            if(!channel) 
            {
                throwErr({name:Errors.NOT_A_MEMBER,code: 400})
            }

        
            console.log(`LoggedUser:`, LoggedUser)
            console.log(`leavingChannel:`, channel)
            let member = channel.members.find(member=>member.member.equals(LoggedUser._id))
            await channel.members.pull(member)
            await LoggedUser.channels.pull({channel: channel._id});
            await channel.save({session});
            await LoggedUser.save({session});
            // let updatedChannel = await Channel.findOne({channelName});
            let updatedChannel = channel
            if(updatedChannel.members.length === 0){
                console.log(`DELETING CHANNEL`)
                return await Channel.findOneAndDelete({_id:updatedChannel._id},{session})
                .then(channel=>res.status(200).send({success:true,data: {message:`CHANNEL "${channel?.channelName}" HAS BEEN DELETED DUE TO LACK OF MEMBERS`}}))
                .catch(err=>throwErr(err)) 
            }
        

            // filter channel and check whether it includes a role that is higher than Member.
            let isThereAdmins = updatedChannel.members.some(member=> member.roles.some(role=> role.name === 'Admin' || role.name === 'Creator') === true) 
            console.log(`CHANNEL : `, updatedChannel)
            console.log(`isthereadmins:`, isThereAdmins)
            let PopulatedChannel = await populateCollection(updatedChannel, 'Channel')
            //if there are no admins give someone an Admin Role
            if(!isThereAdmins) {
                let CreatorRole = await Role.findOne({name: 'Creator'});
                let randomUserInd = Math.floor(Math.random()* updatedChannel.members.length)
                let randomUser = updatedChannel.members[randomUserInd]

                console.log(`RANDOM indx: `, randomUserInd)
                console.log(`RANDOM user: `, randomUser)
                let memberRole = await Role.findOne({name: 'Member'});

                updatedChannel.members[randomUserInd]?.roles?.pull(memberRole)
                updatedChannel.members[randomUserInd]?.roles?.push(CreatorRole)
                
                
                updatedChannel.save({session})
                console.log(`updatedChannel with new Creator:`, updatedChannel)
                isThereAdmins = PopulatedChannel?.members[randomUserInd]
            }
            let PopulatedUser = await populateCollection(LoggedUser,'User');
           
            return res.status(200).send({success:true,data: {message2: isThereAdmins?.member ? `${isThereAdmins?.member?.userName} has been given role "Creator Role""` : '' , user:PopulatedUser?.userName, channel:PopulatedChannel, message:`${capitalize(LoggedUser?.userName)} has left channel "${channel?.channelName}"`}})
        })
    } catch (error) {
         checkError(error,res)
    } 
})



router.route('/delete').delete(async(req,res)=>{
    
    try {
        const session = await conn.startSession()
        const {accessToken, channelName, } = req.query
        let ARGUMENTS = {accessToken,channelName,}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
        const  isValidToken = await verifyAccessToken(accessToken) 
        if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        
        let LoggedUser = await User.findOne({email:isValidToken?.result.email});
        if(!LoggedUser ) {
            throwErr({name:Errors.NOT_FOUND, code:404})
        }
        let channel = await Channel.findOne({channelName});
        if(!channel){
            throwErr({name:Errors.CHANNEL_NOT_FOUND, code: 404})
        }
        // Compare member's id with user's id to check whether they are in a channel
         else if(!channel.members.some(member=> member.member.equals(LoggedUser._id))){
            throwErr({name:Errors.NOT_A_MEMBER, code: 404})
         }

        console.log(`DELETING CHANNEL: `, channel)
        console.log(`CHANNEL DELETING USER: `, LoggedUser)
        let PopulatedChannel = await populateCollection(channel,'Channel'); 
        
         
        // find users' roles in a chat and if they have role "Admin" delete channel
        let isAdmin = PopulatedChannel.members?.find(member => member.member?.email === LoggedUser?.email)
        console.log(`isAdmin: `, isAdmin)
        isAdmin = isAdmin?.roles?.some((role)=> 
        {console.log(role);return role.name === 'Admin'|| role.name === 'Creator'}
        )
     
     
        console.log(`isAdmin: ${isAdmin}`)
        if(!isAdmin){
            throwErr({name: Errors.NOT_HAVE_PERMISSION, code: 400})
        }
        return await session.withTransaction(async()=>{
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
                await session.commitTransaction()
                session.endSession()
                return res.status(200).send({success:true,data: {message:`Channel "${deletedChannel?.channelName}" has been deleted`,channel:deletedChannel}})
            
        })        

    } catch (error) {
         checkError(error,res)
    } 
})

router.route('/userChannels').get(async(req,res) =>{
    try {
        const {userEmail} = req.query  // Bearer ACCESSTOKEN
        if(!userEmail){
            throwErr({err:{name:Errors.MISSING_ARGUMENTS,code:400}})
        }
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) throwErr({err:{name: Errors.NOT_FOUND,code:404}})

        let channels = await Channel.find({"members.member": LoggedUser._id });
        console.log(channels)
        if(channels.length === 0){
             throwErr({name: Errors.CHANNELS_NOT_FOUND,code:404})
        }
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

export const getChannel =async(channelName,userEmail)=>{
    try {
        if(!channelName){
            throwErr({name:Errors.MISSING_ARGUMENTS,code:400, arguments: `channelName`})
        }
     let isEncoded = containsEncodedComponents(channelName)
     if(isEncoded){
        channelName  = decodeURIComponent(channelName)
     }


        let isLogged = await User.findOne({userEmail});
        let channels = await Channel.find({channelName});
        if(isLogged) {
            channels = await Channel.find({channelName, "members.member":isLogged._id })
        }
        console.log(`channels: `, channels)
        if(channels.length === 0){
             throwErr({name: Errors.CHANNELS_NOT_FOUND,code:404})
        }
        if(channels.length > 1){
            // loop through every channel that user is member of and then send it 
            let PopulatedChannels = await Promise.all(channels.map(async channel=>populateCollection(channel,'Channel')))
            return {success:true,data:{channels: PopulatedChannels}}
        }
       
        let PopulatedChannels = await populateCollection(channels[0], 'Channel');
       console.log(`PopulatedChannels,` , PopulatedChannels)
        return {success:true,data:{channels: PopulatedChannels}}
    } catch (error) {
        //  checkError(error,res)
         return {success:false,message:error}
    }
}

router.route('/channel/:channelName').get(async(req,res) =>{
    try {
        let {channelName} = req.params
        let {userEmail} = req.query
        if(!channelName){
            throwErr({name:Errors.MISSING_ARGUMENTS,code:400, arguments: `channelName`})
        }


        let isLogged = await User.findOne({userEmail});
        let channels = await Channel.find({channelName});
        if(isLogged) {
            channels = await Channel.find({channelName, "members.member":isLogged._id })
        }
        console.log(`channels: `, channels)
        if(channels.length === 0){
             throwErr({name: Errors.CHANNELS_NOT_FOUND,code:404})
        }
        if(channels.length > 1){
            // loop through every channel that user is member of and then send it 
            let PopulatedChannels = await Promise.all(channels.map(async channel=>populateCollection(channel,'Channel')))
            return res.status(200).send({success:true,data:{channels: PopulatedChannels}})
        }
       
        let PopulatedChannels = await populateCollection(channels[0], 'Channel');
       console.log(`PopulatedChannels,` , PopulatedChannels)
        return res.status(200).send({success:true,data:{channels: PopulatedChannels}})
    } catch (error) {
        //  checkError(error,res)
         return res.status(400).send({success:false,message:error})
    }
}
)
router.route('/').get(async(req,res) =>{
    try {
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})


        let channels = await Channel.find({ });
        console.log(channels)
        if(channels.length === 0){
             throwErr({name: Errors.CHANNELS_NOT_FOUND,code:404})
        }
        if(channels.length > 1){
            // loop through every channel that user is member of and then send it 
            let PopulatedChannels = await Promise.all(channels.map(async channel=>populateCollection(channel,'Channel')))
            return res.status(200).send({success:true,data:{channels: PopulatedChannels}})
        }
        let PopulatedChannels = await populateCollection(channels[0], 'Channel')
       
        return res.status(200).send({success:true,data:{channels: PopulatedChannels}})

    } catch (error) {
         checkError(error,res)
    }
}


)


export default router