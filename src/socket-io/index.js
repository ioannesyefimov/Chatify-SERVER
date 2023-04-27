import {Server} from 'socket.io'
import https from 'https'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import express from 'express'

import { createDate, populateCollection,Errors, APIFetch } from '../utils.js'
import { getChannel, getUserChannels } from '../Routes/ChannelsRoute/ChannelRoute.js'
import { createMessage, deleteMessage } from '../Routes/MessagesRoute/MessageRoute.js'


export const app = express();




const baseUrl = `https://localhost:5050/api`
export const server = https.createServer({
   pfx: fs.readFileSync('./ssl/cert.pfx'),
    passphrase: '134679582ioa',
    
},app)

export const io = new Server(server, {
    cors: {
        origin: 'https://localhost:5173',
        methods: ['GET','POST','DELETE']
    },
    pfx:fs.readFileSync('./ssl/cert.pfx'),
    passphrase: '134679582ioa',
})
app.use(
    cors()
)

app.set('socketio',io)
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
const currentChannel = io.of('/currentChannel')

currentChannel.on('connection', (socket)=>{
    console.log(`User connected ${socket.id}`)
    socket.on('join_channel',async data=>{
        socket.join(data.room)

        console.log(`JOINED`, data.room);
        socket.emit('join_channel',{data:{room:data.room}})
    });
    socket.on('leave_channel',async(data)=>{
        socket.leave(data)
        console.log(`USER ${data.user} left room "${data.id}"`);
    })


    socket.on('get_channel',async(data)=>{
        console.log(`data:`,data);
        let req = {query :{userEmail:data?.userEmail,channel_id: data?.channel_id}}
        let response = await getChannel(req)
        console.log(`RESPONSE:`, response);
        console.log(`ID:`, socket.id);
        currentChannel.to(socket.id).emit('get_channel', response)
    })

    socket.on('send_message', async(data)=>{
        console.log(`MESSAGE: `, data);
        console.log(`ROOM:`, data.room);
        
        let response = await createMessage({body:{
            userEmail:data?.user.email, channelId:data?.channel_id, message: data?.message

        }})        
        console.log(`RESPONSE:`, response);

        if(!response.success){

        };
        console.log(`RESPONSE`, response);
        if(!response?.success){

              return   currentChannel.in(data.room).emit('receive_message',response)
        }
        currentChannel.in(data.room).emit('receive_message',{data:{messages:response.data.channel.messages,message:response.data.message}})
    })
    socket.on('delete_message',async(data)=>{
        console.log(`DATA:`, data);
            let response = await deleteMessage({query:{message_id:data?.message_id,userEmail:data?.userEmail,channel_id:data?.channel_id}});
            currentChannel.in(data?.channel_id)?.emit("delete_message",response)

    })
    socket.on('disconnect',()=>{
        console.log(`Client ${socket.id} disconnected`);
    })
})