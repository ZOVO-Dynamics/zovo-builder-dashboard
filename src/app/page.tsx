export const dynamic = "force-dynamic";

import DashboardLayout from "@/components/layout/DashboardLayout";
import GeneratePanel from "@/components/GeneratePanel";


export default function Home(){

return (

<DashboardLayout>

<h2 className="text-3xl font-bold">
Welcome to ZOVO Builder 🚀
</h2>


<p className="mt-4 text-zinc-400">
AI Autonomous Application Builder
</p>


<div className="mt-8 grid gap-6 md:grid-cols-3">


<div className="rounded-xl border border-zinc-800 p-6">
🧠
<br/>
AI Agents
<br/>
Online
</div>


<div className="rounded-xl border border-zinc-800 p-6">
🚀
<br/>
Generate App
<br/>
Ready
</div>


<div className="rounded-xl border border-zinc-800 p-6">
📊
<br/>
Usage
<br/>
Tracking
</div>


</div>


<GeneratePanel />

</DashboardLayout>

)

}
