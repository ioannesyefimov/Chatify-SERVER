import express from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'


import User from '../../MongoDb/models/user.js'
import Login from '../../MongoDb/models/login.js'


import jwt from 'jsonwebtoken'
import { checkError, Errors, populateCollection, throwErr, verifyAccessToken } from '../../utils.js'
import { generateAccessToken } from './tokenRoute.js'

dotenv.config();
 

const router = express.Router()

export const handleUserData = async(accessToken,loggedThrough,res) => {
    try {
        if(accessToken){
            console.log(`isvalid: `,isValidToken)
            const  isValidToken = await verifyAccessToken(accessToken);

            if(!isValidToken?.success) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

                if(isValidToken?.result?.email){
                    const USER = await User.findOne({email: isValidToken?.result.email})
                    if(USER.loggedThrough !== loggedThrough) return res.status(404).send({success:false,message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: USER.loggedThrough})
                    let populatedUser = await populateCollection(USER,'User')
    
                    if(!USER)return res.status(404).send({success:false,message:`NOT_FOUND`})
                    const user = {
                        userName: populatedUser?.userName  ,
                        email: populatedUser.email,
                        picture: populatedUser?.picture || null,
                        bio: populatedUser?.bio || null,
                        phone: populatedUser?.phone || null,
                        loggedThrough: populatedUser?.loggedThrough,
                        channels: populatedUser.channels ?? []
                    }
                    console.log(populatedUser)
    
                    const GeneratedAccessToken = generateAccessToken({email: user?.email}) 
                    return res.status(200).send({
                        success:true,
                        data: {user, loggedThrough: populatedUser?.loggedThrough, accessToken: GeneratedAccessToken}
                    })
                }
        }
    }catch(err){
        console.log(err);
        checkError(err,res)
    }
    }


router.route('/').post(async(req,res)=>{
    try {
    const {accessToken} =req.body        
        if(accessToken){
            const isValidToken = await verifyAccessToken(accessToken);
            if(!isValidToken?.success) return res.status(400).send({success:false,message:isValidToken?.err})
            console.log(accessToken)
            console.log(`email: `, isValidToken?.result)
            
            const USER = await User.findOne({email: isValidToken?.result.email});
            if(!USER )return res.status(404).send({success:false,message:`NOT_FOUND`})
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
         checkError(error,res)
    }
})


router.route('/').get(async(req,res)=>{
    try {
    const {accessToken} =req.query       
        if(accessToken){
            const isValidToken = await verifyAccessToken(accessToken);
            if(!isValidToken?.success) return res.status(400).send({success:false,message:isValidToken?.err})
            console.log(accessToken)
            console.log(isValidToken)
            
            const USER = await User.findOne({email: isValidToken?.result.email});

            if(!USER ) {
             throwErr({name:Errors.NOT_FOUND,code:404,arguments:{email:isValidToken?.result?.email}})
            }
            const user = {
                userName: USER?.userName  ,
                email: USER.email,
                picture: USER?.picture ?? null,
                bio: USER?.bio ?? null,
                phone: USER?.phone ?? null,
                channels: USER?.channels ?? [],
                loggedThrough: USER?.loggedThrough
            }
            
            console.log(user)
            return res.status(200).send({
                success:true,
                data: {user, loggedThrough: user?.loggedThrough}
            })
        }
    } catch (error) {
        console.log(`error: `, error)
         checkError(error,res)
    }
})

export const getUser = async(req,res)=>{
    try {
        const {userEmail} =req.params        
        const USER = await User.findOne({email:userEmail});
        if(!USER ){
            throwErr({name:Errors.NOT_SIGNED_UP,code:400 })
        }

        const user = {
            userName: USER?.userName  ,
            email: USER.email,
            picture: USER?.picture || null,
            bio: USER?.bio || null,
            phone: USER?.phone || null,
            channels: USER?.channels
        }
        let populatedUser = await populateCollection(USER,'User');
        delete populatedUser.loggedThrough
        delete populatedUser.phone
        console.log(user)
        return res.status(200).send({
            success:true,
            data: {user:populatedUser }
        })
    } catch (error) {
         checkError(error,res)
    }
}


export default router
