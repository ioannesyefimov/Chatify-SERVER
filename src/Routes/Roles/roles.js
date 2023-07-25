

import mongoose from "mongoose";
import {Permission,Role,User,Channel, conn} from "../../MongoDb/index.js";
import express from 'express'
import { checkError, validateIsEmpty,throwErr,Errors, verifyAccessToken, populateCollection, capitalize } from "../../utils.js";


 

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

        const newPermission = new Permission({
            name,description:permissionDescription,
        },{session})
        // }
        const newRole = new Role({
            name,description:roleDescription,permissions:newPermission
        },{session})
        // newRole.permissions.push(newPermission)
        
        await newRole.save({session})
        await newPermission.save({session})
      
        return res.status(200).send({success:true,data: {message:`"${newRole.name}" has been created`}})
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
       
        const  isValidToken = await verifyAccessToken(accessToken) ;
        console.log(isValidToken)
        if(isValidToken?.err) throwErr({name: isValidToken.err?.message ?? isValidToken?.err})

        let creator = await User.findOne({email:isValidToken?.result?.email})
        if(!creator) throwErr({code:404,name:`TOKEN ERROR`,arguments:isValidToken?.result?.email})
        let userToGive = await User.findOne({email:userEmail,arguments:isValidToken?.email});
        if(!userToGive ) 
        {
            throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
        }

        let channel = await Channel.findOne({channelName});
        if(!channel){
            throwErr({name:Errors.CHANNEL_NOT_FOUND,code: 404})
        } 
        let populatedChannel = await populateCollection(channel,"Channel");
        let DELETING_ROLE 
        await Role.findOne({name:deleteRole}).then(role=>DELETING_ROLE=role).catch(err=>console.log(err))
        let role = await Role.findOne({name:roleName});
        if(!role){
            throwErr({name:`ROLE "${roleName}" ${Errors.NOT_FOUND}`,code:404})
        }
       let hasPermission = populatedChannel?.members.find(member=>member.member.equals(creator._id))?.roles.some(role=>role.name==="Admin"||role.name==='Creator')

       if(!hasPermission) throwErr({code:400,name:Errors.NOT_HAVE_PERMISSION})
            
    let memberToGive = channel.members.find(member=>member.member.equals(userToGive._id))


    if(!memberToGive){
        throwErr({code:400,name:Errors.NOT_A_MEMBER})
    }
    let hasRole = memberToGive.roles.some(role=>role.name === roleName)
    if(hasRole) throwErr({name:Errors.ALREADY_EXISTS,code:404, arguments: roleName})
    if(DELETING_ROLE){
        memberToGive.roles.pull(DELETING_ROLE)
    }
    memberToGive.roles.push(role)

        
    console.log(`UPDATED CHANNEL`, channel)
    channel?.save({session})

    return res.status(200).send({success:true,data:{message:`role "${role?.name}" has been given to "${capitalize(userToGive?.userName)}"`},  message2: DELETING_ROLE?.name ?`${DELETING_ROLE?.name} has been removed from ${userToGive?.userName}`: null  })

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
        const {userEmail,accessToken,channelName,deletingRole} = req.body  // Bearer ACCESSTOKEN
        let ARGUMENTS = {channelName,userEmail,accessToken,deletingRole}
        const isEmpty = await validateIsEmpty(ARGUMENTS);
        
        if(!isEmpty.success){
            throwErr({name: Errors.MISSING_ARGUMENTS , code: 400, arguments:isEmpty?.missing})
        }
        const  isValidToken = await verifyAccessToken(accessToken) ;
        if(isValidToken?.err) throwErr({name: isValidToken.err?.message ?? isValidToken?.err})
        console.log(isValidToken)

        let creator = await User.findOne({email:isValidToken?.result?.email});
        if(!creator) {
            throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
        }
        let LoggedUser = await User.findOne({email:userEmail});
        if(!LoggedUser ) 
        {
            throwErr({name:Errors.NOT_SIGNED_UP,code: 404})
        }
        let channel = await Channel.findOne({channelName, "members.member": LoggedUser._id});
        if(!channel){
            throwErr({name:Errors.CHANNEL_NOT_FOUND,code: 404})
        } 

        let deleteRole = await Role.findOne({name:deletingRole});
        if(!deleteRole){
            throwErr({name:`ROLE ${Errors.NOT_FOUND}`})
        }
        
        let populatedChannel = await populateCollection(channel,"Channel");
        let creatorInChat = populatedChannel.members.find(member=>member.member.equals(creator._id));
        if(!creatorInChat) throwErr({name:Errors.NOT_A_MEMBER, code:400, arguments: creator.email})
        let userToRemove = channel.members.find(member=>member.member.equals(LoggedUser._id))

        if(!userToRemove) throwErr({name:Errors.NOT_A_MEMBER, code:400, arguments: LoggedUser.email})
        let hasPermission = creatorInChat?.roles.some(role=>role.name==='Creator' || role.name==='Admin')

        if(!hasPermission) throwErr({name:Errors.NOT_HAVE_PERMISSION,code:400})
        console.log(`CREATOR IN CHAT ` , creatorInChat)
        let hasRole = userToRemove.roles.some(role=>role.name === deletingRole)
        if(!hasRole) throwErr({name:Errors.NOT_FOUND,code:404, arguments: deletingRole})
        userToRemove?.roles.pull(deleteRole)
        channel?.save({session})
           
        console.log(`UPDATED CHANNEL`, channel)

        return res.status(200).send({success:true,data:{message:`role "${deleteRole?.name}" has been removed from user named  "${capitalize(userToGive?.userName)}"`}})

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