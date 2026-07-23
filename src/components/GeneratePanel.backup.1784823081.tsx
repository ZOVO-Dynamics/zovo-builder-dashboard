"use client";

import {useState} from "react";

export default function GeneratePanel(){

const [prompt,setPrompt]=useState("");
const [output,setOutput]=useState("");
const [loading,setLoading]=useState(false);


async function generate(){

setOutput("");
setLoading(true);

try{

const response = await fetch(
"https://ai.zovo.ca/api/generate/stream",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
prompt
})
}
);


const reader=response.body?.getReader();

if(!reader){
throw new Error("No stream");
}


while(true){

const {done,value}=await reader.read();

if(done) break;


const text=new TextDecoder()
.decode(value);


setOutput(prev=>prev+text);

}


}catch(error){

setOutput(
"Erreur: "+String(error)
);

}

setLoading(false);

}


return (

<div className="mt-8 rounded-xl border border-zinc-800 p-6">

<h2 className="text-xl font-bold">
🧠 AI Generator
</h2>


<textarea

className="mt-4 w-full rounded bg-zinc-900 p-3"

rows={5}

placeholder="Décris l'application à créer..."

value={prompt}

onChange={(e)=>setPrompt(e.target.value)}

/>


<button

className="mt-4 rounded bg-white px-5 py-2 text-black"

onClick={generate}

disabled={loading}

>

{loading ? "Generation..." : "Generate"}

</button>


<pre className="mt-6 whitespace-pre-wrap text-sm text-zinc-300">

{output}

</pre>


</div>

);

}
