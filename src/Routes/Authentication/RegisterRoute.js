import express from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'

import {checkError, validatePassword, Errors, validateIsEmpty, throwErr } from '../../utils.js'
import {conn,User,Login} from '../../MongoDb/index.js'
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
    const session = await conn.startSession()
    try {

        const {userName, email, password, picture, loggedThrough} = req.body
        let isEmpty = await validateIsEmpty({userName,email,password});
        if(!isEmpty?.success){
            throwErr({name:Errors.MISSING_ARGUMENTS,code:400})
        }
        const isLoggedAlready = await Login.findOne({email: email});
        if(isLoggedAlready !== null){
            return isLoggedAlready?.loggedThrough !== 'Internal' ? 
             res.status(400).send({
                success:false, message: Errors.SIGNED_UP_DIFFERENTLY, 
                loggedThrough: isLoggedAlready?.loggedThrough
            }) :
            res.status(400).send({
                success:false, message: Errors.ALREADY_EXISTS,
                loggedThrough: isLoggedAlready?.loggedThrough
            })
        }
        console.log('working')
       return await session.withTransaction(async()=>{
            let user = {
                email: email,
                userName: userName,
                picture: picture || null,
                loggedThrough:loggedThrough,
                bio: null,
                phone: null,
            }
            const refreshToken = generateRefreshToken({email});
            const accessToken = generateAccessToken({email});

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
                    picture: picture || null,
                    loggedThrough: loggedThrough,
                    bio: null,
                    phone: null,
                    
                }
            ], {session});
            
            
            console.log(`success`)
       

    
            await session.commitTransaction(); 
            session.endSession()
            res.status(201).send({success:true,data:{accessToken, refreshToken, loggedThrough: loggedThrough}});
        })
    
    } catch (error) {

        console.log(`trigger err`)
        console.log(error)
         checkError(error,res)
    }
})

export default router
