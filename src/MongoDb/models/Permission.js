import mongoose from "mongoose";


const PermissionSchema = new mongoose.Schema({
    name: {
        type:String,
        trim:true,
        required:true,
        unique: true,
    },
    description:{
        type:String,
    },

}, {versionKey: false })


PermissionSchema.set('toJSON', {
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
const Permission = mongoose.model('Permission', PermissionSchema, 'permissions')


export default Permission 