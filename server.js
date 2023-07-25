import * as dotenv from 'dotenv'



import {Login,User} from './src/MongoDb/models/index.js'

import {GetUserRoute, uploadRoute,ChannelChangeRoute, GoogleRoute, facebookRoute, GitHubRoute, UserDataRoute, RegisterRoute, SignInRoute, TokenRoute, changeProfileRoute, ChannelRoute, RoleRoute,MessageRoute} from './src/Routes/index.js'

import connectDB from './src/MongoDb/connect.js'
import { Channel } from './src/MongoDb/index.js'

import {app,server} from './src/socket-io/index.js'


export async function handleUserWatch(data){
  console.log(`USER CHANGE : ` ,data)
  if(data.operationType==='delete'){
    let leftChannels = await Channel.updateMany({"members.member":data?.documentKey?._id},{$pull: {'members.member':data?.documentKey?._id}}) 
    console.log(`left channels`,leftChannels)
    if(!leftChannels?.length){
      let leftChannels = await Channel.update({},[{ $replaceWith: {
        $arrayToObject: {
              $filter: {
                input: { $objectToArray: "$$ROOT" },
                as: "item",
                cond: { $ne: ["$$item.v", null] }
              }
            }
          }}],
          { multi: true })
         console.log(`left chaneels 2 `, leftChannels);
       }
      }
}





  
Login.watch().on('change', data=>console.log(`LOGIN CHANGE: ` ,data))
User.watch().on('change', handleUserWatch)
    
Channel.watch().on('change', data=>console.log(`CHANNEL CHANGE :` , data))


app.route('/api/').get((req,res)=>res.send('Hello from chatify server!'))
dotenv.config()


app.use('/api/users',GetUserRoute)
app.use('/api/auth/register', RegisterRoute)
app.use('/api/auth/signin', SignInRoute)

app.use('/api/auth/github', GitHubRoute)
app.use('/api/auth/facebook', facebookRoute)
app.use('/api/auth/google', GoogleRoute)
app.use('/api/auth/user', UserDataRoute)


app.use("/api/auth/token", TokenRoute)
app.use("/api/upload", uploadRoute)
app.use('/api/change', changeProfileRoute)
app.use('/api/channel/change', ChannelChangeRoute)
app.use('/api/channels', ChannelRoute)
app.use('/api/messages', MessageRoute)

app.use('/api/roles',RoleRoute)





const PORT = process.env.PORT || 5050

const StartServer = async ()=>{
    try {
        connectDB(process.env.MONGODB_URL);
        server.listen(PORT,process.env.IP_ADDRESS ?? null, () => console.log(`Server is running on port ${PORT} `))
    } catch (error) {
        console.log(error)
    }
}

StartServer()


