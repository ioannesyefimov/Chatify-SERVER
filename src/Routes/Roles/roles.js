

import mongoose from "mongoose";
import {Permission,Role,User,Channel, conn} from "../../MongoDb/index.js";
import express from 'express'
import { checkError, validateIsEmpty,throwErr,Errors, verifyAccessToken, populateCollection } from "../../utils.js";


 

const router = express.Router()

router.route('/create').post(async(req,res)=>{
    const session = await conn.startSession()
    session.startTransaction()
    try {
        const {name, roleDescription,permissionDescription,accessToken} = req.body
        let isEmpty = await validateIsEmpty({name, roleDescription,permissionDescription,accessToken});
        if(!isEmpty?.success){
            throwErr({name:Errors.MISSING_ARGUMENTS,code:400})
        }
        // const  isValidToken = await verifyAccessToken(accessToken) 

        // if(isValidToken?.err){
        //     throwErr({name: isValidToken.err?.message ?? isValidToken?.err,code:400})

        // }
        const newRole = new Role({
            name,roleDescription
        },{session})
        const newPermission = new Permission({
            name,permissionDescription
        },{session})
        newRole.permissions.push(newPermission)
        
        newRole.save({session})
        newPermission.save({session})
      
        return res.status(200).send({success:true,data: `"${newRole.name}" has been created`})
    } catch (error) {
        await session.abortTransaction();
        session.endSession()
         checkError(error,res)
    } finally {
        if(session.inTransaction() === true){
            console.log(`commiting trasaction`)
            await session.commitTransaction()
            session.endSession()
        } else {
            console.log(`session was aborted`);
        }
    }
})

router.route('/giveRole').post(async(req,res)=>{
    const session = await conn.startSession()
    session.startTransaction()

    try {
        const {userEmail,accessToken,channelName,roleName,deleteRole} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {channelName,userEmail,accessToken}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
       
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) 
        {
            throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
        }
        let channel = await Channel.findOne({channelName, "members.member": LoggedUser._id});
        if(!channel){
            throwErr({name:Errors.CHANNEL_NOT_FOUND,code: 404})
        } 
        let DELETING_ROLE 
        let deletedRole = await Role.findOne({name:deleteRole}).then(role=>DELETING_ROLE=role).catch(err=>console.log(err))
        let role = await Role.findOne({name:roleName});
        if(!role){
            throwErr({name:`ROLE ${Errors.NOT_FOUND}`})
        }
    
            for (let member of channel.members){
                if(member.member.equals(LoggedUser._id)){
                    if(DELETING_ROLE){
                        member.roles.pull(DELETING_ROLE)
                    }
                    member.roles.push(role)
                }
            }
        console.log(`UPDATED CHANNEL`, channel)
        channel?.save({session})

        return res.status(200).send({success:true,data:`role "${role?.name}" has been given to "${LoggedUser?.userName}"`})

    }  catch (error) {
        await session.abortTransaction();
        session.endSession()
         checkError(error,res)
    } finally {
        if(session.inTransaction() === true){
            console.log(`commiting trasaction`)
            await session.commitTransaction()
            session.endSession()
        } else {
            console.log(`session was aborted`);
        }
    }
})
router.route('/removeRole').post(async(req,res)=>{
    const session = await conn.startSession()
    session.startTransaction()

    try {
        const {userEmail,accessToken,channelName,roleName} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {channelName,userEmail,accessToken}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
       
        // const  isValidToken = await verifyAccessToken(accessToken) 
        // if(isValidToken?.err) return res.status(400).send({success:false, message: isValidToken.err?.message || isValidToken?.err})

        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) 
        {
            throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
        }
        let channel = await Channel.findOne({channelName, "members.member": LoggedUser._id});
        if(!channel){
            throwErr({name:Errors.CHANNEL_NOT_FOUND,code: 404})
        } 
        let role = await Role.findOne({name:roleName});
        if(!role){
            throwErr({name:`ROLE ${Errors.NOT_FOUND}`})
        }
    
            for (let member of channel.members){
                if(member.member.equals(LoggedUser._id)){
                    member.roles.pull(role)
                }
            }
        console.log(`UPDATED CHANNEL`, channel)
        channel?.save({session})

        return res.status(200).send({success:true,data:`role "${role?.name}" has been removed from user named  "${LoggedUser?.userName}"`})

    }  catch (error) {
        await session.abortTransaction();
        session.endSession()
         checkError(error,res)
    } finally {
        if(session.inTransaction() === true){
            console.log(`commiting trasaction`)
            await session.commitTransaction()
            session.endSession()
        } else {
            console.log(`session was aborted`);
        }
    }
})


export default router