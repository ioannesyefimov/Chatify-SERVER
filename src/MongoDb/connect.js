import mongoose from 'mongoose'
// mongosh "mongodb+srv://chatify.qj85kaw.mongodb.net/chatify" --apiVersion 1 --username yefimov
const connectDB = (url) => {
    mongoose.set(`strictQuery`, true)
    mongoose.connect(url)
        .then(()=> console.log(`mongoDB connected`))
        .catch(err=> console.log(err))
}

export const conn = mongoose.connection;

export default connectDB;