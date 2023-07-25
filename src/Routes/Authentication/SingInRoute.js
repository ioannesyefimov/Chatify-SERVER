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
        console.log(`body`,req.body);
        const {email, password, accessToken, loggedThrough} = req.body
     
        // // }s
        if(!email || !password)
        {
            throwErr({name:`INCORRECT_FORM_SUBMISSION` ,code:400})
        } 
        const USER = await User.findOne({email: email})
        if(!USER){
            throwErr({name:Errors.NOT_SIGNED_UP,code:404})
        }
        let USER_LOGIN = await Login.findOne({email:email});
        if( USER_LOGIN?.loggedThrough !== `INTERNAL` && !USER_LOGIN?.password ) {
            console.log('1')
            throwErr({name:Errors.SIGNED_UP_DIFFERENTLY,arguments:{loggedThrough: USER?.loggedThrough} })
        }


        
        if(USER_LOGIN && USER_LOGIN?.password) {
            console.log(USER)
            const isValid = bcrypt.compareSync(password, USER_LOGIN.password)
            if(!isValid){
                throwErr({name:Errors.WRONG_PASSWORD, code:400})
            } 
            
           
            const GeneratedToken = await generateAccessToken({email:USER?.email});
            console.log(`TOKEN:`, GeneratedToken);
            return res.status(200).send({success:true, data: { accessToken: GeneratedToken, loggedThrough: USER?.loggedThrough}})
        }
    } catch (error) {
        console.log(`error: `, error)
        return res.status(500).send({success: false, message: error})
    }
})

export default router
