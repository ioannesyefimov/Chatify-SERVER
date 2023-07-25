import cloudinary from 'cloudinary'


const opts = {
    overwrite:true,
    invalidate: true,
    resource_type: "auto",
}
const  uploadImageFunc = (image) => { //image => base64
    console.log('uploading image')
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(image,opts).then(result=>{
            console.log(result)
            if(result.secure_url){
                console.log(result.secure_url);
                return resolve({success:true,data:{url: result.secure_url}})
            }

        })
        .catch(error=>{
            console.log(error.mesage);
            return reject({sucess:false, message:error.message})
        })
        })
}


export default  uploadImageFunc