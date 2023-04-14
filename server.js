import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import {Login,User} from './src/MongoDb/models/index.js'
dotenv.config()

import { uploadRoute, GoogleRoute, facebookRoute, GitHubRoute, UserDataRoute, RegisterRoute, SignInRoute, TokenRoute, changeProfileRoute, ChannelRoute, RoleRoute,MessageRoute} from './src/Routes/index.js'
import connectDB from './src/MongoDb/connect.js'
import { Channel } from './src/MongoDb/index.js'
import { getUser } from './src/Routes/Authentication/getUserData.js'
import { Server } from 'socket.io'
import http from 'http'

const app = express();


Login.watch().on('change', data=>console.log(`LOGIN CHANGE: ` ,data))
User.watch().on('change', data=>console.log(`USER CHANGE : ` ,data))
Channel.watch().on('change', data=>console.log(`CHANNEL CHANGE :` , data))

app.use(
    cors()
)
// app.use(bodyParser.json())

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

export const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: 'https://localhost:5173',
        methods: ['GET','POST','DELETE']
    }
})
io.on('connection', (socket)=>{
    console.log(`User connected ${socket.id}`)
})


app.route('/api/user/:userEmail').get(async(req,res)=>await getUser(req,res))

  

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
app.use('/api/messages', MessageRoute)

app.use('/api/roles',RoleRoute)
const PORT = process.env.PORT || 5050


const StartServer = async ()=>{
    try {
        connectDB(process.env.MONGODB_URL);
        server.listen(PORT, () => console.log(`Server is running on port ${PORT} `))

    } catch (error) {
        console.log(error)
    }
}

StartServer()


