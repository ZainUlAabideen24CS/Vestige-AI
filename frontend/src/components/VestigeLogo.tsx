type VestigeLogoProps = {
  variant?: "login" | "sidebar" | "mobile";
  showTagline?: boolean;
};

export default function VestigeLogo({
  variant = "login",
  showTagline = true,
}: VestigeLogoProps) {
  if (variant === "sidebar") {
    return (
      <div className="flex flex-col items-center justify-center select-none">
        <img
          src="/vestige-icon.png"
          alt="Vestige AI"
          className="h-11 w-11 object-contain"
        />

        <div className="mt-1 flex items-center leading-none">
          <span className="text-[17px] font-bold tracking-[0.08em] text-white">
            VESTIGE
          </span>
          <span className="ml-1 text-[17px] font-bold tracking-[0.02em] text-blue-400">
            AI
          </span>
        </div>

        {showTagline && (
          <span className="mt-1 text-[7px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Business Knowledge Intelligence
          </span>
        )}
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div className="flex items-center gap-2 select-none">
        <img
          src="/vestige-icon.png"
          alt="Vestige AI"
          className="h-9 w-9 object-contain"
        />

        <div className="flex items-center leading-none">
          <span className="text-[18px] font-bold tracking-[0.06em] text-slate-900">
            VESTIGE
          </span>
          <span className="ml-1 text-[18px] font-bold text-blue-600">
            AI
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center select-none">
      <img
        src="/vestige-icon.png"
        alt="Vestige AI"
        className="h-[76px] w-[76px] object-contain drop-shadow-[0_8px_12px_rgba(15,23,42,0.18)] sm:h-[86px] sm:w-[86px]"
      />

      <div className="mt-2 flex items-center leading-none">
        <span className="text-[27px] font-bold tracking-[0.035em] text-slate-900 sm:text-[30px]">
          VESTIGE
        </span>

        <span className="ml-1.5 text-[27px] font-bold text-blue-600 sm:text-[30px]">
          AI
        </span>
      </div>

      {showTagline && (
        <p className="mt-2 text-[8px] font-medium uppercase tracking-[0.24em] text-slate-400 sm:text-[9px]">
          Business Knowledge Intelligence
        </p>
      )}
    </div>
  );
}