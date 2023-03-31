import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login,Channel,Permission,Role} from '../../MongoDb/index.js'
import { throwErr, validateIsEmpty, verifyAccessToken } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { Errors, checkError } from "../../utils.js"

dotenv.config()
const router = express.Router()


  


router.route('/create').post(async(req,res) =>{
    const session = await conn.startSession()
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
        if(!LoggedUser ){
            throwErr({name:Errors.NOT_SIGNED_UP,code:404 })
        } 
        let isCreated = await Channel.findOne({channelName});
        if(isCreated) {
            throwErr({name: Errors.ALREADY_EXISTS,code:400})
        }
        console.log(`ISCREATED: `,isCreated)
        return await session.withTransaction(async()=>{
            const newChannel =  new Channel({
                channelName
            },{session});

            console.log(`newchannel:`, newChannel)
            if(!newChannel){
                await session.abortTransaction()
                throwErr(newChannel)
               return console.log(`err not thrown`)
            }

            let creatorRole = await Role.findOne({name:"Creator"});
            if(!creatorRole){
                throwErr({name:`ROLE NOT FOUND`, code:404})
            } 
            newChannel?.members?.push({member:LoggedUser,roles:[creatorRole]})
            LoggedUser?.channels?.push({channel:newChannel, roles:[creatorRole]})
            newChannel?.save()
            LoggedUser?.save()
            console.log(newChannel.members)

          let PopulatedUser = await LoggedUser.populate({path:'channels', populate: [{
            path:'members.member',
            model: 'User',
            populate:[
            {
                path:'roles',
                model: 'Role',
                populate: [{
                    path:'permissions',
                    model:'Permission'
                }]
            },
        ],
        },] });
        let PopulatedChannels = await newChannel.populate({path:'members',populate:[{
            path: 'member',
            model: 'User',
       
        }]});

            await session.commitTransaction();
            session.endSession()
            res.status(200).send({success:true, data: {PopulatedUser,PopulatedChannels}})
        })

    } catch (error) {
        console.log(`err triggered:`, error)
        checkError(error,res)
    }
})

router.route('/join').post(async(req,res)=>{
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
        let PopulatedUser = await LoggedUser.populate({path:'channels', populate: [{
            path:'members.member',
            model: 'User',
            populate:[
            {
                path:'roles',
                model: 'Role',
                populate: [{
                    path:'permissions',
                    model:'Permission'
                }]
            },
        ],
        },] });
        let PopulatedChannels = await joiningChannel.populate({path:'members',populate:[{
            path: 'member',
            model: 'User',
        
        }]});
        return res.status(200).send({success:true,data:{PopulatedUser,PopulatedChannels}})

    } catch (error) {
         checkError(error,res)
    }
})

