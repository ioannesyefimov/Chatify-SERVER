import mongoose from 'mongoose'

const connectDB = (url) => {
    mongoose.set(`strictQuery`, true)
    mongoose.connect(url)
        .then(()=> console.log(`mongoDB connected`))
        .catch(err=> console.log(err))
}

export const conn = mongoose.connection;

export default connectDB;