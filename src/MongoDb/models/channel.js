import mongoose from "mongoose";
import {Errors,validateName } from "../../utils.js";


const ChannelSchema = new mongoose.Schema({
    channelName: {
        type:String,
        trim:true,
        required:true,
         minlength: [2, "channel name must be at least 2 characters"],
        maxlength: [30, "channel name must be maximum 30 characters"],
        validate: [
            {validator: validateName, message: Errors.INVALID_CHANNEL_NAME}
        ]
    },
    channelAvatar: {
        type:String,
        trim:true
    },
    messages:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }],
    channelDiscription:{type:String,trim:true, default: 'Description is empty'},
    members: [
        {
            member: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',  
            },
            roles: [
                {
                    type: mongoose.Schema.ObjectId,
                    ref: 'Role',
                }
            ],
     },
    ],
    isInCall:Boolean,

}, {versionKey: false })


ChannelSchema.set('toJSON', {
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
ChannelSchema.pre('deleteOne',async function (next){
    const channelId = this.getQuery()["_id"]
   await mongoose.model('User').updateMany({"channels.channel": channelId},{$unset:{"channels.channel":channelId}}).then(resp=>console.log(resp)).catch(err=>console.error(err))
})
const Channel = mongoose.model('Channel', ChannelSchema, 'channels')


export default Channel 