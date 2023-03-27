import mongoose from "mongoose";
import { Errors } from "../../utils.js";
let validateEmail = function(email) {
    const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; 
       return regex.test(email)
};

const LoginSchema = new mongoose.Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        required: 'Email address is required',
        validate: [
            {validator: validateEmail, message: Errors.INVALID_EMAIL},  ],
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                "Please fill a valid email address",
              ],
    },
    password: {
        type: String,
    },
    refreshToken : {
        type: String,
    },
    loggedThrough: {
        type:String,
        required: true
    }
    

}, {versionKey: false })

LoginSchema.pre('updateOne', function(next){
    this.setOptions({runValidators:true})
    next()
})

LoginSchema.set('toJSON', {
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
const Login = mongoose.model('Login', LoginSchema, 'logins')


export default Login