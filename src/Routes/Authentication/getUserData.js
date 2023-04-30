import express from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'


import User from '../../MongoDb/models/user.js'
import Login from '../../MongoDb/models/login.js'


import jwt from 'jsonwebtoken'
import { checkError, checkErrWithoutRes, Errors, populateCollection, throwErr, verifyAccessToken } from '../../utils.js'
import { generateAccessToken } from './tokenRoute.js'

dotenv.config();
 

const router = express.Router()

export const handleUserData = async(req) => {
    try {
        let {accessToken,loggedThrough} = req.query
        if(!accessToken ) throwErr({name:MISSING_ARGUMENTS,arguments:'access token'})
        
        const  isValidToken = await verifyAccessToken(accessToken);
        
        if(!isValidToken?.success || !isValidToken.result.email) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})
        
        console.log(`isvalid: `,isValidToken)
        const USER = await User.findOne({email: isValidToken?.result.email})
        if(USER.loggedThrough !== loggedThrough)throwErr({success:false,message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: USER.loggedThrough})
        
        let populatedUser = await populateCollection(USER,'User')
    
        console.log(`POPULATED`, populatedUser);
        if(!USER)throwErr({success:false,message:`NOT_FOUND`})
        let channels = populatedUser.channels.map(channel=>{
           return channel.channel
        })
        const user = {
            userName: populatedUser?.userName  ,
            email: populatedUser.email,
            picture: populatedUser?.picture ?? null,
            bio: populatedUser?.bio ?? null,
            phone: populatedUser?.phone ?? null,
            loggedThrough: populatedUser?.loggedThrough,
            _id:populatedUser._id,
            channels
            }
            console.log(populatedUser)

            const GeneratedAccessToken = generateAccessToken({email: user?.email}) 
            return {
                success:true,
                data: {user, loggedThrough: populatedUser?.loggedThrough, accessToken: GeneratedAccessToken}
            }
            
    }catch(err){
        console.log(err);
        return checkErrWithoutRes(err)
    }
    }


router.route('/').get(async(req,res)=>{
    let  response = await handleUserData(req);
    if(response.success){
        res.status(200).send(response)
    } else {
        res.status(500).send(response)
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


router.route('/users').get(async(req,res)=>{
    try {
        const {userName,email,id,} =req.query  
        let USER = await User.find({}) 
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
        // delete populatedUser.channels
        return res.status(200).send({
            success:true,
            data: {users:[populatedUser] }
        })
    } catch (error) {
         checkError(error,res)
    }
})

export default router
