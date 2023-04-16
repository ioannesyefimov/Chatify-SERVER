import {Server} from 'socket.io'
import http from 'http'
import cors from 'cors'
import express from 'express'
import { createDate, populateCollection,Errors, APIFetch } from '../utils.js'
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
    let serverURL='http://localhost:5050/api'
    console.log(`User connected ${socket.id}`)

    socket.on('join_channel',async data=>{
        socket.join(data)
        console.log(`JOINED`, data);
    });

    socket.on('message',data=>{console.log(`DATA:`,data);})

    socket.on('get_channel',async(data)=>{
        console.log(`data:`,data);
       let response = await APIFetch({url:`http://localhost:5050/api/channels/channel/${data.channelName}`});
        if(!response.success) {
             return socket.emit('get_channel', response)
        }else {
            return socket.emit('get_channel',{data:{channel:response?.data.channels}})
            
        }
    })

    socket.on('send_message', async(data)=>{
        console.log(`MESSAGE: `, data);
        if(!data?.user) return
        console.log(`ROOM:`, data.room);
        let response = await APIFetch({
            url:`${serverURL}/messages/create`,
            method:'POST',
            body:{
                userEmail:data?.user.email, channelId:data?.channelId, message: data?.message
            },
        }); 

        if(!response?.success){
            return socket.emit('receveive_message', response)
        }

        io.sockets.in(data.room).emit('receive_message',{data:{channel:response?.data.channel}})
    });
    socket.on('delete_message',async(data)=>{
        console.log(`DATA:`, data);
        if(data.message_id){
            let response = await APIFetch({url:`${serverURL}/messages/delete?message_id=${data.message_id}&userEmail=${data.userEmail}&channel_id=${data.channel_id}`, method:'DELETE' })
            return io.sockets.in(data.channel_id).emit("delete_message",response)
        }

    })
    socket.on('disconnect',()=>{
        console.log(`Client ${socket.id} disconnected`);
    })
})