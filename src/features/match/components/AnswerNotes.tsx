import type {AnswerMetadata} from "../summaryEvidence"
import {fieldLabel} from "../services/parse"
export function AnswerNotes({value}:{value:AnswerMetadata}) {
  if(!value.citations?.some(group=>group.length))return null
  return <details className="mt-3 rounded-lg border border-suite-line-soft p-3"><summary className="cursor-pointer text-xs font-bold text-suite-blue">Supporting source quotes</summary><div className="mt-3 space-y-3">{value.citations.flatMap((group,index)=>group.map((proof,position)=><blockquote key={`${index}:${position}`} className="border-l-2 border-suite-line pl-3 text-xs leading-5 [overflow-wrap:anywhere]"><p className="font-bold text-suite-slate">Deviation {proof.record_id} · {fieldLabel(proof.field)}</p><p className="mt-1 whitespace-pre-wrap">{proof.quote}</p></blockquote>))}</div></details>
}
