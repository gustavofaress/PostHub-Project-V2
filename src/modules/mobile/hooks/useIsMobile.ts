import * as React from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

export const useIsMobile = () => {
  const getMatches = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia(MOBILE_QUERY).matches;
  }, []);

  const [isMobile, setIsMobile] = React.useState(getMatches);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mediaQuery.matches);

    onChange();
    mediaQuery.addEventListener('change', onChange);

    return () => {
      mediaQuery.removeEventListener('change', onChange);
    };
  }, []);

  return isMobile;
};
