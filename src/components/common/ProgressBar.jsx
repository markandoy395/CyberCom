import "./ProgressBar.css";

const ProgressBar = ({ progress, color = "primary", height = "8px" }) => {
  return (
    <div className="progress-bar" style={{ height }}>
      <div
        className={`progress-fill progress-fill-${color}`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
