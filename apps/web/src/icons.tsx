import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export const PlayIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
  </Icon>
);

export const PauseIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
  </Icon>
);

export const PreviousIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5" y="5" width="2.4" height="14" rx="1" />
    <path d="M19 6.13v11.74a1 1 0 0 1-1.53.85L9.1 13.1a1.3 1.3 0 0 1 0-2.2l8.37-5.62A1 1 0 0 1 19 6.13Z" />
  </Icon>
);

export const NextIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="16.6" y="5" width="2.4" height="14" rx="1" />
    <path d="M5 6.13v11.74a1 1 0 0 0 1.53.85l8.37-5.62a1.3 1.3 0 0 0 0-2.2L6.53 5.28A1 1 0 0 0 5 6.13Z" />
  </Icon>
);

/** Sound-wave mark for the header. */
export const WaveIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="9" width="2.4" height="6" rx="1.2" />
    <rect x="7.4" y="5" width="2.4" height="14" rx="1.2" />
    <rect x="11.8" y="2.5" width="2.4" height="19" rx="1.2" />
    <rect x="16.2" y="6.5" width="2.4" height="11" rx="1.2" />
    <rect x="20.6" y="10" width="2.4" height="4" rx="1.2" />
  </Icon>
);

export const SunIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4.25" />
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.28 5.28l1.41 1.41M17.31 17.31l1.41 1.41M5.28 18.72l1.41-1.41M17.31 6.69l1.41-1.41" />
    </g>
  </Icon>
);

export const MoonIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a.6.6 0 0 0-.79-.72A9.5 9.5 0 1 0 20.92 15.4a.6.6 0 0 0-.72-.8Z" />
  </Icon>
);
