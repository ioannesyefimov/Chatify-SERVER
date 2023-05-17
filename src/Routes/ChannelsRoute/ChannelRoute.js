import express, { response } from 'express';
import * as dotenv from 'dotenv';
import {User,conn,Login,Channel,Permission,Role, Message} from '../../MongoDb/index.js'
import {  Errors, checkError,populateCollection , capitalize, throwErr, validateIsEmpty, verifyAccessToken, containsEncodedComponents, checkErrWithoutRes } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { handleUploadPicture } from '../uploadRoute/uploadRoute.js';


dotenv.config()
const router = express.Router()

export const createChannel = async(req) =>{
    const session = await conn.startSession()
    try{
        const {accessToken,userEmail,channelDiscription, channelName,channelAvatar} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {channelName,userEmail}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        
        // const  isValidToken = await verifyAccessToken(accessToken);
        // if(isValidToken?.err) throwErr({success:false, message: isValidToken.err?.message || isValidToken?.err})
        
        // let LoggedUser = await User.findOne({email:isValidToken?.result?.email});
        let response
        await session.withTransaction(async()=>{
            try {
                if(!isEmpty.success){
                    throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
                }
                
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
    
                if(channelAvatar){
                    console.error(channelAvatar);
                    let uploadPicture = await handleUploadPicture(channelAvatar);
                    console.error(uploadPicture);
                    if(uploadPicture.success) {
                        newChannel.channelAvatar = uploadPicture?.url
                        await newChannel.save({session})
                    }
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
                console.log(newChannel?.members)
                let populatedUser=await populateCollection(LoggedUser,'User');
                let populatedChannel =  await populateCollection(newChannel,'Channel')
                await session.commitTransaction()
                console.log(`COMMITING TRANSACTION....`);

                response =  {success:true, data:{user:populatedUser,channel:populatedChannel}}
                
            } catch (error) {
                await session.abortTransaction()
                console.log(`ABORTING TRANSACTION....`);
                return throwErr(error)
            } finally{
                await session.endSession()
                console.log(`ENDING TRANSACTION....`);

            }
        })
        console.log(`RESPONSE TO CLIENT`, response)
        return response

    } catch (error) {
        return checkErrWithoutRes(error)
    } 

}

router.route('/create').post(async(req,res) =>{
    let  response = await createChannel(req);
    if(response.success){
        res.status(200).send(response)
    } else {
        res.status(500).send(response)
    }
})


export const joinChannel = async(req)=>{
    try {
        const session = await conn.startSession()
        const {userEmail,channel_id} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {userEmail,channel_id}
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
        const joiningChannel = await Channel.findOne({_id:channel_id});
        if(!joiningChannel){
            throwErr({name:Errors.CHANNEL_NOT_FOUND,code: 404})
        } 

        console.log(`USER:`, LoggedUser)
        console.log(`Channel:`, joiningChannel)
        let isAlreadyAmember = await Channel.findOne({_id:channel_id, "members.member": LoggedUser._id});
        console.log(`IS ALREADY A MEMBER: `, isAlreadyAmember)
        if(isAlreadyAmember){
            throwErr({name:Errors.ALREADY_MEMBER,code:400})
        }
        let response 
         await session.withTransaction(async()=>{

            let memberRole = await Role.findOne({name:'Member'});
            LoggedUser?.channels.push({channel:joiningChannel, roles:[memberRole]})
            joiningChannel?.members.push({member:LoggedUser,roles: [memberRole]})
            
            await LoggedUser.save()
           await joiningChannel.save()
            let PopulatedUser = await populateCollection(LoggedUser,'User');
            let PopulatedChannels = await populateCollection(joiningChannel,'Channel');
            await session.commitTransaction()
            session.endSession()
            response = {success:true,data:{user: PopulatedUser,channel: PopulatedChannels}}
        })
        console.log(`RESPONSE TO CLIENT`, response)
        return response

    } catch (error) {
        return checkErrWithoutRes(error,res)
    }
}
router.route('/join').post(async(req,res)=>{
    let  response = await joinChannel(req);
    if(response.success){
        res.status(200).send(response)
    } else {
        res.status(500).send(response)
    }
})


export const leaveChannel= async(req)=>{
    try {
        const session = await conn.startSession();
        console.log(`body:`, req.body)
        const {accessToken,userEmail,channel_id} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {userEmail,channel_id}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})
        let response
         await conn.transaction(async()=>{
            let LoggedUser = await User.findOne({email:userEmail}).session(session);
            if(!LoggedUser )
            { 
                throwErr({name: Errors.NOT_SIGNED_UP,code: 404})
            }  
            let channel = await Channel.findOne({_id:
                channel_id}).session(session);
            if(!channel){
                throwErr({name: Errors.CHANNEL_NOT_FOUND,code: 404})
    
            }
            channel = await Channel.findOne({"members.member": LoggedUser?._id, _id:channel_id
            },{}).session(session);
            if(!channel) 
            {
                throwErr({name:Errors.NOT_A_MEMBER,code: 400})
            }

        
            console.log(`LoggedUser:`, LoggedUser)
            console.log(`leavingChannel:`, channel)
            let member = channel?.members?.find(member=>member?.member?.equals(LoggedUser._id))
            console.log(`MEMBER`,member)
            await channel.members.pull(member)
            await channel.save({session});
            await LoggedUser.channels.pull({channel: channel._id});
            await LoggedUser.save({session});
            let updatedChannel =await populateCollection(channel,'channel');
            let PopulatedUser = await populateCollection(LoggedUser,'User');

            if(updatedChannel.members.length === 0){
                console.log(`DELETING CHANNEL`)
                return  await Channel.findOneAndDelete({_id:updatedChannel._id},{session})
                .then(channel=>response = {success:true,data: {user:PopulatedUser, message:`CHANNEL "${channel?.channelName}" HAS BEEN DELETED DUE TO LACK OF MEMBERS`,channel}})
                .catch(err=>throwErr(err)) 
            }
        

            // filter channel and check whether it includes a role that is higher than Member.
            let isThereAdmins = updatedChannel?.members?.some(member=> member?.roles?.some(role=> role?.name === 'Admin' || role?.name === 'Creator') === true) 
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
            response= {success:true,data: {message2: isThereAdmins?.member ? `${isThereAdmins?.member?.userName} has been given role "Creator Role""` : '' , user:PopulatedUser, channel:PopulatedChannel, message:`${capitalize(LoggedUser?.userName)} has left channel "${channel?.channelName}"`}}
            console.log(`RESPONSE TO CLIENT`, response)
        })
            return response

    } catch (error) {
         return checkErrWithoutRes(error)
    } 
}
router.route('/leave').put(async(req,res)=>{
    let  response = await leaveChannel(req);
    if(response.success){
        res.status(200).send(response)
    } else {
        res.status(500).send(response)
    }
})

