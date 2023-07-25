import express from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'
import * as queryString from 'query-string';
import jwt from 'jsonwebtoken'
import { validatePassword, Errors, checkError } from '../../utils.js'
import {User,Login,conn, Channel} from '../../MongoDb/index.js'
import { generateAccessToken, generateRefreshToken } from './tokenRoute.js'
import { handleUploadPicture } from '../uploadRoute/uploadRoute.js';

dotenv.config();
 
const router = express.Router()
router.route('/').post(async(req,res)=>{
    try {
        const session = await conn.startSession()
        const {credentials} = req.body
        if(!credentials) return res.status(400).send({success:false,message:Errors.MISSING_ARGUMENTS,arguments:'credentials'})

        return await conn.transaction(async()=>{

            const isLoggedAlready = await User.findOne({email: credentials?.email}).session(session)
            if(isLoggedAlready?.loggedThrough?.toLowerCase() !== 'facebook') throwErr({success:false,err:Errors.SIGNED_UP_DIFFERENTLY}) 
            // if(isLoggedAlready) 
            let user
            if(isLoggedAlready){
                if(!isLoggedAlready?.picture){
                    if(credentials?.picture?.data){
                        console.log(`picture:`, credentials?.picture?.data?.url);
                        let updateProfilePicture = await User.updateOne({email: credentials?.email}, {picture: credentials.picture.data.url} ,{upsert:true},{session});
                        if(updateProfilePicture?.upsertedCount === 0) console.log(`picture is the same`)
                        
                    }
                }
                user = {
                    email: isLoggedAlready?.email,
                    userName: isLoggedAlready?.userName,
                    picture:isLoggedAlready?.picture ?? credentials?.picture?.data?.url,
                    loggedThrough:isLoggedAlready?.loggedThrough,
                    bio: isLoggedAlready?.bio,
                    phone: isLoggedAlready?.phone,
                    channels: isLoggedAlready?.channels ?? []
                }
                console.log(`USER IS LOGGED THROUGH: ${user?.loggedThrough}; email: ${user?.email}`)
            } else {
                 user = {
                    email: credentials?.email,
                    userName: credentials?.name,
                    picture: credentials?.picture?.data?.url ?? credentials?.picture,
                    loggedThrough:'Facebook',
                    bio: credentials?.bio ?? '',
                    channels:  []
                };
                let newUser = await User.create([user],{session})
                let welcomeChannel = await Channel.findOne({channelName:'Welcome'});
                if(welcomeChannel){
    
                    newUser.channels.push(welcomeChannel)
                   await newUser.save({session})
                }
            }
            const accessToken =await  generateAccessToken({email:user?.email});
            res.status(201).send({success:true,data:{accessToken, loggedThrough: user?.loggedThrough}});
            
        })
    } catch (error) {
        return checkError(error,res)
    }
})

export default router
