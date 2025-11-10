import { Link } from 'react-router-dom';

export default function CartConflictModal({ 
  isOpen, 
  onClose, 
  conflictType, 
  message, 
  cartPartnerInfo,
  onClearCart 
}) {
  if (!isOpen) return null;

  const getModalContent = () => {
    switch (conflictType) {
      case 'partner_to_regular':
        return {
          title: 'Partner Items in Cart',
          icon: (
            <svg className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          actions: [
            {
              label: 'View Partner Cart',
              link: `/shop/partner/${cartPartnerInfo?.partnerSlug}`,
              primary: true
            },
            {
              label: 'Clear Cart & Continue',
              action: 'clear',
              danger: true
            }
          ]
        };
      
      case 'regular_to_partner':
        return {
          title: 'Regular Items in Cart',
          icon: (
            <svg className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          actions: [
            {
              label: 'View Regular Cart',
              link: '/shop',
              primary: true
            },
            {
              label: 'Clear Cart & Continue',
              action: 'clear',
              danger: true
            }
          ]
        };
      
      case 'different_partner':
        return {
          title: 'Different Partner Shop',
          icon: (
            <svg className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          actions: [
            {
              label: `View ${cartPartnerInfo?.partnerName || 'Current Partner'} Cart`,
              link: `/shop/partner/${cartPartnerInfo?.partnerSlug}`,
              primary: true
            },
            {
              label: 'Clear Cart & Continue',
              action: 'clear',
              danger: true
            }
          ]
        };
      
      default:
        return {
          title: 'Cart Conflict',
          icon: (
            <svg className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          actions: []
        };
    }
  };

  const content = getModalContent();

  const handleAction = (action) => {
    if (action === 'clear') {
      onClearCart();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex flex-col items-center mb-4">
          {content.icon}
          <h3 className="text-xl font-semibold text-gray-900 mt-4">
            {content.title}
          </h3>
        </div>
        
        <p className="text-gray-600 text-center mb-6">
          {message}
        </p>
        
        <div className="space-y-3">
          {content.actions.map((action, index) => (
            action.link ? (
              <Link
                key={index}
                to={action.link}
                onClick={onClose}
                className={`block w-full py-3 px-4 rounded-md font-medium text-center transition-colors duration-200 ${
                  action.primary
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : action.danger
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={index}
                onClick={() => handleAction(action.action)}
                className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 ${
                  action.primary
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : action.danger
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {action.label}
              </button>
            )
          ))}
          
          <button
            onClick={onClose}
            className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}