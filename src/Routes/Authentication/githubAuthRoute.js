import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login} from '../../MongoDb/index.js'
import { generateAccessToken,generateRefreshToken } from './tokenRoute.js';
import { Errors, checkError, verifyAccessToken } from "../../utils.js"

const router = express.Router()


export const handleGithubSingin = async(accessToken ,res)=>{
    try {
        const isValidToken = await verifyAccessToken(accessToken);
        if(isValidToken?.err) {
            console.log(err)
            return res.status(404).send({success:false, message:err})
        }
        console.log(isValidToken)

        const USER = await User.findOne({email: isValidToken?.email});
        if(!USER) return res.status(400).send({success:false, message:Errors.NOT_FOUND})
        if(USER.loggedThrough !== 'Github') return res.status(400).send({success:false, message:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: isLoggedAlready?.loggedThrough})
 
        const user = {
            userName: USER?.userName  ,
            email: USER.email,
            picture: USER?.picture || null,
            loggedThrough: USER?.loggedThrough,
            bio: USER?.bio,
            phone: USER?.phone,
        }
        const GeneratedRefreshToken = generateRefreshToken(user?.email)
        const GeneratedAccessToken = generateAccessToken(user?.email)

        
        res.status(201).send({success:true,data:{accessToken: GeneratedAccessToken, loggedThrough:user.loggedThrough, user: user}});
        
        
    } catch (error) {
        return checkError(error,res)
    }
}

router.route('/register').post(async(req,res) =>{
    try {
        const session = await conn.startSession()
        const {accessToken} = req.body  // Bearer ACCESSTOKEN
        console.log(accessToken)
        const octokit = new Octokit({
         auth: accessToken
         })
    //  console.log(accessTok)
         const basicUser = await octokit.request('GET /user', {
             headers: {
                 'X-GitHub-Api-Version': '2022-11-28'
               }
         })
         const GHuser = await basicUser.data

         await session.withTransaction(async()=>{
            let user = {
                fullName: `${GHuser?.name} ${ GHuser?.lastName ? GHuser?.lastName : '' }`,
                picture: GHuser?.avatar_url,
                email: GHuser?.email,
                loggedThrough: 'Github',
                bio: GHuser?.bio,
                phone: GHuser?.phone,
               

            }
          
            const isRegistered = await Login.find({ email : user?.email});

            if(isRegistered.length > 0) {
                return res.status(404).send({success:false, message:`ALREADY_EXISTS`, loggedThrough: isRegistered[0].loggedThrough})
            }

            const dbLOGIN = await Login.create([{
                email:user.email,
                loggedThrough: user.loggedThrough,
                userName: userName,


            }], {session});

            const dbUser = await User.create([{
                email:user.email,
                fullName: `${GHuser?.name} ${ GHuser?.lastName ? GHuser?.lastName : '' }`,
                picture: GHuser?.avatar_url,
                email: GHuser?.email,
                bio: GHuser?.bio,
                phone: GHuser?.phone,
                loggedThrough: user.loggedThrough,

                
            }], {session});
            // if(!dbLOGIN || !dbUser) return  res.status(500).send({success:false, message:`something went wrong`})
            console.log(`success`)
            const GeneratedAccessToken = generateAccessToken(user)

            
            res.status(201).send({success:true,data:{user:user, accessToken: GeneratedAccessToken}});
            await session.commitTransaction(); 
            session.endSession()
        })

    } catch (error) {
         checkError(error,res)
    }
    }
)



router.route('/getAccessToken').get( async (req,res) =>{
    const params = `?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${req.query.code}&scope=user`

    try {
        const ghAccessToken = await fetch("https://github.com/login/oauth/access_token" + params, {
        method: "POST",
        headers: {
            "Accept": "application/json"
        }})
    
        const ghResponse = await ghAccessToken.json()
        
        console.log(ghResponse)
        if(!ghResponse.access_token){
            return res.status(400).send({success:false, message: ghResponse.error})
        }

            return res.status(200).send({success:true,data: {accessToken: ghResponse.access_token}})
        
    } catch(error){
         checkError(error,res)
    }

  
   
})

router.route('/getUserToken').get(async(req,res)=>{
    try {
        console.log(`token: ${req.get("Authorization")}`);
        const octokit = new Octokit({
         auth: req.get('Authorization')
         })
    //  console.log(accessTok)
         const basicUser = await octokit.request('GET /user', {
             headers: {
                 'X-GitHub-Api-Version': '2022-11-28'
               }
         })
         const GHuser = await basicUser.data

            let user = {
                fullName: `${GHuser?.name} ${ GHuser?.lastName ? GHuser?.lastName : '' }`,
                picture: GHuser?.avatar_url,
                email: GHuser?.email,
                loggedThrough: 'Github',
                bio: GHuser?.bio,
                phone: GHuser?.phone,
            }

            const isRegistered = await Login.findOne({email: user.email})

            if(!isRegistered) return res.status(404).send({success:false,message:`NOT_FOUND`})
            const GeneratedAccessToken = generateAccessToken(user)
            console.log(`success`)
            res.status(201).send({success:true,data:{accessToken: GeneratedAccessToken}});
            
    } catch (error){
        checkError(error,res)
        return res.status(500).send({success:false,message:error ||`SOMETHING WENT WRONG`})
    }
}
)

export default router