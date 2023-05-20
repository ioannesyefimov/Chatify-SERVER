import {Server} from 'socket.io'
import https from 'https'
import cors from 'cors'
import fs from 'fs'
import express from 'express'
import { getChannel } from '../Routes/ChannelsRoute/ChannelRoute.js'
import { createMessage, deleteMessage } from '../Routes/MessagesRoute/MessageRoute.js'

export const app = express();

const baseUrl = `https://localhost:5050/api`
export const server = https.createServer({
   pfx: fs.readFileSync('./ssl/cert.pfx'),
    passphrase: '134679582ioa',
    
},app)

export const io = new Server(server, {
    cors: {
        origin: ['https://localhost:5173','https://192.168.1.102.nip.io:5173'],
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
const userIo = io.of('/user')
const currentChannelCall = io.of('/current-channel-call')
let onlineUsers = []
userIo.on('connection',(socket)=>{
    console.log(`User connected to userSocket by ${socket.id}`)
    socket.to(socket.id).emit('user_online',{online:onlineUsers})
    socket.on('user_online',async data=>{
        console.log(`useronline data`, data);
        if(!data.userId) return console.error('missing userid')
        let isOnline = onlineUsers.some(user=>user?.userId===data?.userId)
        if(isOnline) return socket.emit('user_online',{online:onlineUsers})
        onlineUsers.push({userId:data.userId,socketId:socket.id})
        socket.join('onlineUsers')
        socket.in('onlineUsers').emit('user_online',{online:onlineUsers})
        console.log(`onlineusers: `,onlineUsers);

        console.log(`CONNECTED SOCKET:`, Object.keys(io.of('user')?.sockets));
    });
    socket.on('disconnect', (data)=>{
        onlineUsers = onlineUsers.filter(user=>{
            console.log(`USER`,user);
            console.log(`socketId`,socket.id);
            return    user.socketId !== socket.id
        })
        socket.leave('onlineUsers')
        console.log(`onlineusers: `,onlineUsers);
        socket.in('onlineUsers').emit('user_online',{online:onlineUsers})

    });



})
currentChannel.on('connection', (socket)=>{
    console.log(`User connected to currentChannel socket by  ${socket.id}`)
    socket.on('join_channel',async data=>{
        socket.join(data.room)
        console.log(`User "${data?.user?.email}: JOINED channel with id:`, data.room);
        socket.emit('join_channel',{data:{room:data.room}})
        console.log(`ONLINE_USERS:`,onlineUsers)
    });
    socket.on('leave_channel',async(data)=>{
        if(!data) return
        socket.leave(data)
        console.log(`USER "${data.user?.email}" left room "${data.id}"`);
    })
    socket.on('get_online_users', ()=>{
        socket.emit('get_online_users',{online:onlineUsers})
    })
 
    socket.on('send_message', async(data)=>{
        console.log(`MESSAGE: `, data);
        console.log(`ROOM:`, data.room);
        
        let response = await createMessage({body:{
            userEmail:data?.user.email, channelId:data?.channel_id, message: data?.message

        }})        
        console.log(`RESPONSE:`, response);
        if(!response?.success){
              return   currentChannel.in(data.room).emit('receive_message',response)
        }
        currentChannel.to(data.room).emit('receive_message',{data:{messages:response.data.channel.messages,message:response.data.message}})
    })
    socket.on('delete_message',async(data)=>{
        let sockets = await io.in(data.channel_id).fetchSockets()
        console.log(`SOCKETS in a room`, sockets);
        console.log(`DATA:`, data);
            let response = await deleteMessage({query:{message_id:data?.message_id,userEmail:data?.userEmail,channel_id:data?.channel_id}});
            console.log(`RESPONSE`, response);
          currentChannel.to(data.channel_id).emit('delete_message',response)
            
    })


    socket.on('disconnect',()=>{ 
        console.log(`Client ${socket.id} disconnected from currentChannel`);
    })
})

currentChannelCall.on('connection', socket=>{
    console.log(`${socket.id} connected to currentChannelCall`)

    socket.on('disconnect',()=>{
        console.log(`${socket.id} disconnected`)
        socket.broadcast.emit(`callEnded`)
    })

    socket.on('channel_call',data=>{
        const {signal,from,channel_id}=data
        console.log(`DATA:`,data);
        socket.broadcast.to(channel_id)?.emit('received_call',{answer:signal,from,channel_id})
    })
    socket.on('channel_answer_call',data=>{
        console.log(`DATA:`,data)
        socket.to(data?.channel_id).emit('received_call',{answer:data?.answer,channel_id:data?.channel_id})
    })
})
