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
            if(!isValidToken?.success || !isValidToken.result.email) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

            const USER = await User.findOne({email: isValidToken?.result.email})
            if(USER.loggedThrough !== loggedThrough){
                return res.status(404).send({success:false,message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: USER.loggedThrough})
            }
            let populatedUser = await populateCollection(USER,'User')

            if(!USER)return res.status(404).send({success:false,message:`NOT_FOUND`})
            const user = {
                userName: populatedUser?.userName  ,
                email: populatedUser.email,
                picture: populatedUser?.picture || null,
                bio: populatedUser?.bio || null,
                phone: populatedUser?.phone || null,
                loggedThrough: populatedUser?.loggedThrough,
                _id:populatedUser._id
            }
            console.log(populatedUser)

            const GeneratedAccessToken = generateAccessToken({email: user?.email}) 
            return res.status(200).send({
                success:true,
                data: {user:user, loggedThrough: populatedUser?.loggedThrough, accessToken: GeneratedAccessToken}
            })
        }
    }catch(err){
        console.log(err);
        checkError(err,res)
    }
    }


router.route('/').get(async(req,res)=>{
    try {
        const {accessToken,loggedThrough} = req.query
        const  isValidToken = await verifyAccessToken(accessToken);
        console.log(`isvalid: `,isValidToken)

            if(!isValidToken?.success) {
                throwErr({name: isValidToken.err?.message ?? isValidToken?.err})
            }
            const USER = await User.findOne({email: isValidToken?.result.email})
            if(!USER)return res.status(404).send({success:false,message:`NOT_FOUND`})
            if(USER.loggedThrough !== loggedThrough) return res.status(404).send({success:false,message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: USER.loggedThrough})
            let populatedUser = await populateCollection(USER,'User')

            const user = {
                userName: populatedUser?.userName  ,
                email: populatedUser.email,
                picture: populatedUser?.picture ?? null,
                bio: populatedUser?.bio ?? null,
                phone: populatedUser?.phone ?? null,
                loggedThrough: populatedUser?.loggedThrough,
                _id:populatedUser._id
            }
            console.log(populatedUser)

            const GeneratedAccessToken = await generateAccessToken({email: user?.email}) 
            return res.status(200).send({
                success:true,
                data: {user:user, loggedThrough: populatedUser?.loggedThrough, accessToken: GeneratedAccessToken}
            })
    }catch(err){
        console.log(err);
        checkError(err,res)
    }
})
export const getUsers = async(req,res)=>{
    try {
        const {userName,email,id,searchType} =req.query  
        let USER 

            if(userName !=='null'){
                console.log(`QUERY:`, req.query);
                USER = await User.find({userName})
            }
            else if(email !=='null') {
                console.log(`QUERY:`, req.query);
                USER = await User.find({email})
            }
            else if(id !=='null') {
                console.log(`QUERY:`, req.query);
                USER = await User.find({_id:id})
            } else if(searchType==='USER') {
                return res.status(400).send({success:false,message:Errors.MISSING_ARGUMENTS})
            }  else {
                USER = await User.find({})

            }
            console.log(`USER:`, USER);
        if(!USER.length ){
            throwErr({name:Errors.NOT_SIGNED_UP,code:400 })
        }

        let populatedUser = await populateCollection(USER[0],'User');
        delete populatedUser.loggedThrough
        delete populatedUser.phone
        return res.status(200).send({
            success:true,
            data: {users:[populatedUser] }
        })
    } catch (error) {
         checkError(error,res)
    }
}


router.route('/get/users').get(async(req,res)=>{
    try {
        const {userName,email,id,} =req.query  
        let USER 
            if(userName !=='null' | 'undefined'){
                console.log(`QUERY:`, req.query);
                USER = await User.find({userName:userName.trim()})
            }
            else if(email !=='null' | 'undefined') {
                console.log(`QUERY:`, req.query);
                USER = await User.find({email})
            }
            else if(id !=='null' | 'undefined') {
                console.log(`QUERY:`, req.query);
                USER = await User.find({_id:id})
            } else {
                // return res.status(400).send({success:false,message:Errors.MISSING_ARGUMENTS})
                USER = await User.find({})
            }
            console.log(`USER:`, USER);
        if(!USER.length ){
            throwErr({name:Errors.NOT_SIGNED_UP,code:400 })
        }

        if(USER.length > 1){
            let users = []
            for(let user of USER) {
                users.push(await populateCollection(user,'User'))
            }
            return res.status(200).send({success:true,data:{users: users?? USER}})
        }
        let populatedUser = await populateCollection(USER[0],'User');
        delete populatedUser.channels
        return res.status(200).send({
            success:true,
            data: {users:[populatedUser] }
        })
    } catch (error) {
         checkError(error,res)
    }
})

export default router
