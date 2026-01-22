import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function MetaTagsManager({setLoading}) {
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    // Map paths to page titles
    const pageTitles = {
      '/': 'Home',
      '/surveys': 'Available Surveys',
      '/packages': 'Survey Packages',
      '/deposit': 'Deposit Funds',
      '/withdraw': 'Withdraw Earnings',
      '/profile': 'My Profile',
      '/transactions': 'Transaction History',
      '/bonuses': 'Bonuses & Promotions',
      '/admin': 'Admin Dashboard',
      '/login': 'Login',
      '/register': 'Register',
      '/forgot-password': 'Reset Password',
      /*'/privacy': 'Privacy Policy',
      '/terms': 'Terms of Service',
      '/contact': 'Contact Us',
      '/about': 'About SurveyRewards',
      '/faq': 'FAQ & Help Center'*/
    };

    // Get page title from pathname or use default
    const pageTitle = pageTitles[pathname] || 
      pathname.split('/').filter(Boolean).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') || 'SurveyRewards';

    const canonicalUrl = `${window.location.origin}${pathname}`;
    const fullTitle = `${pageTitle} | SurveyRewards - Earn Money Taking Surveys`;
    
    // Meta descriptions for different pages
    const metaDescription = {
      '/': 'Complete surveys and earn real money. Get paid for your opinions with instant withdrawals to M-Pesa in Kenya.',
      '/surveys': 'Browse and complete available surveys to earn money. New surveys added daily with instant payouts.',
      '/packages': 'Purchase survey packages to unlock premium, high-paying surveys. Invest in your earning potential.',
      '/deposit': 'Add funds to your account securely via M-Pesa, card, or PayPal. Start taking premium surveys today.',
      '/withdraw': 'Withdraw your earnings instantly to M-Pesa. Fast and secure withdrawals with no hidden fees.',
      '/profile': 'Manage your SurveyRewards account, view earnings history, and update your profile information.',
      '/transactions': 'View your complete transaction history, including earnings, withdrawals, and purchases.',
      '/bonuses': 'Claim daily bonuses, referral rewards, and special promotions to earn extra money on SurveyRewards.',
      '/admin': 'Admin dashboard for managing surveys, packages, user accounts, and platform settings.',
      '/login': 'Login to your SurveyRewards account to start earning money by taking surveys.',
      '/register': 'Sign up for SurveyRewards and start earning real money by taking online surveys today.',
      '/forgot-password': 'Reset your SurveyRewards account password securely.',
      /*'/privacy': 'Read our Privacy Policy to understand how we protect your data and information.',
      '/terms': 'Review our Terms of Service for using the SurveyRewards platform.',
      '/contact': 'Contact SurveyRewards support team for assistance and inquiries.',
      '/about': 'Learn more about SurveyRewards - your trusted platform for earning money through surveys.',
      '/faq': 'Find answers to frequently asked questions about earning money with SurveyRewards.'*/
    };

    const pageDescription = metaDescription[pathname] || 
      'Complete surveys and earn real money. Get paid for your opinions with instant withdrawals to M-Pesa. Join thousands earning daily.';

    // Update document title
    document.title = fullTitle;

    // Update or create meta tags
    const updateMetaTag = (name, content, property = null) => {
      let selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector);
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update or create link tags
    const updateLinkTag = (rel, href) => {
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    // Update meta tags
    updateMetaTag('description', pageDescription);
    updateMetaTag('keywords', `Earn Money Kenya, Paid Surveys Online, Make Money Kenya, M-Pesa Surveys, Online Jobs Kenya, Survey Rewards, ${pageTitle} Surveys`);
    
    // Update Open Graph tags
    updateMetaTag('', fullTitle, 'og:title');
    updateMetaTag('', pageDescription, 'og:description');
    updateMetaTag('', canonicalUrl, 'og:url');
    updateMetaTag('', 'website', 'og:type');
    updateMetaTag('', `${window.location.origin}/logo-og.png`, 'og:image');
    updateMetaTag('', 'SurveyRewards', 'og:site_name');
    
    // Update Twitter tags
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', pageDescription);
    updateMetaTag('twitter:image', `${window.location.origin}/logo-twitter.png`);
    updateMetaTag('twitter:card', 'summary_large_image');
    
    // Update canonical link
    updateLinkTag('canonical', canonicalUrl);

    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "SurveyRewards",
      "url": canonicalUrl,
      "description": pageDescription,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "KES"
      },
      "author": {
        "@type": "Organization",
        "name": "SurveyRewards",
        "url": canonicalUrl
      }
    };

    // Remove existing structured data script
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Remove the script we added
      const script = document.querySelector('script[type="application/ld+json"]');
      if (script && script.text.includes('SurveyRewards')) {
        script.remove();
      }
    };
  }, [pathname]);

  return null; // This component doesn't render anything
}