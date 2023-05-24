
import { createMessage, deleteMessage } from '../Routes/MessagesRoute/MessageRoute.js'
import https from 'https'
import cors from 'cors'
import {Server} from 'socket.io'
import fs from 'fs'
import express from 'express'

export const app = express();
app.use(
  cors()
)

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));


export const server = https.createServer({
  pfx:fs.readFileSync('./ssl/cert.pfx'),
  passphrase:'134679582ioa'
},app)


export const io = new Server(server, {
  cors: {
      origin: ['https://localhost:5173','https://192.168.1.102:5173'],
      methods: ['GET','POST','DELETE']
  },
  
})

app.set('socketio',io)

const currentChannel = io.of('/currentChannel')
const userIo = io.of('/user')
const currentChannelCall = io.of('/current-channel-call')
let onlineUsers = {}
userIo.on('connection',(socket)=>{
    console.log(`User connected to userSocket by ${socket.id}`)
    
    
    socket.on('user_online',async data=>{
      console.log(`useronline data`, data);
      if(!data.user_id) return console.error('missing userid')
      addUser(data?.user_id,socket?.id)
      socket.join('onlineUsers')
      socket.to(socket.id).emit('user_online',{online:onlineUsers})
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



const connectedUsers = {};

currentChannelCall.on('connection', socket=>{
  console.log('A user connected:', socket.id);
  
  socket.on('join_room', ({userId,room})=>{
    if(!room) return console.error(`ROOM IS empty`)
    socket.join(room);
    addUser(userId,socket.id,room)
    console.log(`users`,connectedUsers);
    let users = findUsersInRoom(room,connectedUsers)?.filter(user=>user!==userId)
    currentChannelCall.emit('users', users);
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    const user = findUserId(socket.id)
    removeUser(socket.id)
    let users = findUsersInRoom(user?.room,connectedUsers) 
    currentChannelCall.emit('users', users);
  });

  socket.on('offer', ({ userId, offer }) => {
    console.log(`Received offer from ${socket.id} for user ${userId}:`, offer);
    currentChannelCall.to(userId).emit('offer', { userId: socket.id, offer });
  });

  socket.on('answer', ({ userId, answer }) => {
    console.log(`Received answer from ${socket.id} for user ${userId}:`, answer);
    currentChannelCall.to(userId).emit('answer', { userId: socket.id, answer });
  });

  socket.on('iceCandidate', ({ userId, candidate }) => {
    console.log(`Received ICE candidate from ${socket.id} for user ${userId}:`, candidate);
    currentChannelCall.to(userId).emit('iceCandidate', { userId: socket.id, candidate });
  });

  

  function addUser(userId, socketId,room) {
    connectedUsers[userId] = {socketId,room};
    currentChannelCall.to(socketId).emit('userAdded', userId);
  }
  function findUsersInRoom(room,obj){
    if(!obj) return []
    return Object.keys(obj).filter(key=>{
      console.log(`KEY:`,key)
      console.log(`obj:`,obj[key])
      console.log(`room:`,room)
        return obj[key].room ===room
    })
  }
  
  function removeUser(socketId) {
    const userId = findUserId(socketId);
    if (userId) {
      delete connectedUsers[userId];
      currentChannelCall.emit('userRemoved', userId);
    }
  }
  
  function findUserId(socketId) {
    return Object.keys(connectedUsers).find((userId) => connectedUsers[userId].socketId === socketId);
  }
  
  function findReceiverId(senderId) {
    return Object.keys(connectedUsers).find((userId) => userId.socketId !== senderId);
  }
});