import { FaBarsProgress } from "../../../utils/icons";
import { CATEGORIES } from "../../../utils/constants";
import { getIconComponent } from "../../../utils/helpers";
import "./CategoryProgress.css";

const CategoryProgress = ({ categoryProgress = {} }) => {
  return (
    <div className="category-progress-container">
      <div className="progress-header">
        <h3 className="progress-title">
          <FaBarsProgress className="title-icon" />
          Category Progress
        </h3>
      </div>
      <div className="progress-grid">
        {CATEGORIES.map((category) => {
          const progress = categoryProgress[category.id] || 0;
          return (
            <div key={category.id} className="category-item">
              <div className="category-header">
                <div className="category-icon-wrapper">
                  {getIconComponent(category.icon, 20)}
                </div>
                <div className="category-name-section">
                  <span className="category-name">{category.name}</span>
                  <span className="category-progress-value">{progress}%</span>
                </div>
              </div>
              <div className="progress-bar" style={{ backgroundColor: 'var(--border-color)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: category.color,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryProgress;
