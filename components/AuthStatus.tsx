"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import LogoutButton from "./LogoutButton"

export default function AuthStatus(){

  const [user, setUser] = useState<any>(null)

  useEffect(()=>{

    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }

  },[])

  async function checkUser(){
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }

  if(user){
    return (
      <>
        <a href="/profile" style={{marginRight:"20px"}}>Profile</a>
        <LogoutButton/>
      </>
    )
  }

  return (
    <>
      <a href="/login" style={{marginRight:"20px"}}>Login</a>
      <a href="/signup">Signup</a>
    </>
  )
}