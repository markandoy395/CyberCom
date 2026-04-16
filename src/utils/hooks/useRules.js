import { useEffect, useState } from 'react';
import { apiGet, API_ENDPOINTS } from '../api';
import { getDefaultRules, getRulesFromResponse } from '../rules';

const useRules = (type = 'competition') => {
  const [rules, setRules] = useState(() => getDefaultRules(type));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRules = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiGet(API_ENDPOINTS.RULES_LIST(type));

        if (!isMounted) {
          return;
        }

        setRules(getRulesFromResponse(response, type));
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setRules(getDefaultRules(type));
        setError(loadError.message || `Failed to load ${type} rules.`);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRules();

    return () => {
      isMounted = false;
    };
  }, [type]);

  return { rules, loading, error };
};

export default useRules;
