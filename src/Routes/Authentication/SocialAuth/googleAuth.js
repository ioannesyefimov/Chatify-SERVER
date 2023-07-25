import { OAuth2Client } from "google-auth-library";
import * as dotenv from 'dotenv'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

dotenv.config()

// console.log(GOOGLE_CLIENT_ID)
async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });
        // console.log(ticket)
        return {payload: ticket.getPayload()};
    } catch (err){
        return{err: "Invalid user detecte. Please try again."}
    }
}

export default verifyGoogleToken