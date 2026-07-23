import Sidebar from "./Sidebar";


export default function DashboardLayout(
{
children
}:{
children:React.ReactNode
}
){

return (

<div className="flex min-h-screen bg-zinc-950">

<Sidebar />

<main className="flex-1 p-8 text-white">

{children}

</main>

</div>

)

}
