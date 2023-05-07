import mongoose, { Error } from "mongoose";
import { Errors, capitalize } from "../../utils.js";
export const  validateEmail = function(email) {
    const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; 
       return regex.test(email)
};


export const validateNumber = function(number){
    if(number !=null){
        const reg = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/
        return reg.test(number)

    } 
    return true

}

const UserSchema = new mongoose.Schema({
    userName: {
        type: String, 
      
        required:true,
         trim:true,
        minlength: [2, "fullName must be at least 2 characters"],
        maxlength: [30, "fullName must be maximum 30 characters"],
        },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        required: 'Email address is required',
        validate: [
            {validator: validateEmail, message: Errors.INVALID_EMAIL},  ],
        // match: [
        //     /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        //     "Please fill a valid email address",
        //     ],
        
        // match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    loggedThrough: {type:String, required:true},
    picture: {type: String},
    bio: {type:String},
    phone: {
        type:String,
        minlength: [5, Errors?.INVALID_NUMBER],
        maxlength: [30, Errors?.INVALID_NUMBER],
         validate:[
            {
            validator:validateNumber,
                message:Errors.INVALID_NUMBER  
            }
    ]},
    channels: [
        {
            channel:
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Channel'
            },
    }
    ]
     
}, {versionKey: false })
UserSchema.pre('save', function(next){
    this.userName = capitalize(this.userName)
    next()
})
UserSchema.pre('updateOne', function(next){
    this.setOptions({runValidators:true})
    next()
})
UserSchema.pre('deleteOne',async function (next){
    const personId = this.getQuery()["_id"]
   await mongoose.model('Channel').deleteMany({"members.member": personId}).then(resp=>console.log(resp)).catch(err=>console.error(err))
})
UserSchema.set('toJSON', {
    virtuals: true,
    transform: (doc,result) => {
        return {
            ...result,
            id: result._ID
        }
        // ret.dbID = ret._id;
        // delete ret.id
        // delete ret._id;
        // delete ret.__v;
    }
})
const User = mongoose.model('User', UserSchema,'users')

export default User