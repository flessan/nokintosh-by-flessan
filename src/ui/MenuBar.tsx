import { useEffect, useRef, useState } from "react";
import { CheckMark } from "./icons";

export interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  checked?: boolean;
  separatorAfter?: boolean;
}

export interface Menu {
  label: string;
  items: MenuItem[];
}

export function MenuBar({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredMenu, setHoveredMenu] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative z-30 flex select-none items-stretch bg-[color:var(--face)] px-[2px]"
      role="menubar"
    >
      {menus.map((menu, i) => (
        <div key={menu.label} className="relative">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={open === i}
            className="px-[9px] py-[3px] text-[12px]"
            style={
              open === i || hoveredMenu === i
                ? { backgroundColor: "var(--sel)", color: "#ffffff" }
                : undefined
            }
            onPointerEnter={() => {
              setHoveredMenu(i);
              if (open !== null) setOpen(i);
            }}
            onPointerLeave={() => setHoveredMenu(null)}
            onPointerDown={(e) => {
              e.preventDefault();
              setOpen(open === i ? null : i);
            }}
            onPointerEnter={() => open !== null && setOpen(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(open === i ? null : i);
              }
            }}
          >
            {menu.label}
          </button>
          {open === i && (
            <div
              role="menu"
              aria-label={menu.label}
              className="bevel-raised absolute left-0 top-full min-w-[196px] max-w-[85vw] p-[2px] shadow-[2px_2px_0_0_rgba(0,0,0,0.35)]"
            >
              {menu.items.map((item, k) => (
                <div key={item.label + k}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    className="flex w-full items-center gap-2 px-[6px] py-[4px] text-left text-[12px]"
                    style={
                      !item.disabled && hovered === (String(i) + ":" + String(k))
                        ? { backgroundColor: "var(--sel)", color: "#ffffff" }
                        : undefined
                    }
                    onPointerEnter={() => !item.disabled && setHovered(String(i) + ":" + String(k))}
                    onPointerLeave={() => setHovered(null)}
                    onClick={() => {
                      setOpen(null);
                      item.action?.();
                    }}
                  >
                    <span className="w-[12px] shrink-0">
                      {item.checked ? <CheckMark /> : null}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="pl-4 text-[11px] opacity-70">{item.shortcut}</span>
                    )}
                  </button>
                  {item.separatorAfter && <div className="my-[3px] mx-[4px] h-[2px] bevel-thin-in" />}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
