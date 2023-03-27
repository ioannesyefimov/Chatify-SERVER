import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import {Login,User} from './src/MongoDb/models/index.js'
dotenv.config()

import { uploadRoute, GoogleRoute, facebookRoute, GitHubRoute, UserDataRoute, RegisterRoute, SignInRoute, TokenRoute, changeProfileRoute, ChannelRoute} from './src/Routes/index.js'
import connectDB from './src/MongoDb/connect.js'
const app = express();

Login.watch().on('change', data=>console.log(data))
User.watch().on('change', data=>console.log(data))

app.use(
    cors()
)
// app.use(bodyParser.json())

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));


  

app.use('/api/auth/register', RegisterRoute)
app.use('/api/auth/signin', SignInRoute)

app.use('/api/auth/github', GitHubRoute)
app.use('/api/auth/facebook', facebookRoute)
app.use('/api/auth/google', GoogleRoute)
app.use('/api/auth/user', UserDataRoute)

app.use("/api/auth/token", TokenRoute)
app.use("/api/upload", uploadRoute)
app.use('/api/change', changeProfileRoute)
app.use('/api/channels', ChannelRoute)
const PORT = process.env.PORT || 5050

const StartServer = async ()=>{
    try {
        connectDB(process.env.MONGODB_URL);
        app.listen(PORT, () => console.log(`Server is running on port ${PORT} `))

    } catch (error) {
        console.log(error)
    }
}

StartServer()


