import express from 'express';
import  fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import {Octokit} from 'octokit'
import {User,conn,Login} from '../../MongoDb/index.js'
import { generateAccessToken,generateRefreshToken } from './tokenRoute.js';
import { APIFetch, Errors, checkError, throwErr, verifyAccessToken } from "../../utils.js"

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
        if(USER.loggedThrough !== 'Github') return res.status(400).send({success:false, error:Errors.SIGNED_UP_DIFFERENTLY, loggedThrough: isLoggedAlready?.loggedThrough})
 
        const user = {
            userName: USER?.userName  ,
            email: USER.email,
            picture: USER?.picture || null,
            loggedThrough: USER?.loggedThrough,
            bio: USER?.bio,
            phone: USER?.phone,
        }
        const GeneratedAccessToken = generateAccessToken(user?.email)
        res.status(201).send({success:true,data:{accessToken: GeneratedAccessToken, loggedThrough:user.loggedThrough, user: user}});
    } catch (error) {
        return checkError(error,res)
    }
}

router.route('/').post(async(req,res) =>{
    try {
        const session = await conn.startSession()
        const {accessToken} = req.body  // Bearer ACCESSTOKEN
        console.log(accessToken)
      
        let isValidToken = await verifyAccessToken(accessToken);
        if(!isValidToken.success){
            throwErr(isValidToken?.err)
        }
        console.log(`token resp`,isValidToken);
         return await conn.transaction(async()=>{
            let USER = await User.findOne({email:isValidToken?.result?.email});
            console.log(`USER:`, USER);
            if(USER){
                if(USER.loggedThrough !== 'Github') {
                    throwErr({name:Errors.SIGNED_UP_DIFFERENTLY,arguments:{loggedThrough:USER.loggedThrough},code:400, message:`Such account has already been signed up through ${USER.loggedThrough}`})
                }
                return res.status(200).send({success:true,data:{user:USER}})
            }else {

                let user = {
                    userName: isValidToken?.result?.userName,
                    picture: isValidToken?.result?.avatar_url,
                    email: isValidToken?.result?.email,
                    loggedThrough: isValidToken?.result?.loggedThrough,
                    bio: isValidToken?.result?.bio,
                    phone: isValidToken?.result?.phone,
                }
                let newUser = await User.create([user],{session});
                let welcomeChannel = await Channel.findOne({channelName:'Welcome'});
                if(welcomeChannel){
    
                    newUser.channels.push(welcomeChannel)
                   await newUser.save({session})
                }
                return res.status(200).send({success:true,data:{user:newUser,message:'USER HAS BEEN SIGNED UP'}})
            }
        })

    } catch (error) {
         checkError(error,res)
    }
    }
)



router.route('/getAccessToken').get( async (req,res) =>{
    const params = `?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${req.query.code}&scope=user`

    try {
        let response = await APIFetch({url:`https://github.com/login/oauth/access_token${params}`,method:'GET',headers:{"Accept":"application/json"}});
        
        console.log(response)
        // if(!response.access_token){
            // return res.status(400).send({success:false, message: response.error})
        // }

            return res.status(200).send({success:true,data: {accessToken: response.access_token}})
        
    } catch(error){
         checkError(error,res)
    }
   
})

router.route('/getUserToken').get(async(req,res)=>{

    try {
        let token = req.get('Authorization')
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
    // let basicUser = await APIFetch({url:`https://api.github.com/user`,headers:{"authorization": `bearer ${token}`},method:'GET'})

        if(basicUser?.error){
            throwErr(basicUser)
        }
        console.log(`USER:`, basicUser);
         const GHuser =  basicUser.data

            let user = {
                userName: `${GHuser?.name} ${ GHuser?.lastName ? GHuser?.lastName : '' }`,
                picture: GHuser?.avatar_url,
                email: GHuser?.email,
                loggedThrough: 'Github',
                bio: GHuser?.bio,
                phone: GHuser?.phone,
            }

            const GeneratedAccessToken = await generateAccessToken(user)
            console.log(`success`)
            res.status(200).send({success:true,data:{accessToken: GeneratedAccessToken}});
            
    } catch (error){
        checkError(error,res)
    }
}
)

export default router