export const deleteChannel = async(req)=>{
    try {
        const session = await conn.startSession()
        const {accessToken, channel_id } = req.query
        let ARGUMENTS = {accessToken,channel_id,}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
        const  isValidToken = await verifyAccessToken(accessToken) 
        if(isValidToken?.err) throwErr({success:false, message: isValidToken.err?.message ?? isValidToken?.err})

        
        let LoggedUser = await User.findOne({email:isValidToken?.result.email});
        if(!LoggedUser ) {
            throwErr({name:Errors.NOT_FOUND, code:404})
        }
        let channel = await Channel.findOne({_id: channel_id});
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
        let response 
         await session.withTransaction(async()=>{
            let deletedChannel = await Channel.findOneAndDelete({_id: channel_id},{session});
            await  User.find({"channels.channel": deletedChannel?._id})
            .then(async users=>{
                for (let user of users){
                    user.channels.pull({channel: deletedChannel._id})
                     await user.save({session})
                }
            })
            .catch(err=>throwErr(err))
            
                let deleteMessages = await Message.deleteMany({channelAt:deletedChannel._id})
                if(deleteMessages.deletedCount === 0){
                    console.log(`messages were not deleted`)
                }

                console.log(`deletedChannel: ` ,deletedChannel)
                await session.commitTransaction()
                await session.endSession()
                response = {success:true,data: {message:`Channel "${deletedChannel?.channelName}" has been deleted`,channel:deletedChannel}}
            })        
        console.log(`RESPONSE TO CLIENT`, response)

            return response

            

    } catch (error) {
         return checkErrWithoutRes(error)
    } 
}

