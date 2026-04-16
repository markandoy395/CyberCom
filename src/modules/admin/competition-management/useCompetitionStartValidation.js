import { useEffect, useMemo, useState } from "react";
import { fetchPreCompetitionValidation } from "../components/competition-dashboard/preCompetitionValidation";
import { COMPETITION_STATUS } from "../constants";

const VALIDATION_LOADING_MESSAGE = "Pre-Competition Validation is still loading. Please try again in a moment.";
const VALIDATION_ERROR_MESSAGE = "Unable to verify the competition checklist right now. Please review the validation panel and try again.";
const START_BLOCKED_MESSAGE = "Complete every Pre-Competition Validation item before starting the competition.";
const ACTIVE_COMPETITION_MESSAGE = "Another competition is already active. Finish or pause it before starting a new one.";

export const useCompetitionStartValidation = ({
  competitions,
  handleStartCompetition,
  onOpenChecklist,
  showResult,
}) => {
  const [startValidationsByCompetitionId, setStartValidationsByCompetitionId] = useState({});
  const [startingCompetitionId, setStartingCompetitionId] = useState(null);

  const hasActiveCompetition = competitions.some(
    competition => competition.status === COMPETITION_STATUS.ACTIVE
  );
  const activeCompetition = useMemo(
    () => competitions.find(competition => competition.status === COMPETITION_STATUS.ACTIVE) || null,
    [competitions]
  );
  const manageableCompetitions = useMemo(
    () => competitions.filter(
      competition => competition.status !== COMPETITION_STATUS.DONE
        && competition.status !== COMPETITION_STATUS.CANCELLED
    ),
    [competitions]
  );
  const upcomingCompetitions = useMemo(
    () => manageableCompetitions.filter(
      competition => competition.status === COMPETITION_STATUS.UPCOMING
    ),
    [manageableCompetitions]
  );

  useEffect(() => {
    let disposed = false;

    if (upcomingCompetitions.length === 0) {
      setStartValidationsByCompetitionId({});
      return undefined;
    }

    setStartValidationsByCompetitionId(currentState => {
      const nextState = {};

      upcomingCompetitions.forEach(competition => {
        nextState[competition.id] = {
          error: "",
          loading: true,
          validation: currentState[competition.id]?.validation || null,
        };
      });

      return nextState;
    });

    const loadStartValidations = async () => {
      const nextEntries = await Promise.all(
        upcomingCompetitions.map(async competition => {
          try {
            const validation = await fetchPreCompetitionValidation(competition);

            return [
              competition.id,
              {
                error: "",
                loading: false,
                validation,
              },
            ];
          } catch (error) {
            return [
              competition.id,
              {
                error: error.message || VALIDATION_ERROR_MESSAGE,
                loading: false,
                validation: null,
              },
            ];
          }
        })
      );

      if (!disposed) {
        setStartValidationsByCompetitionId(Object.fromEntries(nextEntries));
      }
    };

    void loadStartValidations();

    return () => {
      disposed = true;
    };
  }, [upcomingCompetitions]);

  const handleStartClick = async competition => {
    const validationState = startValidationsByCompetitionId[competition.id];

    if (hasActiveCompetition) {
      showResult?.(false, ACTIVE_COMPETITION_MESSAGE);
      return;
    }

    if (!validationState || validationState.loading) {
      showResult?.(false, VALIDATION_LOADING_MESSAGE);
      return;
    }

    if (validationState.error) {
      showResult?.(false, VALIDATION_ERROR_MESSAGE);
      onOpenChecklist?.(competition);
      return;
    }

    if (!validationState.validation?.startReady) {
      showResult?.(false, START_BLOCKED_MESSAGE);
      onOpenChecklist?.(competition);
      return;
    }

    setStartingCompetitionId(competition.id);

    try {
      await handleStartCompetition(competition.id);
    } finally {
      setStartingCompetitionId(null);
    }
  };

  return {
    activeCompetition,
    handleStartClick,
    hasActiveCompetition,
    manageableCompetitions,
    startValidationsByCompetitionId,
    startingCompetitionId,
    validationMessages: {
      ACTIVE_COMPETITION_MESSAGE,
      START_BLOCKED_MESSAGE,
      VALIDATION_ERROR_MESSAGE,
      VALIDATION_LOADING_MESSAGE,
    },
  };
};

export default useCompetitionStartValidation;
