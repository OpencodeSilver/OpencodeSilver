/** Line-art illustrations for the Discover category cards. */

import React from 'react';

import { cn } from '@/lib/utils';

export type IllustrationProps = React.SVGProps<SVGSVGElement>;

const Illustration: React.FC<IllustrationProps & { children: React.ReactNode }> = ({ className, children, ...props }) => (
    <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn('size-6 text-foreground/90', className)}
        {...props}
    >
        {children}
    </svg>
);

export const EngineeringIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <rect x="7" y="8" width="34" height="32" rx="4" />
        <line x1="7" y1="16" x2="41" y2="16" />
        <path d="M17 24.5L13.5 28L17 31.5" />
        <path d="M22 34L26 22" />
        <path d="M31 24.5L34.5 28L31 31.5" />
    </Illustration>
);

export const CodeIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <rect x="7" y="8" width="34" height="32" rx="4" />
        <line x1="7" y1="16" x2="41" y2="16" />
        <path d="M17 24.5L13.5 28L17 31.5" />
        <path d="M22 34L26 22" />
        <path d="M31 24.5L34.5 28L31 31.5" />
    </Illustration>
);

export const FilesDocumentsIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <path d="M13 18V11C13 10 13.8 9 15 9H27L33 15V24" />
        <path d="M17 22V15C17 14 17.8 13 19 13H31L37 19V28" />
        <path d="M21 17H33L39 23V37C39 38.1 38.1 39 37 39H23C21.9 39 21 38.1 21 37V17Z" />
        <path d="M33 17V23H39" />
    </Illustration>
);

export const DesignsMediaIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <rect x="8" y="10" width="32" height="28" rx="4" />
        <circle cx="16" cy="18" r="3" />
        <path d="M9 31C13.5 25.5 19 25 24 29C28.5 32.5 33 26 39 28" />
    </Illustration>
);

export const PipelinesJobsIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <circle cx="12" cy="16" r="3.5" />
        <circle cx="36" cy="32" r="3.5" />
        <path d="M24 20L28.5 24.5L24 29L19.5 24.5Z" />
        <path d="M15.5 16H30C34.5 16 34.5 24.5 28.5 24.5" />
        <path d="M19.5 24.5C13.5 24.5 13.5 32 18 32H32.5" />
    </Illustration>
);

export const TicketsTasksIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <rect x="9" y="10" width="8" height="8" rx="1.5" />
        <path d="M11 14L13 16L16 12" />
        <line x1="22" y1="14" x2="39" y2="14" />
        <rect x="9" y="20" width="8" height="8" rx="1.5" />
        <line x1="22" y1="24" x2="39" y2="24" />
        <rect x="9" y="30" width="8" height="8" rx="1.5" />
        <line x1="22" y1="34" x2="39" y2="34" />
    </Illustration>
);

export const ApisIllustration: React.FC<IllustrationProps> = ({ className, ...props }) => (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn('size-6 text-foreground/90', className)} {...props}>
        <text
            x="24"
            y="31"
            textAnchor="middle"
            fontSize="24"
            fontWeight="600"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            fill="currentColor"
        >
            {'{ }'}
        </text>
    </svg>
);

export const NotesMemoryIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <path d="M14 9H28L34 15V39C34 40.1 33.1 41 32 41H14C12.9 41 12 40.1 12 39V11C12 9.9 12.9 9 14 9Z" />
        <path d="M28 9V15H34" />
        <line x1="17" y1="20" x2="29" y2="20" />
        <line x1="17" y1="25" x2="29" y2="25" />
        <line x1="17" y1="30" x2="29" y2="30" />
        <line x1="17" y1="35" x2="29" y2="35" />
    </Illustration>
);

export const AiModelsAgentsIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <path d="M15 8L16.8 12.2L21 11L19.2 15.2L23.4 17L19.2 18.8L21 23L16.8 21.8L15 26L13.2 21.8L9 23L10.8 18.8L6.6 17L10.8 15.2L9 11L13.2 12.2Z" />
        <line x1="20" y1="21" x2="28" y2="29" />
        <circle cx="33" cy="34" r="7" />
        <path d="M30 34L32 36L36 32" />
    </Illustration>
);

export const DataAnalyticsIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <line x1="10" y1="38" x2="38" y2="38" />
        <rect x="13" y="24" width="5" height="14" rx="1" />
        <rect x="22" y="17" width="5" height="21" rx="1" />
        <rect x="31" y="11" width="5" height="27" rx="1" />
        <path d="M12 21L21 13L28 17L37 8" />
    </Illustration>
);

export const DevopsIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <path d="M13 32H35C38.3 32 41 29.3 41 26C41 22.9 38.7 20.3 35.6 20.1C34.8 14.4 29.9 10 24 10C19.1 10 14.9 13.1 13.4 17.5C9.8 18.2 7 21.3 7 25C7 28.9 10.1 32 13 32Z" />
        <path d="M20 23L23 26L20 29" />
        <line x1="25" y1="29" x2="29" y2="29" />
    </Illustration>
);

export const SecurityIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <path d="M24 8L36 13V24C36 32 24 39 24 39C24 39 12 32 12 24V13L24 8Z" />
        <circle cx="24" cy="21" r="3" />
        <line x1="24" y1="24" x2="24" y2="29" />
    </Illustration>
);

export const TestingIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <path d="M19 9H29" />
        <path d="M21 9V17L13 33C11.5 36 13.7 39 17 39H31C34.3 39 36.5 36 35 33L27 17V9" />
        <line x1="16" y1="29" x2="32" y2="29" />
        <circle cx="24" cy="34" r="1.5" />
        <circle cx="21" cy="32" r="1" />
    </Illustration>
);

export const OtherIllustration: React.FC<IllustrationProps> = (props) => (
    <Illustration {...props}>
        <path d="M24 9L38 17V31L24 39L10 31V17L24 9Z" />
        <line x1="24" y1="9" x2="24" y2="39" />
        <line x1="24" y1="24" x2="38" y2="17" />
        <line x1="24" y1="24" x2="10" y2="17" />
    </Illustration>
);

