import express from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'


// import User from '../../MongoDb/models/user.js'
// import Login from '../../MongoDb/models/login.js'
import { generateAccessToken, generateRefreshToken } from './tokenRoute.js'
import {User,Login} from '../../MongoDb/index.js'

import jwt from 'jsonwebtoken'

import { Errors, throwErr } from '../../utils.js'
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
        if(!email || !password)
        {
            throwErr({name:`INCORRECT_FORM_SUBMISSION` ,code:400})
        } 
        const USER_LOGIN = await Login.findOne({email: email})

        if(!USER_LOGIN)throwErr({name:Errors.NOT_SIGNED_UP,code:404})
        console.log(`LoggedThrough: ${loggedThrough}`);
        if( USER_LOGIN?.loggedThrough !== loggedThrough && !USER_LOGIN?.password ) {
            console.log('1')
            throwErr({name:Errors.SIGNED_UP_DIFFERENTLY,arguments:{loggedThrough: USER_LOGIN?.loggedThrough} })
        }
        
        if(USER_LOGIN && USER_LOGIN?.password) {
            console.log(USER_LOGIN)
            const isValid = bcrypt.compareSync(password, USER_LOGIN.password)
            if(!isValid){
                throwErr({name:Errors.WRONG_PASSWORD, code:400})
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
