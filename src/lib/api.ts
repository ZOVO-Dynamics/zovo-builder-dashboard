const API_URL =
process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function api(
  endpoint:string,
  options:RequestInit = {}
){

const response = await fetch(
`${API_URL}${endpoint}`,
{
...options,
headers:{
"Content-Type":"application/json",
...(options.headers || {})
}
}
);


if(!response.ok){

throw new Error(
`API Error ${response.status}`
);

}


return response.json();

}
