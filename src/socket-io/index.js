import {Server} from 'socket.io'
import http from 'http'
import cors from 'cors'
import express from 'express'
import { createDate, populateCollection,Errors } from '../utils.js'
import { getChannel } from '../Routes/ChannelsRoute/ChannelRoute.js'
import { Channel, Login, Message } from '../MongoDb/index.js'
export const app = express();


app.use(
    cors()
)

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));


export const server = http.createServer(app)

export const io = new Server(server, {
    cors: {
        origin: 'https://localhost:5173',
        methods: ['GET','POST','DELETE']
    }
})
io.on('connection', (socket)=>{
    console.log(`User connected ${socket.id}`)

    socket.on('join_channel',async data=>{
        socket.join(data)
        console.log(`JOINED`, data);
    });

    socket.on('message',data=>{console.log(`DATA:`,data);})

    socket.on('get_channel',async(data)=>{
        console.log(`data:`,data);
        let channel = await Channel.findOne({channelName:data.channelName,"members.member":data.user.id});
        console.log(`CHANNEL:`, channel);
        if(!channel) {
             return socket.emit('get_channel_response', {success:false,message:Errors.NOT_FOUND})
        }else {
            let populatedChannel = await populateCollection(channel,'Channel');
            return socket.emit('get_channel_response',{channel:populatedChannel})
            
        }
    })

    socket.on('send_message', async(data)=>{
        console.log(`MESSAGE: `, data);
        if(!data.channel) return
        let channel = await Channel.findOne({_id:data.channel})
        socket.to(data.room).emit('receive_message',{channel:channel})
    });
    socket.on('delete_message',(data)=>{

    })
    socket.on('disconnect',()=>{
        console.log(`Client ${socket.id} disconnected`);
    })
})