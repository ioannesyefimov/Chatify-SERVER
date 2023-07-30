
import { createMessage, deleteMessage } from '../Routes/MessagesRoute/MessageRoute.js'
import https from 'https'
import cors from 'cors'
import {Server} from 'socket.io'
import fs from 'fs'
import express from 'express'
 import { sleep } from '../utils.js'
import { User } from '../MongoDb/index.js'
import { log } from 'console'
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
      origin: ['https://localhost:5173','https://192.168.1.102:5173','https://192.168.1.101:5173'],
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
      const isOnline = onlineUsers[socket.id]
      if(isOnline){
        userIo.to(socket.id).emit('user_online',{isOnline:true})
        return 
      }
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
        console.log(`USER "${data.user}" left room "${data.id}"`);
    })
    socket.on('get_online_users', ()=>{
        socket.emit('get_online_users',{online:onlineUsers})
    })
 
    socket.on('send_message', async(data)=>{
        console.log(`MESSAGE: `, data);
        console.log(`from:`, data.from);
        console.log(`ROOM:`, data.room);
        let response = await createMessage({body:{
            userEmail:data?.user.email, channelId:data?.channel_id, message: data?.message
        }})        
        console.log(`RESPONSE:`, response);
        if(!response?.success){
          currentChannel.to(data.room).emit('receive_message',response)
          return     
        }
        currentChannel.to(data.room).emit('receive_message',{ data:{from:data.from,messages:response.data.channel.messages,message:response.data.message}})
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
 
  socket.on('join_room',async (data)=>{
    const {user,room}=data
    console.log(`data:`,data)
    
    if(!user?._id  ||!user?.userName || !room) return 
    if(connectedUsers[user._id]?.room ===room){
      let users = findUsersInRoom(room,connectedUsers)
      currentChannelCall.to(socket.id).emit('users',users)
      return
    }

    if(!user?._id || !room) console.error(`error: missing ID OR ROOM ID ${user?._id}, ${room}`)
    // if(connectedUsers[userId]?.socketId) {
    //   let users = findUsersInRoom(room,connectedUsers)
    //   return console.log(`already online in a room`)
    // }
    addUser(user,socket.id,room)
    console.log(`users`,connectedUsers);
    let users = findUsersInRoom(room,connectedUsers,user?._id)
     socket.join(room)
    console.log(`connectedUsers`,connectedUsers);
    console.log(`found users`,users);
    // currentChannelCall.to(socket.id).emit('use rs', users);
    currentChannelCall.to(room).emit('users', users);
    sleep(2000).then(()=>{
      socket.broadcast.to(room).emit('join_room',user._id)
    })
  })

  socket.on('disconnect',async () => {
    console.log('A user disconnected:', socket.id);
    const userId = findUserId(socket.id,connectedUsers)
    console.log('connected users :', connectedUsers);
    console.log('USER ID :', userId);
    if(!userId) return 
    const room = connectedUsers[userId]?.room
    console.log('A room:', room)
    await socket.leave(room)
    removeUser(userId)
    // currentChannelCall.to(room).emit('users', users);
    currentChannelCall.to(room).emit('user-disconnected',userId);
  });
  socket.on('joinCallUser',(userId)=>{
    currentChannelCall.to(socket.id).emit('joinCallUser',userId)
  })
  socket.on('offer', ({ userId,fromUserId, from, offer,socketId,fromSocket }) => {
    if(!userId || !fromUserId || !from ||!offer ||!socketId || !fromSocket) return 
    console.log(`Received offer from ${from} for user ${userId}:`, offer);
    let isOnline = connectedUsers[userId]?.socketId
    console.log(`isOnline`,isOnline)
    if(!isOnline)return 
    console.log(`userId:${userId}. From:${from}`);
    currentChannelCall.to(isOnline).emit('offer', { userId,from,fromSocket,socketId, offer });
  });

  socket.on('answer', ({ userId, answer,socketId,from }) => {
    if(!userId||!answer||!socketId||!from)
    console.log(`Received answer from ${socket.id} for user ${socketId}:`, answer);
    console.log(`userId:${userId}. socketId:${socketId}`);
    let isOnline = connectedUsers[userId]?.socketId
    console.log(`isOnline`,isOnline);
    if(!isOnline) return console.log(`NOT ONLINE`)
    currentChannelCall.to(socketId).emit('answer',  { userId,socketId, answer ,from});
  });

  socket.on('iceCandidate', ({ userId,socketId, candidate }) => {
    if(!userId || !socketId || !candidate) return
    console.log(`Received ICE candidate from ${socket.id} for user ${socketId}:`, candidate);
    let isOnline = connectedUsers[userId]?.socketId
    console.log(`icecandidate userId:`,userId);
    console.log(`isOnline`,isOnline);
    console.log(`icecandidate socketId`,socketId);
    if(isOnline )
    currentChannelCall.to(socketId).emit('iceCandidate', { userId,socketId:socket.id, candidate });
  });

  socket.on('call-peer',(data)=>{
    const {userId=undefined,fromUserId}= data
    if(!userId || fromUserId) return
    let user = connectedUsers[userId]?.socketId
    let fromUser = connectedUsers[fromUserId]
    currentChannelCall.to(user).emit('call-peer', fromUser?.userId)
  })
  socket.on('media-track',data=>{
    console.log(`media-track data:`,data);
    socket.broadcast.to(data.room).emit('media-track',data)
  })

  function addUser(user, socketId,room) {
    connectedUsers[user._id] = {socketId,room,userName:user.userName,picture:user.picture};
    socket.to(socketId).emit('userAdded', user._id);
  }
  function findUsersInRoom(room,obj,userID){
    if(!obj || !room) return
    let usersObj=Object.keys(obj).map(userId=>{
      console.log(`room:`,room);
      console.log(`user room:`,obj[userId].room);
      if(!userId || obj[userId].room !== room) return
      // if(userId===userID ) return
        if(obj[userId].room===room){
          let user={user:{userId,userName:obj[userId].userName, socketId:obj[userId].socketId,room,picture:obj[userId.picture]}}
          return user
        } 
    }).filter(userInRoom=>userInRoom !== null && userInRoom !== undefined)
    console.log(`usersObj`,usersObj);
    return usersObj
  }
  
  // function removeUser(socketId) {
  //   const userId = findUserId(socketId,connectedUsers);
  //   console.log(`remove func: USERID:`,userId);
  //   if (userId) {
  //     let room = connectedUsers[userId]?.room
  //     delete connectedUsers[userId];
  //     // currentChannelCall.to(room).emit('userRemoved', userId);
  //   }
  // }
  function removeUser(userId) {
    // const userId = findUserId(socketId,connectedUsers);
    console.log(`remove func: USERID:`,userId);
    if (userId) {
      let room = connectedUsers[userId]?.room
      delete connectedUsers[userId];
      // currentChannelCall.to(room).emit('userRemoved', userId);
    }
  }
  
  function findUserId(socketId, obj) {
    const userId = Object.keys(obj).find((id) => obj[id].socketId === socketId);
    return userId;
  }
  function findReceiverId(senderId) {
    return Object.keys(connectedUsers).find((userId) => userId.socketId !== senderId);
  }
});