"use client";

export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#2bb24c] animate-spin" />
            </div>
            <p className="mt-4 text-sm text-slate-500 animate-pulse">{text}</p>
        </div>
    );
}
