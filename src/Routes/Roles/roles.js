

import mongoose from "mongoose";
import {Permission,Role} from "../../MongoDb/index.js";
import express from 'express'
import { checkError, validateIsEmpty,throwErr,Errors } from "../../utils.js";


 

const router = express.Router()

router.route('/create').post(async(req,res)=>{
    try {
        const {name, roleDescription,permissionDescription,accessToken} = req.body
        let isEmpty = await validateIsEmpty({name, roleDescription,permissionDescription,accessToken});
        if(!isEmpty?.success){
            throwErr({name:Errors.MISSING_ARGUMENTS,code:400})
        }
        const  isValidToken = await verifyAccessToken(accessToken) 

        if(isValidToken?.err){
            throwErr({name: isValidToken.err?.message ?? isValidToken?.err,code:400})

        }
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

export default router