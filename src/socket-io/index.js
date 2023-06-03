
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
      userIo.to(socket.id).emit('user_online',{online:onlineUsers})
      userIo.to('onlineUsers').emit('user_online',onlineUsers)
        console.log(`onlineusers: `,onlineUsers);

        console.log(`CONNECTED SOCKET:`, Object.keys(io.of('user')?.sockets));
    });
    socket.on('disconnect', (data)=>{
        removeUser(socket?.id)
        socket.leave('onlineUsers')
        console.log(`onlineusers: `,onlineUsers);
        userIo.to('onlineUsers').emit('user_online',onlineUsers)

    });

    function addUser(userId, socketId,) {
        onlineUsers[socketId] = userId;
        userIo.to(socketId).emit('userAdded', userId);
      }
      
      function removeUser(socketId) {
        const userId = findUserId(socketId);
        if (userId) {
          delete onlineUsers[userId];
          userIo.emit('userRemoved', userId);
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
              return currentChannel.to(data.room).emit('receive_message',response)
        }
        currentChannel.to(data.room).emit('receive_message',{data:{messages:response.data.channel.messages,message:response.data.message}})
    })
    socket.on('delete_message',async(data)=>{
        let sockets = await currentChannel.in(data.channel_id).fetchSockets()
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
    if(!userId || !room) console.error(`error: missing ID OR ROOM ID ${userId}, ${room} `)
    if(findUserId(socket.id,connectedUsers)?.userId) return console.log(`already online in a room`)
    // if(!room) return console.error(`ROOM IS empty`)
    socket.join(room)
    addUser(userId,socket.id,room)
    console.log(`users`,connectedUsers);
    let users = findUsersInRoom(room,connectedUsers)
    console.log(`found users`,users);
    currentChannelCall.to(room).emit('users', users);
  })

  socket.on('disconnect',async () => {
    console.log('A user disconnected:', socket.id);
    const userId = findUserId(socket.id,connectedUsers)
    const room = connectedUsers[userId]?.room
    console.log('A room:', room)
    await socket.leave(room)
    removeUser(socket.id)
    let users = findUsersInRoom(room,connectedUsers) 
    currentChannelCall.to(room).emit('users', users);
  });

  socket.on('offer', ({ userId,from, offer,socketId,fromSocket }) => {
    console.log(`Received offer from ${from} for user ${socketId}:`, offer);
    let isOnline = connectedUsers[userId].socketId
    console.log(`isOnline`,isOnline);

    console.log(`userId:${userId}. From:${from}`);
    currentChannelCall.to(socketId).emit('offer', { userId,from,fromSocket,socketId, offer });
  });

  socket.on('answer', ({ userId, answer,socketId,from }) => {
    console.log(`Received answer from ${socket.id} for user ${socketId}:`, answer);
    console.log(`userId:${userId}. socketId:${socketId}`);
    let isOnline = connectedUsers[userId].socketId
    console.log(`isOnline`,isOnline);
    if(!isOnline) return console.log(`NOT ONLINE`)
    currentChannelCall.to(socketId).emit('answer', { userId,socketId, answer ,from});
  });

  socket.on('iceCandidate', ({ userId,socketId, candidate }) => {
    console.log(`Received ICE candidate from ${socket.id} for user ${socketId}:`, candidate);
    let isOnline = connectedUsers[userId].socketId
    console.log(`icecandidate userId:`,userId);
    console.log(`isOnline`,isOnline);
    console.log(`icecandidate socketId`,socketId);
    if(isOnline )
    currentChannelCall.to(socketId).emit('iceCandidate', { userId: socket.id, candidate });
  });

  

  function addUser(userId, socketId,room) {
    connectedUsers[userId] = {socketId,room};
    currentChannelCall.to(socketId).emit('userAdded', userId);
  }
  function findUsersInRoom(room,obj){
    console.log(`obj :`,obj)
    if(!obj || !room) return [{}]
    let usersObj=Object.keys(obj).map(userId=>{
      console.log(`userId:`,userId)
      console.log(`obj + key:`,obj[userId])
      console.log(`room:`,room)
        if(obj[userId].room===room){
          let user={user:{userId, socketId:obj[userId].socketId,room}}
          return user
        }
    })
    console.log(`usersObj`,usersObj);
    return usersObj
   
  }
  
  function removeUser(socketId) {
    const userId = findUserId(socketId,connectedUsers);
    console.log(`USERID:`,userId);
    if (userId) {
      let room = connectedUsers[userId]?.room
      delete connectedUsers[userId];
      currentChannelCall.to(room).emit('userRemoved', userId);
    }
  }
  
function findUserId(socketId, obj) {
  if (!obj) return null;
  const userId = Object.keys(obj).find((id) => obj[id].socketId === socketId);
  return userId || null;
}
  
  function findReceiverId(senderId) {
    return Object.keys(connectedUsers).find((userId) => userId.socketId !== senderId);
  }
});