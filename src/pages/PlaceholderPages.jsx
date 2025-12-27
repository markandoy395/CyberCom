export const Competition = () => {
  return (
    <div className="container mt-3">
      <div className="card">
        <h1 className="text-primary">Competition Mode</h1>
        <p className="text-secondary">
          Enter competition PIN to join an active CTF competition.
        </p>
        <div className="form-group mt-2">
          <input
            type="text"
            className="input"
            placeholder="Enter Competition PIN"
          />
          <button className="btn btn-primary mt-1">Join Competition</button>
        </div>
      </div>
    </div>
  );
};