router.route('/delete').delete(async(req,res)=>{
    let  response = await deleteChannel(req);
    if(response.success){
        res.status(200).send(response)
    } else {
        res.status(500).send(response)
    }
})
export const getUserChannels = async(req)=>{
    try {
        const {userEmail} = req.query  // Bearer ACCESSTOKEN
        if(!userEmail){
            throwErr({err:{name:Errors.MISSING_ARGUMENTS,code:400}})
        }
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ){
            throwErr({err:{name: Errors.NOT_SIGNED_UP,code:404}})
        }
        let response
        console.log(`USER`,LoggedUser);
        let channels = await Channel.find({'members.member':LoggedUser._id}) ;
        console.log(`CHANNELS`, channels);

        let PopulatedUser = await populateCollection(LoggedUser,'User');
        if(channels.length === 0){
             throwErr({name: Errors.CHANNELS_NOT_FOUND,code:404})
        }else
        if(channels.length > 1){
            // loop through every channel that user is member of and then send it 
            let PopulatedChannels = await Promise.all(channels.map(async channel=>await populateCollection(channel,'Channel')))
            response= {success:true,data:{user: PopulatedUser,channels: PopulatedChannels}}
        }else {

            let PopulatedChannels = await populateCollection(channels[0], 'Channel')
            response =  {success:true,data:{user:PopulatedUser,channels:[PopulatedChannels]}}
        }
       
        
        console.log(`RESPONSE TO CLIENT`, response)
        return response

    } catch (error) {
         return checkErrWithoutRes(error)
    }
}
router.route('/userChannels').get(async(req,res) =>{
    let  response = await getUserChannels(req);
    if(response.success){
        res.status(200).send(response)
    } else {
        res.status(500).send(response)
    }
})

export const getChannel =async(req)=>{
    try {
        console.log(`REQ:`, req);
        const {userEmail}=req.query
        const {channel_id}=req.params
        if(!channel_id || !userEmail){
            throwErr({name:Errors.MISSING_ARGUMENTS,code:400, arguments:`${!userEmail ? 'userEmail' : 'channel_id'} `})
        }
        let isLogged = await User.findOne({email:userEmail});
        if(!isLogged) throwErr({name:Errors.NOT_SIGNED_UP, code:400});

        let isCreated = await Channel.findOne({_id:channel_id});
        if(!isCreated) throwErr({name: Errors.CHANNEL_NOT_FOUND,code:404})
        let response 
        let channels = await Channel.findOne({_id:channel_id, "members.member":isLogged._id });
        console.log(`CHANNELS:`, channels);
        console.log(`isLogged:`, isLogged);
        if(!channels) throwErr({name: Errors.NOT_A_MEMBER,code:400,arguments:{channel_id:isCreated._id}})
        let PopulatedChannels = await populateCollection(channels, 'Channel');

        console.log(`populatedChannels`, PopulatedChannels);
        // find user in an array of members and check whether this user has admin permissions in chat or not.
        // let hasAdminPermissions = PopulatedChannels?.members?.find(member=>member.member?._id.equals(isLogged?._id))?.find(member=>member?.roles?.name==='Admin' || member?.roles?.name==='Creator') 
        // console.log(`HAs ADMIN PERMISSIONS `, hasAdminPermissions);

       response= {success:true,data:{channel: PopulatedChannels,user:isLogged}} 
       console.log(`RESPONSE TO CLIENT`, response)
 
       return response
    } catch (error) {
         return checkErrWithoutRes(error)
    }
}
router.route('/channel/:channel_id').get(async(req,res) =>{
    let  response = await getChannel(req);
    if(response.success){
        res.status(200).send(response)
    } else {
        res.status(500).send(response)
    }
}
)
export const getChannels = async()=>{
    try {
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})
        let channels = await Channel.find({});
        console.log(channels)
        if(channels.length === 0){
             throwErr({name: Errors.CHANNELS_NOT_FOUND,code:404})
        }
        let response
        if(channels.length > 1){
            let promises = channels.map(channel=>populateCollection(channel,'Channel'));
           
           console.log(`promises`,promises);
            let populatedChannels =  await Promise.all(promises);
            console.log(`populated`, populatedChannels);
            // loop through every channel that user is member of and then send it 
            response= {success:true,data:{channels:populatedChannels }}

        }else {
            let PopulatedChannels = await populateCollection(channels[0], 'Channel')
            response= {success:true,data:{channels: [PopulatedChannels]}}
        }
        
        
        console.log(`RESPONSE TO CLIENT`, response)
        return response
    } catch (error) {
         return checkErrWithoutRes(error)
    }
}
router.route('/').get(async(req,res) =>{
    let  response = await getChannels(req);
    if(response.success){
        res.status(200).send(response)
    } else {
        res.status(500).send(response)
    }
})


export default router