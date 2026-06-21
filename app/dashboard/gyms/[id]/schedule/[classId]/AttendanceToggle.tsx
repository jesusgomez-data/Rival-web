"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { markAttendance } from "../../../schedule-actions";

export default function AttendanceToggle({ enrollmentId, initialAttended, path }: any) {
    const [status, setStatus] = useState<boolean | null>(initialAttended);
    const [loading, setLoading] = useState(false);
    const [loadingTarget, setLoadingTarget] = useState<boolean | null>(null);

    async function handleToggle(value: boolean) {
        if (loading) return;
        
        // If clicking the already selected button, toggle back to null (unmarked)
        const newValue = status === value ? null : value;
        
        setLoading(true);
        setLoadingTarget(value);
        setStatus(newValue);

        const res = await markAttendance(enrollmentId, newValue, path);
        if (res.error) {
            alert("Error updating attendance");
            setStatus(initialAttended); // Revert
        }
        setLoading(false);
        setLoadingTarget(null);
    }

    return (
        <div className="flex bg-black rounded-lg p-0.5 sm:p-1 border border-white/10 shrink-0">
            <button
                onClick={() => handleToggle(true)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${status === true ? 'bg-green-500 text-black shadow-lg' : 'text-gray-600 hover:text-green-500'}`}
                title="Mark Present"
            >
                {loading && loadingTarget === true ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                <span className="hidden sm:inline">Present</span>
            </button>
            <button
                onClick={() => handleToggle(false)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${status === false ? 'bg-red-500 text-white shadow-lg' : 'text-gray-600 hover:text-red-500'}`}
                title="Mark Absent"
            >
                {loading && loadingTarget === false ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                <span className="hidden sm:inline">Absent</span>
            </button>
        </div>
    )
}
