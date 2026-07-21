import { useState, useRef, useEffect } from "react";

/**
 * Custom dropdown to replace native <select>.
 * Native selects render their option list at the OS level, which gets
 * clipped by a Chrome extension side panel's bounded window. This
 * component renders the option list as normal DOM, so it can be
 * positioned, sized, and scrolled entirely within the panel.
 */
export default function Dropdown({ value, onChange, options, placeholder = "Select..." }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel =
        options.find(opt => opt.value === value)?.label ?? placeholder;

    return (
        <div className="dropdown-root" ref={rootRef}>
            <button
                type="button"
                className="dropdown-trigger"
                onClick={() => setOpen(o => !o)}
            >
                <span className={value ? "" : "dropdown-placeholder"}>
                    {selectedLabel}
                </span>
                <span className={`dropdown-arrow ${open ? "open" : ""}`}>▼</span>
            </button>

            {open && (
                <div className="dropdown-list">
                    {options.length === 0 && (
                        <div className="dropdown-empty">No options</div>
                    )}
                    {options.map(opt => (
                        <div
                            key={opt.value}
                            className={`dropdown-item ${opt.value === value ? "active" : ""}`}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}