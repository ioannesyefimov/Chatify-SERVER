import mongoose from "mongoose";


const ChannelSchema = new mongoose.Schema({
    channelName: {
        type:String,
        trim:true,
        required:true,
        unique: true
    },
    messages:[{
        default: [],
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }],
    members: [
        {
            member: {
                unique:true,
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',  
            },
            roles: [
                {
                    type: mongoose.Schema.ObjectId,
                    ref: 'Role',
                    default: ['member']
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