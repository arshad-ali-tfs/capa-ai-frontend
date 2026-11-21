export interface AnswerPassage {record_id?:string;field:string;start:number;end:number;quote:string}
export type VerificationStatus="verified"|"insufficient_evidence"|"unavailable"
export interface AnswerMetadata {isQuestion?:boolean;questionIntent?:string;answerStatus?:"answered"|"not_established"|"overview";citations?:AnswerPassage[][];verificationStatus?:VerificationStatus;verificationAttempts?:{draft:number;grounding:number};verificationRetries?:number}
export function parseAnswerMetadata(value:Record<string,unknown>,ids:string[]):AnswerMetadata {
  const result:AnswerMetadata={}
  const invalid=()=>new Error("The answer evidence could not be verified for this search.")
  if(value.is_question!==undefined){
    if(typeof value.is_question!=="boolean"||!["answered","not_established","overview"].includes(value.answer_status as string)||typeof value.question_intent!=="string"||value.is_question&&value.answer_status==="overview"||!value.is_question&&value.answer_status!=="overview")throw invalid()
    result.isQuestion=value.is_question;result.answerStatus=value.answer_status as AnswerMetadata["answerStatus"];result.questionIntent=value.question_intent
  }
  if(value.citations!==undefined){
    if(!Array.isArray(value.citations)||value.citations.length>3)throw invalid()
    result.citations=value.citations.map(group=>{
      if(!Array.isArray(group))throw invalid()
      return group.map(proof=>{
        if(!proof||typeof proof!=="object"||!ids.includes(proof.record_id)||typeof proof.field!=="string"||typeof proof.quote!=="string"||!proof.quote||!Number.isSafeInteger(proof.start)||!Number.isSafeInteger(proof.end)||proof.start<0||proof.end<=proof.start||Array.from(proof.quote).length!==proof.end-proof.start)throw invalid()
        return {record_id:proof.record_id,field:proof.field,start:proof.start,end:proof.end,quote:proof.quote}
      })
    })
  }
  if(value.verification_status!==undefined||value.verification_attempts!==undefined||value.verification_retries!==undefined){
    const attempts=value.verification_attempts as {draft?:unknown;grounding?:unknown}|undefined
    if(!["verified","insufficient_evidence","unavailable"].includes(value.verification_status as string)||!attempts||Array.isArray(attempts)||Object.keys(attempts).sort().join(",")!=="draft,grounding"||!Number.isSafeInteger(attempts.draft)||!Number.isSafeInteger(attempts.grounding)||(attempts.draft as number)<1||(attempts.draft as number)>3||(attempts.grounding as number)<0||(attempts.grounding as number)>3||(attempts.draft as number)+(attempts.grounding as number)>5||value.verification_retries!==Math.max(0,(attempts.draft as number)-1)+Math.max(0,(attempts.grounding as number)-1))throw invalid()
    const proof=result.citations?.some(group=>group.length)
    if(value.verification_status==="verified"&&(!proof||(attempts.grounding as number)<1)||value.verification_status!=="verified"&&result.answerStatus==="answered"||value.verification_status==="unavailable"&&proof||value.verification_status==="insufficient_evidence"&&(attempts.grounding as number)<1)throw invalid()
    if(result.answerStatus==="answered"&&(value.support_check as {direct_answer_verified?:unknown}|undefined)?.direct_answer_verified!==true)throw invalid()
    result.verificationStatus=value.verification_status as VerificationStatus
    result.verificationAttempts=attempts as {draft:number;grounding:number};result.verificationRetries=value.verification_retries as number
  }
  return result
}
