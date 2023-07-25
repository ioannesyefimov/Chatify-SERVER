import express from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'

import {checkError, validatePassword, Errors, validateIsEmpty, throwErr, checkErrWithoutRes } from '../../utils.js'
import {conn,User,Login, Channel, Role} from '../../MongoDb/index.js'
import { generateAccessToken, generateRefreshToken } from './tokenRoute.js'

dotenv.config();
const router = express.Router()

export const  serverValidatePw = ( userName,email,password,res) =>{
    return new Promise((resolve,reject)=>{
        console.log(`server pw validation started`);
        let isValid = validatePassword(password,userName);
        if(isValid === `valid`){
            console.log(`valid server checkr`);
            return resolve({success:true,message:`valid`})
        }else 
           
         if(validatePassword(password,userName) == Errors.INVALID_PASSWORD){
             console.log(Errors.INVALID_PASSWORD)
            return   reject({success:false,message:Errors.INVALID_PASSWORD})
    
        } 
        else if(isValid == Errors.PASSWORD_CONTAINS_NAME){
            console.log(Errors.PASSWORD_CONTAINS_NAME)
            return   reject({success:false, message:Errors.PASSWORD_CONTAINS_NAME})
    
        }
        if(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email) === false) {
            console.log()
            return   reject({success:false,message:Errors.INVALID_EMAIL})
        }    
    })
}

router.route('/').post(async(req,res)=>{
    try {
        const session = await conn.startSession()

        const {userName, email, password, picture, loggedThrough} = req.body
        let isEmpty = await validateIsEmpty({userName,email,password});
        if(!isEmpty?.success){
            throwErr({name:Errors.MISSING_ARGUMENTS,code:400})
        }
        const isLoggedAlready = await Login.findOne({email: email});
        console.log(`ISLOGGGED`, isLoggedAlready);
        if(isLoggedAlready){
            return isLoggedAlready?.loggedThrough !== 'INTERNAL' ? 
             throwErr({
                success:false, err: Errors.SIGNED_UP_DIFFERENTLY, 
                arguments: {loggedThrough: isLoggedAlready?.loggedThrough}
            }) :
            throwErr({
                success:false, err: Errors.ALREADY_EXISTS,
                arguments: {loggedThrough: isLoggedAlready?.loggedThrough}
            })
        }
        console.log('working')
       return await conn.transaction(async()=>{
            // let user = {
            //     email: email,
            //     userName: userName,
            //     picture: picture || null,
            //     loggedThrough:loggedThrough,
            //     bio: null,
            //     phone: null,
            // }
            const refreshToken =await generateRefreshToken({email});
            const accessToken =await generateAccessToken({email});

            const LOGIN = await Login.create([{
                email: email,
                password,
                userName: userName,
                loggedThrough: loggedThrough,
                refreshToken: refreshToken

            }], {session})
            const USER = await User.create([
                {
                    email: email,
                    userName: userName,
                    picture: picture ?? null,
                    loggedThrough: loggedThrough,
                    bio: null,
                    phone: null,
                    channels:[],
                    
                }
            ], {session});
            let memberRole = await Role.findOne({name:"Member"});

            let welcomeChannel = await Channel.findOne({channelName:'Welcome'})
            
            if(welcomeChannel){
                welcomeChannel?.members?.push({member:USER[0],roles:[memberRole]})
                await welcomeChannel?.save({session})
                USER[0]?.channels?.push({channel:welcomeChannel})
                await USER[0]?.save({session})
            }
            
            
            
            res.status(201).send({success:true,data:{accessToken, refreshToken, loggedThrough: loggedThrough}});
        })
    
    } catch (error) {
        let err = await checkErrWithoutRes(error,res);
        res.status(500).send(err)
    }
})

export default router
