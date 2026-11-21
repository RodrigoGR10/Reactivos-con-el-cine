import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number;
    className?: string;
    filled?: boolean;
}

export const ChevronLeftIcon = ({ size = 20, ...props }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
    >
        <path d="m15 18-6-6 6-6" />
    </svg>
);

export const ChevronRightIcon = ({ size = 20, ...props }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
    >
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export const HomeIcon = ({
    size = 28,
    className = "home-icon-svg",
    filled = false,
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        {filled ? (
            <path
                fill="currentColor"
                stroke="none"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.35 2.42a1.1 1.1 0 0 1 1.3 0l8.5 6.14A1.5 1.5 0 0 1 21.75 9.77V20a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 20V9.77a1.5 1.5 0 0 1 .6-1.21l8.5-6.14ZM9.75 13.25a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v9h-4.5v-9Z"
            />
        ) : (
            <path d="M9.5 21.5V13a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v8.5h5A1.5 1.5 0 0 0 21 20V9.5L12 3 3 9.5V20a1.5 1.5 0 0 0 1.5 1.5h5Z" />
        )}
    </svg>
);

export const UserIcon = ({
    size = 28,
    className = "user-icon-svg",
    filled = false,
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        {filled ? (
            <>
                <circle
                    cx="12"
                    cy="7"
                    r="4.5"
                    fill="currentColor"
                    stroke="none"
                />
                <path
                    fill="currentColor"
                    stroke="none"
                    d="M4 20.2c0-3.7 3.5-6.2 8-6.2s8 2.5 8 6.2a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 20.2Z"
                />
            </>
        ) : (
            <>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </>
        )}
    </svg>
);

export const SearchIcon = ({
    size = 16,
    className = "search-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <circle cx="11" cy="11" r="7.5" />
        <line x1="16.5" y1="16.5" x2="21.5" y2="21.5" />
    </svg>
);

export const FilmIcon = ({
    size = 36,
    className = "empty-state-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <rect x="2" y="2" width="20" height="20" rx="2.5" ry="2.5" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="17" x2="22" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
);

export const MapPinIcon = ({
    size = 14,
    className = "pin-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

export const CalendarIcon = ({
    size = 36,
    className = "empty-state-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <rect x="3" y="4" width="18" height="18" rx="2.5" ry="2.5" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

export const StarIcon = ({
    size = 14,
    className = "star-icon-svg",
    filled = false,
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={filled ? undefined : "1.7"}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M 11.83 2.77 Q 12 2.25 12.17 2.77 L 14.3 9.17 Q 14.44 9.59 14.89 9.6 L 21.63 9.64 Q 22.18 9.64 21.73 9.97 L 16.31 13.97 Q 15.95 14.23 16.08 14.66 L 18.12 21.08 Q 18.29 21.61 17.84 21.29 L 12.37 17.36 Q 12 17.1 11.63 17.36 L 6.16 21.29 Q 5.71 21.61 5.88 21.08 L 7.92 14.66 Q 8.05 14.23 7.69 13.97 L 2.27 9.97 Q 1.82 9.64 2.37 9.64 L 9.11 9.6 Q 9.56 9.59 9.7 9.17 Z" />
    </svg>
);

export const LogOutIcon = ({
    size = 26,
    className = "logout-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

export const LogInIcon = ({
    size = 26,
    className = "login-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
);

export const CloseIcon = ({
    size = 20,
    className = "close-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export const MailIcon = ({
    size = 18,
    className = "mail-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
);

export const PersonIcon = ({
    size = 18,
    className = "person-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);

export const EyeIcon = ({
    size = 19,
    className = "eye-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

export const EyeOffIcon = ({
    size = 19,
    className = "eye-off-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

export const TicketIcon = ({
    size = 28,
    className = "ticket-icon-svg",
    filled = false,
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        {filled ? (
            <path
                fill="currentColor"
                stroke="none"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4 4.25A2.75 2.75 0 0 0 1.25 7v2c0 .41.34.75.75.75a2.25 2.25 0 0 1 0 4.5.75.75 0 0 0-.75.75v2A2.75 2.75 0 0 0 4 19.75h16A2.75 2.75 0 0 0 22.75 17v-2a.75.75 0 0 0-.75-.75 2.25 2.25 0 0 1 0-4.5.75.75 0 0 0 .75-.75V7A2.75 2.75 0 0 0 20 4.25H4Zm9 1.75a.9.9 0 0 1 .9.9v1.6a.9.9 0 0 1-1.8 0V6.9a.9.9 0 0 1 .9-.9Zm0 5.1a.9.9 0 0 1 .9.9v1.8a.9.9 0 0 1-1.8 0V12a.9.9 0 0 1 .9-.9Zm0 5.3a.9.9 0 0 1 .9.9v1.6a.9.9 0 0 1-1.8 0v-1.6a.9.9 0 0 1 .9-.9Z"
            />
        ) : (
            <>
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                <path d="M13 5v2" />
                <path d="M13 11v2" />
                <path d="M13 17v2" />
            </>
        )}
    </svg>
);

export const SeatIcon = ({
    size = 14,
    className = "seat-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        focusable="false"
        {...props}
    >
        <path d="M4 18v3h3v-3h10v3h3v-6H4v3zm15-8h3v3h-3v-3zM2 10h3v3H2v-3zm15 3H7V5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v8z" />
    </svg>
);

export const AlertCircleIcon = ({
    size = 18,
    className = "alert-circle-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        focusable="false"
        {...props}
    >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

export const SlidersIcon = ({
    size = 18,
    className = "sliders-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        focusable="false"
        {...props}
    >
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="17" x2="20" y2="17" />
        <circle cx="9" cy="7" r="2.2" fill="var(--color-superficie, #141416)" />
        <circle
            cx="15"
            cy="17"
            r="2.2"
            fill="var(--color-superficie, #141416)"
        />
    </svg>
);

export const PencilIcon = ({
    size = 16,
    className = "pencil-icon-svg",
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        focusable="false"
        {...props}
    >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
);

export const HeartIcon = ({
    size = 14,
    className = "heart-icon-svg",
    filled = false,
    ...props
}: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={filled ? undefined : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z" />
    </svg>
);
