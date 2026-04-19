"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useParams } from "next/navigation"

export default function PublicProfile(){

const { id } = useParams()

const [user,setUser] = useState<any>(null)
const [submissions,setSubmissions] = useState<any[]>([])

useEffect(()=>{

async function loadProfile(){

const { data:userData } = await supabase
.from("users")
.select("*")
.eq("id",id)
.single()

setUser(userData)

const { data:submissionData } = await supabase
.from("submissions")
.select("*")
.eq("user_id",id)
.order("created_at",{ascending:false})

setSubmissions(submissionData || [])

}

loadProfile()

},[id])

return(

<div style={{maxWidth:"900px",margin:"40px auto",padding:"20px"}}>

<h1 style={{fontSize:"32px",fontWeight:"bold",marginBottom:"20px"}}>
Developer Profile
</h1>

{user && (
<div style={{marginBottom:"30px"}}>
<p><b>User ID:</b> {user.id}</p>
</div>
)}

<h2 style={{fontSize:"24px",marginBottom:"15px"}}>
Completed Challenges
</h2>

{submissions.length === 0 && (
<p>No submissions yet.</p>
)}

{submissions.map((submission)=>(
<div
key={submission.id}
style={{
border:"1px solid #ddd",
padding:"20px",
marginBottom:"15px",
borderRadius:"10px",
background:"#fafafa"
}}
>

<h3 style={{fontSize:"20px",fontWeight:"bold"}}>
{submission.title}
</h3>

<p>
{submission.description}
</p>

<div style={{marginTop:"10px"}}>

{submission.repo_url && (
<a
href={submission.repo_url}
target="_blank"
style={{marginRight:"15px",color:"blue"}}
>
View GitHub
</a>
)}

{submission.file_url && (
<a
href={submission.file_url}
target="_blank"
style={{color:"green"}}
>
View Live Project
</a>
)}

</div>

</div>
))}

</div>

)

}
