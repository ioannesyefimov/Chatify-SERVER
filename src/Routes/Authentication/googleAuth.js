import express from 'express'
import * as dotenv from "dotenv"
import  verifyGoogleToken  from './SocialAuth/googleAuth.js'
import { checkError, Errors, throwErr} from '../../utils.js'
import {Channel} from '../../MongoDb/index.js'
import jwt from 'jsonwebtoken'
// import User from '../../MongoDb/models/user.js'
// import Login from '../../MongoDb/models/login.js'

import {User,Login} from '../../MongoDb/index.js'
import { generateAccessToken, generateRefreshToken } from './tokenRoute.js'
import { conn } from '../../MongoDb/connect.js'
import { createChannel } from '../ChannelsRoute/ChannelRoute.js'

dotenv.config()

const router = express.Router()


router.route('/').post(async(req,res)=>{
    
    try {
        const {credential} = req.body
        const session = await conn.startSession(); 
        console.log(`google signin is working`)
        if(!credential){
            throwErr({name:Errors.MISSING_ARGUMENTS, code:400, arguments:`google credentials is missing `})
        } 
        
        const verificationResponse = await verifyGoogleToken(req.body.credential);
        console.log(`verif res` , verificationResponse)
            if(verificationResponse?.err) {
                throwErr(verificationResponse)
            };

            const profile = verificationResponse?.payload;
            console.log(`profile: `, profile);
            console.log(profile?.email)
            await conn.transaction(async(session)=>{
                
                let dbUser = await User.findOne({email:profile?.email}).session(session);
                let dbLogin = await Login.findOne({email:profile?.email}).session(session);
                if(dbLogin && dbUser?.loggedThrough !=='Google'){
                    throwErr({name:Errors.SIGNED_UP_DIFFERENTLY,code:400,arguments:{email:dbLogin?.email, loggedThrough:dbLogin?.loggedThrough}})
                }
                // console.log(existsI nDb)
        
                if(!dbUser && !dbLogin){
                   let user = {

                        userName: `${profile?.given_name} ${profile?.family_name}`,
                        picture: profile?.picture,
                        email: profile?.email,
                        bio: profile?.bio,
                        phone: profile?.phone,
                        loggedThrough: 'Google',
                        channels:[]
                       
                    };
                    let createdUser = await User.create([
                        user
                    ],{session})
                    console.log(`created user`, createdUser);
                    if(!createdUser)throwErr({name:'SOMETHING WENT WRONG'})
                    let welcomeChannel = await Channel.findOne({channelName:'Welcome'});
                    if(welcomeChannel){
                        await User.findOneAndUpdate({email:user.email},{$push:{channels:welcomeChannel}}).then(()=>console.log(`pushed welcome channel`)).catch(err=>console.log(`ERRR`,err))
                    }
                    let accessToken = await generateAccessToken({email:user.email});
    
                    return res.status(201).send({
                        success:true,
                         data:{
                            loggedThrough: 'Google',
                            // user: user,
                            accessToken
                        }
                    });
                }
                let user = {
    
                    userName: dbUser?.userName,
                    picture: dbUser?.picture,
                    email: dbUser?.email,
                    bio: dbUser?.bio,
                    phone: dbUser?.phone,
                    loggedThrough: dbUser?.loggedThrough,
                    channels: dbUser?.channels
                }
                let accessToken = await generateAccessToken({email:user.email});
    
                res.status(201).send({
                    success:true,
                     data:{
                        loggedThrough: 'Google',
                        // user: user,
                        accessToken
                    }
                });
            })
    
        
    } catch (error) {
        return checkError(error,res)
    }
})


router.route('/signin').post(async(req,res)=>{
    
    try {
        console.log(`google signin is working`)
        if(!req.body.credential) return res.status(400).send({success:false,message:Errors.MISSING_ARGUMENTS})
        
            // console.log(req.body.credential)
            const verificationResponse = await verifyGoogleToken(req.body.credential)
            if(verificationResponse.error) {
                return res.status(400).json({message: verificationResponse.error})
            };

            const profile = await verificationResponse?.payload;
            console.log(profile.email)
    
            const dbUser = await User.findOne({email:profile?.email})
            // console.log(existsInDb)
    
            if(!dbUser){
                return res.status(400).json({
                    message: "You are not registered. Please sign up."
                });
            }
            let user = {

                fullName: dbUser?.fullName,
                picture: dbUser?.picture,
                email: dbUser?.email,
                bio: dbUser?.bio,
                phone: dbUser?.phone,
                loggedThrough: 'Google'
               
            }
            console.log(dbUser);
            console.log(req.body.loggedThrough);
            if(dbUser?.loggedThrough !== req.body.loggedThrough){
                return res.status(400).send({success:false, message: Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: dbUser?.loggedThrough})
            }
        

            res.status(201).send({
                success:true,
                 data:{
                    loggedThrough: 'Google',
                    // user: user,
                    accessToken: generateAccessToken(user)
                }
            });
        
    } catch (error) {
        return checkError(error,res)
    }
})

router.route('/register').post(async(req,res)=>{
    
    try {
        if(req.body.credential) {
            const session = await conn.startSession()
            const verificationResponse = await verifyGoogleToken(req.body.credential)
            if(verificationResponse.error) {

                return res.status(400).json({message: verificationResponse.error})
            };
            const profile = verificationResponse?.payload;
            
    
            await session.withTransaction(async()=>{
                let user = {

                    fullName: `${profile?.given_name} ${profile?.family_name}`,
                    picture: profile?.picture,
                    email: profile?.email,
                    bio: profile?.bio,
                    phone: profile?.phone,
                    loggedThrough: 'Google'
                   
                }
                
                const isLoggedAlready = await Login.findOne({email: user?.email});
                 console.log(isLoggedAlready)
                if(isLoggedAlready !==null){
                    return res.status(400).send({
                        success:false, message: Errors.ALREADY_EXISTS,
                        loggedThrough: isLoggedAlready?.loggedThrough
                        })
                }
                const GeneratedRefreshToken = generateRefreshToken(user)
                const GeneratedAccessToken = generateAccessToken(user)

                const loginUser = await Login.create([
                    {
                        email: user?.email,
                        refreshToken: GeneratedRefreshToken,
                        loggedThrough: 'Google'
                    }
                ])
              
                const dbUser = await User.create([
                    {
                        email: user?.email,
                        fullName: user?.fullName,
                        picture: user?.picture,
                        bio: user?.bio,
                        phone: user?.phone,
                        loggedThrough: 'Google'
                    }
                ]);
                console.log(`success`)

                if(loginUser && dbUser){
                    

                    res.status(201).send(
                        {success:true,data:
                            { 
                                accessToken:GeneratedAccessToken, 
                                refreshToken: GeneratedRefreshToken
                            }
                        });
                    await session.commitTransaction(); 
                    session.endSession()
                }
    
       
            })
           
        }
        
    } catch (error) {
        return checkError(error,res)
        console.log(error)
        res.status(500).send({success:false, message:error})  
    }
})
export default router
