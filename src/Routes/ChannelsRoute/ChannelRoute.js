import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login,Channel} from '../../MongoDb/index.js'
import { verifyAccessToken } from '../../utils.js';
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
    try {
        const {user,accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        const session = await conn.startSession()
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:user?.email});
        if(!LoggedUser ) return res.status(404).send({success:false,message:Errors.NOT_SIGNED_UP})

        return await session.withTransaction(async()=>{
            const newChannel = new Channel({
                channelName
            },{session});

            LoggedUser.channels.push(newChannel)
            LoggedUser.save()

            newChannel.members.push(LoggedUser)
            newChannel.save()

            // let newChannel = await Channel.create([{channelName,}],{session});
       


            LoggedUser.populate('channels')
            .then(channels=>{
                console.log('POPULATED User ' + channels)
            })
            .catch(err=>{return console.log(err)})

            newChannel.populate('members')
            .then(members=>{
                console.log(`memmbers POPULATED: `, members)
            })
            .catch(err=>{return console.log(err)})
        })

    } catch (error) {
         checkError(error,res)
    }
})

router.route('/join').post(async(req,res)=>{
    try {
        const {user,accessToken,channelName} = req.body  // Bearer ACCESSTOKEN
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:user?.email});
        if(!LoggedUser ) return res.status(404).send({success:false,message:Errors.NOT_SIGNED_UP})

            const newChannel = await Channel.findOne({channelName});

            LoggedUser.channels.push(newChannel)
            LoggedUser.save()

            newChannel.members.push(LoggedUser)
            newChannel.save()

            // let newChannel = await Channel.create([{channelName,}],{session});
       


            LoggedUser.populate('channels')
            .then(channels=>{
                console.log('POPULATED User ' + channels)
            })
            .catch(err=>{return console.log(err)})

            newChannel.populate('members')
            .then(members=>{
                console.log(`memmbers POPULATED: `, members)
            })
            .catch(err=>{return console.log(err)})

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

        let channels = await Channel.find({members:LoggedUser._id});
        if(channels.length > 1){
            channels.forEach(channel=>{
                return channel.populate('users').then(user=>console.log(`channel user:`, user))
            })
            
        }
        console.log(`channels:`, channels)
            let populatedUser = await LoggedUser.populate('channels');
        let populatedChannels = await channels[0].populate('members');

            // if(!populatedUser) throw new Error(populated?.err)
        console.log(`populated channels`, populatedChannels)
        console.log('POPULATED User ' + populatedUser)

    } catch (error) {
         checkError(error,res)
    }
}




)

export default router