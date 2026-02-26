"use client";

import { HiBookmark, HiOutlineBookmark } from "react-icons/hi2";

interface BookmarkButtonProps {
    isBookmarked: boolean;
    onClick: () => void;
    size?: "sm" | "md";
}

export default function BookmarkButton({ isBookmarked, onClick, size = "sm" }: BookmarkButtonProps) {
    const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    const btnSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";

    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={`flex ${btnSize} items-center justify-center rounded-lg transition-all duration-200 ${isBookmarked
                ? "bg-[#2bb24c]/15 text-[#2bb24c] hover:bg-[#2bb24c]/25"
                : "text-slate-500 hover:bg-white/5 hover:text-[#2bb24c]"
                }`}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
            {isBookmarked ? (
                <HiBookmark className={`${iconSize} transition-transform hover:scale-110`} />
            ) : (
                <HiOutlineBookmark className={`${iconSize} transition-transform hover:scale-110`} />
            )}
        </button>
    );
}
