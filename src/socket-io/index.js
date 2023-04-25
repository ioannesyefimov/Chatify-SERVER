import {Server} from 'socket.io'
import https from 'https'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import express from 'express'
import { createDate, populateCollection,Errors, APIFetch } from '../utils.js'
import { getChannel } from '../Routes/ChannelsRoute/ChannelRoute.js'

export const app = 

express();

const baseUrl = `http://localhost:5050/api`

app.use(
    cors()
)

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));


export const server = https.createServer({
   pfx: fs.readFileSync('./ssl/cert.pfx'),
    passphrase: '134679582ioa'
},app)

export const io = new Server(server, {
    cors: {
        origin: 'https://localhost:5173',
        methods: ['GET','POST','DELETE']
    }
})
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
       let response = await APIFetch({url:`${baseUrl}/channels/channel/${data.channelName}?userEmail=${data?.user.email}`});
       console.log(`RESPONSE:`, response);
       console.log(`ID:`, socket.id);
        currentChannel.to(socket.id).emit('get_channel', response)
    })

    socket.on('send_message', async(data)=>{
        console.log(`MESSAGE: `, data);
        if(!data?.user) return
        console.log(`ROOM:`, data.room);
        let response = await APIFetch({
            url:`${baseUrl}/messages/create`,
            method:'POST',
            body:{
                userEmail:data?.user.email, channelId:data?.channelId, message: data?.message
            },
        }); 
        if(!response.success){
              return  io.sockets.in(data.room).emit('receive_message',response)
        }
        currentChannel.in(data.room).emit('receive_message',{data:{messages:response.data.channel.messages,message:response.data.message}})
    });
    socket.on('delete_message',async(data)=>{
        console.log(`DATA:`, data);
        if(data.message_id){
            let response = await APIFetch({url:`${baseUrl}/messages/delete?message_id=${data.message_id}&userEmail=${data.userEmail}&channel_id=${data.channel_id}`, method:'DELETE' })
            currentChannel.in(data.channel_id).emit("delete_message",response)
        }

    })
    socket.on('disconnect',()=>{
        console.log(`Client ${socket.id} disconnected`);
    })
})