import connectDB,{conn} from "./connect.js";
import User from "./models/user.js";
import Login from "./models/login.js";
import Channel from "./models/channel.js";
import Message from "./models/message.js";
import Role from "./models/role.js";
import Permission from "./models/Permission.js";
export {
    connectDB,conn,User,Login,Message,Channel,Permission,Role
}