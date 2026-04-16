import React, { useMemo } from "react";
import { ChallengeSelector } from "../../../components";

const SelectChallengesTab = ({
  competitions = [],
  selectedCompId = null,
}) => {
  const selectedCompetition = useMemo(
    () => competitions.find(competition => Number(competition.id) === Number(selectedCompId)) || null,
    [competitions, selectedCompId]
  );

  return (
    <div className="admin-section">
      <ChallengeSelector
        competitionId={selectedCompId}
        competitionName={selectedCompetition?.name || ""}
      />
    </div>
  );
};

export default SelectChallengesTab;
