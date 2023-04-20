import jwt from 'jsonwebtoken'
import { Schema } from 'mongoose';
export function capitalize(string){
  return string && string.charAt(0).toUpperCase() + string.slice(1);
}
export 
function validateName(name){
    let specialsRegex=/[*|\":<>[\]{}`\\()';@&$]/;
    if(specialsRegex.test(name)){
        return false
    }
    return true
}
export const createDate = ()=>{
  const today = new Date();
const DATE = {day:"",time:""}
const yyyy = today.getFullYear();
let mm = today.getMonth() + 1; // Months start at 0!
let dd = today.getDate();

if (dd < 10) dd = '0' + dd;
if (mm < 10) mm = '0' + mm;

const formattedToday = dd + '/' + mm + '/' + yyyy;
  DATE.day = formattedToday
  DATE.time = today.toLocaleTimeString()
  return DATE
}

export function populateCollection(collection, name){
  return new Promise((resolve, reject) => {
    if(name === 'User' && collection?.email){
      // console.log(`COLLECTION USER: `, collection)
      return resolve(
        collection.populate([
          {
              path:'channels.channel', 
              model:"Channel"
          },
          {
              path:'channels.channel.members.member',
              model: 'User',
          },
          {
              path: 'channels.channel.members.roles',
              model: 'Role',
              populate: [{
                  path:'permissions',
                  model:'Permission'
              }]
          },
        ])
        )
    } else if (name === 'Channel' && collection?.channelName){
      // console.log(`COLLECTION Channel: `, collection)

        return resolve(
          collection.populate([
          {
              path: 'members.member',
              model: 'User',
              populate: [{
                  path:'channels.channel',
                  model: 'Channel',
              }]
          },
          {
            path: 'messages',
            model: 'Message',
            populate: [{
                path:'user',
                model: 'User',
            },{
              path:'channelAt',
              model: 'Channel'
            }]
          },
          {
            path: 'members.roles',
            model:'Role',
            populate: [{
              path:'permissions',
              model:'Permission'
           }]
          },
          
         
        ])
        )   
    } else if (name === 'Message' && collection?.message){
      // console.log(`COLLECTION Message: `, collection)
        return resolve(
          collection.populate([
            {
              path: 'user',
              model:'User',
            },
            {
              path:'channelAt',
              model:"Channel",
              populate: [{
                  path: 'messages',
                  model:'Message'
              }]
            },
        ])
        )   
      } 
      return reject(`${name} wasn't found in function`)
  })
}


export function validateIsEmpty(params){
  
  return new Promise((resolve,reject)=>{
    let missing={};
    for ( let param in params){
      if(!params[param]){
        missing[param] = param
      }
    }
    console.log(`missing: `, missing)
    if(Object.keys(missing).length > 0){
      return reject({success:false,missing})
    }
    if(Object.keys(missing).length === 0){

      return resolve({success:true})
    }

  })
}

export const executeInQueue = async ({
  dataAry, //the array that you .map through
  callback, //the function that you fire inside .map
  idx = 0,
  results = [],
  session
}) => {
  if (idx === dataAry?.length) return results;
  //else if idx !== dataAry.length
  let d = dataAry[idx];

  try {
    let result = await callback(d, idx);

    results.push(result);

    return executeInQueue({
      dataAry,
      callback,
      log,
      idx: idx + 1,
      results,
      session
    });
  } catch (err) {
    console.log({ err });
    return results.push("error");
  }
};

export const throwErr =  ( err) =>{
 
  if(err?.name ){
    let ERR = new Error
    ERR.name = err?.name
    ERR.code = err?.code
    ERR.arguments = err?.arguments
    throw ERR

  }
  else {
    throw new Error({message: err})
  }
}

export function checkError(error,res){
  console.log(`SERVER error: `, error)
  console.log(`typeof error: `, typeof error)
    let errors = {};
    if(error.name === 'ValidationError'){
      Object.keys(error.errors).forEach((key)=>{
          errors[key] = error.errors[key]?.message;
          
      })
      console.log(error)
      return res.status(400).send({success:false, message:errors})

    } else
    if(error?.code){
      console.log(`error code : `)
      let errors = {}
      let filteredErrs = Object.keys(error).filter(
          (err, i)=> err !== 'code' && err !=='index') 
    console.log(filteredErrs)       
    filteredErrs = filteredErrs.forEach((key,ind)=>{
      if(key === 'keyPattern'){
          errors['Duplicate_Pattern'] = error[key]
      } else
      if(key === 'keyValue'){
          errors['Duplicate_Value'] = error[key]
      }else{

          errors[key] = error[key]
      }
      })
      console.log(`FILTERED: `, filteredErrs)
      console.log(`error: `, error)
      console.log(`errors: `, errors)
      if(Object.keys(errors).length === 0){
        return res.status(400).send({success:false,message:error})
      }
      return res.status(400).send({success:false,message:errors})

    }
    return res.status(500).send({succes:false,message: error})

  
}
export function containsEncodedComponents(x) {
  // ie ?,=,&,/ etc
  return (decodeURI(x) !== decodeURIComponent(x));
}
 
export  const APIFetch = async({url,
  method='get',
 headers={
  "Content-Type": "application/json",
}, 
body,
signal}) => {
  console.log(`headers: `, headers);
  console.log(`body: `, body);
  console.log(`url: `, url)
 return !method?.toLowerCase().includes('get')   ? (
  await fetch(url, {
    method: method,
    signal,
    headers,
    body: JSON.stringify(body)
  }).then(response=>response?.json())
 ) : (
  
  await fetch(url, {
    method: method,
    headers,
    signal  ,
  }).then(response=>response?.json())
 )
}

export function validatePassword(password, name){
    // check whether password doesn't contains at least 
    // 1 uppercase, 1 lowercase, 1 number, and 1 special character. 
    // If it doesn't contains everything mentioned, returns true
    const password_rgx = /^(.{0,7}|[^0-9]*|[^A-Z]*|[^a-z]*|[a-zA-Z0-9]*)$/

    function kmpSearch(pattern, text) {
      
        if (pattern.length == 0)
          return 0; // Immediate match
        // change inputs to lowercase so that comparing will be non-case-sensetive
       pattern = pattern.toLowerCase()
       text = text.toLowerCase()
        // Compute longest suffix-prefix table
        let lsp = [0]; // Base case
        for (let i = 1; i < pattern.length; i++) {
          let j = lsp[i - 1]; // Start by assuming we're extending the previous LSP
          while (j > 0 && pattern[i] !== pattern[j])
            j = lsp[j - 1];
          if (pattern[i] === pattern[j])
            j++;
          lsp.push(j);
        }
      
        // Walk through text string
        let j = 0; // Number of chars matched in pattern
        for (let i = 0; i < text.length; i++) {
          while (j > 0 && text[i] != pattern[j])
            j = lsp[j - 1]; // Fall back in the pattern
          if (text[i]  == pattern[j]) {
            j++; // Next char matched, increment position
            if (j == pattern.length)
              return i - (j - 1);
          }
        }
        return -1; // Not found
      }
    
      const hasNamePatternInPassword = kmpSearch(name, password)

      const isInValidPassword = password_rgx.test(password)
      console.log(password);
      console.log(isInValidPassword);
    
    if((hasNamePatternInPassword != -1) ){
        return Errors.PASSWORD_CONTAINS_NAME
    } else if(isInValidPassword == true) {
      console.log(`invalid in checker`);
        return Errors.INVALID_PASSWORD
    } else {
      console.log(`valid checker`);
      return `valid`
    }
}

export const Errors = {
  INVALID_CHANNEL_NAME: `Channel name must not contain any special characters such as [*|\":<>[\]{}\`\()';@&$] `,
  CHANNEL_NOT_FOUND: `Such channel wasn't found. Try to type in differently`,
  CHANNELS_NOT_FOUND: `Channels weren't found`,
  USER_NOT_FOUND: `Such user isn't registereg`,
  NOT_A_MEMBER: `You are not a member of this channel. First, join channel`,
  ALREADY_MEMBER:`Such user is already a member`,
  INVALID_PASSWORD: `must be in English and contains at least one uppercase and lowercase character, one number, and one special character`,
  PASSWORD_CONTAINS_NAME: `Password must not contain user's name`,
  USER_EXIST: `USER is already signed up`,
  EMAIL_EXIST: `User was already signed up by this email`,
  NOT_FOUND: 'Not found',
  WRONG_PASSWORD: `WRONG_PASSWORD`,
  INVALID_EMAIL: `Type in valid email`,
  WRONG_EMAIL: `Wrong email`,
  CANNOT_CONTAIN_NUMBERS: `CANNOT CONTAIN NUMBERS`,
  LOGGED_THROUGH_SOCIAL: "LOGGED THROUGH SOCIAL",
  CANNOT_BE_EMPTY: `THIS FIELD CANNOT BE EMPTY`,
  NOT_SIGNED_UP: `NOT SIGNED UP`,
  SIGNED_UP_DIFFERENTLY: `SIGNED UP DIFFERENTLY`,
  ALREADY_EXISTS: `ALREADY EXISTS`,
  INVALID_NUMBER: `INVALID NUMBER`,
  CHANGES_APPLIED: `CHANGES WERE APPLIED`,
  CHANGES_NOT_APPLIED: `CHANGES WERE NOT APPLIED`,
  JWT_MALFORMED: `jwt malformed` ,
  MISSING_ARGUMENTS: `MISSING ARGUMENTS`,
  ABORTED_TRANSACTION: `ABORTED TRANSACTION`,
  NOT_HAVE_PERMISSION: 'USER DO NOT HAVE PERMISSION'
  
}

export const verifyAccessToken =(token )=>{
  return new Promise((resolve, reject) => {
    console.log(`secret: `, process.env.JWT_TOKEN_SECRET)
    jwt.verify(token, process.env.JWT_TOKEN_SECRET, async(err,result)=>{
    if(err) {
        console.log(err)
        return reject({success:false,err})
    }
   return resolve({success:true,result})
    
  })
})
  
}


export const isObj = (obj) =>{
  return (typeof obj === 'object' && !Array.isArray(obj) && obj !== null && Object)

}
export const isTrue = (arg) =>{
  if(Array.isArray(arg) && !arg.length){
    return {arg, is:false}
  }
  if(isObj(arg) && !Object.keys(arg).length){
    return {arg, is: false}
  }
  return {arg, is: !!arg}
}
 
export const handleChangeProfile = async(req,res)=>{
  try {
    const session = await conn.startSession()
    const {email, updatedParam, accessToken} = req.body
    const isLogged = await Login.find({email:email})
    if(isLogged.length < 1) {
        console.log(Errors.NOT_FOUND);
        return res.status(404).send({success:false, message:Errors.NOT_FOUND})
    }
    
    const isValidToken = await verifyAccessToken(accessToken)

    if(isValidToken?.err) return res.status(400).send({success:false,message:isValidToken?.err})

    return await session.withTransaction(async()=>{

        const USER = await User.updateOne({email:email}, {email: updatedParam}, {upsert:true}, {session})
        const LOGIN = await Login.updateOne({email:email}, {email: updatedParam}, {upsert:true}, {session})
        // console.log(USER)

        if(USER?.modifiedCount == 0 && LOGIN?.modifiedCount == 0 ){
            return res.status(400).send({success:false,message:`Email IS THE SAME`})
        }

         res.status(200).send({success:true,data:{message:`Email HAS BEEN CHANGED TO ${updatedParam}`, email: updatedParam}})
        await session.commitTransaction(); 
        session.endSession()
    })
} catch (error) {
    return res.status(500).send({success:false,message:error})

}
}