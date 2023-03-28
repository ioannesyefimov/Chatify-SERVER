import { Errors } from "../../utils.js";
import bcrypt from 'bcrypt'

export const validateEmail = function(email) {
    const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; 
       return regex.test(email)
};
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
        return {success:false,message:Errors.PASSWORD_CONTAINS_NAME}
    } else if(isInValidPassword) {
      console.log(`invalid in checker`);
        return {success:false,message:Errors.INVALID_PASSWORD}
    } else {
      console.log(`valid checker`);
      return {success:true}
    }
}

export const  serverValidatePw = (password,objDocument) =>{

    console.log(`server pw validation started`);
    let isValid = validatePassword(password,objDocument.userName);
    if(isValid?.success){
        console.log(`valid server checkr`);
        let hash = bcrypt.hashSync(password,10);
        objDocument.password = hash;
        console.log(`obj document: `,objDocument)
        return true
    }else 
     if(!isValid?.success){
         console.log(Errors.INVALID_PASSWORD)
        throw new Error(isValid?.message)

    } else 
    if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email) ) {
        console.log()
        throw new Error(Errors.INVALID_EMAIL)
    }   

}
