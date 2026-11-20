import type { SearchInput } from "./types"
import { emptyFilters, canonicalFilters } from "./searchModel"
import { parseFilters } from "./services/parse"

export function unavailableSearchLocation(){
  const key=new URLSearchParams(window.location.search).get("state")
  if(!key)return false
  try{
    if(!/^[a-f0-9-]{36}$/.test(key))return true
    const value=JSON.parse(sessionStorage.getItem(`match-search:${key}`)||"null")
    if(!value||typeof value.query!=="string"||typeof value.site!=="string"||![10,25,50].includes(value.topK)||!["auto","keyword","exact","semantic"].includes(value.mode))return true
    parseFilters(value.filters)
    return false
  }catch{return true}
}

export function readSearchLocation():SearchInput {
  const params=new URLSearchParams(window.location.search)
  const initial:SearchInput={query:params.get("seed")?`Find cases similar to deviation ${params.get("seed")}.`:params.get("q")||"",site:params.get("site")||"",topK:10,mode:"auto",filters:emptyFilters(),offset:0}
  try{
    const key=params.get("state")
    if(key&&/^[a-f0-9-]{36}$/.test(key)){
      const saved=JSON.parse(sessionStorage.getItem(`match-search:${key}`)||"null")
      if(saved&&typeof saved.query==="string"&&typeof saved.site==="string"&&[10,25,50].includes(saved.topK)&&["auto","keyword","exact","semantic"].includes(saved.mode))return {...saved,filters:parseFilters(saved.filters),offset:Number.isSafeInteger(saved.offset)&&saved.offset>=0&&saved.offset<=1000000?saved.offset:0}
    }
    const data=params.get("filters")
    if(data)initial.filters=parseFilters(JSON.parse(data))
    if(["auto","keyword","exact","semantic"].includes(params.get("mode")||""))initial.mode=params.get("mode") as SearchInput['mode']
    if([10,25,50].includes(Number(params.get("limit"))))initial.topK=Number(params.get("limit"))
    const offset=Number(params.get("offset")||0)
    if(Number.isSafeInteger(offset)&&offset>=0&&offset<=1000000)initial.offset=offset
  }catch{ /* Invalid location state never becomes an unchecked API request. */ }
  return initial
}

export function rememberSearch(input:SearchInput){
  const params=new URLSearchParams()
  const fromMap=new URLSearchParams(window.location.search).get("fromMap")
  if(fromMap?.startsWith("/map"))params.set("fromMap",fromMap)
  params.set("search","1")
  if(input.query.length<=1800){
    if(input.query)params.set("q",input.query)
    if(input.site)params.set("site",input.site)
    params.set("filters",JSON.stringify(canonicalFilters(input.filters)))
    params.set("mode",input.mode);params.set("limit",String(input.topK))
    if(input.offset)params.set("offset",String(input.offset))
  }else{
    const key=crypto.randomUUID()
    try{sessionStorage.setItem(`match-search:${key}`,JSON.stringify(input))}
    catch{window.history.replaceState({},"","/match");return false}
    params.set("state",key)
  }
  window.history.replaceState({},"",`/match?${params}`)
  return true
}
