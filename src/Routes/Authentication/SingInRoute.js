import express from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'


// import User from '../../MongoDb/models/user.js'
// import Login from '../../MongoDb/models/login.js'
import { generateAccessToken, generateRefreshToken } from './tokenRoute.js'
import {User,Login} from '../../MongoDb/index.js'

import { handleGithubSingin } from './githubAuthRoute.js'
import jwt from 'jsonwebtoken'
import { handleUserData } from './getUserData.js'

import { Errors } from '../../utils.js'
dotenv.config();
 

const router = express.Router()

router.route('/').post(async(req,res)=>{
    try {
        const {email, password, accessToken, loggedThrough} = req.body
        // if(accessToken && loggedThrough == 'Github'){
        //    return handleGithubSingin(accessToken, res)
        // }
        // if(accessToken  ){
        //     return handleUserData(accessToken,loggedThrough, res)
        // } 
        // // }
        if(!email || !password) return res.status(400).send({success:false, message:`INCORRECT_FORM_SUBMISSION`})
        const USER_LOGIN = await Login.findOne({email: email})

        if(!USER_LOGIN)return res.status(404).send({success:false,message:Errors.NOT_FOUND})
        console.log(`LoggedThrough: ${loggedThrough}`);
        if( USER_LOGIN?.loggedThrough !== loggedThrough && !USER_LOGIN?.password ) {
            console.log('1')
            return res.status(400).send({success:false, message: Errors.SIGNED_UP_DIFFERENTLY , loggedThrough: USER_LOGIN?.loggedThrough})
        }
        
        if(USER_LOGIN && USER_LOGIN?.password) {
            console.log(USER_LOGIN)
            const isValid = bcrypt.compareSync(password, USER_LOGIN.password)
            if(!isValid){
                return res.status(400).send({success:false, message:Errors.WRONG_PASSWORD});
            } 
            let USER = await User.findOne({email: email});
            let user = {
                userName: USER.userName,
                 email: USER.email,
                  picture: USER?.picture,
                    bio: USER?.bio,
                  phone: USER?.phone,
                  loggedThrough: USER?.loggedThrough
                }
            const GeneratedToken = generateAccessToken({email:user?.email});
            return res.status(200).send({success:true, data: { accessToken: GeneratedToken, loggedThrough: `Internal`}})
        }
    } catch (error) {
        console.log(`error: `, error)
        return res.status(500).send({success: false, message: error})
    }
})

export default router
