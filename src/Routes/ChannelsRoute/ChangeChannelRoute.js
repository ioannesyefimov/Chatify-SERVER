import express, { response } from 'express'
import * as dotenv from "dotenv"
import bcrypt from 'bcrypt'
import { checkError, checkErrWithoutRes, Errors, isTrue, throwErr } from '../../utils.js'
import {Login,User} from '../../MongoDb/models/index.js'
import { serverValidatePw } from '../Authentication/RegisterRoute.js'
import { validatePassword, verifyAccessToken } from '../../utils.js'
import { conn } from '../../MongoDb/connect.js'
import { generateAccessToken } from '../Authentication/tokenRoute.js'
import { validateNumber } from '../../MongoDb/models/user.js'
import { handleUploadPicture } from '../uploadRoute/uploadRoute.js'
import { Channel } from '../../MongoDb/index.js'

dotenv.config();


const router = express.Router()
export async function deleteChannel (req){
    try {
        console.log(`DELETE USER IS WORKING`)
        
        const {userEmail,accessToken,channel_id} = req.body
        console.log(`body:`, req.body);
        if(!userEmail || !accessToken || channel_id ) throwErr({success:false, message:Errors.MISSING_ARGUMENTS})
        
        const isValidToken = await verifyAccessToken(accessToken);
        if(!isValidToken?.success) throwErr({success:false,message:isValidToken?.err?.message || isValidToken?.err})
        
        const isLogged = await Login.findOne({email:userEmail});
        const channel = await Channel.findOne({_id:channel_id});
        if(!isLogged)throwErr({success:false, message:Errors.NOT_SIGNED_UP})
        if(!channel) throwErr({success:false, message:Errors.CHANNEL_NOT_FOUND})

        const session = await conn.startSession()
        let response 
        await session.withTransaction(async()=>{
            let deletedChannel = await Channel.deleteOne({_id:channel_id}, {session});
            if(deletedChannel === 0){
                await session.abortTransaction()
                throwErr({success:false, message: Errors?.ABORTED_TRANSACTION})
            }
            response = ({success:true, data: { message:`CHANNEL_IS_DELETED`}})
            return
            })
            await session.endSession()
        return response
        
        
    } catch (error) {
        return checkErrWithoutRes(error)
    }
}
router.route('/delete').put(async(req,res)=>{
    let response = await deleteChannel(req);
    if(response?.success){
        res.status(200).send(response)
    }else {
        res.status(500).send(response)
    }
    

})

export async function channelChange(req){
    try {
        const session = await conn.startSession()
    
        const {accessToken, updatedParams,channel_id } = req.body 
        console.log(`reg body:`, req.body)

        if(!updatedParams || !isTrue(updatedParams).is || !channel_id) {
            return throwErr({success:false,message:Errors.MISSING_ARGUMENTS,arguments:{channel_id:channel_id}})
        } 
        const isValidToken = await verifyAccessToken(accessToken);
        if(isValidToken?.err) throwErr({success:false,message:isValidToken?.err?.message})
        
        let {email} = isValidToken?.result
        const isLogged = await User.findOne({email});
        if(!isLogged)throwErr({success:false, message:Errors.NOT_SIGNED_UP})
        let channel = await Channel.findOne({_id:channel_id});
        if(!channel) throwErr({success:false, message:Errors.CHANNEL_NOT_FOUND})
            
        let changesArray = {
        }
        console.log(req.body)
        console.log(`data :`, updatedParams)
        let response
         await session.withTransaction(async()=>{
            console.log(`transaction started`)

            if(updatedParams?.channelName){
                let channel = await Channel.updateOne({channelName: updatedParams.channelName}, {channelName :updatedParams?.channelName },  {upsert:true}, {session});
                if (channel?.modifiedCount === 0){
                    changesArray.newChannelName = `${updatedParams?.channelName}  hasn't been applied`
                     console.log(changesArray.newEmai)
                } else{
                    changesArray.newChannelName = updatedParams?.channelName
                     console.log(changesArray.newChannelName)
                }
                
            }
            if(updatedParams?.channelDescription){
                let channel=   await Channel.updateOne({_id: channel_id}, {channelDescription :updatedParams?.channelDescription },  {upsert:true}, {session});
                if (channel?.modifiedCount === 0){
                    changesArray.newChannelDescription = `${updatedParams?.channelDescription}  hasn't been applied`
                    console.log(changesArray.newChannelDescription)

                } else {
                    changesArray.newChannelDescription = updatedParams?.channelDescription
                      console.log(changesArray.newChannelDescription)
                }
                
            }
            if(updatedParams?.channelAvatar){
                console.log(`picture: ${updatedParams?.channelAvatar}`)
                let uri = await handleUploadPicture(updatedParams?.channelAvatar);
                if(!uri?.success) return res.status(400).send({success:false, message: {picture : uri?.message} })

                let channel=   await Channel.updateOne({_id:channel_id}, {picture: uri?.url },  {upsert:true}, {session});
                console.log(user);
                if (channel?.modifiedCount === 0){
                    changesArray.newChannelAvatar = `${updatedParams?.channelAvatar}  hasn't been applied`
                    console.log(changesArray.newChannelAvatar)

                } else {
                    changesArray.newChannelAvatar = updatedParams?.channelAvatar
                      console.log(changesArray.newChannelAvatar)
                }
                
            }
            if(Object.keys(changesArray).length === 0 && changesArray.constructor === Object) throwErr({success:false,name:Errors.CHANGES_NOT_APPLIED, message:`CHANGES HAVEN'T BEEN APPLIED`})
            console.log(changesArray)
            channel = await Channel.findOne({_id:channel_id},{session});

            session.endSession()
            response = {success:true, data: { message:Errors.CHANGES_APPLIED, changes: changesArray, channel}}
        })
        return response ?? throwErr({name:'TRANSCATION FAILED', code:500})
    } catch (error) {
       return checkErrWithoutRes(error)
    }
}

router.route('/').post(async(req,res)=>{
    let response = await channelChange(req);
    if(response?.success){
        res.status(200).send(response)
    }else {
        res.status(500).send(response)
    }
})


export default router