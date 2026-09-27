import type { Metadata } from "next";
import { IndividualOfferClient } from "./IndividualOfferClient";

export const metadata: Metadata = { title:"Oferta indywidualna — TOKAMA", robots:{ index:false, follow:false } };
export default async function IndividualOfferPage({ params }:{ params:Promise<{token:string}> }) { const {token}=await params; return <IndividualOfferClient token={token}/>; }
