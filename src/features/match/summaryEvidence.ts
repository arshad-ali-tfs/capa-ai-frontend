export interface AnswerPassage {record_id?:string;field:string;start:number;end:number;quote:string}
export interface AnswerMetadata {isQuestion?:boolean;questionIntent?:string;answerStatus?:"answered"|"not_established"|"overview";citations?:AnswerPassage[][]}
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
  return result
}
