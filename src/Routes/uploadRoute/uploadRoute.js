import cloudinary from 'cloudinary'
import express from 'express'
import uploadImageFunc from './fileUploadMiddleware.js'
import { verifyAccessToken } from '../../utils.js'
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})
const router = express.Router()

export const handleUploadPicture = async(image)=>{
    try {
    
       const uploadImage = await uploadImageFunc(image);
       if(!uploadImage.success){
        console.log(uploadImage)
        return {success:false,message:uploadImage.message}
       }
    
       return {success:true,url: uploadImage.data?.url}
    } catch (error) {
        return {success:false,message:error |`SOMETHING WENT WRONG`}

    }
}


router.route('/picture').post(async(req,res)=>{
    try {
        const {accessToken, image} = req.body
        const isValidToken = await verifyAccessToken(accessToken)
        if(isValidToken?.err) return res.status(400).send({success:false,message:isValidToken?.err})
    
       const uploadImage = await uploadImageFunc(image)
       if(!uploadImage.success){
        console.log(uploadImage)
        return res.status(500).send({success:false,message:uploadImage.message})
       }
    
       return res.status(200).send({success:true, data:{url: uploadImage.data?.url}})
    } catch (error) {
        return res.status(500).send({success:false,message:error |`SOMETHING WENT WRONG`})

    }
//    if(uplaodImage)
//     .then(url=>{
//         console.log(url)
//         return res.status(200).send({sucess:true,data:url})
//     })
//     .catch(err=>{
//         console.log(err)

//        return  res.status(500).send({sucess:false,message:err})
//     })
})
export default router
