import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login} from '../../MongoDb/index.js'
import { verifyAccessToken } from '../../utils.js';
import jwt from 'jsonwebtoken'
import { Errors, checkError } from "../../utils.js"

dotenv.config()
const router = express.Router()


export const handleGithubSingin = async(accessToken ,res)=>{
    try {
        
       return  await jwt.verify(accessToken, process.env.JWT_TOKEN_SECRET, async (err,result) => {
            if(err) {
                console.log(err)
                return res.status(404).send({success:false, message:err})
            }
            const session = await conn.startSession()
            console.log(result)
            const user = {
                fullName: result?.fullName  ,
                email: result.email,
                picture: result?.picture || null,
                loggedThrough: result?.loggedThrough,
                bio: result?.bio,
                phone: result?.phone,
                loggedThrough: result?.loggedThrough
               
            }
            const GeneratedRefreshToken = generateRefreshToken(user)
            const GeneratedAccessToken = generateAccessToken(user)
            
            const isLoggedAlready = await Login.findOne({email: user?.email})
            if(!isLoggedAlready){
                return res.status(400).send({success:false, message:Errors.NOT_FOUND, loggedThrough: isLoggedAlready[0]?.loggedThrough})
            }
            if(isLoggedAlready.loggedThrough !== 'Github') return res.status(400).send({success:false, message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: isLoggedAlready?.loggedThrough})


           return await session.withTransaction(async()=>{

                const GeneratedAccessToken = generateAccessToken(user)
                

                
                if(isLoggedAlready && user.loggedThrough !== 'Github' ){
                    return res.status(400).send({success:false, message: `LOGGED_DIFFERENTLY`, loggedThrough: isLoggedAlready[0]?.loggedThrough})
                }
          
                res.status(201).send({success:true,data:{accessToken: GeneratedAccessToken, loggedThrough:user.loggedThrough, user: user}});
               await session.commitTransaction(); 
                session.endSession()
            })
        
        })
        
    } catch (error) {
        return checkError(error,res)
    }
}

router.route('/').get(async(req,res) =>{
    try {
        const {user,accessToken,name,} = req.body  // Bearer ACCESSTOKEN
        
        // const  isValidToken = await verifyAccessToken(accessToken) 
        const session = conn.startSession()
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:user?.email});
        if(!LoggedUser ) return res.status(404).send({success:false,message:Errors.NOT_FOUND})

        return await (await session).withTransaction(async()=>{
            let Channel = await Channel

            LoggedUser.populate('channels').exec((err,channles)=>{
                console.log('POPULATED User ' + channles)
            })
        })

    } catch (error) {
        return checkError(error,res)
    }
})

router.route('/create').post(async(req,res) =>{
    try {
        const {user,accessToken,name,} = req.body  // Bearer ACCESSTOKEN
        
        // const  isValidToken = await verifyAccessToken(accessToken) 
        const session = conn.startSession()
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:user?.email});
        if(!LoggedUser ) return res.status(404).send({success:false,message:Errors.NOT_FOUND})

        return await (await session).withTransaction(async()=>{
            let Channel = await Channel

            LoggedUser.populate('channels').exec((err,channles)=>{
                console.log('POPULATED User ' + channles)
            })
        })

    } catch (error) {
        return checkError(error,res)
        if(error.name === 'ValidationError'){
            return checkError(error,res)
        }
        console.log(error)
        res.status(500).send({success:false, message:error})       
    }
}




)

export default router