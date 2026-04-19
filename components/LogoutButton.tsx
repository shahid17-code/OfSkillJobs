"use client"

import { supabase } from "../lib/supabase"

export default function Logoutbutton(){

  async function handleLogout(){

    const { error } = await supabase.auth.signOut()

    if(error){
      alert(error.message)
    }else{
      alert("Logged out successfully")
      window.location.href="/"
    }

  }

  return(

    <button onClick={handleLogout}>
      Logout
    </button>

  )

}