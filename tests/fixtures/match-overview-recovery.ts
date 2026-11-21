import {overview} from "./match-assist"
export function verifiedOverview(id?:string){
  const value=overview(id),record=value.reviewed_ids[0],quote="Fictional calibration instructions were revised."
  return {...value,is_question:true,question_intent:"actions",answer_status:"answered",verification_status:"verified",
    verification_attempts:{draft:2,grounding:1},verification_retries:1,verification_reason:null,
    support_check:{direct_answer_verified:true},
    lines:[{text:"The fictional source documents revised calibration instructions.",references:[record]},...value.lines.slice(1)],
    citations:[[{record_id:record,field:"DETAILED_DESCRIPTION",start:0,end:quote.length,quote}],[]]}
}
export function gapOverview(id?:string){
  const value=verifiedOverview(id)
  return {...value,answer_status:"not_established",verification_status:"insufficient_evidence",verification_attempts:{draft:1,grounding:1},verification_retries:0,support_check:{direct_answer_verified:false},citations:[],
    lines:[{text:"The reviewed excerpts do not establish which action resolved the requested failure.",references:value.reviewed_ids},...value.lines.slice(1)]}
}
export function unavailableOverview(id?:string){
  const value=gapOverview(id)
  return {...value,verification_status:"unavailable",verification_attempts:{draft:2,grounding:0},verification_retries:1,verification_reason:"provider_unavailable",
    lines:[{text:"An AI answer could not be verified right now; the source results remain available.",references:value.reviewed_ids},
      {text:"This does not establish that the records lack an answer. Review the retained source evidence before drawing a conclusion.",references:value.reviewed_ids},value.lines[2]]}
}
