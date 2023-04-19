import mongoose from "mongoose";


const ChannelSchema = new mongoose.Schema({
    channelName: {
        type:String,
        trim:true,
        required:true,
        unique: true
    },
    channelAvatar: {
        type:String,
        trim:true
    },
    messages:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }],
    channelDiscription:{type:String,trim:true,},
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
const Channel = mongoose.model('Channel', ChannelSchema, 'channels')


export default Channel 