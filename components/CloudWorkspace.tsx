"use client";
import {useEffect,useState} from "react";
import {getCloudSessionState,signInWithEmailOtp,signOutCloud} from "@/lib/workspace-sync";

type CloudState={configured:boolean;signed_in:boolean;user_id:string|null;email:string|null};
const INITIAL_STATE:CloudState={configured:false,signed_in:false,user_id:null,email:null};

export default function CloudWorkspace(){
  const [state,setState]=useState<CloudState>(INITIAL_STATE);
  const [email,setEmail]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);

  async function refresh(){
    try{setState(await getCloudSessionState())}
    catch(e:unknown){setMessage(e instanceof Error?e.message:"Could not check cloud sign-in status.")}
  }

  useEffect(()=>{void refresh()},[]);

  async function login(){
    if(!email.trim())return;
    setBusy(true);setMessage("");
    try{await signInWithEmailOtp(email.trim());setMessage("Magic sign-in link requested. Check your email, then return to ChimneyAI Pro.")}
    catch(e:unknown){setMessage(e instanceof Error?e.message:"Could not start sign-in.")}
    finally{setBusy(false)}
  }

  async function logout(){
    setBusy(true);setMessage("");
    try{await signOutCloud();await refresh();setMessage("Signed out of cloud workspace.")}
    catch(e:unknown){setMessage(e instanceof Error?e.message:"Could not sign out.")}
    finally{setBusy(false)}
  }

  return <details className="cloudWorkspace">
    <summary><span>Cloud Workspace</span><small>{!state.configured?"not configured":state.signed_in?"signed in":"ready for sign-in"}</small></summary>
    <div className="cloudBody">
      {!state.configured?<div className="cloudNotice"><b>Browser-first mode is active.</b><span>Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable the cloud workspace. No fake cloud state is shown while those values are missing.</span></div>:
      state.signed_in?<div className="cloudSignedIn"><div><b>Signed in</b><span>{state.email||state.user_id}</span></div><button type="button" disabled={busy} onClick={logout}>Sign out</button></div>:
      <div className="cloudLogin"><div><b>Sign in to sync Pro cases</b><span>Passwordless email link. Production policy can later add company/workspace invites and roles.</span></div><div className="cloudLoginRow"><input type="email" autoComplete="email" aria-label="Cloud workspace email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/><button type="button" disabled={busy||!email.trim()} onClick={login}>{busy?"Requesting…":"Email sign-in link"}</button></div></div>}
      {message&&<div className="cloudMessage" role="status">{message}</div>}
      <p className="cloudFoot">v38 cloud code is schema-ready but has not been connected to a live Supabase project in this build. Browser cases and the local Source File Vault remain the safe fallback.</p>
    </div>
  </details>;
}
