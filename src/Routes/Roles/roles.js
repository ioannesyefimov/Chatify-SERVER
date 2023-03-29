

import mongoose from "mongoose";
import {Permission,Role} from "../../MongoDb/index.js";
import express from 'express'
import { checkError } from "../../utils.js";


 

const router = express.Router()

router.route('/create').post(async(req,res)=>{
    try {
        const adminPermission = new Permission({
            name:'Admin',
            description: 'everything',
        })
        const adminRole = new Role({
            name:'Admin',
            description: 'This role has all permissions in the channel',
        })
        const memberPermission = new Permission({
            name:'Member',
            description: 'write&read',
        })
        const memberRole = new Role({
            name:'Member',
            description: 'This role could write and read channel',
        })
        adminPermission.save()
        memberPermission.save()
        memberRole.permissions.push(memberPermission)
        adminRole.permissions.push(adminPermission)
        
        memberRole.save()
        adminRole.save()
    } catch (error) {
        checkError(error,res)  
    }
})

export default router