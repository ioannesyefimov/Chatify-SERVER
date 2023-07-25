import GetUserRoute from './Authentication/getUsers.js'
import GoogleRoute from './Authentication/googleAuth.js'
import SignInRoute from './Authentication/SingInRoute.js'
import RegisterRoute from './Authentication/RegisterRoute.js'
import TokenRoute from './Authentication/tokenRoute.js'
import GitHubRoute from './Authentication/githubAuthRoute.js'
import UserDataRoute from './Authentication/getUserData.js'
import uploadRoute from './uploadRoute/uploadRoute.js'
import changeProfileRoute from './changeProfile/changeProfile.js'
import facebookRoute from './Authentication/facebookAuthRoute.js'
import ChannelRoute from './ChannelsRoute/ChannelRoute.js'
import MessageRoute from './MessagesRoute/MessageRoute.js'
import ChannelChangeRoute from './ChannelsRoute/ChangeChannelRoute.js'
import RoleRoute from './Roles/roles.js'
export {
    GetUserRoute, RoleRoute,ChannelRoute, MessageRoute, facebookRoute, changeProfileRoute,SignInRoute, GoogleRoute,GitHubRoute,UserDataRoute ,TokenRoute, RegisterRoute,uploadRoute,ChannelChangeRoute
}