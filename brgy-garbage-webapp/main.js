// main.js — GarboTrack Unified Client Logic
// -----------------------------------------------------------
// Handles Supabase init, auth, realtime, helpers, SMS helper,
// Firebase placeholder, dark mode, utilities.
// -----------------------------------------------------------

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// -----------------------------------------------------------
// 1) SUPABASE PROJECT KEYS
// -----------------------------------------------------------
const SUPABASE_URL = "https://tnukdvfdxafpoiwvyzsc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRudWtkdmZkeGFmcG9pd3Z5enNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNzAzMjksImV4cCI6MjA3ODY0NjMyOX0.WTYPb-xUPhGtMCsWZTQ6OW30EStDw3AZo30aDps8SME";

// -----------------------------------------------------------
// 2) MAIN GARBO OBJECT
// -----------------------------------------------------------
window.GARBO = {
    supabase: null,

    init: async function () {
        if (this.supabase) return;

        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth event:", event);
        });
    },

    logout: async function () {
        await this.supabase.auth.signOut();
        localStorage.removeItem("garbo_role");
        window.location.href = "index.html";
    },

    toast: function (msg) {
        alert(msg);
    },

    // -----------------------------------------------------------
    // 3) SMS API (via Serverless Function)
    // -----------------------------------------------------------
    sendSms: async function (phone, body) {
        try {
            const res = await fetch("/.netlify/functions/send_sms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: phone, body })
            });

            return await res.json();

        } catch (err) {
            console.error("SMS Error:", err);
            return { error: err };
        }
    }
};

// -----------------------------------------------------------
// 4) AUTO-INIT SUPABASE
// -----------------------------------------------------------
(async () => { await window.GARBO.init(); })();

// -----------------------------------------------------------
// 5) DARK MODE RESTORE
// -----------------------------------------------------------
if (localStorage.getItem("garbo_dark") === "true") {
    document.body.classList.add("dark");
}

// -----------------------------------------------------------
// 6) POINT-IN-POLYGON (for geofence / barangay checking)
// -----------------------------------------------------------
export function pointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];

        const intersect =
            ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / (yj - yi + 0.000001) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}

// -----------------------------------------------------------
// 7) FIREBASE PUSH NOTIFICATION PLACEHOLDER
// (You will replace this with real Firebase config)
// -----------------------------------------------------------
export async function initFirebaseMessaging(firebaseConfig, vapidKey) {
    if (!("serviceWorker" in navigator)) {
        console.warn("Service worker not supported.");
        return null;
    }

    console.warn("Firebase Messaging placeholder — insert real config here.");
    return null;
}