router.route('/leave').post(async(req,res)=>{
    const session = await conn.startSession()
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
        let leavingChannel = await Channel.findOne({channelName});
        if(!LoggedUser )
        { 
            throwErr({name: Errors.NOT_SIGNED_UP,code: 404})

        } else 
        if(!leavingChannel){
            throwErr({name: Errors.CHANNEL_NOT_FOUND,code: 404})

        }
        console.log(`LOGGED USER:`, )
        // LoggedUser.populate({path:'channels',model:'Channel',populate:[{path:'members', models:'User'}]}).then(user=>console.log(user))
        return await session.withTransaction(async()=>{

            const leavingChannel = await Channel.findOne({"members.member": LoggedUser?._id, channelName:channelName},{},{session});
            if(!leavingChannel) 
            {
                throwErr({name:Errors.NOT_A_MEMBER,code: 400})
            }
            console.log(`LoggedUser:`, LoggedUser)
            console.log(`leavingChannel:`, leavingChannel)

            await leavingChannel.members.pull({member:member.member})
            await LoggedUser.channels.pull({channel: leavingChannel._id});
            await leavingChannel.save();
            await LoggedUser.save();
            let updatedChannel = await Channel.findOne({channelName});
            if(updatedChannel.members.length === 0){
                console.log(`DELETING CHANNEL`)
               return await Channel.findOneAndDelete({_id:updatedChannel._id},{session})
               .then(channel=>res.status(200).send({success:true,data: `CHANNEL "${updatedChannel?.channelName}" HAS BEEN DELETED DUE TO LACK OF MEMBERS`}))
               .catch(err=>throwErr(err)) 
            }



            // filter channel and check whether it includes a role that is higher than Member.
            let isThereAdmins = updatedChannel.members.some(member=> member.roles.some(role=> role.name === 'Admin' || role.name === 'Creator') === true) 
            console.log(`isthereadmins:`, isThereAdmins)
            //if there are no admins give someone an Admin Role
            if(!isThereAdmins) {
                let CreatorRole = await Role.findOne({name: 'Creator'});
                let randomUserInd = Math.floor(Math.random()* updatedChannel.members.length)
                console.log(`RANDOM indx: `, randomUserInd)
                console.log(`RANDOM user: `, updatedChannel.members[randomUserInd])
                let memberRole = await Role.findOne({name: 'Member'});
                updatedChannel.members[randomUserInd]?.roles.pull(memberRole)
                updatedChannel.members[randomUserInd]?.roles.push(CreatorRole)

                updatedChannel.save()

                console.log(`updatedChannel with new Creator:`, updatedChannel)
            }

            let PopulatedUser = await User.find({_id: LoggedUser?._id}).populate({path:'channels', populate: [
                {
                    path:'members.member',
                    model: 'User',
                },
                {
                    path: 'members',
                    populate:[
                        {
                            path:'roles',
                            model: 'Role',
                            populate: [{
                                path:'permissions',
                                model:'Permission'
                            }]
                        },
                    ],
            
                }
            ] });
            let PopulatedChannel = await Channel.findOne({channelName}).populate({path:'members',populate:[
                {
                    path: 'member',
                    model: 'User',
                },
                {
                    path:'roles',
                    model: 'Role',
                    populate: [{
                        path:'permissions',
                        model:'Permission'
                    }]
                },
            ]})


            await session.commitTransaction()
            session.endSession()
            return res.status(200).send({success:true,data: {user:PopulatedUser, channel:PopulatedChannel, message:`${LoggedUser?.userName} HAS LEFT CHANNEL "${leavingChannel?.channelName}"`}})
                
            // return res.status(200).send({success:true,data:{PopulatedUser,PopulatedChannels}})
        })

    } catch (error) {
         checkError(error,res)
    }
})

router.route('/delete').delete(async(req,res)=>{
    const session = await conn.startSession();
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
         else if(!  channel.members.some(member=> member.member.toString() === LoggedUser._id.toString())){
            throwErr({name:Errors.NOT_A_MEMBER, code: 404})
         }

        console.log(`DELETING CHANNEL: `, channel)
        console.log(`CHANNEL DELETING USER: `, LoggedUser)
        
        let PopulatedUser = await LoggedUser.populate({path:'channels', populate: [{
            path:'roles',
            model: 'Role',
                populate: [{
                    path:'permissions',
                    model:'Permission'
                }]
            },{
                path:'channel',model:'Channel'
            }
        ],
        },);

        // find users' roles in a chat and if they have role "Admin" delete channel
        let isAdmin = PopulatedUser.channels?.filter(channel => channel.channel.channelName === channelName)[0].roles.some(role=>role.name === 'Admin')
        if(!isAdmin){
            throwErr({name: Errors.NOT_HAVE_PERMISSION, code: 400})
        }

        return await session.withTransaction(async()=>{
            let deletedChannel = await Channel.findOneAndDelete({channelName},{session});
            let usersInChannel = await  User.find({"channels.channel": deletedChannel?._id});

            await usersInChannel.forEach((user,i)=>{
                user.channels.pull({channel: deletedChannel._id})
                usersInChannel[i].save()
            })
            

            console.log(`deletedChannel: ` ,deletedChannel)

            await session.commitTransaction()
            session.endSession()
            return res.status(200).send({success:true,data: {channel: deletedChannel,message:`CHANNEL HAS BEEN DELETED`}})
        })

    } catch (error) {
  
        checkError(error,res)
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
        if(channels.length === 0) throw new Error(Errors.NOT_FOUND)
        if(channels.length > 1){
            channels.forEach(async channel=>{
               return await channel.populate('users').then(user=>console.log(`channel user:`, user))
            })
            console.log(`channels: `,channels)
            return res.status(200).send({success:true,data: channels})
            
        }
        console.log(`channels:`, channels)
        let PopulatedUser = await LoggedUser.populate({path:'channels', populate: [{
            path:'members.member',
            model: 'User',
        },] });
        let PopulatedChannels = await channels[0].populate({path:'members',populate:[{
            path: 'member',
            model: 'User',
            populate: [{
                path:'channels',
                model: 'Channel',
            }]

        },{
            path:'roles',
            model: 'Role',
            populate: [{
                path:'permissions',
                model:'Permission'
            }]
        },]});
        return res.status(200).send({success:true,data:{PopulatedUser,PopulatedChannels}})

    } catch (error) {
         checkError(error,res)
    }
}




)

export default router