import mongoose from "mongoose";
import { createDate } from "../../utils.js";

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
        type:Object,
        default: createDate()
    },
    channelAt: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Channel',
        required:true,
    }],

}, {versionKey: false })


MessageSchema.set('toJSON', {
    virtuals: true,
})


const Message= mongoose.model('Message', MessageSchema)


export default Message 