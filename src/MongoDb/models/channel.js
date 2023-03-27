import mongoose from "mongoose";


const ChannelSchema = new mongoose.Schema({
    name: {
        type:String,
        trim:true,
        required:true,
    },
    messages:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]

}, {versionKey: false })

ChannelSchema.pre('updateOne', function(next){
    this.setOptions({runValidators:true})
    next()
})

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