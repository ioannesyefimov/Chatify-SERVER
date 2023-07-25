import express from 'express'
import * as dotenv from "dotenv"
import jwt from 'jsonwebtoken'
import { verifyAccessToken } from '../../utils.js'
import {Login} from '../../MongoDb/index.js'

export const generateAccessToken = (data) => {
    return new Promise((resolve, reject) => {
        console.log(`data: `, data)
        const accessToken =  jwt.sign(data, process.env.JWT_TOKEN_SECRET, {
            expiresIn: '30m'
        });
        if(!accessToken) return reject('SOMETHING WENT WRONG')
        return  resolve(accessToken)
        
    })
} 

export const generateRefreshToken = (data) =>{
    const refreshToken = jwt.sign(data, process.env.JWT_REFRESH_TOKEN_SECRET)
    return refreshToken
}


const  router = express.Router()

router.route('/').post(async(req,res)=>{
    const refreshToken = req.body.refreshToken 
    console.log(refreshToken)
    if(refreshToken == null) return res.sendStatus(401)

     const isValidToken = await Login.findOne({refreshToken: refreshToken});
     console.log(isValidToken)
    if(!isValidToken) {
        // console.log(isValidToken)
        return res.status(404).send({success:false, message: Errors.NOT_FOUND})
    }
        console.log(isValidToken)
         jwt.verify(isValidToken?.refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET, (error, user) => {
            if(error){
                return res.status(403).send({success:false, message:err})
            } 
            let loggedUser = {userName: user.userName, email: user.email}
            console.log(loggedUser)
            const accessToken = generateAccessToken({email:loggedUser?.email})
            res.status(200).send({success:true, data: accessToken})
        })
})

dotenv.config();
 
export default router