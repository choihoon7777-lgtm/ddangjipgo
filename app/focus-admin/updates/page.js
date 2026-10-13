"use client";
import GuestUpdates from "../../../components/df-updates-guest";

// Real fixed-source official collection remains available without authentication.
// Privileged document mutations are isolated at /focus-admin/updates/manage.
export default function PublicOfficialUpdatesPage(){
 return <GuestUpdates/>;
}
