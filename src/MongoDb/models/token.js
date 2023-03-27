import mongoose from "mongoose";



const refreshToken = new mongoose.Schema({
    refreshToken : {
        type: String,
    }
}, {versionKey: false })


refreshToken.method('transform', function() {
    let obj = this.toObject();

    //Rename fields
    obj.id = obj._id;
    delete obj._id;

    return obj;
});
const refreshTokenScheme = mongoose.model('refreshToken', refreshToken)


export default refreshTokenScheme 