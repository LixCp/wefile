"use server"
import { generate8DigitAlphanumericId } from "@/lib/identitycode";

export async function generateID():Promise<{id:string}> {
    try{
        const id = generate8DigitAlphanumericId()
        return {id}
    }catch(error){
        console.log('Error Generated Id:',error);
        throw new Error('Failed to generate ID');
    }
}