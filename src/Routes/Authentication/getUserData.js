import express from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'


import User from '../../MongoDb/models/user.js'
import Login from '../../MongoDb/models/login.js'


import jwt from 'jsonwebtoken'
import { checkError, Errors, verifyAccessToken } from '../../utils.js'
import { generateAccessToken } from './tokenRoute.js'

dotenv.config();
 

const router = express.Router()

export const handleUserData = async(accessToken,loggedThrough,res) => {
    try {
        if(accessToken){
            console.log(`isvalid: `,isValidToken)
            const  isValidToken = await verifyAccessToken(accessToken);

            if(!isValidToken?.success) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})
                console.log(isValidToken)

                if(isValidToken?.result?.email){
                    const USER = await User.findOne({email: isValidToken?.result.email})
                    if(USER.loggedThrough !== loggedThrough) return res.status(404).send({success:false,message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: USER.loggedThrough})
    
                    if(!USER)return res.status(404).send({success:false,message:`NOT_FOUND`})
                    const user = {
                        userName: USER?.userName  ,
                        email: USER.email,
                        picture: USER?.picture || null,
                        bio: USER?.bio || null,
                        phone: USER?.phone || null,
                        loggedThrough: USER?.loggedThrough
                    }
                    console.log(user)
    
                    const GeneratedAccessToken = generateAccessToken({email: user?.email}) 
                    return res.status(200).send({
                        success:true,
                        data: {user, loggedThrough: USER?.loggedThrough, accessToken: GeneratedAccessToken}
                    })
                }
        }
    }catch(err){
        console.log(err);
        return checkError(error,res)
        return res.status(500).send({success:false, message:err})
    }
    }


router.route('/').post(async(req,res)=>{
    try {
    const {accessToken} =req.body        
        if(accessToken){
            const isValidToken = await verifyAccessToken(accessToken);
            if(!isValidToken?.success) return res.status(400).send({success:false,message:isValidToken?.err})
            console.log(accessToken)
            console.log(isValidToken)
            
            const USER = await User.findOne({email: isValidToken?.result.email});
            if(!USER )return res.status(404).send({success:false,message:`NOT_FOUND`})
            // if(USER.loggedThrough !== loggedThrough) return res.status(404).send({success:false,message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: USER.loggedThrough})

            const user = {
                userName: USER?.userName  ,
                email: USER.email,
                picture: USER?.picture || null,
                bio: USER?.bio || null,
                phone: USER?.phone || null,
                loggedThrough: USER?.loggedThrough
            }
            
            console.log(user)
            return res.status(200).send({
                success:true,
                data: {user, loggedThrough: isValidToken?.loggedThrough}
            })
        }
    } catch (error) {
        console.log(`error: `, error)
        return checkError(error,res)
        return res.status(500).send({success: false, message: error})
    }
})

export default router
