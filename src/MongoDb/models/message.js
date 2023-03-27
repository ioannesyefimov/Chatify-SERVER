import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    message: {
        type: String,
        trim: true,
        required:true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type:Date,
        default: Date.now(),
    },
    channelAt: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Channel'
    }]    

}, {versionKey: false })

MessageSchema.pre('updateOne', function(next){
    this.setOptions({runValidators:true})
    next()
})

MessageSchema.set('toJSON', {
    virtuals: true,
    transform: (doc,result) => {
        return {
            ...result,
            id: result._ID
        }
    }
})
const Message= mongoose.model('Message', MessageSchema)


export default Message 