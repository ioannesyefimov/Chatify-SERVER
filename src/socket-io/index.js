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
let onlineUsers = {}
userIo.on('connection',(socket)=>{
    console.log(`User connected to userSocket by ${socket.id}`)
    socket.to(socket.id).emit('user_online',{online:onlineUsers})


    socket.on('user_online',async data=>{
        console.log(`useronline data`, data);
        if(!data.user_id) return console.error('missing userid')
        addUser(data?.user_id,socket?.id)
        socket.join('onlineUsers')
        socket.to('onlineUsers').emit('user_online',onlineUsers)
        console.log(`onlineusers: `,onlineUsers);

        console.log(`CONNECTED SOCKET:`, Object.keys(io.of('user')?.sockets));
    });
    socket.on('disconnect', (data)=>{
        removeUser(socket?.id)
        socket.leave('onlineUsers')
        console.log(`onlineusers: `,onlineUsers);
        socket.to('onlineUsers').emit('user_online',onlineUsers)

    });

    function addUser(userId, socketId,) {
        onlineUsers[socketId] = userId;
        socket.to(socketId).emit('userAdded', userId);
      }
      
      function removeUser(socketId) {
        const userId = findUserId(socketId);
        if (userId) {
          delete onlineUsers[userId];
          socket.to().emit('userRemoved', userId);
        }
      }
      
      function findUserId(socketId) {
        console.log(`SOCKET_ID`,socketId)
        console.log(`users`,onlineUsers)
        return Object.keys(onlineUsers).find((userId) => socketId === userId);
      }
      
      function findReceiverId(senderId) {
        return Object.keys(onlineUsers).find((userId) => userId !== senderId);
      }



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
const connectedUsers = {}
currentChannelCall.on('connection', socket=>{
    console.log(`${socket.id} connected to currentChannelCall`)
    socket.on('join_room',data=>{
        socket.join(data?.room)
        console.log(`User ${data?.user_id} joined ${data?.room}`)
        addUser(data?.user_id, socket.id,data?.room);
        socket.to(socket.id).emit('join_room',{message:`User ${data?.user_id} joined ${data?.room}`})
        socket.broadcast.to(data?.room).emit('new_peer',{user_id:data?.user_id})
        // socket.broadcast.to(data?.room).emit('candidate',{user_id:data?.user_id,room:data?.room,socket_id:socket.id})
    })
    socket.on('message',data=>{
        console.log(`message data:`,data);
        console.log(`USERS:`,connectedUsers);
        socket.to(data?.room).emit('message',data)
       
    })

    socket.on('disconnect',()=>{
        console.log(`${socket.id} disconnected`)
        removeUser(socket.id);
        socket.broadcast.emit(`callEnded`)
    })

    socket.on('candidate',data=>{
        console.log(`DATA`,data)
        const {user_id,candidate,room}=data
        socket.to(room).emit({user_id,candidate,room})
    })
   function addUser(userId, socketId,room) {
        connectedUsers[userId] = {socketId,room};
        io.to(socketId).emit('userAdded', userId);
      }
      
      function removeUser(socketId) {
        const userId = findUserId(socketId);
        if (userId) {
            let room = connectedUsers[userId]?.room
            console.log(`room:`,room);
          delete connectedUsers[userId];
          socket.to(room).emit('userRemoved', userId);
        }
      }
      
      function findUserId(socketId) {
        console.log(`SOCKET_ID`,socketId)
        console.log(`users`,connectedUsers)
        return Object.keys(connectedUsers).find((userId) => connectedUsers[userId]?.socketId === socketId);
      }
      
      function findReceiverId(senderId) {
        return Object.keys(connectedUsers).find((userId) => userId !== senderId);
      }
    
})
