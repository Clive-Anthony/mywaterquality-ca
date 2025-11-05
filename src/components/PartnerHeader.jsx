

/**
 * Partner header component showing partner logo + MWQ logo
 * Layout: [Partner Logo] "In Partnership With" [MWQ Logo]
 */
export default function PartnerHeader({ partner }) {
  if (!partner) return null;

  return (
    <div className="flex items-center justify-center gap-4 py-4 px-4 bg-white border-b border-gray-200">
      {/* Partner Logo */}
      {partner.logo_url ? (
        <a
          href={partner.website_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
        >
          <img
            src={partner.logo_url}
            alt={`${partner.partner_name} Logo`}
            className="h-10 w-auto object-contain hover:opacity-80 transition-opacity duration-200"
          />
        </a>
      ) : (
        <div className="flex-shrink-0 px-4 py-2 bg-gray-100 rounded">
          <span className="text-sm font-medium text-gray-700">
            {partner.partner_name}
          </span>
        </div>
      )}

      {/* "In Partnership With" Text */}
      <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
        In Partnership With
      </span>

      {/* MWQ Logo */}
      <div className="flex-shrink-0">
        <img
          src="/MWQ-logo-final.png"
          alt="My Water Quality Logo"
          className="h-10 w-auto object-contain"
        />
      </div>
    </div>
  );
}