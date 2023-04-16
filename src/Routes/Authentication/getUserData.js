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
                        channels: populatedUser.channels ?? [],
                        _id:populatedUser._id
                    }
                    console.log(populatedUser)
    
                    const GeneratedAccessToken = generateAccessToken({email: user?.email}) 
                    return res.status(200).send({
                        success:true,
                        data: {populatedUser, loggedThrough: populatedUser?.loggedThrough, accessToken: GeneratedAccessToken}
                    })
                }
        }
    }catch(err){
        console.log(err);
        checkError(err,res)
    }
    }


// router.route('/').post(async(req,res)=>{
//     try {
//         let {accessToken} = req.body
//         if(accessToken){
//             console.log(`isvalid: `,isValidToken)
//             const  isValidToken = await verifyAccessToken(accessToken);

//             if(!isValidToken?.success) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

//                 if(isValidToken?.result?.email){
//                     const USER = await User.findOne({email: isValidToken?.result.email})
//                     if(USER.loggedThrough !== loggedThrough) return res.status(404).send({success:false,message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: USER.loggedThrough})
//                     let populatedUser = await populateCollection(USER,'User')
    
//                     if(!USER)return res.status(404).send({success:false,message:`NOT_FOUND`})
//                     const user = {
//                         userName: populatedUser?.userName  ,
//                         email: populatedUser.email,
//                         picture: populatedUser?.picture || null,
//                         bio: populatedUser?.bio || null,
//                         phone: populatedUser?.phone || null,
//                         loggedThrough: populatedUser?.loggedThrough,
//                         channels: populatedUser.channels ?? [],
//                         _id:populatedUser._id
//                     }
//                     console.log(populatedUser)
    
//                     const GeneratedAccessToken = generateAccessToken({email: user?.email}) 
//                     return res.status(200).send({
//                         success:true,
//                         data: {populatedUser, loggedThrough: populatedUser?.loggedThrough, accessToken: GeneratedAccessToken}
//                     })
//                 }
//         }
//     }catch(err){
//         console.log(err);
//         checkError(err,res)
//     }
// })


router.route('/').get(async(req,res)=>{
    try {
        const {accessToken,loggedThrough} = req.query
        const  isValidToken = await verifyAccessToken(accessToken);
        console.log(`isvalid: `,isValidToken)

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
                        channels: populatedUser.channels ?? [],
                        _id:populatedUser._id
                    }
                    console.log(populatedUser)
    
                    const GeneratedAccessToken = generateAccessToken({email: user?.email}) 
                    return res.status(200).send({
                        success:true,
                        data: {user:populatedUser, loggedThrough: populatedUser?.loggedThrough, accessToken: GeneratedAccessToken}
                    })
                }
    }catch(err){
        console.log(err);
        checkError(err,res)
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
