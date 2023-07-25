import express from 'express'
import * as dotenv from "dotenv"

import User from '../../MongoDb/models/user.js'

import { checkError, checkErrWithoutRes, Errors, populateCollection, throwErr, verifyAccessToken } from '../../utils.js'
dotenv.config();
 

const router = express.Router()

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
export const getUser = async(req,res)=>{
    try {
        const {userId} =req.params
        console.log(`id`,userId)
        // const {userName,email,id,searchType} =req.query  
        let USER = await User.findOne({_id:userId})
        if(!USER) throwErr({name:Errors.NOT_SIGNED_UP,code:400})

    let populatedUser = await populateCollection(USER,'User');
        delete populatedUser.phone
        return res.status(200).send({
            success:true,
            data: {user:populatedUser }
        })
    } catch (error) {
         checkError(error,res)
    }
}
router.route('/user/:userId').get(getUser)

router.route('/').get(async(req,res)=>{
    try {
        // const {userName,email,id} =req.query  
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
