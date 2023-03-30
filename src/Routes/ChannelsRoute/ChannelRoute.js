import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login,Channel,Permission,Role} from '../../MongoDb/index.js'
import { throwErr, verifyAccessToken } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { Errors, checkError } from "../../utils.js"

dotenv.config()
const router = express.Router()


 const handleGithubSingin = async(accessToken ,res)=>{
    try {
        
       return  await jwt.verify(accessToken, process.env.JWT_TOKEN_SECRET, async (err,result) => {
            if(err) {
                console.log(err)
                return res.status(404).send({success:false, message:err})
            }
            const session = await conn.startSession()
            console.log(result)
            const user = {
                fullName: result?.fullName  ,
                email: result.email,
                picture: result?.picture || null,
                loggedThrough: result?.loggedThrough,
                bio: result?.bio,
                phone: result?.phone,
                loggedThrough: result?.loggedThrough
               
            }
            const GeneratedRefreshToken = generateRefreshToken(user)
            const GeneratedAccessToken = generateAccessToken(user)
            
            const isLoggedAlready = await Login.findOne({email: user?.email})
            if(!isLoggedAlready){
                return res.status(400).send({success:false, message:Errors.NOT_FOUND, loggedThrough: isLoggedAlready[0]?.loggedThrough})
            }
            if(isLoggedAlready.loggedThrough !== 'Github') return res.status(400).send({success:false, message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: isLoggedAlready?.loggedThrough})


           return await session.withTransaction(async()=>{

                const GeneratedAccessToken = generateAccessToken(user)
                

                
                if(isLoggedAlready && user.loggedThrough !== 'Github' ){
                    return res.status(400).send({success:false, message: `LOGGED_DIFFERENTLY`, loggedThrough: isLoggedAlready[0]?.loggedThrough})
                }
          
                res.status(201).send({success:true,data:{accessToken: GeneratedAccessToken, loggedThrough:user.loggedThrough, user: user}});
               await session.commitTransaction(); 
                session.endSession()
            })
        
        })
        
    } catch (error) {
        return checkError(error,res)
    }
}



router.route('/create').post(async(req,res) =>{
    const session = await conn.startSession()
    try {
        const {user,accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:user?.email});
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
                throwErr(newChannel)
               return console.log(`err not thrown`)
            }

            let AdminRole = await Role.findOne({name:"Admin"});
            if(!AdminRole) return console.log(`ROLE ISN'T FOUND`)
            newChannel?.members?.push({member:LoggedUser,roles:[AdminRole]})
            LoggedUser?.channels?.push({channel:newChannel, roles:[AdminRole]})
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

            // const leavingChannel = await Channel.findOneAndRemove({"members.member": LoggedUser._id, channelName},{session});
            // console.log(`leavingChannel: `, leavingChannel)
            // const leavingUser = await User.findOneAndRemove({"channels.channel": leavingChannel._id,'channels.channel.name': channelName},{session})
            // console.log(`leaving channel: `, leavingChannel)
            // console.log(`leaving User: `, leavingUser)

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