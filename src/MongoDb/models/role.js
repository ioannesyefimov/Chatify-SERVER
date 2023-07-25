import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
    name: {
        type:String,
        trim:true,
        required:true,
        unique: true,
    },
    description:{
        type:String,
    },

    permissions: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
        default:'write&read'
    },

}, {versionKey: false })


RoleSchema.set('toJSON', {
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
const Role = mongoose.model('Role', RoleSchema, 'roles')



export default Role 