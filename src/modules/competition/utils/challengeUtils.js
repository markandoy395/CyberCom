// Challenge filtering and data transformation utilities

const normalizeResourceUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (
    trimmed.startsWith('/')
    || /^(https?:|data:|blob:|mailto:|tel:)/i.test(trimmed)
  ) {
    return trimmed;
  }

  if (/^(api|uploads|resources|web-exploitation)\//i.test(trimmed)) {
    return `/${trimmed}`;
  }

  return trimmed;
};

const inferResourceTypeFromUrl = (url) => {
  if (!url) {
    return null;
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url)) {
    return 'image';
  }

  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(url)) {
    return 'audio';
  }

  if (/\.(mp4|webm|mov|avi|mkv)$/i.test(url)) {
    return 'video';
  }

  if (
    url.endsWith('/')
    || url.endsWith('/zip')
    || /\/zip(?:$|\?)/i.test(url)
  ) {
    return 'folder';
  }

  if (url.startsWith('/api/uploads/')) {
    return 'file';
  }

  if (/^(https?:|\/)/i.test(url)) {
    return 'link';
  }

  return null;
};

const normalizeResourceObject = (resource) => {
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
    return null;
  }

  const url = normalizeResourceUrl(resource.url || '');
  const type = resource.type || inferResourceTypeFromUrl(url) || 'file';
  const fallbackName = url ? url.split('/').filter(Boolean).pop() : 'Resource';

  return {
    ...resource,
    type,
    name: resource.name || resource.title || fallbackName,
    url,
  };
};

// Helper function to parse a resource string into attachment object
const parseResourceString = (resourceStr) => {
  if (!resourceStr || typeof resourceStr !== 'string') return null;
  
  const trimmed = normalizeResourceUrl(resourceStr);
  if (!trimmed) return null;
  
  // Check if it's a URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      type: 'link',
      url: trimmed,
      name: trimmed.split('/').pop() || 'Resource Link'
    };
  }
  
  // Check if it's an image file
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(trimmed)) {
    return {
      type: 'image',
      url: trimmed,
      name: trimmed.split('/').pop() || 'Image'
    };
  }
  
  // Check if it looks like a folder (ends with / or contains folder-like names)
  if (
    trimmed.endsWith('/')
    || trimmed.endsWith('/zip')
    || /\/zip(?:$|\?)/i.test(trimmed)
    || trimmed.includes('folder')
    || trimmed.includes('dir')
  ) {
    return {
      type: 'folder',
      url: trimmed,
      name: trimmed.split('/').pop() || 'Folder'
    };
  }
  
  // For any other string, treat as a file/resource link
  // cspell:disable-next-line
  // This handles cases like "FLOWCHART.svg", "ljbaobaOISFBAS", etc.
  return {
    type: inferResourceTypeFromUrl(trimmed) || 'link',
    url: trimmed,
    name: trimmed.split('/').pop() || trimmed
  };
};

