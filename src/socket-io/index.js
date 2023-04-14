import io,{Socket} from 'socket.io'
import { server } from '../../server'
import { createDate, populateCollection } from '../utils'
import { getChannel } from '../Routes/ChannelsRoute/ChannelRoute'
import { Channel } from '../MongoDb'

const io = new Server(server, {
    cors: {
        origin: 'https://localhost:5173',
        methods: ['GET','POST','DELETE']
    }
})
io.on('connection', (socket)=>{
    console.log(`User connected ${socket.id}`)
    socket.emit('response', "hello from server")

    socket.on('join_channel',async data=>{
        socket.join(data)
        console.log(`JOINED`, data);
    });

    socket.on('message',data=>{console.log(`DATA:`,data);})

    socket.on('get_channel',async(data)=>{
        console.log(`GETTING CHANNEL`,data);
        let channel = await Channel.findOne({channelName:data.channelName,"members.member":data.user._id});
        if(!channel) {
             socket.emit('get_channel_response', {success:false,message:Errors.NOT_FOUND})
        }else {
            let populatedChannel = await populateCollection(channel,'Channel');
            socket.emit('get_channel_response',{channel:populatedChannel})
            
        }
    })

    socket.on('send_message',(data)=>{
        console.log(`MESSAGE: `, data);
        socket.to(data.room).emit('receive_message',data)
    });
    socket.on('delete_message',(data)=>{

    })
})
