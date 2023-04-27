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

dotenv.config();


const router = express.Router()
export async function deleteAccount (req){
    try {
        console.log(`DELETE USER IS WORKING`)
        
        const {userEmail, updatedParams,accessToken,deletedThrough} = req.body
        console.log(`body:`, req.body);
        if(!userEmail || !accessToken ) throw new Error({success:false, message:Errors.MISSING_ARGUMENTS})
        
        const isValidToken = await verifyAccessToken(accessToken);
        if(!isValidToken?.success) throwErr({success:false,message:isValidToken?.err?.message || isValidToken?.err})
        
        const isLogged = await Login.findOne({email:userEmail});
        if(!isLogged) {
           throwErr({success:false, message:Errors.NOT_FOUND})
        };
        const session = await conn.startSession()
        let response 
         await session.withTransaction(async()=>{
            console.log(`isLogged: `, isLogged)
            if(isLogged?.loggedThrough === deletedThrough && isLogged?.loggedThrough !== 'Internal'){
                let isDeletedLOGIN = await Login.deleteOne({email: userEmail}, {session});
                let isDeletedUSER = await User.deleteOne({email: userEmail}, {session});

                if(isDeletedUSER?.deletedCount === 0 ||  isDeletedLOGIN?.deletedCount === 0){
                    await session.abortTransaction()
                    console.log(`USER:`, isDeletedUSER);
                    console.log(`LOGIN:`, isDeletedLOGIN);
                    throwErr({success:false, message: Errors?.ABORTED_TRANSACTION})
                }
                console.log(`USER:`, isDeletedUSER);
                console.log(`LOGIN:`, isDeletedLOGIN);
                response = ({success:true, data: { message:`USER_IS_DELETED`}})
                return
            }
            if(!updatedParams?.password && isLogged?.password){
                session.abortTransaction()
                return throwErr({success:false, message:Errors.MISSING_ARGUMENTS})
            }
            const isValidPw = bcrypt.compareSync(updatedParams?.password, isLogged?.password)
            console.log("ISVALID:",isValidPw)
            if(!isValidPw) return res.status(400).send({success:false,message:Errors.WRONG_PASSWORD})
            let isDeletedLOGIN = await Login.deleteOne({email: userEmail}, {session});
            let isDeletedUSER = await Login.deleteOne({email: userEmail}, {session});

            if(!isDeletedLOGIN || !isDeletedUSER) {
                session.abortTransaction()
               throwErr({success:false,message:`USER_ISN'T_DELETED`})
            }
            console.log(`USER:`, isDeletedUSER);
            console.log(`LOGIN:`, isDeletedLOGIN);
            console.log(isLogged);
            await session.commitTransaction(); 
            session.endSession()
             response = {success:true, data: { message:`USER_IS_DELETED`}}

        })
        return response

        
    } catch (error) {
        return checkErrWithoutRes(error)
    }
}
router.route('/delete').delete(async(req,res)=>{
    let response = await deleteAccount(req);
    if(response?.success){
        res.status(200).send(response)
    }else {
        res.status(500).send(response)
    }
    

})

