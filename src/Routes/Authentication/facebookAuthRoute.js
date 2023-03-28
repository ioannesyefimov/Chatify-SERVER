import express from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'
import * as queryString from 'query-string';

import jwt from 'jsonwebtoken'
// import { conn } from '../../MongoDb/connect.js'
import { validatePassword, Errors, checkError } from '../../utils.js'
import {User,Login,conn} from '../../MongoDb/index.js'
// import User from '../../MongoDb/models/user.js'
// import Login from '../../MongoDb/models/login.js'
import { generateAccessToken, generateRefreshToken } from './tokenRoute.js'
import { handleUploadPicture } from '../uploadRoute/uploadRoute.js';

dotenv.config();
 

const router = express.Router()

export const handleFacebookSignin = async()=>{

}

router.route('/register').post(async(req,res)=>{
    try {
        const session = await conn.startSession()

        const {credentials} = req.body
        if(!credentials) return res.status(400).send({success:false,message:Errors.MISSING_ARGUMENTS})


        const isLoggedAlready = await Login.findOne({email: credentials?.email})
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

       return await session.withTransaction(async()=>{
            if(credentials?.picture?.data){
                console.log(`picture:`, credentials?.picture?.data?.url);
                let uploadPicture = await handleUploadPicture(credentials?.picture?.data?.url)
                if(!uploadPicture?.success) return console.log(`uploading error: `,uploadPicture?.message)
                credentials.picture.data.url = uploadPicture?.url;
            }
            let user = {
                email: credentials?.email,
                fullName: credentials?.name,
                picture: credentials?.picture?.data?.url,
                loggedThrough:'Facebook',
                bio: null,
                phone: null,
            }
            const refreshToken = generateRefreshToken(user);
            const accessToken = generateAccessToken(user);

            const loginUser = await Login.create([{
                email: user.email,
                loggedThrough: user.loggedThrough,
                refreshToken: refreshToken,
                userName: userName,


            }], {session})
            const USER = await User.create([
                user
            ], {session});
            
            
            console.log(`success`)
       

    
            res.status(201).send({success:true,data:{accessToken, refreshToken, loggedThrough: user?.loggedThrough}});
           await session.commitTransaction(); 
            session.endSession()
        })
    
    } catch (error) {
        return checkError(error,res)
    }
})


router.route('/signin').post(async(req,res)=>{
    try {

        const {credentials} = req.body
        if(!credentials) return res.status(400).send({success:false,message:Errors.MISSING_ARGUMENTS})


        const isLoggedAlready = await User.findOne({email: credentials?.email})
        if(isLoggedAlready === null) return res.status(404).send({
                success:false, message: Errors.NOT_FOUND 
         }) 
        

        if(credentials?.picture?.data){
            console.log(`picture:`, credentials?.picture?.data?.url);
            let updateProfilePicture = await User.updateOne({email: credentials?.email}, {picture: credentials.picture.data.url} ,{upsert:true});
            if(updateProfilePicture?.upsertedCount === 0) console.log(`picture is the same`)
            
        }
        let user = {
            email: isLoggedAlready?.email,
            fullName: isLoggedAlready?.fullName,
            picture: credentials?.picture?.data?.url || isLoggedAlready?.picture,
            loggedThrough:isLoggedAlready?.loggedThrough,
            bio: isLoggedAlready?.bio,
            phone: isLoggedAlready?.bio,
        }
        const accessToken = generateAccessToken(user);

        
        
        console.log(`USER IS LOGGED THROUGH: ${user?.loggedThrough}; email: ${user?.email}`)
    


        res.status(201).send({success:true,data:{accessToken, loggedThrough: user?.loggedThrough}});
    
    } catch (error) {
        return checkError(error,res)
    }
})

export default router
