import express from 'express'
import * as dotenv from "dotenv"

// import Login from '../../MongoDb/models/login.js'
import {Login} from '../../MongoDb/index.js'

export const generateAccessToken = (user) => {
    const accessToken = jwt.sign(user, process.env.JWT_TOKEN_SECRET, {
        expiresIn: '30m'
    })
    return accessToken
} 

export const generateRefreshToken = (user) =>{
    const refreshToken = jwt.sign(user, process.env.JWT_REFRESH_TOKEN_SECRET)
    return refreshToken
}

import jwt from 'jsonwebtoken'

const  router = express.Router()

router.route('/').post(async(req,res)=>{
    const refreshToken = req.body.refreshToken 
    console.log(refreshToken)
    if(refreshToken == null) return res.sendStatus(401)

     const isValidToken = await Login.find({refreshToken: refreshToken});
     console.log(isValidToken)
    if(isValidToken.length < 1) {
        // console.log(isValidToken)
        return res.status(404).send({success:false, message: Errors.NOT_FOUND})
    }
        console.log(isValidToken)
         jwt.verify(isValidToken[0].refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET, (error, user) => {
            if(error){
                return res.status(403).send({success:false, message:err})
            } 
            let loggedUser = {fullName: user.fullName, email: user.email}
            console.log(loggedUser)
            const accessToken = generateAccessToken(loggedUser)
            res.status(200).send({success:true, data: accessToken})
        })
})

dotenv.config();
 
export default router