router.route('/').post(async(req,res)=>{

    try {
        const session = await conn.startSession()
    
        const {userEmail, accessToken, updatedParams } = req.body 
        console.log(`reg body:`, req.body)

        if(!updatedParams || !isTrue(updatedParams).is) {
            return res.status(400).send({success:false,message:Errors.MISSING_ARGUMENTS})
        } 
            
        let changesArray = {
        }

        console.log(req.body)
        const isLogged = await User.findOne({email:userEmail});
    
        if(!isLogged) {
            return res.status(404).send({success:false, message:Errors.NOT_FOUND})
        }
    
        // validate if user has been signed up through social 
        // if(isLogged[0].loggedThrough !=='Internal' && !oldPassword){
        const isValidToken = await verifyAccessToken(accessToken);
        if(isValidToken?.err) throw new Error({success:false,message:isValidToken?.err?.message})
        console.log(`data :`, updatedParams)

        return await session.withTransaction(async()=>{
            console.log(`transaction started`)

            if(updatedParams?.email){
                let user=   await User.updateOne({email: userEmail}, {email :updatedParams?.email },  {upsert:true}, {session});
                let login = await Login.updateOne({email: userEmail}, {email :updatedParams?.email },  {upsert:true}, {session});
                console.log('login',login);
                console.log('user',user);
                if (user?.modifiedCount === 0 && login?.modifiedCount === 0 (user?.acknowledged && !login?.acknowledged)){
                    changesArray.newEmail = `${updatedParams?.email}  hasn't been applied`
                     console.log(changesArray.newEmai)
                } else if (user?.modifiedCount != 0 &&login?.modifiedCount != 0 ){
                    changesArray.newEmail = updatedParams?.email
                     console.log(changesArray.newEmail)
                }
                
            }
            if(updatedParams.fullName){
             
                  let user=   await User.updateOne({email: userEmail}, {fullName :updatedParams?.fullName },  {upsert:true}, {session});
                if (user?.modifiedCount === 0 && user?.acknowledged ){
                    changesArray.newFullname = `${updatedParams?.fullName}  hasn't been applied`
                     console.log(changesArray.newFullName)
                } else if (user?.modifiedCount != 0){
                    changesArray.newFullName = updatedParams?.fullName
                     console.log(changesArray.newFullName)
                }
                
            }
            if(updatedParams?.phone){
                let user=   await User.updateOne({email: userEmail}, {phone :updatedParams?.phone },  {upsert:true}, {session});
                if (user?.modifiedCount === 0 && user?.acknowledged ){
                    changesArray.newPhone = `${updatedParams?.phone}  hasn't been applied`
                     console.log(changesArray.phone)
                } else if (user?.modifiedCount !== 0 ){
                    changesArray.newPhone = updatedParams?.phone
                     console.log(changesArray.newPhone)
                }
            }
            if(updatedParams?.bio){
                let user=   await User.updateOne({email: userEmail}, {bio :updatedParams?.bio },  {upsert:true}, {session});
                console.log(user);
                if (user?.modifiedCount === 0 && user?.acknowledged){
                    changesArray.newBio = `${updatedParams?.bio}  hasn't been applied`
                    console.log(changesArray.newBio)

                } else if (user?.modifiedCount != 0){
                    changesArray.newBio = updatedParams?.bio
                      console.log(changesArray.newBio)
                }
                
            }
            if(updatedParams?.picture){
                console.log(`picture: ${updatedParams?.picture}`)
                let uri = await handleUploadPicture(updatedParams?.picture);
                if(!uri?.success) return res.status(400).send({success:false, message: {picture : uri?.message} })

                let user=   await User.updateOne({email: userEmail}, {picture: uri?.url },  {upsert:true}, {session});
                console.log(user);
                if (user?.modifiedCount === 0 && user?.acknowledged){
                    changesArray.newPicture = `${updatedParams?.picture}  hasn't been applied`
                    console.log(changesArray.newPicture)

                } else if (user?.modifiedCount != 0){
                    changesArray.newPicture = updatedParams?.picture
                      console.log(changesArray.newPicture)
                }
                
            }
            if(updatedParams?.password){
                console.log(`token:`, isValidToken);
                const isValid = await serverValidatePw(isValidToken?.fullName,userEmail,updatedParams?.password)
                if(!isValid?.success) return res.status(400).send({success:false, message: {password : isValid?.message}}) 
                console.log(isValid);
                const salt = bcrypt.genSaltSync(10);
                const hashPw = bcrypt.hashSync(updatedParams?.password, salt)
                console.log(`before db search`);
                const user = await Login.updateOne({email:userEmail}, {password: hashPw},  {upsert:true}, {session})
                console.log(`after db search`);
                console.log(user)
                if (user?.modifiedCount === 0 && user?.acknowledged){
                    changesArray.newPassword = `${updatedParams?.password}  hasn't been applied`
                     console.log(changesArray.password)
                } else if (user?.modifiedCount != 0){
                    changesArray.newPassword = updatedParams?.password
                     console.log(changesArray.newPassword)
                }
                
            }
            if(Object.keys(changesArray).length === 0 && changesArray.constructor === Object) return res.status(400).send({success:false, message:`CHANGES HAVEN'T BEEN APPLIED`})
            console.log(changesArray)
            let userData = {
              email:isLogged[0]?.email,
              fullName: isLogged[0]?.fullName,
              bio:isLogged[0]?.bio ,
              phone:isLogged[0]?.phone ,
              picture: isLogged[0]?.picture,
              loggedThrough: isLogged[0]?.loggedThrough,
            }
            console.log(userData);
            let accessToken = await generateAccessToken(userData);
            console.log(`token: ${accessToken}`);
            await session.commitTransaction(); 
            session.endSession()
            return res.status(200).send({success:true, data: { message:Errors.CHANGES_APPLIED, changes: changesArray, accessToken}})

        })

    } catch (error) {
        console.log(error)
        if(error.name === 'ValidationError'){
          return checkError(error,res)
        }
        return res.status(500).send({success:false,message:error |`SOMETHING WENT WRONG`})

    }
})


export default router