export const transformChallengeData = (apiData) => {
  // Backend API now returns decrypted challenges - no client-side decryption needed
  if (!apiData || apiData.length === 0) {
    return [];
  }

  const isTeamSolved = challenge => (
    challenge.team_solved === true
    || challenge.team_solved === 1
    || challenge.team_solved === '1'
  );

  const result = apiData.map((challenge) => {
    const hasCatId = 'category_id' in challenge && challenge.category_id !== undefined && challenge.category_id !== null;
    const hasCatName = 'category_name' in challenge && challenge.category_name !== undefined && challenge.category_name !== null;
    
    // Parse resources/attachment data - handle multiple formats
    let attachments = [];
    if (challenge.resources) {
      try {
        let parsed = challenge.resources;
        
        // If it's a string, try to parse as JSON first
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            // Not JSON, keep as string
          }
        }
        
        // Now handle the parsed value
        if (Array.isArray(parsed)) {
          // Convert all items in array to attachments
          attachments = parsed
            .map((resource) => {
              if (typeof resource === 'string') {
                return parseResourceString(resource);
              } else if (typeof resource === 'object' && resource !== null) {
                return normalizeResourceObject(resource);
              }
              return null;
            })
            .filter(item => item !== null);
        } else if (typeof parsed === 'string') {
          // Single string resource
          const attachment = parseResourceString(parsed);
          if (attachment) {
            attachments = [attachment];
          }
        } else if (typeof parsed === 'object' && parsed !== null) {
          const attachment = normalizeResourceObject(parsed);
          attachments = [attachment];
        }
      } catch {
        // If all else fails, treat as a link
        const attachment = typeof challenge.resources === 'string' 
          ? parseResourceString(challenge.resources) 
          : null;
        if (attachment) {
          attachments = [attachment];
        }
      }
    }

    // Parse hints - handle both 'hint' and 'hints' fields, and different formats
    let hints = [];
    
    // Try hints field first (new format)
    if (challenge.hints) {
      try {
        let parsed = challenge.hints;
        
        if (typeof parsed === 'string') {
          // Try to parse the JSON string
          parsed = JSON.parse(parsed);
        }
        
        // Now check what we got after parsing
        if (parsed && typeof parsed === 'object') {
          // If it's an object with a 'hints' key, extract that array
          if (!Array.isArray(parsed) && 'hints' in parsed) {
            hints = Array.isArray(parsed.hints) ? parsed.hints : [];
          }
          // If it's already an array, use it directly
          else if (Array.isArray(parsed)) {
            hints = parsed;
          }
        }
      } catch {
        // If parsing fails, treat the raw string as a single hint
        hints = typeof challenge.hints === 'string' && challenge.hints.trim() ? [challenge.hints] : [];
      }
    } 
    // Fallback to hint field if hints is empty (old format)
    else if (challenge.hint) {
      try {
        let parsed = challenge.hint;
        
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        
        if (parsed && typeof parsed === 'object') {
          if (!Array.isArray(parsed) && 'hints' in parsed) {
            hints = Array.isArray(parsed.hints) ? parsed.hints : [];
          } else if (Array.isArray(parsed)) {
            hints = parsed;
          }
        }
      } catch {
        // If parsing fails, treat as single hint
        hints = typeof challenge.hint === 'string' && challenge.hint.trim() ? [challenge.hint] : [];
      }
    }
    
    const transformed = {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      fullDescription: challenge.full_description || challenge.description,
      hints: hints,
      difficulty: challenge.difficulty,
      points: challenge.competition_points || challenge.points || 100,
      solverCount: Number.parseInt(challenge.solver_count, 10) || 0,
      flag: challenge.flag,
      attachments: attachments,
      status: isTeamSolved(challenge)
        ? 'solved'
        : challenge.status === 'active'
          ? 'unsolved'
          : 'locked',
      category: (hasCatId && hasCatName) ? {
        id: challenge.category_id,
        name: challenge.category_name,
        description: challenge.category_description || '',
        color: challenge.category_color || '#6b7280',
        icon: null
      } : null,
      solved: isTeamSolved(challenge) ? 1 : 0,
      solveTime: isTeamSolved(challenge) ? 'Solved' : null,
    };

    return transformed;
  });

  return result;
};

export const getInitialUnlockedChallenges = (parentChallenges, initialChallenges) => {
  const initialUnlocked = new Map();
  const now = Date.now();
  
  // Use database challenges: unlock all active and solved challenges
  if (parentChallenges && parentChallenges.length > 0) {
    initialChallenges.forEach((challenge) => {
      // Unlock both unsolved and solved challenges - locked ones stay locked
      if (challenge.status === 'unsolved' || challenge.status === 'solved') {
        initialUnlocked.set(challenge.id, { unlockedAt: now });
      }
    });
  }

  return initialUnlocked;
};

export const groupChallengesByDifficulty = (challenges) => {
  const difficulties = ["hard", "medium", "easy"];
  const result = {};

  difficulties.forEach((diff) => {
    result[diff] = challenges.filter(
      (challenge) => challenge.difficulty === diff
    );
  });

  return result;
};

