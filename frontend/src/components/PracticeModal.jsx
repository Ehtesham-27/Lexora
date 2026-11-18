import React, { useState } from "react";
import { X, Award, RotateCcw, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { quizQuestions } from "../data/quizQuestions";

export const PracticeModal = ({ isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const currentQ = quizQuestions[currentIndex];
  const totalQuestions = quizQuestions.length;

  const handleSelectOption = (idx) => {
    if (isSubmitted) return;
    setSelectedOption(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null || isSubmitted) return;
    setIsSubmitted(true);
    if (selectedOption === currentQ.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setScore(0);
    setIsCompleted(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="practice-modal clay-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="quiz-badge">
              <Sparkles size={14} />
              <span>Vocabulary Quiz</span>
            </div>
            <span className="quiz-progress-text">
              {!isCompleted ? `Question ${currentIndex + 1} of ${totalQuestions}` : "Results"}
            </span>
          </div>

          <button className="close-btn" onClick={onClose} aria-label="Close Quiz">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        {!isCompleted ? (
          <div className="modal-body">
            <div className="question-header">
              <span className="target-word font-serif">{currentQ.word}</span>
              <h3 className="question-prompt">{currentQ.question}</h3>
            </div>

            {/* 4 Choices */}
            <div className="options-list">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctIndex;
                let optionClass = "option-btn";

                if (isSubmitted) {
                  if (isCorrect) optionClass += " is-correct";
                  else if (isSelected && !isCorrect) optionClass += " is-wrong";
                } else if (isSelected) {
                  optionClass += " is-selected";
                }

                return (
                  <button
                    key={idx}
                    className={optionClass}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isSubmitted}
                  >
                    <span className="option-index">{String.fromCharCode(65 + idx)}</span>
                    <span className="option-text">{option}</span>
                    {isSubmitted && isCorrect && <CheckCircle2 size={18} className="option-feedback-icon correct" />}
                    {isSubmitted && isSelected && !isCorrect && <AlertCircle size={18} className="option-feedback-icon wrong" />}
                  </button>
                );
              })}
            </div>

            {/* Answer Explanation */}
            {isSubmitted && (
              <div className="explanation-box">
                <span className="explanation-title">Explanation:</span>
                <p className="explanation-text">{currentQ.explanation}</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="modal-footer">
              {!isSubmitted ? (
                <button
                  className="clay-btn-primary"
                  onClick={handleConfirmAnswer}
                  disabled={selectedOption === null}
                  style={{ opacity: selectedOption === null ? 0.5 : 1 }}
                >
                  Confirm Answer
                </button>
              ) : (
                <button className="clay-btn-primary" onClick={handleNext}>
                  {currentIndex + 1 < totalQuestions ? "Next Question" : "View Results"}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Completion Screen */
          <div className="completion-body">
            <div className="score-trophy-clay">
              <Award size={48} className="trophy-icon" />
            </div>

            <h2 className="completion-heading font-serif">Practice Completed!</h2>
            <p className="completion-subtitle">
              You scored <strong>{score}</strong> out of <strong>{totalQuestions}</strong> (
              {Math.round((score / totalQuestions) * 100)}%)
            </p>

            <div className="score-summary-pill">
              {score === totalQuestions
                ? "Outstanding! Perfect vocabulary mastery!"
                : score >= 3
                ? "Great job! Your vocabulary is expanding steadily."
                : "Good effort! Keep exploring words to master them."}
            </div>

            <div className="completion-actions">
              <button className="clay-btn" onClick={handleRestart}>
                <RotateCcw size={16} />
                <span>Try Again</span>
              </button>
              <button className="clay-btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(30, 26, 40, 0.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        .practice-modal {
          width: 100%;
          max-width: 580px;
          padding: 28px;
          background-color: var(--surface-card);
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-clay-lg);
          border: 1px solid var(--border-subtle);
          position: relative;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-dark-subtle);
        }

        .modal-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .quiz-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-lavender);
          color: var(--pastel-lavender-text);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .quiz-progress-text {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          background-color: var(--surface-raised);
          box-shadow: var(--shadow-clay-sm);
          transition: all 0.15s ease;
        }
        .close-btn:hover {
          color: var(--text-main);
          transform: scale(1.05);
        }

        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .question-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .target-word {
          font-size: 1.55rem;
          font-weight: 700;
          color: var(--accent-primary);
        }

        .question-prompt {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-main);
          line-height: 1.45;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .option-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: var(--radius-md);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-sm);
          color: var(--text-main);
          font-size: 0.95rem;
          text-align: left;
          transition: all 0.18s ease;
          position: relative;
        }
        .option-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: var(--shadow-clay-md);
        }
        .option-btn.is-selected {
          box-shadow: var(--shadow-clay-inset);
          border: 1px solid var(--accent-primary);
          color: var(--accent-primary);
        }
        .option-btn.is-correct {
          background-color: var(--pastel-mint);
          color: var(--pastel-mint-text);
          box-shadow: var(--shadow-clay-sm);
        }
        .option-btn.is-wrong {
          background-color: var(--pastel-peach);
          color: var(--pastel-peach-text);
          box-shadow: var(--shadow-clay-sm);
        }

        .option-index {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: var(--surface-card);
          box-shadow: var(--shadow-clay-inset-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          flex-shrink: 0;
        }

        .option-text {
          flex: 1;
        }

        .option-feedback-icon {
          flex-shrink: 0;
        }
        .option-feedback-icon.correct {
          color: #2D5845;
        }
        .option-feedback-icon.wrong {
          color: #734538;
        }

        .explanation-box {
          padding: 12px 16px;
          border-radius: var(--radius-md);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset-sm);
          font-size: 0.9rem;
          line-height: 1.45;
        }

        .explanation-title {
          font-weight: 700;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 4px;
        }
        .explanation-text {
          color: var(--text-main);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          padding-top: 10px;
        }

        /* Completion Screen */
        .completion-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px 10px;
          gap: 16px;
        }

        .score-trophy-clay {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: var(--surface-lavender);
          box-shadow: var(--shadow-clay-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          margin-bottom: 6px;
        }

        .completion-heading {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .completion-subtitle {
          font-size: 1rem;
          color: var(--text-secondary);
        }

        .score-summary-pill {
          padding: 10px 18px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset-sm);
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--accent-primary);
        }

        .completion-actions {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
};
