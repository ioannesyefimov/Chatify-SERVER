

import mongoose from "mongoose";
import {Permission,Role,User,Channel, conn} from "../../MongoDb/index.js";
import express from 'express'
import { checkError, validateIsEmpty,throwErr,Errors, verifyAccessToken } from "../../utils.js";


 

const router = express.Router()

router.route('/create').post(async(req,res)=>{
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
        })
        const newPermission = new Permission({
            name,permissionDescription
        })
        newRole.permissions.push(newPermission)
        
        newRole.save()
        newPermission.save()
      
        return res.status(200).send({success:true,data: newRole.name})
    } catch (error) {
        checkError(error,res)  
    }
})

router.route('/giveRole').post(async(req,res)=>{
    try {
        const session = await conn.startSession();
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
        
        return await session.withTransaction(async()=>{

             channel.members.forEach(member=>{
                if(member.member?.toString()===LoggedUser._id?.toString()){
                    console.log(`trigger`)
                    return member.roles.push(role)
                }
                console.log(`member: `, member)
            })
                console.log(`UPDATED CHANNEL`, channel)

                channel?.save()
            let PopulatedChannels = await channel.populate({path:'members',populate:[
                {
                    path: 'member',
                    model: 'User',
                    
                },
                {
                    path: "roles",
                    model: 'Role',
                    populate: [{
                            path:'permissions',
                            model:'Permission'
                    }]
                }
                ]
                });
            let PopulatedUser = await LoggedUser.populate({path:'channels', populate: [
                {
                    path:'channel',
                    model: 'Channel',
                },
                {
                    path: "roles",
                    model: 'Role',
                    populate: [{
                            path:'permissions',
                            model:'Permission'
                        }]
                }
            ],
            });
        
            // let PopulatedChannels = await joiningChannel.populate({path:'members',populate:[
            //     {
            //         path: 'member',
            //         model: 'User',
                    
            //     },
            //     {
            //         path: "roles",
            //         model: 'Role',
            //         populate: [{
            //                 path:'permissions',
            //                 model:'Permission'
            //         }]
            //     }
            //     ]
            //  });
            return res.status(200).send({success:true,data:`role ${newRole} has been given to ${LoggedUser?.userName}`})
        })

    } catch (error) {
         checkError(error,res)
    }
})


export default router