export const filterChallengesByCategory = (challengesByDifficulty, unlockedChallenges, selectedCategory) => {
  const getCategoryId = (cat) => {
    if (!cat || !cat.id) return 'uncategorized';
    return String(cat.id); // Convert to string for consistent comparison
  };

  // Convert selectedCategory to string for comparison
  const selectedCategoryStr = selectedCategory === "all" ? "all" : String(selectedCategory);

  return {
    hard: challengesByDifficulty.hard.filter((challenge) => {
      if (!unlockedChallenges.has(challenge.id)) return false;
      if (selectedCategoryStr === "all") return true;
      
      const challengeCategoryId = getCategoryId(challenge.category);
      return challengeCategoryId === selectedCategoryStr;
    }),
    medium: challengesByDifficulty.medium.filter((challenge) => {
      if (!unlockedChallenges.has(challenge.id)) return false;
      if (selectedCategoryStr === "all") return true;
      
      const challengeCategoryId = getCategoryId(challenge.category);
      return challengeCategoryId === selectedCategoryStr;
    }),
    easy: challengesByDifficulty.easy.filter((challenge) => {
      if (!unlockedChallenges.has(challenge.id)) return false;
      if (selectedCategoryStr === "all") return true;
      
      const challengeCategoryId = getCategoryId(challenge.category);
      return challengeCategoryId === selectedCategoryStr;
    }),
  };
};

export const filterChallengesBySearch = (filteredByCategory, searchQuery) => {
  if (!searchQuery || searchQuery.trim() === "") {
    return filteredByCategory;
  }

  const query = searchQuery.toLowerCase();

  return {
    hard: filteredByCategory.hard.filter((challenge) =>
      challenge.title.toLowerCase().includes(query) ||
      challenge.description.toLowerCase().includes(query)
    ),
    medium: filteredByCategory.medium.filter((challenge) =>
      challenge.title.toLowerCase().includes(query) ||
      challenge.description.toLowerCase().includes(query)
    ),
    easy: filteredByCategory.easy.filter((challenge) =>
      challenge.title.toLowerCase().includes(query) ||
      challenge.description.toLowerCase().includes(query)
    ),
  };
};

export const formatElapsedTime = (unlockedAt) => {
  const elapsed = Math.floor((Date.now() - unlockedAt) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

export const calculateUnlockCount = (difficulty, solveCount) => {
  let challengesToUnlock = 0;
  if (solveCount === 1) {
    challengesToUnlock = 2; // After 1st solve, unlock 2
  } else if (solveCount === 3) {
    challengesToUnlock = 3; // After 2nd solve (total 3), unlock 3 more
  } else if (solveCount > 3 && (solveCount - 3) % 3 === 0) {
    challengesToUnlock = 3; // Every 3 solves after, unlock 3 more
  }
  return challengesToUnlock;
};

// All available database categories - matches database schema
const ALL_DATABASE_CATEGORIES = [
  { id: 1, name: 'Web Exploitation', description: 'Web vulnerabilities and exploits', color: '#06b6d4' },
  { id: 2, name: 'Cryptography', description: 'Cryptographic challenges', color: '#ec4899' },
  { id: 3, name: 'Forensics', description: 'Digital forensics challenges', color: '#8b5cf6' },
  { id: 4, name: 'Reverse Engineering', description: 'Binary analysis and reverse engineering', color: '#14b8a6' },
  { id: 5, name: 'Binary Exploitation', description: 'Binary exploitation challenges', color: '#f97316' },
];

export const getAvailableCategories = (challenges) => {
  // Create a map of categories that have challenges
  const categoriesWithChallenges = new Set();
  challenges.forEach((challenge) => {
    if (challenge.category && challenge.category.id) {
      categoriesWithChallenges.add(challenge.category.id);
    }
  });
  
  // Always return all database categories so users can see all options
  // This improves UX by showing what categories exist even if no challenges are assigned yet
  const categories = ALL_DATABASE_CATEGORIES.map(cat => ({
    ...cat,
    hasActiveChallenges: categoriesWithChallenges.has(cat.id)
  }));
  
  const hasUncategorized = challenges.some(c => !c.category || !c.category.id);
  if (hasUncategorized) {
    categories.push({ 
      id: 'uncategorized', 
      name: 'Uncategorized',
      description: 'Challenges without category',
      color: '#6b7280',
      icon: null
    });
  }
  
  return categories;
};
