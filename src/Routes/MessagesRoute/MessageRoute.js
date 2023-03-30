import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login,Channel,Permission,Role, Message} from '../../MongoDb/index.js'
import { throwErr, validateIsEmpty, verifyAccessToken } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { Errors, checkError } from "../../utils.js"

dotenv.config()
const router = express.Router()



router.route('/create').post(async(req,res) =>{
    const session = await conn.startSession()
    try {
        const {user,accessToken,channelName,message} = req.body  // Bearer ACCESSTOKEN
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:user?.email});
        if(!LoggedUser ){
            throwErr({name:Errors.NOT_SIGNED_UP,code:404 })
        } 
        let isCreated = await Channel.findOne({channelName});
        if(!isCreated) {
            throwErr({name: Errors.CHANNEL_NOT_FOUND, code:404})
        }
        return await session.withTransaction(async()=>{
            const newMessage =  new Message({
                message
            },{session});

            newMessage.user = LoggedUser
            newMessage.channelAt = isCreated

            isCreated?.messages.push(newMessage)

            newMessage?.save()
            isCreated?.save()

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
        },{path:'messages', model:'Message'}] });
        let PopulatedChannels = await isCreated.populate([
            {
                path:"members",populate:[
                {
                    path: 'member',
                    model: 'User',
                },]
            }, 
            {
                path:"messages", model: 'Message'
            }
            ]);

        console.log(`channels:`, PopulatedChannels)
        console.log(`user:`, PopulatedUser)
        return await session.abortTransaction();
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
        const {user,accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:user?.email});
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
        const {user,accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        console.log(`body:`, req.body)
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:user?.email});
        let leavingChannel = await Channel.find({channelName});
        if(!leavingChannel){
            throwErr({name: Errors.CHANNEL_NOT_FOUND,code: 404})

        }
        if(!LoggedUser )
        { 
            throwErr({name: Errors.NOT_SIGNED_UP,code: 404})

        }
        console.log(`LOGGED USER:`, )
        // LoggedUser.populate({path:'channels',model:'Channel',populate:[{path:'members', models:'User'}]}).then(user=>console.log(user))
        return await session.withTransaction(async()=>{

            const leavingChannel = await Channel.findOne({"members.member": LoggedUser?._id, channelName:channelName},{},{session});
            const leavingUser = await User.findOne({'channels.channel': leavingChannel?._id, },{},{session})
            if(!leavingUser || !leavingChannel) 
            {
                throwErr({name:Errors.NOT_A_MEMBER,code: 400})
            }
            console.log(`leavingUser:`, leavingUser)
            console.log(`leavingChannel:`, leavingChannel)

            await leavingChannel.members.pull({member: LoggedUser._id});
            await leavingUser.channels.pull({channel: leavingChannel._id});
            leavingChannel.save()
            leavingUser.save()

    
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
            let PopulatedChannels = await leavingChannel.populate({path:'members',populate:[{
                path: 'member',
                model: 'User',
           
            }]});
            await session.commitTransaction()
            session.endSession()
            return res.status(200).send({success:true,data: {user:PopulatedUser, channel:PopulatedChannels, message:`CHANNEL HAS BEEN LEFT`}})
                
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
        // const  isValidToken = await verifyAccessToken(accessToken) 
        console.log(userEmail)
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