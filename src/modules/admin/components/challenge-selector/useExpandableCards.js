import { useState } from 'react';

const useExpandableCards = () => {
  const [expandedCardId, setExpandedCardId] = useState(null);

  const toggleCardExpansion = (id) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  const isCardExpanded = (id) => {
    return expandedCardId === id;
  };

  return { expandedCardId, toggleCardExpansion, isCardExpanded };
};

export default useExpandableCards;
